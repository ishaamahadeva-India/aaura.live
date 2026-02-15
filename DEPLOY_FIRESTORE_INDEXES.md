# Deploy Firestore Indexes

## Issue
The `/api/ads` endpoint is failing with:
```
FAILED_PRECONDITION: The query requires an index for templeAds collection
```

## Fix Applied
Added missing Firestore composite indexes for:
- `templeAds` collection
- `poojaAds` collection

Both indexes are on fields: `active` (ASC), `type` (ASC), `priority` (DESC)

## Deploy the Indexes

### Option 1: Automatic Deployment (Recommended)
If you have Firebase CLI configured:

```bash
firebase deploy --only firestore:indexes
```

### Option 2: Manual Deployment via Firebase Console
1. Go to: https://console.firebase.google.com/v1/r/project/studio-9632556640-bd58d/firestore/indexes
2. Click "Create Index" if prompted
3. The indexes should auto-create from the error link, OR
4. Manually create indexes with these fields:
   - Collection: `templeAds`
   - Fields:
     - `active` (Ascending)
     - `type` (Ascending)  
     - `priority` (Descending)
   - Repeat for `poojaAds` collection

### Option 3: Use the Error Link
The error message includes a direct link to create the index:
```
https://console.firebase.google.com/v1/r/project/studio-9632556640-bd58d/firestore/indexes?create_composite=...
```

Click that link and it will auto-create the index.

## Verify
After deployment, wait 1-2 minutes for indexes to build, then:
- Check Vercel logs - `/api/ads` should return 200
- No more `FAILED_PRECONDITION` errors

## Status
✅ Index definitions added to `firestore.indexes.json`
✅ Code pushed to GitHub
⏳ **Action Required**: Deploy indexes to Firebase

