# 🧪 Local Testing Guide

## Step 1: Check Environment Variables

Before running locally, make sure you have the Firebase service account key set:

### Option A: Create `.env.local` file

Create a file named `.env.local` in the project root:

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
touch .env.local
```

Add this line (replace with your actual service account key JSON as a single line):

```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"studio-9632556640-bd58d",...}
```

**To get the key:**
1. Open `FIREBASE_ADMIN_KEY.json` file
2. Convert to single line: `cat FIREBASE_ADMIN_KEY.json | jq -c .`
3. Copy the output and paste in `.env.local`

### Option B: Use existing environment

If you already have environment variables set up, skip this step.

---

## Step 2: Install Dependencies (If Needed)

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
npm install
```

---

## Step 3: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 15.5.7
- Local:        http://localhost:9002
- Network:      http://0.0.0.0:9002
```

---

## Step 4: Open in Browser

Open your browser and go to:
```
http://localhost:9002
```

---

## Step 5: Test Video Upload

### Test Steps:

1. **Login to your app** (if required)

2. **Navigate to upload page:**
   - Go to: `http://localhost:9002/upload`
   - Or find the upload button in your app

3. **Select a video file:**
   - Choose a small test video (1-5 MB)
   - This will be faster to test

4. **Start upload:**
   - Click upload/submit button
   - Watch the progress

5. **Check browser console:**
   - Press `F12` to open DevTools
   - Go to **Console** tab
   - Look for:
     - ✅ **No 403 errors** - Good!
     - ✅ **No 412 errors** - Good!
     - ❌ **403 Forbidden** - Still an issue
     - ❌ **412 Precondition Failed** - Still an issue

6. **Check Network tab:**
   - Go to **Network** tab in DevTools
   - Look for requests to `/api/upload/signed-url`
   - Check the response status:
     - ✅ **200 OK** - Good!
     - ❌ **403/412** - Issue

---

## Step 6: Verify Upload Works

### What to Check:

- [ ] Upload starts without errors
- [ ] Progress bar shows progress
- [ ] Upload completes successfully
- [ ] No 403 errors in console
- [ ] No 412 errors in console
- [ ] Video appears after upload
- [ ] Video can be played

---

## Step 7: Test the Diagnostic Endpoint

Test the diagnostic endpoint we created:

1. **Open in browser:**
   ```
   http://localhost:9002/api/test-signed-url
   ```

2. **Check the response:**
   - Should show JSON with `success: true`
   - If there's an error, it will show details

**Expected successful response:**
```json
{
  "success": true,
  "message": "Signed URL generation works correctly",
  "diagnostic": {
    "hasServiceAccountKey": true,
    "storageInitialized": true,
    "bucketExists": true,
    "bucketName": "aaura-original-uploads",
    "signedUrlGenerated": true
  }
}
```

---

## Troubleshooting

### Issue: "FIREBASE_SERVICE_ACCOUNT_KEY not set"

**Fix:**
1. Create `.env.local` file
2. Add the service account key (single line JSON)
3. Restart dev server: `npm run dev`

### Issue: "Port 9002 already in use"

**Fix:**
```bash
# Kill the process using port 9002
lsof -ti:9002 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

### Issue: "Module not found"

**Fix:**
```bash
npm install
```

### Issue: Still getting 403 errors locally

**Possible causes:**
1. Service account key not set in `.env.local`
2. Service account doesn't have permissions (but we already fixed this)
3. Bucket name mismatch

**Check:**
1. Verify `.env.local` exists and has the key
2. Restart dev server
3. Check diagnostic endpoint: `http://localhost:9002/api/test-signed-url`

---

## Quick Test Checklist

- [ ] Dev server running on `http://localhost:9002`
- [ ] `.env.local` file created with service account key
- [ ] Can access the app in browser
- [ ] Can login (if required)
- [ ] Can access upload page
- [ ] Upload a test video
- [ ] Check console - no 403/412 errors
- [ ] Video uploads successfully
- [ ] Video plays after upload

---

## What to Look For

### ✅ Success Indicators:
- Upload completes without errors
- Console shows no 403/412 errors
- Video appears in the app
- Video can be played

### ❌ Failure Indicators:
- 403 Forbidden errors
- 412 Precondition Failed errors
- Upload fails immediately
- "Permission denied" messages

---

## Next Steps After Local Testing

If local testing works:
1. ✅ Commit your changes
2. ✅ Push to repository
3. ✅ Deploy to production
4. ✅ Test in production

If local testing fails:
1. Check the error messages
2. Verify `.env.local` is set correctly
3. Check diagnostic endpoint response
4. Share the error details for help

---

**Start testing now:**
```bash
npm run dev
```

Then open: `http://localhost:9002`

