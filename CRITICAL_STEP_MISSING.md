# ⚠️ CRITICAL: Grant Permissions to SERVICE ACCOUNT (Not Just Your Email)

## The Issue

You've granted **Storage Admin** to your email ID, which is good - that allows you to grant permissions. 

**BUT:** The **Firebase service account** (`firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`) still needs permissions on the bucket.

## What You Need to Do

You need to grant **Storage Object Admin** to the **SERVICE ACCOUNT**, not just your email.

---

## Step-by-Step: Grant Permissions to Service Account

### Step 1: Open the Bucket

Go to: https://console.cloud.google.com/storage/browser/aaura-original-uploads?project=studio-9632556640-bd58d

### Step 2: Open Permissions Tab

Click the **"Permissions"** tab at the top of the bucket page.

### Step 3: Grant Access to SERVICE ACCOUNT

1. Click **"Grant Access"** button
2. In **"New principals"** field, enter:
   ```
   firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com
   ```
   ⚠️ **This is the SERVICE ACCOUNT email, not your email!**
3. In **"Select a role"** dropdown, choose:
   - **Storage Object Admin**
4. Click **"Save"**

### Step 4: Verify

After saving, check the Permissions list. You should see **TWO entries**:
1. Your email with **Storage Admin** role ✅
2. `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com` with **Storage Object Admin** role ✅

---

## Visual Guide

```
Bucket Permissions Should Show:

┌─────────────────────────────────────────────────────────────┐
│ Principal                                                    │ Role                │
├─────────────────────────────────────────────────────────────┤
│ your-email@example.com                                       │ Storage Admin        │ ✅
│ firebase-adminsdk-fbsvc@...iam.gserviceaccount.com         │ Storage Object Admin │ ✅ ← NEED THIS!
└─────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

- **Your email with Storage Admin** = You can manage the bucket
- **Service account with Storage Object Admin** = The app can upload videos

**Both are needed!**

---

## After Granting to Service Account

1. **Wait 1-2 minutes** for IAM propagation
2. **Redeploy your app** (or wait for next deployment)
3. **Test video upload**
4. **403 errors should be resolved**

---

## Quick Check

After granting, verify the service account appears in the permissions list:

1. Go to bucket → Permissions tab
2. Look for: `firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com`
3. Should show: **Storage Object Admin** role

If you don't see it, the permissions weren't granted correctly.

---

## Still Getting 403?

If you've granted permissions to the service account and still get 403:

1. **Wait 2-5 minutes** - IAM changes need time to propagate
2. **Check the Permissions tab** - Verify service account is listed
3. **Redeploy** - Sometimes a fresh deployment helps
4. **Test with diagnostic endpoint**: `/api/test-signed-url` (if deployed)

---

## Summary

✅ You have: Storage Admin on your email (allows you to grant permissions)  
❌ You need: Storage Object Admin on the service account (allows app to upload)

**Grant it now using the steps above!**

