import { Request, Response } from 'express';
import { Queue } from 'bullmq';
import { db } from '../config/firebase-admin';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';
import { isRedisAvailable } from '../utils/redis-check';
import { activeChildProcesses } from '../workers/build.worker';

export const checkAndFailStaleBuild = async (buildId: string, buildData: any): Promise<any> => {
  const activeStages = ['QUEUED', 'PREPARING', 'GENERATING_PROJECT', 'RUNNING_GRADLE', 'SIGNING_APK', 'UPLOADING', 'BUILDING'];
  if (activeStages.includes(buildData.status)) {
    const startTime = buildData.startedAt ? new Date(buildData.startedAt).getTime() : new Date(buildData.createdAt).getTime();
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    
    if (elapsedSeconds > 420) {
      const reason = `Build timed out: remained in active state ${buildData.status} for ${Math.round(elapsedSeconds)} seconds (limit is 420 seconds).`;
      logger.warn(`Stale build detected during fetch: Failing build ${buildId}: ${reason}`);
      console.log(`[BUILD STAGE TRANSITION] Build ID: ${buildId} -> failed`);
      
      const updateData = {
        status: 'FAILED',
        error: reason,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      
      await db.collection('builds').doc(buildId).update(updateData);
      
      await db.collection('builds').doc(buildId).collection('logs').add({
        level: 'ERROR',
        message: reason,
        timestamp: new Date().toISOString(),
      });
      
      return {
        ...buildData,
        ...updateData,
      };
    }
  }
  return buildData;
};

// Build queue
export const buildQueue = new Queue('android-builds', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * POST /api/builds
 * Queue a new build for a project.
 */
export const createBuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, buildType } = req.body;

    if (!isRedisAvailable) {
      res.status(503).json({
        success: false,
        error: 'Build queue service is temporarily offline. Builds are disabled but other features remain active.'
      });
      return;
    }

    // Verify project ownership
    const projectDoc = await db.collection('projects').doc(projectId).get();

    if (!projectDoc.exists || projectDoc.data()?.userId !== req.userId || projectDoc.data()?.isDeleted) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }
    const project = { id: projectDoc.id, ...projectDoc.data() } as any;
    
    // Validate project properties before generating APK
    const config = project.config || {};
    if (!project.websiteUrl || !project.websiteUrl.startsWith('http')) {
      res.status(400).json({
        success: false,
        error: 'Invalid website URL. URL must start with http:// or https://'
      });
      return;
    }
    if (!config.appName || config.appName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'App Name is required'
      });
      return;
    }
    if (!config.packageName || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.packageName)) {
      res.status(400).json({
        success: false,
        error: `Invalid package name: "${config.packageName || ''}". Must be in format com.example.app`
      });
      return;
    }
    if (!['APK', 'AAB', 'SIGNED_APK'].includes(buildType)) {
      res.status(400).json({
        success: false,
        error: `Invalid output type: "${buildType}". Must be APK, AAB, or SIGNED_APK`
      });
      return;
    }

    // Check for existing active build
    const activeBuildsSnap = await db.collection('builds')
      .where('projectId', '==', projectId)
      .where('status', 'in', ['QUEUED', 'PREPARING', 'BUILDING', 'SIGNING'])
      .get();

    if (!activeBuildsSnap.empty) {
      res.status(409).json({
        success: false,
        error: 'A build is already in progress for this project',
      });
      return;
    }

    // Create build record
    const buildData = {
      projectId,
      userId: req.userId,
      buildType,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      downloadUrl: null,
      logOutput: null,
      progress: 0,
    };

    const buildRef = await db.collection('builds').add(buildData);

    console.log(`[BUILD STAGE TRANSITION] Build ID: ${buildRef.id} -> queued`);

    // Add to queue
    await buildQueue.add(
      'compile',
      {
        buildId: buildRef.id,
        projectId: project.id,
        websiteUrl: project.websiteUrl,
        appType: project.appType,
        buildType,
        config: project.config,
        iconUrl: project.iconUrl,
        splashUrl: project.splashUrl,
      },
      {
        jobId: buildRef.id,
        priority: 1,
      }
    );

    logger.info(`Build queued: ${buildRef.id} for project ${project.name}`);

    res.status(201).json({
      success: true,
      data: {
        id: buildRef.id,
        ...buildData,
      },
      message: 'Build queued successfully',
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/builds/:id
 * Get build status and logs.
 */
export const getBuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buildId = req.params.id as string;
    const buildDoc = await db.collection('builds').doc(buildId).get();

    if (!buildDoc.exists || buildDoc.data()?.userId !== req.userId) {
      res.status(404).json({
        success: false,
        error: 'Build not found',
      });
      return;
    }

    let buildData = buildDoc.data()!;
    buildData = await checkAndFailStaleBuild(buildId, buildData);
    const projectDoc = await db.collection('projects').doc(buildData.projectId).get();
    
    // Fetch logs from a subcollection if they exist
    const logsSnap = await db.collection('builds').doc(buildId).collection('logs')
      .orderBy('timestamp', 'asc')
      .limit(200)
      .get();
      
    const buildLogs = logsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: {
        id: buildDoc.id,
        ...buildData,
        project: projectDoc.exists ? { name: projectDoc.data()?.name, websiteUrl: projectDoc.data()?.websiteUrl } : null,
        buildLogs,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/builds/:id/debug
 * Debug endpoint returning detailed build status, progress, last log, error, and queue position.
 */
export const getBuildDebug = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buildId = req.params.id as string;
    const buildDoc = await db.collection('builds').doc(buildId).get();

    if (!buildDoc.exists || buildDoc.data()?.userId !== req.userId) {
      res.status(404).json({
        success: false,
        error: 'Build not found',
      });
      return;
    }

    let buildData = buildDoc.data()!;
    buildData = await checkAndFailStaleBuild(buildId, buildData);

    const logsSnap = await db.collection('builds').doc(buildId).collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    const lastLog = logsSnap.empty ? null : logsSnap.docs[0].data().message;

    let queuePosition: number | null = null;
    let progress = buildData.progress ?? 0;

    try {
      const job = await buildQueue.getJob(buildId);
      if (job) {
        const jobProgress = job.progress;
        if (typeof jobProgress === 'number') {
          progress = jobProgress;
        }

        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed') {
          const waitingJobs = await buildQueue.getJobs(['waiting', 'delayed']);
          const index = waitingJobs.findIndex(j => j.id === buildId);
          queuePosition = index !== -1 ? index + 1 : null;
        } else if (state === 'active') {
          queuePosition = 0;
        }
      }
    } catch (queueErr) {
      logger.error(`Error querying BullMQ for build debug ${buildId}:`, queueErr);
    }

    res.json({
      success: true,
      data: {
        status: buildData.status,
        progress,
        lastLog,
        error: buildData.error || null,
        queuePosition,
      }
    });
  } catch (error: any) {
    logger.error('Error in getBuildDebug:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/**
 * GET /api/projects/:id/builds
 * List builds for a project.
 */
export const listProjectBuilds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const projectId = req.params.id as string;

    // Verify project ownership
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists || projectDoc.data()?.userId !== req.userId) {
       res.status(404).json({ success: false, error: 'Project not found' });
       return;
    }

    const snapshot = await db.collection('builds')
      .where('projectId', '==', projectId)
      .get();
      
    const allBuilds = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    allBuilds.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = allBuilds.length;
    
    const startIndex = (page - 1) * limit;
    const builds = allBuilds.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: builds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/builds
 * List all builds for current user.
 */
export const listBuilds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = req.query.status as string;

    let query = db.collection('builds').where('userId', '==', req.userId!);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Firestore requires composite index for filtering + sorting on different fields, so we sort in memory
    const snapshot = await query.get();
    let allBuilds = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    
    allBuilds.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allBuilds.length;
    const startIndex = (page - 1) * limit;
    const paginatedBuilds = allBuilds.slice(startIndex, startIndex + limit);

    // Attach project data
    for (const build of paginatedBuilds) {
      const pDoc = await db.collection('projects').doc(build.projectId).get();
      if (pDoc.exists) {
        build.project = { name: pDoc.data()?.name, websiteUrl: pDoc.data()?.websiteUrl };
      }
    }

    res.json({
      success: true,
      data: paginatedBuilds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/builds/:id/download
 * Download the build artifact (time-limited).
 */
export const downloadBuild = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buildId = req.params.id as string;
    const buildDoc = await db.collection('builds').doc(buildId).get();

    if (!buildDoc.exists || buildDoc.data()?.userId !== req.userId || buildDoc.data()?.status !== 'COMPLETED') {
      res.status(404).json({
        success: false,
        error: 'Build artifact not found or not ready',
      });
      return;
    }

    const buildData = buildDoc.data()!;

    if (!buildData.downloadUrl) {
      res.status(404).json({
        success: false,
        error: 'Download URL not available',
      });
      return;
    }

    // Check if artifact has expired
    if (buildData.expiresAt && new Date(buildData.expiresAt) < new Date()) {
      res.status(410).json({
        success: false,
        error: 'Build artifact has expired. Please create a new build.',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        downloadUrl: buildData.downloadUrl,
        expiresAt: buildData.expiresAt,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics.
 */
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const projectsSnap = await db.collection('projects').where('userId', '==', userId).where('isDeleted', '==', false).count().get();
    const totalProjects = projectsSnap.data().count;

    const buildsSnap = await db.collection('builds').where('userId', '==', userId).get();
    const allBuilds = buildsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
    
    const totalBuilds = allBuilds.length;
    const successfulBuilds = allBuilds.filter((b: any) => b.status === 'COMPLETED').length;
    const failedBuilds = allBuilds.filter((b: any) => b.status === 'FAILED').length;
    
    // Sort for recent
    allBuilds.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentBuilds = allBuilds.slice(0, 5);
    
    for (const build of recentBuilds) {
      const pDoc = await db.collection('projects').doc(build.projectId).get();
      if (pDoc.exists) {
        build.project = { name: pDoc.data()?.name, websiteUrl: pDoc.data()?.websiteUrl };
      }
    }

    res.json({
      success: true,
      data: {
        totalProjects,
        totalBuilds,
        successfulBuilds,
        failedBuilds,
        recentBuilds,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

export const startStaleBuildCleaner = () => {
  setInterval(async () => {
    try {
      // Find all builds in any active stage
      const activeStages = ['QUEUED', 'PREPARING', 'GENERATING_PROJECT', 'RUNNING_GRADLE', 'SIGNING_APK', 'UPLOADING', 'BUILDING'];
      
      for (const stage of activeStages) {
        const snapshot = await db.collection('builds')
          .where('status', '==', stage)
          .get();
          
        for (const doc of snapshot.docs) {
          const buildData = doc.data();
          const buildId = doc.id;
          const startTime = buildData.startedAt ? new Date(buildData.startedAt).getTime() : new Date(buildData.createdAt).getTime();
          const totalElapsedSeconds = (Date.now() - startTime) / 1000;
          
          // Phase 7 - Hang Detection
          if (totalElapsedSeconds >= 120 && !buildData.hangWarned) {
            // 1. stuck for 120s: warn
            logger.warn(`[HANG DETECTION] Warning: Build ${buildId} stuck in stage ${stage} for ${Math.round(totalElapsedSeconds)}s.`);
            
            await db.collection('builds').doc(buildId).update({
              hangWarned: true,
              updatedAt: new Date().toISOString(),
            });
            
            await db.collection('builds').doc(buildId).collection('logs').add({
              level: 'WARN',
              message: `[HANG DETECTION] Warning: Build has been stuck in state ${stage} for over 120 seconds.`,
              timestamp: new Date().toISOString(),
            });
          }
          else if (totalElapsedSeconds >= 240 && buildData.hangWarned && !buildData.hangTraceCaptured) {
            // 2. stuck for 240s: capture stack trace
            const stackTrace = new Error().stack || 'No stack trace available';
            logger.warn(`[HANG DETECTION] Stack trace captured for build ${buildId} stuck in state ${stage}`);
            
            await db.collection('builds').doc(buildId).update({
              hangTraceCaptured: true,
              updatedAt: new Date().toISOString(),
            });
            
            await db.collection('builds').doc(buildId).collection('logs').add({
              level: 'WARN',
              message: `[HANG DETECTION] Warning: Build stuck in ${stage} for over 240 seconds. Capturing Stack Trace:\n${stackTrace}`,
              timestamp: new Date().toISOString(),
            });
          }
          else if (totalElapsedSeconds >= 420 && buildData.hangWarned && buildData.hangTraceCaptured) {
            // 3. stuck for 420s (7 minutes): kill process and mark FAILED
            const reason = `Build terminated: stuck in stage ${stage} for over 420 seconds (limit is 420 seconds).`;
            logger.error(`[HANG DETECTION] Killing build ${buildId}: ${reason}`);
            console.log(`[BUILD STAGE TRANSITION] Build ID: ${buildId} -> failed`);
            
            await db.collection('builds').doc(buildId).update({
              status: 'FAILED',
              error: reason,
              updatedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            });
            
            await db.collection('builds').doc(buildId).collection('logs').add({
              level: 'ERROR',
              message: `[HANG DETECTION] ${reason}`,
              timestamp: new Date().toISOString(),
            });
            
            // Terminate local child process running Gradle/Docker if registered
            const childProcess = activeChildProcesses.get(buildId);
            if (childProcess) {
              try {
                childProcess.kill('SIGKILL');
                logger.info(`[HANG DETECTION] Successfully terminated child process for build ${buildId}`);
              } catch (killErr: any) {
                logger.warn(`[HANG DETECTION] Failed to kill child process: ${killErr.message}`);
              }
              activeChildProcesses.delete(buildId);
            }
            
            // Terminate Docker container by name
            try {
              const { exec } = require('child_process');
              exec(`docker kill appforge-build-${buildId}`, (err: any) => {
                if (err) {
                  logger.debug(`[HANG DETECTION] docker kill execution response: ${err.message}`);
                } else {
                  logger.info(`[HANG DETECTION] Successfully issued docker kill for appforge-build-${buildId}`);
                }
              });
            } catch (dockerKillErr: any) {
              logger.error(`[HANG DETECTION] Failed to run docker kill command:`, dockerKillErr);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error in stale build cleaner background task:', error);
    }
  }, 10000); // Check every 10 seconds
};

/**
 * GET /queue/debug
 * Return queue counts and details of the latest job.
 */
export const getQueueDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isRedisAvailable) {
      res.status(503).json({
        success: false,
        error: 'Queue service (Redis) offline',
      });
      return;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      buildQueue.getWaitingCount(),
      buildQueue.getActiveCount(),
      buildQueue.getCompletedCount(),
      buildQueue.getFailedCount(),
      buildQueue.getDelayedCount()
    ]);

    let latestJobId = null;
    let latestJobStatus = null;
    let latestJobProgress = null;
    let latestJobError = null;

    try {
      const jobs = await buildQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, 10, false);
      if (jobs && jobs.length > 0) {
        jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const latestJob = jobs[0];

        latestJobId = latestJob.id || null;
        latestJobStatus = await latestJob.getState();
        latestJobProgress = latestJob.progress ?? null;
        latestJobError = latestJob.failedReason || null;
      }
    } catch (jobErr) {
      logger.error('Error getting latest job info for queue debug:', jobErr);
    }

    res.json({
      waiting,
      active,
      completed,
      failed,
      delayed,
      latestJobId,
      latestJobStatus,
      latestJobProgress,
      latestJobError
    });
  } catch (error: any) {
    logger.error('Error in getQueueDebug:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
