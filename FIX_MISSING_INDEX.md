# 🔧 Fix Missing Firestore Index

## The Problem

Firestore requires an index for the `mandapaAds` collection query that filters by:
- `active` (equality)
- `type` (equality)  
- `priority` (descending order)

## ✅ Fix Applied

I've added the missing index to `firestore.indexes.json`:

```json
{
  "collectionGroup": "mandapaAds",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "active", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" }
  ]
}
```

## Deploy the Index

### Option 1: Quick Deploy (Recommended)

Click the link from the error message:
```
https://console.firebase.google.com/v1/r/project/studio-9632556640-bd58d/firestore/indexes?create_composite=...
```

This will automatically create the index.

### Option 2: Deploy via Firebase CLI

```bash
firebase deploy --only firestore:indexes
```

**Wait 2-5 minutes** for the index to build.

---

## Verify Index is Created

1. Go to: https://console.firebase.google.com/project/studio-9632556640-bd58d/firestore/indexes
2. Look for: `mandapaAds` collection
3. Should show index with fields: `active`, `type`, `priority`

---

## After Index is Created

1. ✅ Wait 2-5 minutes for index to build
2. ✅ Restart your dev server (if needed)
3. ✅ Try accessing the page again
4. ✅ Error should be gone!

---

## Quick Fix Summary

1. **Click the link** from the error (easiest)
2. **Or deploy** via CLI: `firebase deploy --only firestore:indexes`
3. **Wait** for index to build
4. **Test** again

---

**The index definition is already in `firestore.indexes.json`. Just deploy it!**

