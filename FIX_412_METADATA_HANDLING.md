# ✅ Fixed 412 Error - Improved Metadata Handling

## The Problem

You were still getting **412 Precondition Failed** errors because:
- Content-Type might be `undefined` when `file.type` is empty
- Firebase Storage requires explicit, valid content-type
- Missing content-type causes precondition validation to fail

## What I Fixed

### 1. Always Set Content-Type
- Never pass `undefined` as contentType
- Always provide a valid MIME type

### 2. Infer Content-Type from Extension
- If `file.type` is missing, infer from file extension
- Supports common video/image formats:
  - Videos: mp4, mov, avi, webm
  - Images: jpg, jpeg, png, gif
- Falls back to `application/octet-stream` if unknown

### 3. Consistent Metadata Format
- Always pass metadata object (never undefined)
- Ensures Firebase Storage receives valid metadata

## Files Modified

1. ✅ `src/components/CreatePostDialog.tsx` - Improved metadata handling
2. ✅ `src/app/upload/page.tsx` - Improved metadata handling
3. ✅ `src/components/UploadReel.tsx` - Improved metadata handling + filename sanitization

## Test Now

1. **Restart dev server** (if running):
   ```bash
   # Stop (Ctrl+C) and restart
   npm run dev
   ```

2. **Try uploading a video again:**
   - Go to: `http://localhost:9002/upload`
   - Upload a test video
   - Should work without 412 error! ✅

## What Changed

### Before:
```typescript
uploadBytesResumable(storageRef, file, {
  contentType: file.type || undefined,  // ❌ Can be undefined
});
```

### After:
```typescript
let contentType = file.type;
if (!contentType) {
  // Infer from extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  contentType = mimeTypes[ext] || 'application/octet-stream';
}
uploadBytesResumable(storageRef, file, {
  contentType: contentType,  // ✅ Always valid
});
```

---

**Try uploading now - the 412 error should be fixed!**

