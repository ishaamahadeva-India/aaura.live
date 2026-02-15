/**
 * Bulk Video Upload Script for Firebase Storage
 * 
 * This script uploads multiple video files to Firebase Storage and creates
 * corresponding Firestore documents with the correct videoStoragePath field.
 * 
 * Prerequisites:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Get service account key from Firebase Console
 * 3. Place videos in ./videos/ folder
 * 4. Update userId and other config below
 * 
 * Usage: node scripts/uploadVideos.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Path to your service account key JSON file
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');

// Your Firebase Storage bucket (use .firebasestorage.app for Gen 2)
const STORAGE_BUCKET = 'studio-9632556640-bd58d.firebasestorage.app';

// Folder containing your videos (relative to this script)
const VIDEOS_FOLDER = path.join(__dirname, '../videos');

// User ID for the posts (replace with actual user ID)
const USER_ID = '5QC34TXttWhRWlvTo7sLZnU3Q9o1';

// Default content for posts (you can customize this)
const DEFAULT_CONTENT = 'Devotional video';

// ============================================
// INITIALIZATION
// ============================================

// Check if service account file exists
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ ERROR: Service account key not found!');
  console.error(`Expected location: ${SERVICE_ACCOUNT_PATH}`);
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the JSON file as serviceAccountKey.json in the project root');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET,
  });
  console.log('✅ Firebase Admin initialized');
  console.log(`   Bucket: ${STORAGE_BUCKET}`);
} catch (error) {
  console.error('❌ ERROR: Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ============================================
// UPLOAD FUNCTIONS
// ============================================

/**
 * Uploads a single video file to Firebase Storage and creates Firestore document
 * @param {string} filePath - Full path to the video file
 * @param {string} userId - User ID for the post
 * @returns {Promise<{storagePath: string, docId: string}>}
 */
async function uploadVideo(filePath, userId) {
  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n📹 Processing: ${fileName} (${fileSizeMB} MB)`);
  
  // Generate storage path: posts/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const storagePath = `posts/${userId}/${timestamp}-${fileName}`;
  
  try {
    // Upload to Firebase Storage
    console.log(`   Uploading to: ${storagePath}...`);
    await bucket.upload(filePath, {
      destination: storagePath,
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    console.log(`   ✅ Uploaded to Storage`);
    
    // Get download URL (optional, but useful for verification)
    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Far future date
    });
    
    // Create Firestore document
    const docRef = db.collection('posts').doc();
    const docData = {
      authorId: userId,
      content: DEFAULT_CONTENT,
      postType: 'general',
      videoUrl: url, // Store the download URL (optional, videoStoragePath is the source of truth)
      videoStoragePath: storagePath, // CRITICAL: This is what the frontend uses
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      likes: 0,
      commentsCount: 0,
      // No contextId or contextType - makes it a general feed post
    };
    
    await docRef.set(docData);
    console.log(`   ✅ Created Firestore document: ${docRef.id}`);
    
    return {
      storagePath,
      docId: docRef.id,
      fileName,
    };
  } catch (error) {
    console.error(`   ❌ ERROR uploading ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Uploads all videos from the videos folder
 */
async function uploadAll() {
  // Check if videos folder exists
  if (!fs.existsSync(VIDEOS_FOLDER)) {
    console.error(`❌ ERROR: Videos folder not found: ${VIDEOS_FOLDER}`);
    console.error('   Create the folder and place your .mp4 files in it');
    process.exit(1);
  }
  
  // Get all video files
  const files = fs.readdirSync(VIDEOS_FOLDER).filter(f => 
    f.toLowerCase().endsWith('.mp4') || 
    f.toLowerCase().endsWith('.webm') ||
    f.toLowerCase().endsWith('.mov')
  );
  
  if (files.length === 0) {
    console.error(`❌ ERROR: No video files found in ${VIDEOS_FOLDER}`);
    console.error('   Supported formats: .mp4, .webm, .mov');
    process.exit(1);
  }
  
  console.log(`\n📦 Found ${files.length} video file(s) to upload`);
  console.log(`   Folder: ${VIDEOS_FOLDER}`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Bucket: ${STORAGE_BUCKET}\n`);
  
  const results = {
    success: [],
    failed: [],
  };
  
  // Upload each video
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(VIDEOS_FOLDER, file);
    
    try {
      const result = await uploadVideo(filePath, USER_ID);
      results.success.push(result);
      console.log(`   Progress: ${i + 1}/${files.length} completed`);
    } catch (error) {
      results.failed.push({ fileName: file, error: error.message });
      console.error(`   Failed: ${file}`);
    }
    
    // Small delay between uploads to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully uploaded: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Successfully uploaded videos:');
    results.success.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.fileName}`);
      console.log(`      Storage: ${r.storagePath}`);
      console.log(`      Doc ID: ${r.docId}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed uploads:');
    results.failed.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.fileName}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Upload process completed!');
  console.log('   Refresh your app to see the videos in the feed.');
}

// ============================================
// RUN
// ============================================

uploadAll().catch((error) => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});

