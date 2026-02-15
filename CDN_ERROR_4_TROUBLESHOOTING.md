# 🔧 CDN Error 4 (Format Error) - Troubleshooting

## Current Issue

**Error**: `MEDIA_ELEMENT_ERROR: Format error` (Error Code 4)  
**Symptom**: CDN URL fails, falls back to Firebase URL  
**URL Pattern**: `https://videos.aaura.live/v0/b/studio-9632556640-bd58d.firebasestorage.app/o/posts%2F...`

---

## Root Causes

### 1. ⚠️ Cloudflare Page Rule Not Created (MOST LIKELY)

**Problem**: Without the Page Rule, Cloudflare doesn't know how to handle Range requests for videos.

**Solution**: **CREATE THE PAGE RULE NOW** (see `CLOUDFLARE_PAGE_RULE_SETUP.md`)

**Why it's critical**:
- Page Rule tells Cloudflare to bypass cache for video paths
- Without it, Range requests fail
- Videos get Format error (code 4)

### 2. URL Format Issue

**Problem**: URL might have `.firebasestorage.app` in path (wrong format)

**Solution**: Code updated to handle both formats:
- ✅ `firebasestorage.googleapis.com/v0/b/BUCKET/o/path`
- ✅ `BUCKET.firebasestorage.app/o/path`

### 3. DNS Propagation

**Problem**: `videos.aaura.live` might not be fully propagated

**Check**:
```bash
dig videos.aaura.live
```

**Expected**: Should show Cloudflare IPs (104.16.x.x, 172.64.x.x, etc.)

### 4. Missing Query Parameters

**Problem**: URL might be missing `?alt=media&token=...`

**Check**: Look at full URL in console (not truncated)

---

## Immediate Fix Steps

### Step 1: Create Cloudflare Page Rule (CRITICAL)

1. **Go to**: https://dash.cloudflare.com → Your Domain → Rules → Page Rules
2. **Create Rule**:
   - URL: `*videos.aaura.live/*/o/*`
   - Cache Level: **Bypass**
   - Origin Cache Control: **On**
   - Browser Cache TTL: **Respect Existing Headers**
3. **Save**

**This is THE most important step!**

### Step 2: Purge Cache

1. **Go to**: Caching → Purge Cache
2. **Purge Everything**
3. **Wait**: 30 seconds

### Step 3: Test Direct URL

```bash
# Replace with actual video path and token
curl -I "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FVIDEO.mp4?alt=media&token=TOKEN"
```

**Expected**: `200 OK` or `206 Partial Content`

### Step 4: Check URL Format

In browser console, check the **full URL** (not truncated):
- Should include: `?alt=media&token=...`
- Should NOT have: `.firebasestorage.app` in the path after conversion

---

## Code Fixes Applied

✅ **Updated URL conversion** to handle `.firebasestorage.app` format  
✅ **Better logging** to see full URLs  
✅ **Preserves query parameters** correctly

---

## Verification

After creating Page Rule:

1. **Restart dev server**
2. **Play video**
3. **Check console**:
   - Should see: `[CDN] Converted Firebase URL to CDN URL (subdomain)`
   - Should see: `hasQueryParams: true`
   - Should see: `hasToken: true`

4. **Check Network tab**:
   - URL should be: `https://videos.aaura.live/v0/b/...`
   - Status should be: `206 Partial Content` (not 4xx error)
   - Headers should include: `Accept-Ranges: bytes`

---

## If Still Failing

### Option 1: Temporarily Disable CDN

```javascript
// In browser console:
localStorage.setItem('cdn_disabled', 'true');
location.reload();
```

This will use Firebase URLs directly (bypasses CDN).

### Option 2: Check Firebase URL Format

The Firebase URL might be in `.firebasestorage.app` format. Check:
- Original Firebase URL format
- Whether it includes query parameters
- Whether the path is correct

### Option 3: Test Without CDN

Temporarily disable CDN to verify Firebase URLs work:
- If Firebase URLs work → CDN setup issue
- If Firebase URLs fail → Firebase Storage rules issue

---

## Most Likely Solution

**90% chance**: The Cloudflare Page Rule hasn't been created yet.

**Action**: Create the Page Rule (see `CLOUDFLARE_PAGE_RULE_SETUP.md`)

Once the Page Rule is active, Error 4 should disappear and videos should stream correctly.

---

## Next Steps

1. **Create Page Rule** ← DO THIS FIRST
2. **Purge cache**
3. **Restart dev server**
4. **Test video playback**
5. **Verify Range requests work**

---

**The Page Rule is the missing piece!** 🚨







