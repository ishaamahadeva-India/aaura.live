# Fresh Start Guide - Video Upload & Playback

## ✅ Current Setup Status

### 1. Firebase Configuration ✓
**Location**: `src/lib/firebase/client.ts`

```typescript
storageBucket: "studio-9632556640-bd58d.firebasestorage.app"
```

**Note**: This project uses `.firebasestorage.app` (Firebase Storage Gen 2), not `.appspot.com`. This is **CORRECT** for this project.

### 2. Video Upload Code ✓
**Location**: `src/components/CreatePostDialog.tsx`

The upload code already:
- ✅ Creates proper folder structure: `posts/{userId}/{timestamp}-{filename}`
- ✅ Stores `videoStoragePath` in Firestore document
- ✅ Returns both `url` and `path` from upload

**Example Firestore document structure**:
```json
{
  "authorId": "USER_ID",
  "content": "Post content",
  "videoUrl": "https://firebasestorage.googleapis.com/v0/b/...",
  "videoStoragePath": "posts/USER_ID/1765362845016-KALABHAIRAVAASHTAKAM.mp4",
  "createdAt": "2024-01-15T10:30:00Z",
  "likes": 0,
  "commentsCount": 0
}
```

### 3. Video Playback Code ✓
**Location**: `src/components/FeedCard.tsx`

The playback code:
- ✅ Uses `videoStoragePath` from Firestore (never extracts from URLs)
- ✅ Gets fresh download URL using `getDownloadURL(ref(storage, videoStoragePath))`
- ✅ Uses URLs exactly as Firebase returns them (no modifications)

### 4. CORS Configuration ✓
**Location**: `cors.json`

CORS is configured for:
- ✅ `https://www.aaura.live`
- ✅ `https://aaura.live`
- ✅ `http://localhost:3000`
- ✅ `http://localhost:3001`
- ✅ `http://localhost:5173`

**To deploy CORS**:
```bash
gsutil cors set cors.json gs://studio-9632556640-bd58d.firebasestorage.app
```

## 🎯 What You Need to Do

### Step 1: Verify Firebase Storage Bucket
```bash
gsutil ls
# Should show: gs://studio-9632556640-bd58d.firebasestorage.app/
```

### Step 2: Upload New Videos
1. Go to your app's "Create Post" dialog
2. Upload a video file
3. The system will automatically:
   - Upload to: `posts/{userId}/{timestamp}-{filename}.mp4`
   - Store `videoStoragePath` in Firestore
   - Generate download URL

### Step 3: Verify Firestore Documents
After uploading, check Firestore:
- Collection: `posts`
- Each document should have `videoStoragePath` field
- Example: `"videoStoragePath": "posts/abc123/1765362845016-video.mp4"`

### Step 4: Test Video Playback
1. Navigate to `/feed` page
2. Videos should load automatically
3. If you see "Video storage path not available" error:
   - That post was created before `videoStoragePath` was implemented
   - Re-upload that video to fix it

## ⚠️ Important Notes

### Old Posts Without `videoStoragePath`
If you have old posts without `videoStoragePath`:
- They will show error: "Video storage path not available"
- **Solution**: Re-upload those videos (they will get `videoStoragePath`)

### Bucket Name
- **This project uses**: `studio-9632556640-bd58d.firebasestorage.app`
- **NOT**: `studio-9632556640-bd58d.appspot.com`
- The config is already correct - **DO NOT CHANGE IT**

### URL Handling
- ✅ **CORRECT**: Use `videoStoragePath` → `getDownloadURL()` → Use URL as-is
- ❌ **WRONG**: Extract path from URL (URLs may be truncated)

## 🔧 Troubleshooting

### Videos Not Loading
1. Check browser console for errors
2. Verify `videoStoragePath` exists in Firestore
3. Verify CORS is deployed: `gsutil cors get gs://studio-9632556640-bd58d.firebasestorage.app`
4. Check Firebase Storage console - file should exist at the path

### 404 Errors
- Verify the file exists in Firebase Storage at the exact path in `videoStoragePath`
- Check that `videoStoragePath` is complete (not truncated)

### CORS Errors
- Deploy CORS: `gsutil cors set cors.json gs://studio-9632556640-bd58d.firebasestorage.app`
- Verify your domain is in `cors.json`

## ✅ Checklist

- [x] Firebase config uses correct bucket (`.firebasestorage.app`)
- [x] Upload code stores `videoStoragePath`
- [x] Playback code uses `videoStoragePath` (not URL extraction)
- [x] CORS configuration file exists
- [ ] CORS deployed to bucket (run `gsutil cors set cors.json gs://studio-9632556640-bd58d.firebasestorage.app`)
- [ ] Test upload a new video
- [ ] Verify `videoStoragePath` in Firestore
- [ ] Test video playback

## 🎉 After This Setup

Your app will:
- ✅ Upload videos with correct `videoStoragePath`
- ✅ Load videos using real storage paths
- ✅ Avoid 404 errors
- ✅ Avoid truncated URL issues
- ✅ Work with Unicode filenames
- ✅ Work with long filenames

