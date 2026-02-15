/**
 * Migration utility to fix existing Firebase Storage URLs in Firestore
 * 
 * This script updates all mediaUrl and videoUrl fields that use
 * firebasestorage.app domain to use firebasestorage.googleapis.com
 * 
 * Run this as a one-time migration or as a Cloud Function
 */

import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { isProblematicStorageUrl, convertToGoogleapisUrl } from './storage-urls';

/**
 * Migrates a single document's mediaUrl/videoUrl field
 */
export async function migrateDocumentUrl(
  docRef: any,
  fieldName: 'mediaUrl' | 'videoUrl',
  data: any
): Promise<boolean> {
  const url = data[fieldName];
  
  if (!url || typeof url !== 'string') {
    return false; // No URL to migrate
  }

  // Check if URL needs fixing
  if (!isProblematicStorageUrl(url)) {
    return false; // Already correct
  }

  try {
    // Try to get a fresh URL from storage
    // Extract path from the URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1]);
      const { getFirebaseStorage } = await import('./client');
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, decodedPath);
      
      try {
        // Get fresh URL from Firebase
        const freshUrl = await getDownloadURL(storageRef);
        await updateDoc(docRef, { [fieldName]: freshUrl });
        console.log(`✅ Migrated ${fieldName} for document ${docRef.id}`);
        return true;
      } catch (error) {
        // If we can't get fresh URL, try to convert the existing one
        console.warn(`⚠️ Could not get fresh URL for ${docRef.id}, converting existing URL`);
        const convertedUrl = convertToGoogleapisUrl(url);
        if (convertedUrl !== url) {
          await updateDoc(docRef, { [fieldName]: convertedUrl });
          console.log(`✅ Converted ${fieldName} for document ${docRef.id}`);
          return true;
        }
      }
    } else {
      // Try direct conversion
      const convertedUrl = convertToGoogleapisUrl(url);
      if (convertedUrl !== url) {
        await updateDoc(docRef, { [fieldName]: convertedUrl });
        console.log(`✅ Converted ${fieldName} for document ${docRef.id}`);
        return true;
      }
    }
  } catch (error) {
    console.error(`❌ Error migrating ${fieldName} for document ${docRef.id}:`, error);
  }

  return false;
}

/**
 * Migrates all media documents
 */
export async function migrateMediaUrls(db: any, batchSize: number = 100): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;

  try {
    const mediaCollection = collection(db, 'media');
    const snapshot = await getDocs(mediaCollection);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const docRef = doc(db, 'media', docSnap.id);

      if (data.mediaUrl) {
        const success = await migrateDocumentUrl(docRef, 'mediaUrl', data);
        if (success) migrated++;
        else if (isProblematicStorageUrl(data.mediaUrl)) failed++;
      }
    }

    console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
  } catch (error) {
    console.error('Error during media migration:', error);
  }

  return { migrated, failed };
}

/**
 * Migrates all post documents
 */
export async function migratePostUrls(db: any, batchSize: number = 100): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;

  try {
    const postsCollection = collection(db, 'posts');
    const snapshot = await getDocs(postsCollection);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const docRef = doc(db, 'posts', docSnap.id);

      if (data.videoUrl) {
        const success = await migrateDocumentUrl(docRef, 'videoUrl', data);
        if (success) migrated++;
        else if (isProblematicStorageUrl(data.videoUrl)) failed++;
      }
    }

    console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
  } catch (error) {
    console.error('Error during posts migration:', error);
  }

  return { migrated, failed };
}

/**
 * Migrates all reels documents
 */
export async function migrateReelsUrls(db: any): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;

  try {
    const reelsCollection = collection(db, 'reels');
    const snapshot = await getDocs(reelsCollection);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const docRef = doc(db, 'reels', docSnap.id);

      if (data.videoUrl) {
        const success = await migrateDocumentUrl(docRef, 'videoUrl', data);
        if (success) migrated++;
        else if (isProblematicStorageUrl(data.videoUrl)) failed++;
      }
    }

    console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
  } catch (error) {
    console.error('Error during reels migration:', error);
  }

  return { migrated, failed };
}

/**
 * Runs full migration for all collections
 */
export async function runFullMigration(db: any): Promise<void> {
  console.log('🚀 Starting Firebase Storage URL migration...');
  
  const mediaResult = await migrateMediaUrls(db);
  console.log(`Media: ${mediaResult.migrated} migrated, ${mediaResult.failed} failed`);
  
  const postsResult = await migratePostUrls(db);
  console.log(`Posts: ${postsResult.migrated} migrated, ${postsResult.failed} failed`);
  
  const reelsResult = await migrateReelsUrls(db);
  console.log(`Reels: ${reelsResult.migrated} migrated, ${reelsResult.failed} failed`);
  
  console.log('✅ Migration complete!');
}













