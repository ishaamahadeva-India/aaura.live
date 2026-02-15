# Fix 403 Error - Storage Rules Not Working

## Still Getting 403? Let's Fix It

### Step 1: Verify Rules Are Actually Published

1. **Go to Firebase Console**
   - https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules

2. **Check Rules Status**
   - Look for "Published" or "Last published: [date]" at the top
   - If you see "Saved" but not "Published", click **Publish** again

3. **Verify Rules Content**
   - Make sure you see `allow read: if true` for `posts/` paths
   - Rules should match what you pasted

---

### Step 2: Test Direct Firebase URL

Test if rules work directly (bypassing CDN):

1. **Get a real video path** from Firestore
   - Example: `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/video.mp4`

2. **Test direct Firebase URL:**
   ```
   https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d.firebasestorage.app/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2Fvideo.mp4?alt=media
   ```
   (Replace with your actual path)

3. **Expected Results:**
   - ✅ **200 OK** = Rules are working, file exists
   - ❌ **403 Forbidden** = Rules not deployed correctly
   - ❌ **404 Not Found** = File doesn't exist (but rules are working)

---

### Step 3: Check Bucket Name in Worker

The Worker might be using wrong bucket format. Check:

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Edit code

2. **Check Bucket Name:**
   ```javascript
   const FIREBASE_BUCKET_SHORT = 'studio-9632556640-bd58d';
   const FIREBASE_BUCKET_FULL = 'studio-9632556640-bd58d.firebasestorage.app';
   ```

3. **Verify in Firebase Console:**
   - Go to: Firebase Console → Storage → Settings (gear icon)
   - Check "Bucket" name
   - Should match one of the above

---

### Step 4: Clear Cache and Retry

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Wait 1-2 Minutes**
   - Rules may need time to propagate

3. **Test Again:**
   ```
   https://aaura.live/videos/test
   ```

---

### Step 5: Check Worker Logs

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Logs

2. **Look for Errors:**
   - Check what error code Worker is getting from Firebase
   - Look for 403 errors in logs

3. **Check Request Details:**
   - See what URL Worker is trying to access
   - Verify bucket name is correct

---

### Step 6: Verify Rules Match File Structure

Your rules should match your file paths:

**For videos in `posts/`:**
```
match /posts/{userId}/{allPaths=**} {
  allow read: if true;  // ← This should work
}
```

**Test with actual path:**
- If file is: `posts/userId/video.mp4`
- Rule should match: `match /posts/{userId}/{allPaths=**}`

---

### Step 7: Try Alternative Rule Format

If still not working, try this simpler rule (temporary test):

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Temporary: Allow all reads (for testing)
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING**: This allows public read access to ALL files. Only use for testing!

**After testing works, revert to your original rules.**

---

### Step 8: Check Firebase Storage API

Make sure Storage API is enabled:

1. **Go to Firebase Console**
   - Project Settings → APIs
   - Look for "Cloud Storage for Firebase"
   - Should be "Enabled"

2. **If not enabled:**
   - Click "Enable API"

---

## Quick Diagnostic Checklist

- [ ] Rules show "Published" (not just "Saved")
- [ ] Direct Firebase URL works (test Step 2)
- [ ] Bucket name in Worker matches Firebase
- [ ] Browser cache cleared
- [ ] Waited 1-2 minutes after publishing
- [ ] Checked Worker logs for errors
- [ ] Storage API is enabled

---

## Most Common Issues

### Issue 1: Rules Not Actually Published
**Symptom**: Rules show "Saved" but not "Published"
**Fix**: Click **Publish** button (not just Save)

### Issue 2: Wrong Bucket Name
**Symptom**: Worker logs show 404 or wrong bucket
**Fix**: Update Worker code with correct bucket name

### Issue 3: Rules Don't Match Path
**Symptom**: Direct Firebase URL works, but CDN doesn't
**Fix**: Check path structure matches rules

### Issue 4: Caching
**Symptom**: Still getting 403 after publishing
**Fix**: Wait 2-3 minutes, clear cache, try again

---

## Test Commands

### Test Direct Firebase URL:
```bash
# Replace with your actual file path
curl -I "https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d.firebasestorage.app/o/posts%2FuserId%2Fvideo.mp4?alt=media"
```

### Test CDN URL:
```bash
curl -I "https://aaura.live/videos/posts/userId/video.mp4"
```

**Compare responses:**
- If Firebase URL works but CDN doesn't = Worker issue
- If both fail = Rules issue

---

## Still Not Working?

1. **Share Worker Logs**: Check Cloudflare Dashboard → Logs
2. **Share Direct Firebase URL Test**: Test a real file URL
3. **Check Rules in Console**: Verify they're actually published
4. **Try Simple Rule**: Use Step 7 temporary rule to test

---

**Let me know what you find and we'll fix it!** 🔧


