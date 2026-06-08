/**
 * Firebase Admin SDK — Server-Side Singleton
 *
 * This is the server-only equivalent of the client Firebase SDK.
 * It initializes using the service account credentials from env vars,
 * giving us admin-level access to verify ID tokens, set custom claims,
 * and read Firestore securely from API routes.
 *
 * NEVER import this file in client components — it will break.
 * All files in src/app/api/** are server-only by default in Next.js.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  // Initialize using environment variables set from the Firebase service account
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey && projectId) {
    // Full credentials available — use service account
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    // Fallback: use Application Default Credentials (works in Firebase App Hosting / Cloud Run)
    adminApp = initializeApp({ projectId });
  }

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}
