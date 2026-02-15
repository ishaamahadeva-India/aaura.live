# 🔐 Bucket Permissions Required

## Error Message

```
Additional permissions required to view this bucket's metadata: 
Ask a bucket owner to grant you 'storage.buckets.get' and 
'storage.buckets.getIamPolicy' permissions.
```

## What This Means

You're trying to grant IAM permissions on the bucket, but your current Google Cloud account doesn't have sufficient permissions to:
- View bucket metadata (`storage.buckets.get`)
- View/modify IAM policies (`storage.buckets.getIamPolicy`)

## Solutions

### Option 1: Ask Bucket Owner/Admin (Recommended)

If you're not the project owner, ask someone with **Owner** or **Storage Admin** role to:

1. **Grant the service account permissions** (they can do this):
   - Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
   - Click **Permissions** tab
   - Click **Grant Access**
   - Principal: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
   - Role: **Storage Object Admin**
   - Click **Save**

2. **Or grant you the necessary permissions** so you can do it:
   - Go to: https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d
   - Find your account
   - Click **Edit** (pencil icon)
   - Add role: **Storage Admin** or **Storage Object Admin**
   - Click **Save**

### Option 2: Use gcloud CLI with Service Account Key

If you have a service account key with sufficient permissions:

```bash
# Authenticate with a service account that has Storage Admin role
gcloud auth activate-service-account --key-file=/path/to/service-account-key.json

# Grant permissions
gsutil iam ch serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com:roles/storage.objectAdmin gs://aaura-original-uploads
```

### Option 3: Check Your Current Permissions

1. **Go to IAM & Admin:**
   - https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d

2. **Find your account** in the list

3. **Check your roles:**
   - You need one of these roles:
     - **Owner** (has all permissions)
     - **Storage Admin** (can manage buckets and IAM)
     - **Storage Object Admin** (can manage objects and IAM on specific buckets)

4. **If you don't have sufficient permissions:**
   - Ask project owner to grant you **Storage Admin** role
   - Or ask them to grant the service account permissions directly

### Option 4: Use Terraform/Infrastructure as Code

If your project uses infrastructure as code, add this to your Terraform config:

```hcl
resource "google_storage_bucket_iam_member" "firebase_admin_object_admin" {
  bucket = "aaura-original-uploads"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com"
}
```

## Required Roles Explained

### To Grant Permissions (What You Need):
- **Storage Admin** - Can manage all buckets and their IAM policies
- **Owner** - Has all permissions including IAM management
- **Storage Object Admin** - Can manage objects and IAM on specific buckets (if granted at bucket level)

### What We're Granting (To Firebase Service Account):
- **Storage Object Admin** - Allows the service account to:
  - Generate signed URLs
  - Read/write objects
  - Manage object metadata
  - This is what's needed for video uploads to work

## Quick Checklist

- [ ] Identify who has Owner/Storage Admin role in your project
- [ ] Ask them to grant permissions to `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
- [ ] Or ask them to grant you Storage Admin role so you can do it
- [ ] Verify permissions were granted
- [ ] Test video upload

## Verify Permissions Were Granted

After someone grants the permissions, verify:

1. **Check IAM Policy:**
   ```bash
   gsutil iam get gs://aaura-original-uploads
   ```

2. **Look for:**
   ```
   serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
   roles/storage.objectAdmin
   ```

3. **Or in Console:**
   - Go to bucket → Permissions tab
   - Service account should appear with **Storage Object Admin** role

## Alternative: Project-Level Permissions

If bucket-level permissions are restricted, you can grant project-level permissions:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d
2. Find: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
3. Click **Edit** (pencil icon)
4. Add role: **Storage Object Admin** (project-level)
5. Click **Save**

This grants permissions on all buckets in the project.

## Next Steps

1. **Contact project owner/admin** to grant the permissions
2. **Or request Storage Admin role** for yourself
3. **Once permissions are granted**, test video upload
4. **Verify** the 403 errors are resolved

## Need Help?

If you're the project owner but still getting this error:
- Check if you're logged into the correct Google account
- Verify you're viewing the correct project
- Try logging out and back in
- Check if there are organization policies restricting IAM changes

