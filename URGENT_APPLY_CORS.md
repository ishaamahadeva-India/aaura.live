# 🚨 URGENT: Apply CORS Configuration

## The Problem

You're getting CORS errors because the bucket doesn't allow requests from `localhost:9002`.

**Error:**
```
blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Quick Fix: Apply CORS Now

### Option 1: Using Cloud Shell (Easiest - 2 minutes)

1. **Open Cloud Shell:**
   - Go to: https://console.cloud.google.com/
   - Click **Cloud Shell** icon (top right, looks like `>_`)
   - Wait for it to open

2. **Upload the CORS file:**
   ```bash
   # First, download the cors.json file to Cloud Shell
   # Or create it directly:
   cat > cors.json << 'EOF'
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
   EOF
   ```

3. **Apply CORS:**
   ```bash
   gsutil cors set cors.json gs://aaura-original-uploads
   ```

4. **Verify:**
   ```bash
   gsutil cors get gs://aaura-original-uploads
   ```

### Option 2: Using Google Cloud Console

1. **Go to bucket:**
   - https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d

2. **Click bucket name** → **Configuration** tab

3. **Scroll to CORS section** → Click **Edit**

4. **Paste this JSON:**
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

5. **Click Save**

---

## After Applying CORS

1. **Wait 1-2 minutes** for CORS to propagate
2. **Hard refresh browser** (`Ctrl+Shift+R`)
3. **Try uploading again**
4. **CORS errors should be gone!**

---

## About the Other Errors

### ✅ Expected (Can Ignore):
- **403 errors on old videos** - These are expired signed URLs from December 19 (expected)
- **412 errors** - Some old Firebase Storage URLs (expected)
- **Video format errors** - Happening because URLs are blocked by CORS

### ❌ Need to Fix:
- **CORS errors** - Apply CORS config (above)
- **Upload CORS error** - Will be fixed when CORS is applied

---

## Quick Command (If you have gcloud CLI locally)

```bash
gsutil cors set cors.json gs://aaura-original-uploads
```

---

**Apply CORS using Cloud Shell (easiest) and the errors will be fixed!**

