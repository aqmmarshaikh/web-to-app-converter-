import { Worker, Job } from 'bullmq';
import { db, storage } from '../config/firebase-admin';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const execAsync = promisify(exec);

// Map of active child processes running Gradle/Docker builds
export const activeChildProcesses = new Map<string, any>();

interface BuildJobData {
  buildId: string;
  projectId: string;
  websiteUrl: string;
  appType: string;
  buildType: string;
  config: Record<string, any>;
  iconUrl?: string;
  splashUrl?: string;
}

/**
 * Update build status in database and emit WebSocket event.
 */
async function updateBuildStatus(
  buildId: string,
  status: string,
  message: string,
  progress?: number
) {
  // Check if build is already marked as FAILED in DB (e.g. by 60s stale build check)
  const buildRef = db.collection('builds').doc(buildId);
  const buildDoc = await buildRef.get();
  if (buildDoc.exists && buildDoc.data()?.status === 'FAILED' && status !== 'FAILED') {
    logger.warn(`Build ${buildId} is already marked as FAILED in DB. Aborting worker update to ${status}.`);
    throw new Error('Build timed out and was automatically marked as failed.');
  }

  console.log(`[BUILD STAGE TRANSITION] Build ID: ${buildId} -> ${status.toLowerCase()}`);

  const updateData: any = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (progress !== undefined) {
    updateData.progress = progress;
  } else {
    if (status === 'QUEUED') updateData.progress = 0;
    else if (status === 'COMPLETED') updateData.progress = 100;
  }

  if (status === 'FAILED') {
    updateData.error = message;
  }

  if (status === 'PREPARING') {
    updateData.startedAt = new Date().toISOString();
  } else if (status === 'COMPLETED' || status === 'FAILED') {
    updateData.completedAt = new Date().toISOString();
    updateData.expiresAt = new Date(Date.now() + env.BUILD_CLEANUP_HOURS * 60 * 60 * 1000).toISOString();
  }

  await buildRef.update(updateData);

  await buildRef.collection('logs').add({
    level: status === 'FAILED' ? 'ERROR' : 'INFO',
    message,
    timestamp: new Date().toISOString(),
  });

  logger.info(`Build ${buildId}: ${status} - ${message}`);
}

/**
 * Generate an Android project from templates based on configuration.
 */
async function generateAndroidProject(
  buildDir: string,
  data: BuildJobData
): Promise<void> {
  const config = data.config;
  const packageName = config.packageName || 'com.appforge.app';
  const appName = config.appName || 'My App';
  const packagePath = packageName.replace(/\./g, '/');

  // Create project structure
  const dirs = [
    `${buildDir}/app/src/main/java/${packagePath}`,
    `${buildDir}/app/src/main/res/layout`,
    `${buildDir}/app/src/main/res/values`,
    `${buildDir}/app/src/main/res/drawable`,
    `${buildDir}/app/src/main/res/mipmap-hdpi`,
    `${buildDir}/app/src/main/res/mipmap-mdpi`,
    `${buildDir}/app/src/main/res/mipmap-xhdpi`,
    `${buildDir}/app/src/main/res/mipmap-xxhdpi`,
    `${buildDir}/app/src/main/res/mipmap-xxxhdpi`,
    `${buildDir}/gradle/wrapper`,
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Generate settings.gradle.kts
  await fs.writeFile(
    `${buildDir}/settings.gradle.kts`,
    `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${appName.replace(/"/g, '\\"')}"
include(":app")
`
  );

  // Generate root build.gradle.kts
  await fs.writeFile(
    `${buildDir}/build.gradle.kts`,
    `plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
}
`
  );

  // Generate app/build.gradle.kts
  const minSdk = data.appType === 'TWA' ? 19 : 21;
  await fs.writeFile(
    `${buildDir}/app/build.gradle.kts`,
    `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = ${minSdk}
        targetSdk = 34
        versionCode = ${config.versionCode || 1}
        versionName = "${config.versionName || '1.0.0'}"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.9.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    ${config.pushNotifications ? 'implementation("com.google.firebase:firebase-messaging-ktx:23.4.0")' : ''}
}
`
  );

  // Generate proguard rules
  await fs.writeFile(
    `${buildDir}/app/proguard-rules.pro`,
    `-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class ${packageName}.** { *; }
`
  );

  // Generate gradle.properties
  await fs.writeFile(
    `${buildDir}/gradle.properties`,
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8 -Dhttps.protocols=TLSv1.2,TLSv1.3 -Djava.net.preferIPv4Stack=true
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`
  );

  // Generate gradle-wrapper.properties (matches Docker builder Gradle 8.5)
  await fs.writeFile(
    `${buildDir}/gradle/wrapper/gradle-wrapper.properties`,
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  );

  // Generate AndroidManifest.xml
  const permissions = config.permissions || [];
  const permissionLines = permissions
    .map((p: string) => {
      const permMap: Record<string, string> = {
        CAMERA: 'android.permission.CAMERA',
        LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
        MICROPHONE: 'android.permission.RECORD_AUDIO',
        NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
        STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
        CONTACTS: 'android.permission.READ_CONTACTS',
      };
      return permMap[p] ? `    <uses-permission android:name="${permMap[p]}" />` : '';
    })
    .filter(Boolean)
    .join('\n');

  const orientationAttr =
    config.orientationLock === 'PORTRAIT'
      ? 'android:screenOrientation="portrait"'
      : config.orientationLock === 'LANDSCAPE'
      ? 'android:screenOrientation="landscape"'
      : '';

  await fs.writeFile(
    `${buildDir}/app/src/main/AndroidManifest.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
${permissionLines}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="${appName.replace(/"/g, '\\"')}"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        ${
          config.splashScreen
            ? `<activity
            android:name=".SplashActivity"
            android:exported="true"
            android:theme="@style/SplashTheme"
            ${orientationAttr}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".MainActivity"
            android:exported="false"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|keyboardHidden" />`
            : `<activity
            android:name=".MainActivity"
            android:exported="true"
            ${orientationAttr}
            android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>`
        }
    </application>
</manifest>
`
  );

  // Generate MainActivity.kt
  await fs.writeFile(
    `${buildDir}/app/src/main/java/${packagePath}/MainActivity.kt`,
    `package ${packageName}

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    ${config.pullToRefresh ? 'private lateinit var swipeRefresh: SwipeRefreshLayout' : ''}
    ${config.fileUploadSupport ? 'private var filePathCallback: ValueCallback<Array<Uri>>? = null' : ''}

    private val websiteUrl = "${data.websiteUrl}"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        ${config.pullToRefresh ? `swipeRefresh = findViewById(R.id.swipeRefresh)
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }` : ''}

        setupWebView()
        webView.loadUrl(websiteUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode = ${config.offlineMode ? 'WebSettings.LOAD_CACHE_ELSE_NETWORK' : 'WebSettings.LOAD_DEFAULT'}
            mediaPlaybackRequiresUserGesture = false
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return if (url.startsWith("http://") || url.startsWith("https://")) {
                    false
                } else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (_: Exception) { }
                    true
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                ${config.pullToRefresh ? 'swipeRefresh.isRefreshing = false' : ''}
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                } else {
                    progressBar.visibility = View.VISIBLE
                }
            }

            ${config.fileUploadSupport ? `
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                if (intent != null) {
                    try {
                        startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                    } catch (e: Exception) {
                        this@MainActivity.filePathCallback = null
                        return false
                    }
                    return true
                }
                return false
            }` : ''}
        }

        ${config.downloadSupport ? `
        webView.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
            val request = android.app.DownloadManager.Request(Uri.parse(url))
            request.setMimeType(mimeType)
            request.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            request.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName)
            val dm = getSystemService(DOWNLOAD_SERVICE) as android.app.DownloadManager
            dm.enqueue(request)
            android.widget.Toast.makeText(this, "Downloading $fileName", android.widget.Toast.LENGTH_SHORT).show()
        }` : ''}
    }

    ${config.backButtonHandling ? `
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }` : ''}

    ${config.fileUploadSupport ? `
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback == null) return
            val results = if (resultCode == Activity.RESULT_OK) {
                if (data != null) {
                    val dataString = data.dataString
                    val clipData = data.clipData
                    if (clipData != null) {
                        val count = clipData.itemCount
                        val uris = Array(count) { i -> clipData.getItemAt(i).uri }
                        uris
                    } else if (dataString != null) {
                        arrayOf(Uri.parse(dataString))
                    } else {
                        null
                    }
                } else {
                    null
                }
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }` : ''}

    companion object {
        private const val FILE_CHOOSER_REQUEST = 1001
    }
}
`
  );

  // Generate SplashActivity.kt (if enabled)
  if (config.splashScreen) {
    await fs.writeFile(
      `${buildDir}/app/src/main/java/${packagePath}/SplashActivity.kt`,
      `package ${packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        }, 1500)
    }
}
`
    );
  }

  // Generate layout XML
  await fs.writeFile(
    `${buildDir}/app/src/main/res/layout/activity_main.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
${config.pullToRefresh ? `<androidx.swiperefreshlayout.widget.SwipeRefreshLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/swipeRefresh"
    android:layout_width="match_parent"
    android:layout_height="match_parent">` : ''}
<FrameLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="4dp"
        android:layout_gravity="top"
        android:indeterminate="false"
        android:max="100" />

</FrameLayout>
${config.pullToRefresh ? '</androidx.swiperefreshlayout.widget.SwipeRefreshLayout>' : ''}
`
  );

  // Generate values/styles.xml
  const themeColor = config.themeColor || '#000000';
  await fs.writeFile(
    `${buildDir}/app/src/main/res/values/styles.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">${themeColor}</item>
        <item name="colorPrimaryDark">${themeColor}</item>
        <item name="colorAccent">${themeColor}</item>
        <item name="android:windowBackground">@android:color/white</item>
    </style>

    <style name="SplashTheme" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_background</item>
    </style>
</resources>
`
  );

  // Generate values/strings.xml
  await fs.writeFile(
    `${buildDir}/app/src/main/res/values/strings.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
</resources>
`
  );

  // Generate splash background drawable
  await fs.writeFile(
    `${buildDir}/app/src/main/res/drawable/splash_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/white" />
</layer-list>
`
  );

  // =====================================================
  // App Icon Generation — resize user icon or generate default
  // =====================================================
  const mipmapSizes: Record<string, number> = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
  };

  // Adaptive icon foreground must be 108dp; at xxxhdpi that's 432px
  const adaptiveForegroundSizes: Record<string, number> = {
    'mdpi': 108,
    'hdpi': 162,
    'xhdpi': 216,
    'xxhdpi': 324,
    'xxxhdpi': 432,
  };

  let iconBuffer: Buffer | null = null;
  let customIconRequested = false;

  // Try to load user-provided icon
  if (config.iconPath) {
    customIconRequested = true;
    try {
      iconBuffer = await fs.readFile(config.iconPath);
      logger.info(`Loaded icon from path: ${config.iconPath}`);
    } catch (err: any) {
      throw new Error(`Uploaded App Icon could not be processed. Failed to read file: ${err.message}`);
    }
  } else if (config.iconUrl) {
    customIconRequested = true;
    try {
      const resp = await fetch(config.iconUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content-type: ${contentType}`);
      }
      iconBuffer = Buffer.from(await resp.arrayBuffer());
      logger.info(`Downloaded icon from URL: ${config.iconUrl}`);
    } catch (err: any) {
      throw new Error(`Uploaded App Icon could not be processed. Failed to download URL: ${err.message}`);
    }
  }

  // Validate the loaded icon with sharp
  if (iconBuffer && customIconRequested) {
    try {
      const meta = await sharp(iconBuffer).metadata();
      if (!meta.width || !meta.height || meta.width < 48 || meta.height < 48) {
        throw new Error(`Uploaded App Icon could not be processed. Dimensions too small (${meta.width}x${meta.height}).`);
      }
    } catch (err: any) {
      if (err.message.includes('Uploaded App Icon')) throw err;
      throw new Error(`Uploaded App Icon could not be processed. Image is corrupted or unreadable. Error: ${err.message}`);
    }
  }

  // Generate default icon if none provided or loading failed
  if (!iconBuffer) {
    if (customIconRequested) {
      throw new Error('Uploaded App Icon could not be processed. Icon was requested but buffer is empty.');
    }
    const letter = (appName.charAt(0) || 'A').toUpperCase();
    const bgColor = themeColor || '#4A90D9';
    // Create a 1024x1024 Material-style icon: colored circle with white letter
    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="220" fill="${bgColor}"/>
  <text x="512" y="512" text-anchor="middle" dominant-baseline="central"
        font-family="sans-serif" font-weight="bold" font-size="540" fill="white">${letter}</text>
</svg>`;
    iconBuffer = await sharp(Buffer.from(svgIcon)).png().toBuffer();
    logger.info(`Generated default icon with letter "${letter}" and color ${bgColor}`);
  }

  // Resize and write to all mipmap density buckets
  for (const [density, size] of Object.entries(mipmapSizes)) {
    const resized = await sharp(iconBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await fs.writeFile(
      `${buildDir}/app/src/main/res/mipmap-${density}/ic_launcher.png`,
      resized
    );

    // Round icon: clip to circle
    const roundMask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );
    const roundIcon = await sharp(resized)
      .composite([{ input: roundMask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    await fs.writeFile(
      `${buildDir}/app/src/main/res/mipmap-${density}/ic_launcher_round.png`,
      roundIcon
    );
  }

  // Generate adaptive icon foreground PNGs (icon centered in 108dp canvas with padding)
  await fs.mkdir(`${buildDir}/app/src/main/res/mipmap-anydpi-v26`, { recursive: true });

  for (const [density, fgSize] of Object.entries(adaptiveForegroundSizes)) {
    // The icon safe zone is ~66% of the full 108dp canvas
    const iconSize = Math.round(fgSize * 0.66);
    const padding = Math.round((fgSize - iconSize) / 2);

    const foreground = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: padding,
        bottom: fgSize - iconSize - padding,
        left: padding,
        right: fgSize - iconSize - padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await fs.writeFile(
      `${buildDir}/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`,
      foreground
    );
  }

  // Generate adaptive icon XML referencing the PNG foreground
  const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/white" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  await fs.writeFile(
    `${buildDir}/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`,
    adaptiveIconXml
  );
  await fs.writeFile(
    `${buildDir}/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`,
    adaptiveIconXml
  );
}

/**
 * Main build worker process.
 * Picks up queued build jobs and executes the full pipeline.
 */
const worker = new Worker<BuildJobData>(
  'android-builds',
  async (job: Job<BuildJobData>) => {
    const { buildId, projectId } = job.data;
    const buildDir = path.resolve(`tmp/builds/${buildId}`);

    try {
      // Stage 1: Preparing (10%)
      await updateBuildStatus(buildId, 'PREPARING', 'Validating build configuration...', 10);
      await job.updateProgress(10);

      // Validate project properties before running
      const config = job.data.config || {};
      if (!job.data.websiteUrl || !job.data.websiteUrl.startsWith('http')) {
        throw new Error('Invalid website URL. URL must start with http:// or https://');
      }
      if (!config.appName || config.appName.trim().length === 0) {
        throw new Error('App Name is required');
      }
      if (!config.packageName || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(config.packageName)) {
        throw new Error(`Invalid package name: "${config.packageName || ''}". Must be in format com.example.app`);
      }
      if (!['APK', 'AAB', 'SIGNED_APK'].includes(job.data.buildType)) {
        throw new Error(`Invalid output type: "${job.data.buildType}". Must be APK, AAB, or SIGNED_APK`);
      }

      // Validate URL accessibility
      try {
        const response = await fetch(job.data.websiteUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Website returned HTTP ${response.status}`);
        }
      } catch (error: any) {
        throw new Error(`Website is not accessible: ${error.message}`);
      }

      // Stage 2: Generating Project (25%)
      await updateBuildStatus(buildId, 'GENERATING_PROJECT', 'Generating Android project structure...', 25);
      await job.updateProgress(25);

      await generateAndroidProject(buildDir, job.data);
      await job.updateProgress(40);

      // Stage 3: Running Gradle (50%)
      await updateBuildStatus(buildId, 'RUNNING_GRADLE', 'Compiling Android application using Gradle...', 50);
      await job.updateProgress(50);

      // Execute Gradle build via Docker
      const gradleTask =
        job.data.buildType === 'AAB' ? 'bundleRelease' : 'assembleRelease';

      const helperRunCmd = (cmd: string): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
          exec(cmd, (error, stdout, stderr) => {
            if (error) {
              const err = error as any;
              err.stdout = stdout;
              err.stderr = stderr;
              reject(err);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
      };

      // 1. Create the container (running as root user)
      const createCmd = [
        'docker',
        'create',
        `--name appforge-build-${buildId}`,
        '--user root',
        '--network=host',
        '-v appforge-gradle-cache-v2:/root/.gradle',
        '-e GRADLE_USER_HOME=/root/.gradle',
        '--memory=4g',
        '--cpus=6',
        '-w /workspace',
        env.DOCKER_BUILDER_IMAGE,
        `gradle ${gradleTask} --no-daemon --stacktrace --build-cache --parallel --configure-on-demand`,
      ].join(' ');

      logger.info(`Creating container: ${createCmd}`);
      await helperRunCmd(createCmd);

      // 2. Copy files in
      const copyInCmd = `docker cp "${buildDir}/." appforge-build-${buildId}:/workspace/`;
      logger.info(`Copying files into container: ${copyInCmd}`);
      await helperRunCmd(copyInCmd);

      // 3. Start container and stream output
      const startCmd = `docker start -a appforge-build-${buildId}`;
      logger.info(`Starting compilation inside container: ${startCmd}`);

      let stdout = '';
      let stderr = '';

      const buildPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = exec(startCmd);
        activeChildProcesses.set(buildId, child);

        if (child.stdout) {
          child.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdout += chunk;
            process.stdout.write(chunk);
          });
        }

        if (child.stderr) {
          child.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderr += chunk;
            process.stderr.write(chunk);
          });
        }

        child.on('close', async (code) => {
          activeChildProcesses.delete(buildId);
          if (code !== 0) {
            const err = new Error(`Docker run failed with exit code ${code}`) as any;
            err.code = code;
            err.stdout = stdout;
            err.stderr = stderr;
            reject(err);
          } else {
            // Copy files back on success
            try {
              // Ensure the full host output directory exists
              const hostOutputDir = path.join(buildDir, 'app', 'build', 'outputs');
              await fs.mkdir(hostOutputDir, { recursive: true });

              // Use docker cp without trailing dot for Windows compatibility
              const copyOutCmd = `docker cp appforge-build-${buildId}:/workspace/app/build/outputs "${buildDir}/app/build/"`;
              logger.info(`Copying compiled outputs back to host: ${copyOutCmd}`);
              await helperRunCmd(copyOutCmd);

              // Verify the copy by listing the output directory
              try {
                const listing = await listDirRecursive(hostOutputDir);
                logger.info(`Output directory listing after docker cp:\n${listing.join('\n')}`);
              } catch (listErr: any) {
                logger.warn(`Could not list output directory: ${listErr.message}`);
              }

              resolve({ stdout, stderr });
            } catch (copyErr: any) {
              reject(new Error(`Failed to copy outputs from container: ${copyErr.message || copyErr}`));
            }
          }
        });

        child.on('error', (err: any) => {
          activeChildProcesses.delete(buildId);
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
        });
      });
 
      try {
        const result = await buildPromise;
        stdout = result.stdout;
        stderr = result.stderr;
 
        // Log build output
        await db.collection('builds').doc(buildId).collection('logs').add({
          level: 'INFO',
          message: stdout.substring(0, 10000),
          timestamp: new Date().toISOString()
        });
 
        if (stderr) {
          await db.collection('builds').doc(buildId).collection('logs').add({
            level: 'WARN',
            message: stderr.substring(0, 5000),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error: any) {
        const errStdout = error.stdout || stdout || '';
        const errStderr = error.stderr || stderr || '';
        const exitCode = error.code !== undefined ? error.code : 'unknown';
        const errMessage = error.message || '';
        const errStack = error.stack || '';
 
        console.error("Docker build error stdout:", errStdout);
        console.error("Docker build error stderr:", errStderr);
        console.error("Docker build error message:", errMessage);
        console.error("Docker build error stack:", errStack);
 
        // Fetch docker logs of the container if it exists or was running
        let dockerLogs = '';
        try {
          const { execSync } = require('child_process');
          dockerLogs = execSync(`docker logs appforge-build-${buildId}`, { encoding: 'utf8' });
        } catch (_) {}
 
        // Combine all logs into a single report
        const logReport = `--- BUILD ERROR DIAGNOSTICS ---
Exit Code: ${exitCode}
Message: ${errMessage}
Stack Trace: ${errStack}
 
--- DOCKER CONTAINER LOGS ---
${dockerLogs}
 
--- STDOUT ---
${errStdout}
 
--- STDERR ---
${errStderr}
`;
 
        // Save to build_logs.txt in the build workspace
        const logFilePath = path.join(buildDir, 'build_logs.txt');
        try {
          await fs.writeFile(logFilePath, logReport);
          logger.info(`Diagnostics written to: ${logFilePath}`);
        } catch (writeErr: any) {
          logger.warn(`Failed to write build_logs.txt: ${writeErr.message}`);
        }
 
        // Upload build_logs.txt to Firebase Storage or local fallback
        const logsDestination = `builds/${buildId}_logs.txt`;
        let logsUrl = '';
        try {
          const bucket = storage.bucket();
          await bucket.upload(logFilePath, {
            destination: logsDestination,
            metadata: {
              contentType: 'text/plain',
            }
          });
          const [signedUrl] = await bucket.file(logsDestination).getSignedUrl({
            action: 'read',
            expires: Date.now() + env.BUILD_CLEANUP_HOURS * 60 * 60 * 1000,
          });
          logsUrl = signedUrl;
        } catch (storageErr: any) {
          logger.warn(`⚠️ Firebase Storage upload failed for logs. Falling back to local serving: ${storageErr.message || storageErr}`);
          
          const localDownloadDir = path.resolve(env.DOWNLOAD_DIR || 'tmp/downloads');
          await fs.mkdir(localDownloadDir, { recursive: true });
          const localFilePath = path.join(localDownloadDir, `${buildId}_logs.txt`);
          try {
            await fs.copyFile(logFilePath, localFilePath);
            logsUrl = `${env.API_URL}/downloads/${buildId}_logs.txt`;
          } catch (_) {}
        }
 
        const parsedReason = parseErrorReason(errStdout, errStderr, errMessage);
 
        // Update database with detailed error reason and log URL
        await db.collection('builds').doc(buildId).update({
          error: parsedReason,
          logsUrl: logsUrl || null,
        });
 
        await db.collection('builds').doc(buildId).collection('logs').add({
          level: 'ERROR',
          message: logReport.substring(0, 10000),
          timestamp: new Date().toISOString()
        });
 
        throw new Error(parsedReason);
      }

      await job.updateProgress(75);

      // Stage 4: Signing APK (80%)
      await updateBuildStatus(buildId, 'SIGNING_APK', 'Signing compiled application...', 80);
      await job.updateProgress(80);

      // Find output file - search recursively since Gradle output structure can vary
      const outputDir = path.join(buildDir, 'app', 'build', 'outputs');
      const ext = job.data.buildType === 'AAB' ? 'aab' : 'apk';
      
      // First try the standard path
      let outputFile = path.join(outputDir, ext, 'release', `app-release.${ext}`);
      
      // If standard path doesn't exist, search recursively
      try {
        await fs.access(outputFile);
        logger.info(`Found output file at standard path: ${outputFile}`);
      } catch {
        logger.warn(`Output file not found at standard path: ${outputFile}. Searching recursively...`);
        
        // List and log the actual output directory contents for debugging
        try {
          const listing = await listDirRecursive(outputDir);
          logger.info(`Full output directory listing:\n${listing.join('\n')}`);
        } catch (listErr: any) {
          logger.warn(`Could not list output directory: ${listErr.message}`);
        }
        
        // Search recursively for any file matching the extension
        const foundFile = await findFileRecursive(outputDir, `.${ext}`);
        if (foundFile) {
          outputFile = foundFile;
          logger.info(`Found output file via recursive search: ${outputFile}`);
        } else {
          throw new Error(
            `Build output file not found. Expected at: ${outputFile}. ` +
            `The Gradle build may have succeeded but produced output in an unexpected location. ` +
            `Check the build logs for the actual output path.`
          );
        }
      }

      // Stage 5: Uploading (90%)
      await updateBuildStatus(buildId, 'UPLOADING', 'Uploading artifact...', 90);
      await job.updateProgress(90);

      // Upload to Firebase Storage with a local fallback
      const destination = `builds/${buildId}.${ext}`;
      let url = '';
      try {
        logger.info(`Uploading build to Firebase Storage: ${destination}...`);
        const bucket = storage.bucket();
        await bucket.upload(outputFile, {
          destination,
          metadata: {
            contentType: ext === 'aab' ? 'application/x-authorware-bin' : 'application/vnd.android.package-archive',
          }
        });
        
        // Get signed URL that expires far in the future
        const [signedUrl] = await bucket.file(destination).getSignedUrl({
          action: 'read',
          expires: Date.now() + env.BUILD_CLEANUP_HOURS * 60 * 60 * 1000,
        });
        url = signedUrl;
        logger.info(`Uploaded build to Firebase Storage successfully: ${url}`);
      } catch (storageErr: any) {
        logger.warn(`⚠️ Firebase Storage upload failed. Falling back to local serving: ${storageErr.message || storageErr}`);
        
        // Ensure local downloads directory exists
        const localDownloadDir = path.resolve(env.DOWNLOAD_DIR || 'tmp/downloads');
        await fs.mkdir(localDownloadDir, { recursive: true });
        
        const localFilePath = path.join(localDownloadDir, `${buildId}.${ext}`);
        await fs.copyFile(outputFile, localFilePath);
        
        url = `${env.API_URL}/downloads/${buildId}.${ext}`;
        logger.info(`Local build file copied to: ${localFilePath}. Download URL: ${url}`);
      }

      await job.updateProgress(95);

      // Check if build is already marked as FAILED in DB (e.g. by 60s stale build check)
      const finalDoc = await db.collection('builds').doc(buildId).get();
      if (finalDoc.exists && finalDoc.data()?.status === 'FAILED') {
        throw new Error('Build timed out and was automatically marked as failed.');
      }

      // Stage 6: Complete (100%)
      await updateBuildStatus(buildId, 'COMPLETED', 'Build completed successfully!', 100);
      await db.collection('builds').doc(buildId).update({
          downloadUrl: url,
          expiresAt: new Date(Date.now() + env.BUILD_CLEANUP_HOURS * 60 * 60 * 1000).toISOString(),
      });

      await job.updateProgress(100);
      logger.info(`Build ${buildId} completed successfully`);

      return { success: true, buildId };
    } catch (error: any) {
      logger.error(`Build ${buildId} failed:`, error);

      await updateBuildStatus(
        buildId,
        'FAILED',
        error.message || 'Build failed due to an unknown error'
      );

      throw error;
    } finally {
      // Clean up build container
      try {
        const { execSync } = require('child_process');
        execSync(`docker rm -f appforge-build-${buildId}`, { stdio: 'ignore' });
        logger.info(`Cleaned up build container appforge-build-${buildId}`);
      } catch (e) {
        // ignore error if container doesn't exist
      }

      // Clean up build directory
      try {
        await fs.rm(buildDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn(`Failed to clean up build dir: ${buildDir}`);
      }

      // Clean up temp icon file if it was uploaded
      const iconPath = job.data.config?.iconPath;
      if (iconPath && iconPath.includes('tmp/icons/')) {
        try {
          await fs.unlink(iconPath);
          logger.info(`Cleaned up temp icon: ${iconPath}`);
        } catch (e) {
          // ignore if already deleted
        }
      }
    }
  },
  {
    connection: redis,
    concurrency: env.MAX_CONCURRENT_BUILDS,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Worker Heartbeat setup to support health checking
setInterval(async () => {
  try {
    await redis.set('worker:heartbeat', Date.now().toString(), 'EX', 15);
  } catch (err: any) {
    logger.error('Failed to update worker heartbeat in Redis:', err.message || err);
  }
}, 5000);

logger.info('🔨 Build worker started, waiting for jobs...');

export default worker;

/**
 * Recursively list all files in a directory.
 */
async function listDirRecursive(dir: string, prefix = ''): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        results.push(`${relativePath}/`);
        const subResults = await listDirRecursive(path.join(dir, entry.name), relativePath);
        results.push(...subResults);
      } else {
        const stat = await fs.stat(path.join(dir, entry.name));
        results.push(`${relativePath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
  } catch (err: any) {
    results.push(`[Error reading ${dir}: ${err.message}]`);
  }
  return results;
}

/**
 * Recursively search for a file ending with the given suffix.
 */
async function findFileRecursive(dir: string, suffix: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findFileRecursive(fullPath, suffix);
        if (found) return found;
      } else if (entry.name.endsWith(suffix)) {
        return fullPath;
      }
    }
  } catch {
    // directory doesn't exist or can't be read
  }
  return null;
}

/**
 * Utility to extract a user-friendly failure reason from raw process execution output.
 */
function parseErrorReason(stdout: string, stderr: string, message: string): string {
  const combined = `${stdout}\n${stderr}\n${message}`;
  
  if (combined.includes("libnative-platform.so")) {
    return "Gradle native library failure: Cannot load libnative-platform.so inside Linux builder. Permissions or mount issue.";
  }
  if (combined.includes("SSL peer shut down incorrectly") || combined.includes("SSLHandshakeException")) {
    return "Network connection issue: Maven Central handshake failed. The build timed out or failed while downloading Gradle/library dependencies.";
  }
  if (combined.includes("Type mismatch")) {
    const lines = combined.split('\n');
    const mismatchLine = lines.find(l => l.includes("Type mismatch"));
    return mismatchLine ? `Compilation Error: ${mismatchLine.trim()}` : "Kotlin Type Mismatch Error";
  }
  if (combined.includes("Execution failed for task")) {
    const lines = combined.split('\n');
    const taskFailedLine = lines.find(l => l.includes("Execution failed for task"));
    return taskFailedLine ? `Gradle Task Failure: ${taskFailedLine.trim()}` : "Gradle Task Execution Failure";
  }
  
  const lines = combined.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    return `Gradle Build Failure:\n${lines.slice(-3).join('\n')}`;
  }
  
  return "Gradle compilation failed (check container logs for details).";
}
