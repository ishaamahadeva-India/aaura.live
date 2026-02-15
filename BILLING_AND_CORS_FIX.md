# 🚨 Billing Issue + CORS Fix

## ✅ Good News

1. **Found the correct bucket**: `studio-9632556640-bd58d.firebasestorage.app` (Gen 2)
2. **Code updated**: Now using the correct bucket
3. **CORS file ready**: `cors.json` has correct configuration

## ❌ The Problem

**Billing account is disabled/delinquent**, which prevents setting CORS via `gsutil`.

Error:
```
AccessDeniedException: 403 The billing account for the owning project is disabled in state delinquent
```

## ✅ Solutions (Choose One)

### Solution 1: Fix Billing (Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/billing?project=studio-9632556640-bd58d

2. **Check Billing Status**
   - Look for billing account status
   - If "Delinquent" or "Disabled":
     - Click on billing account
     - Update payment method
     - Resolve any payment issues

3. **After Billing is Fixed**
   - Run CORS command again:
     ```bash
     gsutil cors set cors.json gs://studio-9632556640-bd58d.firebasestorage.app
     ```

### Solution 2: Firebase Console (Alternative)

Some Firebase projects allow setting CORS through Firebase Console:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage

2. **Check for CORS Settings**
   - Look for "CORS configuration" or "Settings"
   - If available, paste CORS configuration there

3. **If Not Available**
   - You'll need to fix billing first (Solution 1)

### Solution 3: Use Firebase Storage Rules (Workaround)

While CORS is the proper solution, you can also ensure Storage Rules allow uploads:

1. **Deploy Storage Rules** (if not done)
   ```bash
   firebase deploy --only storage:rules
   ```

2. **Verify Rules Allow Uploads**
   - Check `storage.rules` file
   - Should have: `allow write: if request.auth != null && request.auth.uid == userId;`

## 📋 CORS Configuration (Ready to Deploy)

Once billing is fixed, use this:

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

## ✅ Code Updated

I've updated the code to use the correct bucket:
- ✅ Changed from `.appspot.com` to `.firebasestorage.app`
- ✅ Updated hard proof log to check for `.firebasestorage.app`

## 🎯 Next Steps

1. **Fix billing account** (Solution 1)
2. **Deploy CORS** using `gsutil` command
3. **Test upload** - should work ✅

## ⚠️ Important

- **Billing must be active** to set CORS via `gsutil`
- **Code is now correct** - using the right bucket
- **After CORS is deployed**, uploads will work

