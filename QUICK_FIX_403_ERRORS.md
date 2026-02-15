# ⚡ Quick Fix: 403 Upload Errors

## The Problem

**403 Forbidden** errors when uploading videos after production launch.

## The Fix (2 minutes)

### Step 1: Grant IAM Permissions

Go to Google Cloud Console and grant permissions:

1. **Open:** https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d
2. **Click:** Permissions tab
3. **Click:** Grant Access
4. **New principals:** `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
5. **Role:** Storage Object Admin
6. **Click:** Save

### Step 2: Verify

Try uploading a video again. It should work now!

---

## Alternative: Use gcloud CLI

```bash
gsutil iam ch serviceAccount:firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com:roles/storage.objectAdmin gs://aaura-original-uploads
```

---

## Why This Happened

- Custom bucket (`aaura-original-uploads`) requires IAM permissions
- Firebase Storage rules don't apply to custom buckets
- Service account needs explicit permission to generate signed URLs

---

## Full Details

See `FIX_403_UPLOAD_ERRORS.md` for complete explanation and troubleshooting.

