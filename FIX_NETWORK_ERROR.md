# 🔧 Fix Network Error on Upload

## The Problem

Getting "Network error" when trying to upload. This is usually a **CORS (Cross-Origin Resource Sharing)** issue.

## Quick Fix: Update CORS Configuration

The bucket needs to allow requests from `localhost:9002` (your local dev server).

### Step 1: Update CORS Configuration

I've already updated `cors.json` to include `localhost:9002`. Now apply it:

**Option A: Using gcloud CLI (Recommended)**

```bash
# If you have gcloud installed
gsutil cors set cors.json gs://aaura-original-uploads
```

**Option B: Using Google Cloud Console**

1. Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Click on the bucket name
3. Go to **Configuration** tab
4. Scroll to **CORS** section
5. Click **Edit**
6. Paste this JSON:
```json
[
  {
    "origin": [
      "https://www.aaura.live",
      "https://aaura.live",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:9002",
      "http://0.0.0.0:9002",
      "http://127.0.0.1:9002"
    ],
    "method": ["GET", "HEAD", "OPTIONS", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Range",
      "x-goog-resumable",
      "x-goog-content-length-range"
    ]
  }
]
```
7. Click **Save**

**Option C: Using Cloud Shell (Easiest)**

1. Go to: https://console.cloud.google.com/
2. Click **Cloud Shell** icon (top right)
3. Run:
```bash
gsutil cors set cors.json gs://aaura-original-uploads
```

---

## Step 2: Verify CORS is Applied

**Check in Cloud Shell:**
```bash
gsutil cors get gs://aaura-original-uploads
```

**Should show** `localhost:9002` in the origins list.

---

## Step 3: Test Again

1. **Restart your dev server** (if running):
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Try uploading again**
3. **Check browser console** (F12 → Console)
   - Look for CORS errors
   - Should see no CORS errors after fix

---

## Alternative: Test with Browser DevTools

If CORS is still an issue, check:

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Try uploading**
4. **Look for the failed request**
5. **Check the error message:**
   - "CORS policy" = CORS issue (needs bucket CORS config)
   - "Network error" = Could be CORS or network issue
   - "403 Forbidden" = Permission issue (different problem)

---

## What I've Updated

1. ✅ **Updated `cors.json`** - Added `localhost:9002` to allowed origins
2. ✅ **Improved error handling** - Better error messages to diagnose issues

---

## After Applying CORS

1. ✅ Wait 1-2 minutes for CORS to propagate
2. ✅ Restart dev server
3. ✅ Try upload again
4. ✅ Should work now!

---

## Still Not Working?

If you still get network errors after applying CORS:

1. **Check browser console** for specific error messages
2. **Check Network tab** - look at the failed request details
3. **Verify CORS was applied:**
   ```bash
   gsutil cors get gs://aaura-original-uploads
   ```
4. **Share the error message** from browser console

---

**Apply CORS configuration and try again!**

