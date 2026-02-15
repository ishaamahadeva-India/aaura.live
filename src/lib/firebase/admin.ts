
import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Ensure this is only run on the server
let adminApp: App;
let db: Firestore;
let auth: Auth;
let storage: Storage;

/**
 * Initializes (or reuses) the Firebase Admin SDK app instance.
 * It will try to use environment variables first.
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey) {
            const serviceAccount = JSON.parse(serviceAccountKey);
            adminApp = initializeApp({
              credential: cert(serviceAccount),
            });
        } else {
            console.warn(
                "Firebase Admin SDK not initialized. The `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable is not set. Server-side features may not work."
            );
            // Create a dummy app to avoid crashing if it's used where not expected
             adminApp = initializeApp();
        }
    } catch (error: any) {
      console.error('🔥 Firebase Admin SDK initialization failed:', error.message);
      // Fallback to default initialization for environments without service account keys
      // This allows local dev server to run, though server-side auth will be limited.
      if (!getApps().length) {
        adminApp = initializeApp();
      } else {
        adminApp = getApps()[0];
      }
    }
  }

  db = getFirestore(adminApp);
  auth = getAuth(adminApp);
  storage = getStorage(adminApp);
}

// Initialize on module load
initializeFirebaseAdmin();

export { adminApp, db, auth, storage };
