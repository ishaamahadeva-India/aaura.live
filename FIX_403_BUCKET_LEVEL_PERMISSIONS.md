# 🔧 Fix 403 Errors - Grant Bucket-Level Permissions

## The Problem

Even though the service account has **project-level** Storage Object Admin permissions, you're still getting 403 errors. This means **bucket-level IAM policies** are overriding the project-level permissions.

## Solution: Grant Bucket-Level Permissions via gcloud CLI

Since you can't access bucket permissions in the console, we'll use the command line.

---

## Step 1: Install Google Cloud SDK (If Not Installed)

### Option A: Install gcloud CLI

**On Linux/Mac:**
```bash
# Download and install
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

**On Windows:**
- Download from: https://cloud.google.com/sdk/docs/install
- Run the installer
- Follow the setup wizard

### Option B: Use Cloud Shell (Easiest - No Installation)

1. **Go to:** https://console.cloud.google.com/
2. **Click the Cloud Shell icon** (top right, looks like `>_`)
3. **Wait for it to open** (takes 30 seconds)
4. **You're ready!** Skip to Step 2

---

## Step 2: Authenticate

**If using Cloud Shell:** You're already authenticated! Skip to Step 3.

**If using local gcloud CLI:**
```bash
gcloud auth login
# Follow the prompts to login with your Google account
```

---

## Step 3: Set the Project

```bash
gcloud config set project studio-9632556640-bd58d
```

---

## Step 4: Grant Bucket-Level Permissions

Run this command:

```bash
gsutil iam ch serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com:roles/storage.objectAdmin gs://aaura-original-uploads
```

**Expected output:**
```
Updated IAM policy for gs://aaura-original-uploads.
```

---

## Step 5: Verify Permissions Were Granted

Run this command to check:

```bash
gsutil iam get gs://aaura-original-uploads | grep firebase-adminsdk-fbsvc
```

**You should see:**
```
serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
```

---

## Step 6: Wait and Test

1. **Wait 2-3 minutes** for IAM changes to propagate
2. **Test video upload** in your app
3. **Check if 403 errors are resolved**

---

## Alternative: Ask Someone with Owner Role

If you can't use gcloud CLI, ask someone with **Owner** role to:

1. Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. Click **Permissions** tab
3. Click **Grant Access**
4. Principal: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
5. Role: **Storage Object Admin**
6. Save

---

## Why This Is Needed

- **Project-level permissions** = Apply to all buckets (but can be overridden)
- **Bucket-level permissions** = Specific to one bucket (takes precedence)

When bucket-level IAM policies exist, they override project-level permissions. That's why we need to grant bucket-level permissions explicitly.

---

## Quick Command Summary

```bash
# Set project
gcloud config set project studio-9632556640-bd58d

# Grant permissions
gsutil iam ch serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com:roles/storage.objectAdmin gs://aaura-original-uploads

# Verify
gsutil iam get gs://aaura-original-uploads | grep firebase-adminsdk-fbsvc
```

---

## After Granting

1. ✅ Wait 2-3 minutes
2. ✅ Test video upload
3. ✅ 403 errors should be resolved!

---

**Use Cloud Shell (easiest) or install gcloud CLI, then run the commands above!**

