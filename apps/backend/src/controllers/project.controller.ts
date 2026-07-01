import { Response } from 'express';
import { db } from '../config/firebase-admin';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

/**
 * POST /api/projects
 * Create a new project.
 */
export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, websiteUrl, appType, config } = req.body;

    const projectData = {
      userId: req.userId!,
      name,
      websiteUrl,
      appType,
      config: config || {},
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('projects').add(projectData);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...projectData,
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
 * GET /api/projects
 * List all projects for current user (paginated).
 */
export const listProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
    const search = (req.query.search as string)?.toLowerCase();

    let query = db.collection('projects')
      .where('userId', '==', req.userId!)
      .where('isDeleted', '==', false);

    const snapshot = await query.get();
    let projects = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

    // Sort in memory by createdAt desc to avoid composite index requirement
    projects.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (search) {
      projects = projects.filter(
        (p: any) =>
          p.name?.toLowerCase().includes(search) ||
          p.websiteUrl?.toLowerCase().includes(search)
      );
    }

    const total = projects.length;
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProjects = projects.slice(startIndex, startIndex + limit);

    // Fetch build counts for these projects
    for (const project of paginatedProjects) {
      const buildsSnapshot = await db.collection('builds')
        .where('projectId', '==', project.id)
        .count()
        .get();
      project._count = { builds: buildsSnapshot.data().count };
    }

    res.json({
      success: true,
      data: paginatedProjects,
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
 * GET /api/projects/:id
 * Get project details with recent builds.
 */
export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const docRef = db.collection('projects').doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== req.userId || docSnap.data()?.isDeleted) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const projectData = { id: docSnap.id, ...docSnap.data() };

    // Fetch recent builds — sort in memory to avoid composite index requirement
    let builds: any[] = [];
    let buildsCount = 0;
    try {
      const buildsSnapshot = await db.collection('builds')
        .where('projectId', '==', projectId)
        .get();
      
      builds = buildsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
      buildsCount = builds.length;
      builds.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      builds = builds.slice(0, 10);
    } catch (buildsErr: any) {
      // If builds query fails, still return the project without builds
      console.warn('Failed to fetch builds for project:', buildsErr.message);
    }

    res.json({
      success: true,
      data: {
        ...projectData,
        builds,
        _count: { builds: buildsCount }
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
 * PUT /api/projects/:id
 * Update project settings.
 */
export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const docRef = db.collection('projects').doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== req.userId || docSnap.data()?.isDeleted) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const { name, websiteUrl, appType, config } = req.body;

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (name) updateData.name = name;
    if (websiteUrl) updateData.websiteUrl = websiteUrl;
    if (appType) updateData.appType = appType;
    if (config) updateData.config = config;

    await docRef.update(updateData);
    
    // Get latest data
    const updatedSnap = await docRef.get();

    res.json({
      success: true,
      data: {
        id: updatedSnap.id,
        ...updatedSnap.data(),
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
 * DELETE /api/projects/:id
 * Soft-delete a project.
 */
export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const docRef = db.collection('projects').doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== req.userId || docSnap.data()?.isDeleted) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    await docRef.update({ 
      isDeleted: true,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
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
 * POST /api/projects/:id/duplicate
 * Clone a project with a new name.
 */
export const duplicateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const docRef = db.collection('projects').doc(projectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== req.userId || docSnap.data()?.isDeleted) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    const existing = docSnap.data()!;

    const duplicateData = {
      userId: req.userId!,
      name: `${existing.name} (Copy)`,
      websiteUrl: existing.websiteUrl,
      appType: existing.appType,
      config: existing.config || {},
      iconUrl: existing.iconUrl || null,
      splashUrl: existing.splashUrl || null,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newDocRef = await db.collection('projects').add(duplicateData);

    res.status(201).json({
      success: true,
      data: {
        id: newDocRef.id,
        ...duplicateData,
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
