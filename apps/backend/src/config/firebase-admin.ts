import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { env } from './env';

const FALLBACK_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@apk-converter-b4731.iam.gserviceaccount.com";
const FALLBACK_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/0s+4g0saIyWJ\n5RlLKpX0v9N5by/TUAwNQLUmeWvuM85XJ1aXYQLMbO2ttvOsXWLdYAincvePbRv5\np0UBSDtNcJ0+0ZYzW2yi1Ul9sGOx14+xcih8sLi2nWkIqEq3Y3lPNU09adBwKde0\nYtdqVwp7zRcrxzdsLCAa/NbRaGANI4OAziJmbC9xamz9c6xqZRwOejU+NPel4+Ed\n8aU23y3QL0jWfRh5+Kb5jjavxoSiL+t9zCrswkw5UJ/MofiRTIr/SBu72VRyEama\naguQzmzOfzjbnKJh3Cow2hp92uAzIzzAm4WTm5Kx7Do+d+PzxjaqIZ6suzOnfQWU\nK7TieT9rAgMBAAECggEAJ0919yuc2/Xg7wHurYtEINyg421oQSdR2PNuTDys5Ctk\nuVKb+bjNQISALs3j4OpgZNqV228Bkbh7960SRKF/Wa7e4q1D2TF+sV4BSgs4Ww1A\nas5owqjaqb3XdQk8CpoNlbBoLFI/f4TrqhFpcOb2hIlymqugTYA7chxnj5GSwY4v\nE8YlYDjrFMEESG16hvP0e1XU0YeAK4ildyIORXU3V/5MBD8LbN+1F29nniCc96fY\nwEZ/0Hzdkr19S0MEZMGcThQ0K1NHv8SMjP2iBLHubWO5cWwIG/b1UpQj/NeF/fQO\nzthoEFBUsNQITXCtB7akqfNbEkr1MWCl1YY5ndJ/yQKBgQDsdMd+ogD/DS0nFE2l\nqphH9f9Bx7NL/ouOAOe+W9h+UEft7qYL0iXnM/TJ/dh4H3t2CfA96rJ4eDqVmeHM\nOYUYSVnSjImRWiWnWdqeyd0y20tZz4YQjC2uF0Vc1RG+nueLerRWfzs8r/f4bW9p\nGPnigZmuwUldT9kMnDYugKuucwKBgQDPraQDx85UW0ddf/lWp5VVV+Zsj4mFF6p/\nPnsgYbZHtT5XF7OGnCfDIij5AMzfCQNOiXqnxNWL9WhYULpT+afEc1c41HBTmDxJ\nvXReFZRs09WvH/W3n5W87Q4VHxkAFGFENRPa9XOinuOuVPSSN1YiHJROsrpTroO1\nJVyJtRG1KQKBgCoqnRTJARJ6oA2zAjHD3Uof5Tguy5uGtg5JvQnmSRIlcN5OS5Aa\nFqZHTqTivsKVIqgnF4+DFfaDwjbBbVHFBCYTlpAEfdfM0qAoVuMwLmEOWD6Y0liL\nFu5Pug/W80YiAjqOVDCEmeS1oKvNoCuGx7EL2YMfdtzMC3HDPapHSdZfAoGAIaTW\nskoXMfFLoWkPAqvJdHb1/FZQiAAqfcyoc7mApyNEgyVyzvbTNjh9fMFVbzhtkbaR\n6UXo9nB+Q/hoBxylwhyRX8KCo/hApA2OIYPLdMnojyNVUjcHMgERS/iquymSDFOw\n8MLcxdaJuf9HU7ylNod8uzcXGmFmMt1nnWN5B+kCgYEAps1eyl9dBoSBiSjRM0Y8\nysDY16NwwrB/D+LSaOkI6ka/yGEaaeb/ov+MLmkxILv9/r/rS0G/rUcfJHhxfRrJ\nbMRUxpgfYsMLZ/KzL8OCassYlvvBbr7NVUwBQ2wrctCTQWb/wJ1Ic/F6cBsecTyD\nR4ulXlucrdSBlKsOfRKHOIg=\n-----END PRIVATE KEY-----\n";

if (!getApps().length) {
  try {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'apk-converter-b4731',
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: env.FIREBASE_STORAGE_BUCKET || 'apk-converter-b4731.firebasestorage.app',
      });
    } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
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
