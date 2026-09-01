import { db, storage } from '../config/firebase-admin';
import { generateAndroidProject } from './build.worker';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function runGitHubBuild() {
  const buildId = process.env.BUILD_ID;
  if (!buildId) {
    console.error('❌ Error: BUILD_ID environment variable is missing.');
    process.exit(1);
  }

  console.log(`🚀 Starting GitHub Actions compilation for Build ID: ${buildId}`);

  const buildRef = db.collection('builds').doc(buildId);
  const buildDoc = await buildRef.get();

  if (!buildDoc.exists) {
    console.error(`❌ Build document ${buildId} not found in Firestore.`);
    process.exit(1);
  }

  const buildData = buildDoc.data()!;
  const projectId = buildData.projectId;

  const projectDoc = await db.collection('projects').doc(projectId).get();
  if (!projectDoc.exists) {
    console.error(`❌ Project document ${projectId} not found in Firestore.`);
    process.exit(1);
  }

  const projectData = projectDoc.data()!;

  const jobData = {
    buildId,
    projectId,
    websiteUrl: projectData.websiteUrl,
    appType: projectData.appType || 'WEBSITE',
    buildType: buildData.buildType || 'APK',
    config: projectData.config || {},
    iconUrl: projectData.iconUrl,
    splashUrl: projectData.splashUrl,
  };

  const buildDir = path.resolve(process.cwd(), 'tmp', 'github-builds', buildId);
  await fs.mkdir(buildDir, { recursive: true });

  try {
    // 1. Update Status: PREPARING (10%)
    await buildRef.update({
      status: 'PREPARING',
      startedAt: new Date().toISOString(),
      progress: 10,
      updatedAt: new Date().toISOString(),
    });

    // 2. Update Status: GENERATING_PROJECT (25%)
    await buildRef.update({
      status: 'GENERATING_PROJECT',
      progress: 25,
      updatedAt: new Date().toISOString(),
    });

    console.log(`📦 Generating Android project structure in ${buildDir}...`);
    await generateAndroidProject(buildDir, jobData as any);

    // 3. Update Status: RUNNING_GRADLE (50%)
    await buildRef.update({
      status: 'RUNNING_GRADLE',
      progress: 50,
      updatedAt: new Date().toISOString(),
    });

    const gradleTask = jobData.buildType === 'AAB' ? 'bundleRelease' : 'assembleRelease';
    console.log(`🔨 Running Gradle task: gradle ${gradleTask}...`);

    // Ensure gradlew is executable if present, or run system gradle
    let buildCmd = `gradle ${gradleTask} --no-daemon --stacktrace`;
    try {
      await fs.chmod(path.join(buildDir, 'gradlew'), '755');
      buildCmd = `./gradlew ${gradleTask} --no-daemon --stacktrace`;
    } catch (_) {}

    const { stdout, stderr } = await execAsync(buildCmd, { cwd: buildDir });
    console.log('✅ Gradle Compilation Output:', stdout.substring(0, 2000));

    // 4. Update Status: SIGNING_APK (80%)
    await buildRef.update({
      status: 'SIGNING_APK',
      progress: 80,
      updatedAt: new Date().toISOString(),
    });

    // 5. Locate Output Artifact (.apk / .aab)
    const ext = jobData.buildType === 'AAB' ? 'aab' : 'apk';
    const outputDir = path.join(buildDir, 'app', 'build', 'outputs');

    async function findFileRecursive(dir: string, extension: string): Promise<string | null> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            const found = await findFileRecursive(res, extension);
            if (found) return found;
          } else if (entry.isFile() && entry.name.endsWith(extension)) {
            return res;
          }
        }
      } catch (_) {}
      return null;
    }

    const outputFile = await findFileRecursive(outputDir, `.${ext}`);
    if (!outputFile) {
      throw new Error(`Compiled artifact .${ext} not found in ${outputDir}`);
    }

    console.log(`🎉 Found compiled artifact: ${outputFile}`);

    // 6. Update Status: UPLOADING (90%)
    await buildRef.update({
      status: 'UPLOADING',
      progress: 90,
      updatedAt: new Date().toISOString(),
    });

    // 7. Upload to Firebase Storage
    const destination = `builds/${buildId}.${ext}`;
    console.log(`☁️ Uploading artifact to Firebase Storage: ${destination}...`);

    const bucket = storage.bucket();
    await bucket.upload(outputFile, {
      destination,
      metadata: {
        contentType: ext === 'aab' ? 'application/x-authorware-bin' : 'application/vnd.android.package-archive',
      },
    });

    const [downloadUrl] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8. Update Status: COMPLETED (100%)
    await buildRef.update({
      status: 'COMPLETED',
      progress: 100,
      downloadUrl,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Build ${buildId} completed successfully! Download URL: ${downloadUrl}`);
  } catch (error: any) {
    console.error(`❌ Build ${buildId} failed:`, error);
    await buildRef.update({
      status: 'FAILED',
      error: error.message || 'Build compilation failed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    process.exit(1);
  } finally {
    try {
      await fs.rm(buildDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runGitHubBuild();
