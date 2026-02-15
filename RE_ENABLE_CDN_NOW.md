# 🔄 Re-enable CDN After Page Rule Setup

## Current Status

**CDN is disabled** due to previous failures (Error Code 4).  
**Reason**: CDN failed before Page Rule was created.

---

## ✅ Re-enable CDN (After Creating Page Rule)

### Method 1: Browser Console (Quick)

1. **Open browser console** (F12)
2. **Run this command**:
   ```javascript
   localStorage.removeItem('cdn_disabled');
   location.reload();
   ```

### Method 2: Using Global Function

1. **Open browser console** (F12)
2. **Run this command**:
   ```javascript
   window.enableCdn();
   location.reload();
   ```

### Method 3: Manual Clear

1. **Open browser console** (F12)
2. **Go to**: Application tab → Local Storage
3. **Find**: `cdn_disabled`
4. **Delete** it
5. **Reload** page

---

## ⚠️ Important: Create Page Rule First!

**DO NOT re-enable CDN until you've created the Cloudflare Page Rule!**

Without the Page Rule:
- ❌ CDN will fail again (Error Code 4)
- ❌ Videos won't play
- ❌ CDN will auto-disable again

**With the Page Rule**:
- ✅ Range requests work
- ✅ Videos stream correctly
- ✅ No Error Code 4

---

## Step-by-Step Process

### Step 1: Create Cloudflare Page Rule

1. Go to: https://dash.cloudflare.com → Your Domain → Rules → Page Rules
2. Create rule:
   - URL: `*videos.aaura.live/*/o/*`
   - Cache Level: **Bypass**
   - Origin Cache Control: **On**
   - Browser Cache TTL: **Respect Existing Headers**
3. Save

**See**: `CLOUDFLARE_PAGE_RULE_SETUP.md` for details

### Step 2: Purge Cloudflare Cache

1. Go to: Caching → Purge Cache
2. Purge Everything
3. Wait 30 seconds

### Step 3: Re-enable CDN

**In browser console**:
```javascript
localStorage.removeItem('cdn_disabled');
location.reload();
```

### Step 4: Verify

1. **Check console**: Should see `[CDN] Converted Firebase URL to CDN URL`
2. **Check Network tab**: URLs should use `videos.aaura.live`
3. **Play video**: Should work without Error Code 4

---

## Verification Checklist

After re-enabling:

- [ ] Page Rule is active
- [ ] Cache is purged
- [ ] CDN is re-enabled (no "CDN is disabled" message)
- [ ] Console shows CDN URL conversion
- [ ] Network tab shows `videos.aaura.live` URLs
- [ ] Videos play without Error Code 4
- [ ] Range requests return 206 Partial Content

---

## If CDN Fails Again

If you still get Error Code 4 after re-enabling:

1. **Check Page Rule is active** (most common issue)
2. **Verify DNS**: `dig videos.aaura.live` should show Cloudflare IPs
3. **Test direct URL**: `curl -I "https://videos.aaura.live/..."` should return 200/206
4. **Check Firebase Storage rules**: Must allow public read
5. **Check URL format**: Should not have `.firebasestorage.app` in path

---

## Quick Re-enable Script

Save this as a bookmarklet for easy re-enabling:

```javascript
javascript:(function(){localStorage.removeItem('cdn_disabled');location.reload();})();
```

Or run in console:
```javascript
localStorage.removeItem('cdn_disabled'); location.reload();
```

---

## Current Behavior

- ✅ CDN auto-disables after failures (prevents infinite retries)
- ✅ Falls back to Firebase URLs (videos still work)
- ✅ Easy re-enable via localStorage
- ✅ Global functions available: `window.enableCdn()` and `window.disableCdn()`

---

**Remember**: Create the Page Rule FIRST, then re-enable CDN! 🚨







