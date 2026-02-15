# 🔧 Fix: 403 Forbidden Errors on Video Uploads

## Problem Summary

After production launch, you're experiencing **403 Forbidden** errors when uploading videos:

```
PUT https://storage.googleapis.com/aaura-original-uploads/posts/.../video.mp4
403 (Forbidden)

Error: Upload failed: Permission denied. The signed URL may have expired or you may not have permission to upload.
```

## Root Cause

The Firebase Admin service account (`firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`) **does not have IAM permissions** on the custom Google Cloud Storage bucket `aaura-original-uploads`.

When your backend API (`/api/upload/signed-url`) tries to generate signed URLs for uploads, it fails because the service account lacks the necessary permissions.

## Solution

Grant the Firebase service account **Storage Object Admin** role on the `aaura-original-uploads` bucket.

### Method 1: Using Google Cloud Console (Recommended - Easiest)

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select project: `studio-9632556640-bd58d`

2. **Navigate to Cloud Storage:**
   - Go to: **Cloud Storage** → **Buckets**
   - Click on bucket: `aaura-original-uploads`

3. **Grant Permissions:**
   - Click on the **Permissions** tab
   - Click **Grant Access**
   - In **New principals**, enter:
     ```
     firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
     ```
   - In **Select a role**, choose: **Storage Object Admin**
   - Click **Save**

4. **Verify:**
   - The service account should now appear in the permissions list with **Storage Object Admin** role

### Method 2: Using gcloud CLI (If you have it installed)

```bash
# Set the project
gcloud config set project studio-9632556640-bd58d

# Grant Storage Object Admin role
gsutil iam ch serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com:roles/storage.objectAdmin gs://aaura-original-uploads
```

### Method 3: Using the Provided Script

If you have `gsutil` installed and authenticated:

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
chmod +x grant-bucket-permissions.sh
./grant-bucket-permissions.sh
```

## Additional Checks

### 1. Verify Bucket Exists

Make sure the bucket `aaura-original-uploads` exists:
- Go to: https://console.cloud.google.com/storage/browser?project=studio-9632556640-bd58d
- You should see `aaura-original-uploads` in the list

### 2. Verify Service Account Exists

Check that the service account exists:
- Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=studio-9632556640-bd58d
- Look for: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`

### 3. Check Environment Variable

Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is set in your production environment (Vercel/other hosting):
- The service account key JSON should be set as an environment variable
- This is required for the Admin SDK to authenticate

## Why This Happens After Production Launch

- **Development**: You might have been using a different service account or local credentials
- **Production**: The Firebase Admin SDK uses the service account from `FIREBASE_SERVICE_ACCOUNT_KEY`
- **Custom Buckets**: Firebase Storage rules don't apply to custom GCS buckets - you need IAM permissions instead

## Understanding the Errors

### 403 Forbidden (PUT/GET requests)
- **Cause**: Service account lacks IAM permissions on the bucket
- **Fix**: Grant `roles/storage.objectAdmin` role

### 412 Precondition Failed
- **Cause**: Usually related to CORS or bucket configuration
- **Fix**: Check CORS configuration on the bucket (see below)

## CORS Configuration (If Needed)

If you still get CORS errors after fixing permissions, ensure CORS is configured on the bucket:

1. **Go to bucket settings:**
   - Cloud Storage → `aaura-original-uploads` → **Configuration** tab

2. **Add CORS configuration:**
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "PUT", "POST", "HEAD"],
       "responseHeader": ["Content-Type", "Content-Length"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

   Or use the provided `cors.json` file:
   ```bash
   gsutil cors set cors.json gs://aaura-original-uploads
   ```

## Testing After Fix

1. **Try uploading a video** through your app
2. **Check browser console** - should no longer see 403 errors
3. **Verify upload succeeds** - video should appear in the bucket

## Expected Behavior After Fix

✅ **Before Fix:**
- 403 Forbidden errors
- "Permission denied" messages
- Uploads fail immediately

✅ **After Fix:**
- Signed URLs generate successfully
- Uploads proceed normally
- Videos appear in the bucket
- Download URLs work correctly

## Related Files

- `grant-bucket-permissions.sh` - Script to grant permissions
- `src/app/api/upload/signed-url/route.ts` - API endpoint that generates signed URLs
- `src/lib/firebase/admin.ts` - Firebase Admin SDK initialization

## Need Help?

If you still see errors after granting permissions:
1. Check Google Cloud Console → IAM & Admin → IAM
2. Verify the service account has the role on the bucket
3. Check server logs for detailed error messages
4. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly in production

