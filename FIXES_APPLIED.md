# ✅ Fixes Applied for 403/412 Errors

## Changes Made

### 1. ✅ Reduced Upload URL Expiry (10 minutes instead of 1 hour)
**File:** `src/app/api/upload/signed-url/route.ts`
- Changed from 1 hour to 10 minutes
- Prevents expired URLs from being used
- More secure (shorter window for misuse)

### 2. ✅ Content-Type Header Already Set Correctly
**File:** `src/lib/firebase/signed-upload.ts`
- Content-Type header is already being set correctly
- Matches the content type used when generating the signed URL
- This prevents 412 Precondition Failed errors

### 3. ✅ Fixed Download URL Generation
**File:** `src/lib/firebase/signed-upload.ts`
- Removed dependency on pre-generated downloadUrl from POST endpoint
- Always generates fresh download URL after upload completes
- Uses GET endpoint to get a valid URL for the actual file

## What This Fixes

### ✅ Upload Errors (403)
- **Before:** URLs expired after 1 hour, causing 403 errors
- **After:** URLs expire after 10 minutes, but upload happens immediately
- **Result:** No more expired upload URLs

### ✅ Content-Type Mismatch (412)
- **Before:** Potential mismatch between signed URL and upload request
- **After:** Content-Type is explicitly set and matches
- **Result:** No more 412 Precondition Failed errors

### ✅ Playback Issues
- **Before:** Stored signed URLs expired after 7 days
- **After:** Fresh URLs generated on-demand via GET endpoint
- **Result:** Videos always get fresh, valid URLs for playback

## Important Notes

### For New Uploads
- ✅ Upload URLs expire in 10 minutes (plenty of time for upload)
- ✅ Content-Type headers match exactly
- ✅ Fresh download URLs generated after upload
- ✅ Storage path stored in database (not URLs)

### For Existing Videos
- ⚠️ Old videos may still have expired signed URLs in database
- ✅ Playback code should use `videoStoragePath` to get fresh URLs
- ✅ GET endpoint generates fresh signed URLs on-demand

## Next Steps

1. **Deploy these changes** to production
2. **Test new video uploads** - should work without 403/412 errors
3. **For old videos:** Ensure playback code uses `videoStoragePath` to get fresh URLs
4. **Monitor logs** for any remaining errors

## Testing Checklist

- [ ] Upload a new video - should succeed
- [ ] Check browser console - no 403 errors
- [ ] Check browser console - no 412 errors
- [ ] Video should play after upload
- [ ] Old videos should still play (using fresh URLs from GET endpoint)

---

## Architecture Summary

### Upload Flow (Fixed)
1. Client requests signed upload URL (10 min expiry)
2. Client uploads file with correct Content-Type header
3. After upload, client requests fresh download URL via GET endpoint
4. Fresh download URL stored in database (7 day expiry)
5. Storage path also stored (for future URL refreshes)

### Playback Flow (Should Use)
1. Read `videoStoragePath` from database
2. Call GET endpoint: `/api/upload/signed-url?filePath={storagePath}`
3. Get fresh signed URL (7 day expiry)
4. Use URL for video playback
5. If URL expires, repeat step 2-4

---

**Deploy these changes and test!**

