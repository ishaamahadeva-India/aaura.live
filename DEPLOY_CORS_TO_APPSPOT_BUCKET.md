# 🚨 CRITICAL: Deploy CORS Rules to .appspot.com Bucket

## ✅ Good News

1. **Bucket is now correct** - Using `.appspot.com` ✅
2. **CORS file is correct** - Has `https://www.aaura.live` ✅
3. **CORS rules need to be deployed** - They're probably on the old bucket ❌

## 🔥 The Problem

CORS rules were likely deployed to the **old bucket** (`.firebasestorage.app`), but now we're using the **new bucket** (`.appspot.com`). CORS rules need to be applied to the **correct bucket**.

## ✅ Solution: Deploy CORS to .appspot.com Bucket

### Method 1: Google Cloud Console (Easiest)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/storage/browser?project=studio-9632556640-bd58d
   - Or: Google Cloud Console → Storage → Buckets

2. **Select the Bucket**
   - Find: `studio-9632556640-bd58d.appspot.com`
   - Click on it

3. **Go to CORS Configuration**
   - Click **"Configuration"** tab
   - Scroll to **"CORS configuration"** section
   - Click **"Edit CORS configuration"**

4. **Paste CORS Rules**
   - Copy ALL content from `cors.json` file
   - Paste into the editor
   - Click **"Save"**

### Method 2: gsutil Command (If you have gsutil)

```bash
gsutil cors set cors.json gs://studio-9632556640-bd58d.appspot.com
```

### Method 3: Cloud Shell (No Installation)

1. **Open Cloud Shell**
   - Visit: https://shell.cloud.google.com/?project=studio-9632556640-bd58d

2. **Upload cors.json**
   - Click **"Upload file"** button
   - Select `cors.json` from your project

3. **Run Command**
   ```bash
   gsutil cors set cors.json gs://studio-9632556640-bd58d.appspot.com
   ```

4. **Verify**
   ```bash
   gsutil cors get gs://studio-9632556640-bd58d.appspot.com
   ```

## 🧪 Verify CORS is Deployed

After deploying, test upload again. The CORS error should be gone.

### Expected Result

- ✅ No CORS errors in console
- ✅ Upload starts successfully
- ✅ Network request shows 200 OK (not CORS error)

## 📋 CORS Configuration (Already in cors.json)

```json
[
  {
    "origin": [
      "https://www.aaura.live",
      "https://aaura.live",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:9002"
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

## ⚠️ Important Notes

1. **CORS rules are bucket-specific** - Each bucket needs its own CORS rules
2. **Changes take effect immediately** - No need to restart anything
3. **Test after deploying** - Upload should work right away

## 🚨 If Still Fails

1. **Check bucket name** - Make sure you're editing `studio-9632556640-bd58d.appspot.com`
2. **Check CORS rules** - Verify `https://www.aaura.live` is in the origins list
3. **Clear browser cache** - CORS errors can be cached
4. **Check network tab** - Look for OPTIONS request (preflight) - should return 200 OK

