# 📧 Email Template: Request Bucket Permissions

Use this template to request permissions from your project admin:

---

**Subject:** Request: Grant IAM Permissions for Firebase Service Account on Storage Bucket

**Body:**

Hi [Admin Name],

I need help granting IAM permissions on our Google Cloud Storage bucket to fix video upload errors in production.

**Issue:**
Our app is getting 403 Forbidden errors when users try to upload videos. This is because the Firebase Admin service account doesn't have permissions on the custom storage bucket.

**What's Needed:**
Grant the Firebase service account `Storage Object Admin` role on the bucket `aaura-original-uploads`.

**Steps to Fix:**
1. Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Click the **Permissions** tab
3. Click **Grant Access**
4. In **New principals**, enter:
   ```
   firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
   ```
5. In **Select a role**, choose: **Storage Object Admin**
6. Click **Save**

**Alternative (if bucket access is restricted):**
Grant project-level permissions:
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d
2. Find: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
3. Click **Edit** (pencil icon)
4. Add role: **Storage Object Admin**
5. Click **Save**

**Or grant me Storage Admin role** so I can manage this myself:
- Go to: https://console.cloud.google.com/iam-admin/iam?project=studio-9632556640-bd58d
- Find my account: [your-email@example.com]
- Add role: **Storage Admin**

**Time Required:** 2 minutes

**Impact:** This will fix the 403 errors and allow video uploads to work in production.

Thanks!

---

## Quick Copy-Paste Version

```
Hi,

I need to grant IAM permissions on bucket 'aaura-original-uploads' to fix video upload errors.

Please grant 'Storage Object Admin' role to:
firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com

Steps:
1. https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Permissions tab → Grant Access
3. Principal: firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
4. Role: Storage Object Admin
5. Save

Or grant me Storage Admin role so I can do this.

Thanks!
```

