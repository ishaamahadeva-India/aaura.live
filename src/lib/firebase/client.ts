'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

type FirebaseClientResources = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
};

// Default Firebase configuration (fallback if env vars are not available)
// These are public values and safe to include in client-side code
const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: "AIzaSyCGWOFpBL1devnWqA9SSbBkHBM-Ent8OYM",
  authDomain: "studio-9632556640-bd58d.firebaseapp.com",
  projectId: "studio-9632556640-bd58d",
  // CRITICAL FIX: Use Gen 2 bucket (.firebasestorage.app) - this is the actual bucket
  // The bucket is: studio-9632556640-bd58d.firebasestorage.app (Gen 2)
  // This is the correct bucket for this Firebase project
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-9632556640-bd58d.firebasestorage.app",
  messagingSenderId: "435313355929",
  appId: "1:435313355929:web:c3266137390bee318f5c08",
};

let cachedConfig: FirebaseClientConfig | null = null;
let cachedResources: FirebaseClientResources | null = null;

function resolveFirebaseConfig(): FirebaseClientConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Always use the default config - this ensures it works in all environments
  // The default config contains the Firebase configuration values that are safe to include in client-side code
  // Environment variables are preferred when available, but since Next.js replaces them at build time
  // and they might not be available in all environments, we use the hardcoded default as a reliable fallback
  cachedConfig = DEFAULT_FIREBASE_CONFIG;
  return cachedConfig;
}

function initializeResources(): FirebaseClientResources {
  if (cachedResources) {
    return cachedResources;
  }

  const config = resolveFirebaseConfig();
  const app = getApps().length ? getApp() : initializeApp(config);

  const canUsePersistentCache =
    typeof indexedDB !== "undefined" && typeof caches !== "undefined";

  let db: Firestore;

  if (canUsePersistentCache) {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          synchronizeTabs: true, // Enable multi-tab synchronization to fix persistence errors
        }),
      });
    } catch (error) {
      // If persistence fails, fall back to memory cache
      console.warn('Firestore persistence initialization failed, using memory cache:', error);
      db = getFirestore(app);
    }
  } else {
    db = getFirestore(app);
  }

  const auth = getAuth(app);
  // 🔥 CRITICAL FIX: Use Gen 2 bucket (.firebasestorage.app) - this is the actual bucket
  // The bucket is: studio-9632556640-bd58d.firebasestorage.app (Gen 2)
  // MUST use explicit gs:// URL to prevent SDK from using cached/default bucket
  const storageBucket = "gs://studio-9632556640-bd58d.firebasestorage.app";
  const storage = getStorage(app, storageBucket);
  
  // 🔍 HARD PROOF LOG - MUST print .firebasestorage.app
  if (typeof window !== 'undefined') {
    console.log('🔥 STORAGE BUCKET IN USE:', storage.app.options.storageBucket);
    if (!storage.app.options.storageBucket?.includes('firebasestorage.app')) {
      console.error('🚨 CRITICAL: Storage bucket is NOT .firebasestorage.app!', storage.app.options.storageBucket);
    }
  }

  cachedResources = { app, db, auth, storage };
  return cachedResources;
}

export function getFirebaseClient(): FirebaseClientResources {
  return initializeResources();
}

// 🔥 EXPORT STORAGE INSTANCE - This is the ONLY storage instance allowed
// All uploads MUST use this instance to ensure correct bucket (.appspot.com)
export function getFirebaseStorage(): FirebaseStorage {
  const resources = initializeResources();
  return resources.storage;
}
