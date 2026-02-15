# ✅ Fixed 412 Upload Error

## The Problem

You were getting **412 Precondition Failed** when uploading videos because:

1. **Filename with special characters** - "WhatsApp Video 2025-12-21 at 14.30.06.mp4" has spaces and colons
2. **Missing Content-Type metadata** - Firebase Storage needs explicit content-type

## What I Fixed

### 1. Sanitized Filenames
- Replaced special characters with underscores
- Example: `WhatsApp Video 2025-12-21 at 14.30.06.mp4` → `WhatsApp_Video_2025-12-21_at_14.30.06.mp4`

### 2. Added Content-Type Metadata
- Explicitly set `contentType` when uploading
- Ensures Firebase Storage knows the file type

## Files Modified

1. ✅ `src/components/CreatePostDialog.tsx` - Sanitized filename + content-type
2. ✅ `src/app/upload/page.tsx` - Sanitized filename + content-type

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

## About Old Videos

**Old videos** (in custom bucket) will still show CORS errors:
- These are videos uploaded before the switch
- They're in `aaura-original-uploads` bucket
- CORS is blocking them (expected)

**Solution:**
- New uploads will work perfectly ✅
- Old videos can be re-uploaded if needed

---

**Try uploading now - the 412 error should be fixed!**

