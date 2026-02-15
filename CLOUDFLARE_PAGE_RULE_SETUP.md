# Cloudflare Page Rule Setup for Video Streaming

## ⚠️ CRITICAL: This Page Rule is REQUIRED for Range Requests

Without this Page Rule, Range requests (bytes=...) will not work correctly, causing videos to stop after 10-15 seconds.

---

## Step-by-Step Instructions

### 1. Go to Cloudflare Dashboard

**URL**: https://dash.cloudflare.com

1. Select your domain: **aaura.live**
2. Click **Rules** in the left sidebar
3. Click **Page Rules** (or go directly to: https://dash.cloudflare.com/YOUR_ZONE_ID/rules/page-rules)

### 2. Create New Page Rule

1. Click **"Create Page Rule"** button (top right)

### 3. Configure URL Pattern

**URL Pattern:**
```
*videos.aaura.live/*/o/*
```

**Important**: 
- The `*` at the start matches any subdomain (though we only have `videos`)
- The `/*/o/*` matches the Firebase Storage path structure: `/v0/b/BUCKET/o/PATH`

### 4. Add Settings

Click **"Add a Setting"** and add these settings **in this order**:

#### Setting 1: Cache Level
- **Setting**: `Cache Level`
- **Value**: `Bypass`
- **Why**: Ensures Range requests pass through to Firebase correctly

#### Setting 2: Origin Cache Control
- **Setting**: `Origin Cache Control`
- **Value**: `On`
- **Why**: Respects Firebase's cache headers

#### Setting 3: Browser Cache TTL (Optional)
- **Setting**: `Browser Cache TTL`
- **Value**: **Don't add this setting** (leave empty) OR `2 hours` if you must set it
- **Why**: 
  - If "Respect Existing Headers" is not available, don't set Browser Cache TTL
  - Cloudflare will use default behavior which often respects origin headers
  - Setting a specific time (like 4 hours) risks token expiration issues
  - See `CLOUDFLARE_BROWSER_CACHE_TTL_OPTIONS.md` for alternatives

### 5. Save Rule

1. Click **"Save and Deploy"**
2. Wait for confirmation: **"Page Rule created"**

### 6. Verify Rule is Active

- Rule should appear in the list
- Status should show **"Active"** (green)
- Order should be correct (rules are processed top to bottom)

---

## Rule Configuration Summary

```
URL Pattern: *videos.aaura.live/*/o/*

Settings:
├─ Cache Level: Bypass
├─ Origin Cache Control: On
└─ Browser Cache TTL: Respect Existing Headers
```

---

## Why These Settings?

### Cache Level: Bypass
- **Critical for Range requests**: Prevents Cloudflare from caching partial responses
- **Ensures 206 Partial Content**: Range requests must reach Firebase
- **Token validation**: Signed URLs work correctly

### Origin Cache Control: On
- **Respects Firebase headers**: Uses Firebase's cache-control directives
- **Prevents over-caching**: Doesn't cache longer than Firebase allows

### Browser Cache TTL: Respect Existing Headers
- **Uses Firebase headers**: Browser caching follows Firebase's rules
- **Proper expiration**: Tokens expire correctly

---

## Testing the Page Rule

### Test 1: Check Rule is Active

1. Go to Page Rules list
2. Find rule: `*videos.aaura.live/*/o/*`
3. Verify status: **Active** ✅

### Test 2: Test Range Request

```bash
curl -I -H "Range: bytes=0-1023" \
  "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FVIDEO.mp4?alt=media&token=TOKEN"
```

**Expected Response:**
```
HTTP/2 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1023/10485760
Content-Length: 1024
```

### Test 3: Check Cloudflare Headers

```bash
curl -I "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FVIDEO.mp4?alt=media&token=TOKEN"
```

**Look for:**
- `cf-cache-status: BYPASS` (if rule is working)
- `Accept-Ranges: bytes`
- `Content-Length` header

---

## Troubleshooting

### Rule Not Working?

1. **Check rule order**: Rules are processed top to bottom
   - More specific rules should be higher
   - This rule should be near the top

2. **Check URL pattern**: Must match exactly
   - `*videos.aaura.live/*/o/*` (correct)
   - `videos.aaura.live/*` (too broad, might conflict)

3. **Wait for propagation**: Rules can take 1-2 minutes to activate

4. **Purge cache**: After creating rule, purge Cloudflare cache

### Still Getting 403 Errors?

1. **Check Firebase Storage rules**: Must allow public read
2. **Check token validity**: Signed URLs must have valid tokens
3. **Check DNS**: `videos.aaura.live` must resolve to Cloudflare

### Range Requests Still Not Working?

1. **Verify rule is active**: Check Page Rules list
2. **Check cache status**: Should see `cf-cache-status: BYPASS`
3. **Test direct Firebase URL**: Bypass CDN to isolate issue
4. **Check browser console**: Look for CORS or CSP errors

---

## Alternative: Cache Rule (If Page Rule Doesn't Work)

If Page Rules don't work, use **Cache Rules**:

1. Go to: **Rules → Cache Rules**
2. Click **"Create rule"**
3. **Rule name**: "Bypass video cache"
4. **When incoming requests match**:
   - **Hostname**: `videos.aaura.live`
   - **Path**: Contains `/o/`
5. **Then**:
   - **Cache status**: `Bypass`
6. **Deploy**

---

## Important Notes

⚠️ **Do NOT** set these settings:
- ❌ Cache Everything (breaks Range requests)
- ❌ Edge Cache TTL: 4 hours (too aggressive)
- ❌ Always Online (not needed for videos)

✅ **DO** use:
- ✅ Cache Level: Bypass
- ✅ Origin Cache Control: On
- ✅ Browser Cache TTL: Respect Existing Headers

---

## Verification Checklist

- [ ] Page Rule created
- [ ] URL pattern: `*videos.aaura.live/*/o/*`
- [ ] Cache Level: Bypass
- [ ] Origin Cache Control: On
- [ ] Browser Cache TTL: Respect Existing Headers
- [ ] Rule status: Active
- [ ] Cache purged after rule creation
- [ ] Range requests return 206 Partial Content
- [ ] Videos play fully without stopping

---

## After Setup

1. **Purge Cloudflare cache** (see main setup guide)
2. **Test video playback**
3. **Monitor Cloudflare Analytics** for cache hit ratio
4. **Check browser Network tab** for Range requests

---

**This Page Rule is CRITICAL for video streaming to work correctly!**

