import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from './env';

if (!getApps().length) {
  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      initializeApp({
        credential: cert(env.FIREBASE_SERVICE_ACCOUNT_PATH),
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      initializeApp({
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error('⚠️ Firebase Admin SDK initialization failed:');
    console.error('⚠️ Please ensure firebase-adminsdk.json is placed in apps/backend or disable FIREBASE_SERVICE_ACCOUNT_PATH in .env');
    // Initialize with actual project ID so token audience verification passes if ADC exists
    initializeApp({ 
      projectId: env.FIREBASE_PROJECT_ID || 'apk-converter-b4731',
      storageBucket: env.FIREBASE_STORAGE_BUCKET
    });
  }
}

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
