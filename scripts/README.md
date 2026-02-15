# Video Processing Scripts

This directory contains scripts for processing and uploading videos to Firebase.

## Scripts

1. **uploadVideos.js** - Bulk upload videos to Firebase Storage
2. **reencodeVideos.sh** - Re-encode videos for web streaming (Bash)
3. **reencodeVideos.js** - Re-encode videos for web streaming (Node.js)

---

## Bulk Video Upload Script

This script allows you to upload multiple video files to Firebase Storage and automatically create Firestore documents with the correct `videoStoragePath` field.

## Prerequisites

1. **Node.js** installed (v14 or higher)
2. **Firebase Service Account Key** (JSON file)
3. **Video files** ready to upload

## Setup

### Step 1: Install Dependencies

```bash
npm install firebase-admin
```

### Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `studio-9632556640-bd58d`
3. Go to **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the JSON file as `serviceAccountKey.json` in the **project root** (not in scripts folder)
6. **Important**: Add `serviceAccountKey.json` to `.gitignore` to keep it secure

### Step 3: Prepare Videos

1. Create a `videos/` folder in the project root
2. Place all your video files (`.mp4`, `.webm`, `.mov`) in this folder
3. Example structure:
   ```
   aaura-india-main/
   ├── videos/
   │   ├── video1.mp4
   │   ├── video2.mp4
   │   └── video3.mp4
   ├── scripts/
   │   └── uploadVideos.js
   └── serviceAccountKey.json
   ```

### Step 4: Configure the Script

Edit `scripts/uploadVideos.js` and update these values:

```javascript
// Your user ID (replace with actual user ID)
const USER_ID = '5QC34TXttWhRWlvTo7sLZnU3Q9o1';

// Default content for posts
const DEFAULT_CONTENT = 'Devotional video';
```

## Usage

Run the script:

```bash
node scripts/uploadVideos.js
```

The script will:
1. ✅ Check for service account key
2. ✅ Initialize Firebase Admin
3. ✅ Find all video files in `videos/` folder
4. ✅ Upload each video to Firebase Storage at: `posts/{userId}/{timestamp}-{filename}.mp4`
5. ✅ Create Firestore documents in `posts` collection with:
   - `videoStoragePath`: The storage path (CRITICAL - frontend uses this)
   - `authorId`: Your user ID
   - `content`: Default content
   - `videoUrl`: Download URL
   - `createdAt`: Server timestamp
   - `likes`: 0
   - `commentsCount`: 0

## Output

The script will show:
- Progress for each video upload
- Success/failure status
- Storage paths and Firestore document IDs
- Summary at the end

Example output:
```
✅ Firebase Admin initialized
   Bucket: studio-9632556640-bd58d.firebasestorage.app

📦 Found 3 video file(s) to upload
   Folder: /path/to/videos
   User ID: 5QC34TXttWhRWlvTo7sLZnU3Q9o1

📹 Processing: video1.mp4 (25.5 MB)
   Uploading to: posts/USER_ID/1765370162460-video1.mp4...
   ✅ Uploaded to Storage
   ✅ Created Firestore document: abc123

📊 UPLOAD SUMMARY
✅ Successfully uploaded: 3
❌ Failed: 0
```

## After Upload

1. **Refresh your app** - Videos should appear in the feed
2. **Check Firestore** - Verify documents have `videoStoragePath` field
3. **Check Storage** - Verify files exist at the correct paths

## Troubleshooting

### Error: "Service account key not found"
- Make sure `serviceAccountKey.json` is in the project root
- Check the file path in the script matches your file location

### Error: "Videos folder not found"
- Create a `videos/` folder in the project root
- Place your video files in it

### Error: "No video files found"
- Check that files have `.mp4`, `.webm`, or `.mov` extension
- Make sure files are in the `videos/` folder

### Error: "Permission denied"
- Check that your service account has Storage and Firestore permissions
- Verify the service account key is for the correct Firebase project

### Videos not showing in app
- Check that `videoStoragePath` field exists in Firestore documents
- Verify the storage path matches the actual file location
- Check browser console for errors

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `serviceAccountKey.json` to git
- Add it to `.gitignore`
- Keep the service account key secure
- Rotate keys periodically

## Customization

You can customize the script by editing:
- `USER_ID`: Change the user ID for posts
- `DEFAULT_CONTENT`: Change default post content
- `STORAGE_BUCKET`: Change bucket (should match your Firebase config)
- Add more fields to Firestore documents as needed

