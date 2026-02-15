# Fix Firestore Index Authentication Error

## Problem
When clicking the error link, you get:
```
401 UNAUTHENTICATED: Request is missing required authentication credential
```

This is because the link requires you to be logged into Firebase Console first.

## Solution: Choose One Method

### ✅ Method 1: Manual Creation in Firebase Console (Easiest)

**Step 1: Log in to Firebase Console**
1. Go to: https://console.firebase.google.com
2. Log in with your Google account (kranthisuryadevara25@gmail.com)
3. Select project: **studio-9632556640-bd58d**

**Step 2: Create Index for `templeAds`**
1. In Firebase Console, go to: **Firestore Database** → **Indexes** tab
2. Click **"Create Index"** button
3. Fill in:
   - **Collection ID**: `templeAds`
   - **Fields to index**:
     - Field: `active` → Order: **Ascending**
     - Field: `type` → Order: **Ascending**
     - Field: `priority` → Order: **Descending**
   - **Query scope**: Collection
4. Click **"Create"**

**Step 3: Create Index for `poojaAds`** (Preventive)
1. Click **"Create Index"** again
2. Fill in:
   - **Collection ID**: `poojaAds`
   - **Fields to index**:
     - Field: `active` → Order: **Ascending**
     - Field: `type` → Order: **Ascending**
     - Field: `priority` → Order: **Descending**
   - **Query scope**: Collection
3. Click **"Create"**

**Step 4: Wait for Indexes to Build**
- Indexes take 1-2 minutes to build
- Status will show "Building" → "Enabled" when ready
- You'll see a green checkmark ✅ when complete

---

### ✅ Method 2: Install Firebase CLI and Deploy (Automatic)

**Step 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

**Step 2: Login to Firebase**
```bash
firebase login
```
This will open a browser for authentication.

**Step 3: Set Project**
```bash
firebase use studio-9632556640-bd58d
```

**Step 4: Deploy Indexes**
```bash
firebase deploy --only firestore:indexes
```

This will automatically deploy all indexes from `firestore.indexes.json`.

---

### ✅ Method 3: Use Direct Console Link (After Login)

1. **First, log in to Firebase Console**: https://console.firebase.google.com
2. **Then, use this direct link**:
   ```
   https://console.firebase.google.com/project/studio-9632556640-bd58d/firestore/indexes
   ```
3. Click **"Create Index"** and follow Method 1 steps

---

## Verify Indexes Are Created

After creating indexes:
1. Go to: **Firestore Database** → **Indexes** tab
2. You should see:
   - ✅ `templeAds` index with fields: `active`, `type`, `priority`
   - ✅ `poojaAds` index with fields: `active`, `type`, `priority`
3. Status should be **"Enabled"** (green checkmark)

## Test the Fix

After indexes are built (1-2 minutes):
1. Check Vercel logs for `/api/ads` endpoint
2. Should see **200 OK** instead of `FAILED_PRECONDITION`
3. No more index errors!

---

## Quick Summary

**Easiest Method**: 
1. Log in to https://console.firebase.google.com
2. Go to Firestore → Indexes
3. Create index for `templeAds` with fields: `active` (ASC), `type` (ASC), `priority` (DESC)
4. Wait 1-2 minutes for it to build
5. Done! ✅

