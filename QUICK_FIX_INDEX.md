# 🚀 Quick Fix: Firestore Index

## The Error
```
FAILED_PRECONDITION: The query requires an index for templeAds
```

## Quick Fix (2 minutes)

### Step 1: Open Firebase Console
👉 https://console.firebase.google.com

### Step 2: Login & Select Project
- Login with: kranthisuryadevara25@gmail.com
- Select project: **studio-9632556640-bd58d**

### Step 3: Create Index
1. Go to: **Firestore Database** → **Indexes** tab
2. Click **"Create Index"**
3. Fill in:
   - Collection: `templeAds`
   - Fields:
     - `active` → **Ascending**
     - `type` → **Ascending**
     - `priority` → **Descending**
4. Click **"Create"**

### Step 4: Wait
- Index builds in 1-2 minutes
- Status: "Building" → "Enabled" ✅

### Done! 🎉
Your `/api/ads` endpoint will work now!

---

**Need help?** See `FIX_FIRESTORE_INDEX_AUTH_ERROR.md` for detailed steps.
