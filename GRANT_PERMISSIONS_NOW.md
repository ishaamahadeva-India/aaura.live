# ✅ Grant Permissions to Firebase Service Account

Now that you have **Storage Admin** role, you can grant permissions to the Firebase service account.

## Step-by-Step Instructions

### Step 1: Open the Bucket in Google Cloud Console

1. **Go to:** https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d

   Or navigate manually:
   - Go to: https://console.cloud.google.com/
   - Select project: `studio-9632556640-bd58d`
   - Go to: **Cloud Storage** → **Buckets**
   - Click on: `aaura-original-uploads`

### Step 2: Grant Access

1. **Click on the "Permissions" tab** (at the top of the bucket page)

2. **Click "Grant Access"** button (usually at the top right)

3. **In "New principals" field**, enter:
   ```
   firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
   ```

4. **In "Select a role" dropdown**, choose:
   - **Storage Object Admin** (or search for it)

5. **Click "Save"**

### Step 3: Verify

After saving, you should see:
- The service account appears in the permissions list
- It has the **Storage Object Admin** role

### Step 4: Test

1. **Wait 1-2 minutes** for permissions to propagate
2. **Try uploading a video** through your app
3. **Check if 403 errors are resolved**

---

## Alternative: Grant at Project Level

If you prefer to grant project-level permissions (applies to all buckets):

1. **Go to:** https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d

2. **Click "Grant Access"** (top of the page)

3. **In "New principals"**, enter:
   ```
   firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
   ```

4. **In "Select a role"**, choose:
   - **Storage Object Admin**

5. **Click "Save"**

---

## Quick Visual Guide

```
Google Cloud Console
  ↓
Cloud Storage → Buckets
  ↓
aaura-original-uploads
  ↓
Permissions Tab
  ↓
Grant Access
  ↓
New principals: firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
  ↓
Role: Storage Object Admin
  ↓
Save
```

---

## What This Does

Grants the Firebase service account permission to:
- ✅ Generate signed URLs for uploads
- ✅ Read/write objects in the bucket
- ✅ Manage object metadata
- ✅ Access bucket for video uploads

---

## After Granting Permissions

1. **Wait 1-2 minutes** for IAM changes to propagate
2. **Test video upload** in your app
3. **Check browser console** - 403 errors should be gone
4. **Verify** videos upload successfully

---

## Troubleshooting

**If you still see 403 errors after granting:**

1. **Wait 2-5 minutes** - IAM changes can take time to propagate
2. **Verify permissions** - Check the Permissions tab to confirm the service account is listed
3. **Check production logs** - Look for detailed error messages
4. **Verify FIREBASE_SERVICE_ACCOUNT_KEY** is set in production environment

---

## Need Help?

If you encounter any issues:
- Check the Permissions tab to verify the service account appears
- Wait a few minutes and try again
- Check production logs for specific error messages

