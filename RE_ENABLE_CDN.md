# Re-Enable CDN - Quick Guide

## Problem
CDN was automatically disabled after multiple failures (403 errors). You're seeing:
```
[CDN] CDN is disabled due to previous failures. Clear localStorage to re-enable.
```

## Solution: Re-Enable CDN

### Option 1: Browser Console (Easiest)

1. **Open Browser Console** (F12 or Right-click → Inspect → Console)

2. **Run this command**:
   ```javascript
   localStorage.removeItem('cdn_disabled');
   location.reload();
   ```

3. **Or use the helper function** (if available):
   ```javascript
   window.enableCdn();
   location.reload();
   ```

### Option 2: Fix Storage Rules First (Recommended)

**Before re-enabling CDN, fix the root cause (403 errors):**

1. **Deploy Storage Rules**:
   - Go to: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules
   - Copy rules from `storage.rules` file
   - Paste and click **Publish**
   - Verify "Published" status

2. **Test CDN**:
   ```bash
   curl -I "https://aaura.live/videos/test"
   ```
   - Should return `200 OK` (not `403 Forbidden`)

3. **Then re-enable CDN** (Option 1 above)

### Option 3: Programmatic Re-Enable

If you want to re-enable CDN in code:

```typescript
import { enableCdn } from '@/lib/firebase/cdn-urls';

// Re-enable CDN
enableCdn();
```

## Why Was CDN Disabled?

CDN was automatically disabled after **5 consecutive failures** (403 errors). This happens when:
- Firebase Storage rules are not deployed
- CDN Worker has configuration issues
- Network/authentication problems

## Prevention

1. **Deploy Storage Rules** properly (see Option 2)
2. **Monitor CDN errors** in browser console
3. **Fix 403 errors** before they accumulate

## Verify CDN is Working

After re-enabling:

1. **Check console** - Should see:
   ```
   [CDN] Converted Firebase URL to CDN URL
   ```

2. **Check network tab** - Video requests should go to `aaura.live` (not `firebasestorage.googleapis.com`)

3. **No more 403 errors** - CDN should return `200 OK`

## Notes

- CDN is **optional** - Videos work fine with Firebase Storage directly
- CDN improves performance but isn't critical for functionality
- If CDN keeps failing, it will auto-disable again after 5 failures







