# Troubleshooting 403 Permission Denied Error

## The Problem

You're getting a 403 error when accessing files through the Cloudflare Worker. This means Firebase Storage is denying access.

## Root Causes

The 403 error happens when:
1. **Storage rules are NOT deployed** (most common - 90% of cases)
2. Storage rules don't allow public read access
3. The file path doesn't match the storage rules pattern

## Solution Steps

### Step 1: Verify Storage Rules Are Deployed

**CRITICAL**: Storage rules must be deployed for the Worker to access files!

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select project: `studio-9632556640-bd58d`

2. **Check Storage Rules**
   - Click "Storage" in left sidebar
   - Click "Rules" tab
   - Look for rules like:
     ```javascript
     match /posts/{userId}/{allPaths=**} {
       allow read: if true;  // ← This allows public read
       allow write: if request.auth != null && request.auth.uid == userId;
     }
     ```

3. **If Rules Are Missing or Wrong**
   - Copy rules from `storage.rules` file in your project
   - Paste into Firebase Console
   - Click "Publish"

### Step 2: Test Direct Firebase Storage Access

Test if a file is accessible directly from Firebase Storage:

1. **Get a real file path from your app**
   - Example: `posts/userId123/video.mp4`

2. **Construct Firebase Storage URL**
   - Format: `https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2FuserId123%2Fvideo.mp4?alt=media`
   - (Replace `userId123` and `video.mp4` with actual values)

3. **Test in Browser**
   - Open the URL in a new tab
   - If you get 403 → Storage rules not deployed
   - If you get 404 → File doesn't exist
   - If file downloads → Rules are working!

### Step 3: Update Cloudflare Worker

Use the improved Worker code from `CLOUDFLARE_WORKER_FINAL.js`:

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Edit code

2. **Replace with Final Worker Code**
   - Copy from `CLOUDFLARE_WORKER_FINAL.js`
   - This version tries both bucket name formats and provides better error messages

3. **Save and Deploy**

### Step 4: Check Worker Logs

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Logs

2. **Look for Error Messages**
   - The Worker logs will show the exact Firebase URL it's trying to access
   - This helps identify if the path is wrong

## Quick Test

After deploying storage rules, test with a real file:

```bash
# Replace with an actual file path from your Firebase Storage
curl "https://aaura.live/videos/posts/USER_ID/VIDEO_FILE.mp4"
```

If you still get 403:
1. ✅ Verify storage rules are deployed (Step 1)
2. ✅ Test direct Firebase URL (Step 2)
3. ✅ Check Worker logs for the exact URL being requested

## Common Mistakes

❌ **Mistake 1**: Editing rules in Firebase Console but not clicking "Publish"
- **Fix**: Always click "Publish" after editing rules

❌ **Mistake 2**: Rules allow read but path doesn't match
- **Fix**: Check that your file path matches the rule pattern
  - Example: File at `posts/userId/video.mp4` needs rule `match /posts/{userId}/{allPaths=**}`

❌ **Mistake 3**: Using wrong bucket name in Worker
- **Fix**: Use `studio-9632556640-bd58d` (without `.firebasestorage.app`)

## Still Not Working?

If you've done all steps and still get 403:

1. **Share the error details**:
   - The exact URL you're testing
   - The file path in Firebase Storage
   - The storage rules you deployed

2. **Check Firebase Storage Console**:
   - Go to Storage → Files
   - Verify the file exists at the expected path
   - Check file permissions

3. **Test with a simple file**:
   - Upload a test file to `posts/test/test.mp4`
   - Test: `https://aaura.live/videos/posts/test/test.mp4`
   - If this works, the issue is with your specific file path









