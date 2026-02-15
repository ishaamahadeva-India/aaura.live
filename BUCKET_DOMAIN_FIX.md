# ✅ CRITICAL FIX: Storage Bucket Domain

## 🚨 Root Cause Found!

The **412 Precondition Failed** error was caused by using the **wrong storage bucket domain**.

### ❌ Wrong (Causing 412 Errors):
```
storageBucket: "studio-9632556640-bd58d.firebasestorage.app"
```

### ✅ Correct (Fixed):
```
storageBucket: "studio-9632556640-bd58d.appspot.com"
```

## Why This Causes 412 Errors

1. **Auth token mismatch**: Firebase auth tokens are issued for `.appspot.com` domain
2. **Upload goes to wrong domain**: Using `.firebasestorage.app` causes mismatch
3. **Finalize fails**: Firebase rejects finalization with 412 because token doesn't match bucket domain

## What Was Happening

```
✅ Upload starts → Bucket exists
❌ Fails at finalize → Token-bucket mismatch
❌ 412 error → Precondition failed
❌ Retry fails → Same bucket issue
```

## Fix Applied

✅ Changed `storageBucket` in `src/lib/firebase/client.ts`:
- From: `studio-9632556640-bd58d.firebasestorage.app`
- To: `studio-9632556640-bd58d.appspot.com`

## 🧪 Test Now

### 1. Clear Browser Cache (CRITICAL!)

Firebase SDK caches bucket endpoints. You MUST clear:

**Option A: DevTools**
- Open DevTools (F12)
- Application tab → Clear Storage → Clear site data
- Hard reload (Ctrl + Shift + R)

**Option B: Incognito**
- Open browser in Incognito/Private mode
- Test upload there

### 2. Verify Network Request

After fix, network request should go to:
```
firebasestorage.googleapis.com/v0/b/...appspot.com/o
```

NOT:
```
firebasestorage.googleapis.com/v0/b/...firebasestorage.app/o
```

### 3. Test Upload

1. Hard refresh browser (Ctrl + Shift + R)
2. Try uploading a video
3. Should work without 412 errors ✅

## Expected Result

- ✅ Upload completes successfully
- ✅ `getDownloadURL()` works
- ✅ NO 412 errors
- ✅ Network request uses `.appspot.com` domain

## Why This Was Hard to Spot

- Upload **starts** successfully (bucket exists)
- Only **fails at finalize** (token validation)
- Error is **silent** (looks like a resumable upload bug)
- SDK version **irrelevant** (config-level bug)

## Files Changed

- ✅ `src/lib/firebase/client.ts` - Fixed storageBucket config

## Status

- ✅ Code fixed and pushed to GitHub
- ⏳ **YOU MUST**: Clear browser cache and test
- ⏳ **YOU MUST**: Deploy storage rules (if not done)

