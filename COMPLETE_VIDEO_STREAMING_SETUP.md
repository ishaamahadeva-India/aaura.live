# 🎬 Complete Video Streaming Setup for aaura.live

## Overview
This guide provides a complete solution for video streaming using Firebase Storage + Cloudflare CDN with proper Range request support.

---

## ✅ Step 1: Cloudflare Subdomain (COMPLETED)

### CNAME Record
- **Subdomain**: `videos.aaura.live`
- **Type**: CNAME
- **Target**: `firebasestorage.googleapis.com`
- **Proxy Status**: **Proxied** (Orange Cloud) ✅

**Status**: ✅ Already created

---

## ✅ Step 2: Code Updates (COMPLETED)

### Files Updated
- ✅ `src/lib/firebase/cdn-urls.ts` - Domain replacement logic
- ✅ `src/lib/firebase/storage-urls.ts` - URL conversion
- ✅ `src/components/FeedCard.tsx` - CDN URL detection

**Status**: ✅ Code automatically converts Firebase URLs to `videos.aaura.live`

---

## 🔧 Step 3: Cloudflare Page Rule (REQUIRED)

### Create Page Rule

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com
   - Select your domain: `aaura.live`

2. **Navigate to Rules → Page Rules**

3. **Click "Create Page Rule"**

4. **Configure Rule:**

   **URL Pattern:**
   ```
   *videos.aaura.live/*/o/*
   ```

   **Settings (Add these in order):**
   
   - **Cache Level**: `Bypass`
   - **Origin Cache Control**: `On`
   - **Cache Everything**: `Off` (or don't add this)
   - **Browser Cache TTL**: `Respect Existing Headers`

5. **Click "Save and Deploy"**

### Why These Settings?

- **Cache Level: Bypass** - Ensures Range requests work correctly
- **Origin Cache Control: On** - Respects Firebase cache headers
- **No aggressive caching** - Prevents token/signature issues

---

## 🔧 Step 4: Cloudflare Cache Settings

### Additional Settings to Check

1. **Go to**: Caching → Configuration

2. **Verify**:
   - **Caching Level**: Standard
   - **Browser Cache TTL**: Respect Existing Headers
   - **Always Online**: Off (for videos)

3. **Cache Rules** (Optional but recommended):
   - Create rule for `videos.aaura.live`
   - Cache Level: Bypass
   - Edge Cache TTL: 2 hours (for segments)

---

## 🧪 Step 5: Testing & Verification

### Test 1: DNS Resolution

```bash
dig videos.aaura.live
```

**Expected**: Should show Cloudflare IPs (not Google IPs)

### Test 2: Direct URL Test

```bash
# Replace with actual video path
curl -I "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FVIDEO.mp4?alt=media&token=TOKEN"
```

**Expected Headers:**
```
HTTP/2 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-1048575/10485760
Content-Length: 1048576
```

### Test 3: Range Request Test

```bash
curl -I -H "Range: bytes=0-1023" "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FVIDEO.mp4?alt=media&token=TOKEN"
```

**Expected:**
```
HTTP/2 206 Partial Content
Content-Range: bytes 0-1023/10485760
Content-Length: 1024
Accept-Ranges: bytes
```

### Test 4: Browser Network Tab

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Play a video**
4. **Check request headers:**

   ✅ **Request Headers:**
   ```
   Range: bytes=0-1048575
   ```

   ✅ **Response Headers:**
   ```
   Status: 206 Partial Content
   Accept-Ranges: bytes
   Content-Range: bytes 0-1048575/10485760
   Content-Length: 1048576
   ```

### Test 5: HLS Playlist Test

```bash
# Test master playlist
curl "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2Fhls%2FVIDEO_ID%2Fmaster.m3u8?alt=media&token=TOKEN"

# Test segment
curl -I "https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2Fhls%2FVIDEO_ID%2Fsegment000.ts?alt=media&token=TOKEN"
```

**Expected**: Should return playlist/segment content

---

## 🧹 Step 6: Purge Cloudflare Cache

### Method 1: Purge Everything (Recommended after setup)

1. **Go to**: Cloudflare Dashboard → Caching → Purge Cache
2. **Select**: "Purge Everything"
3. **Click**: "Purge Everything"
4. **Wait**: 30 seconds for propagation

### Method 2: Purge by URL Pattern

1. **Go to**: Caching → Purge Cache
2. **Select**: "Custom Purge"
3. **Enter**: `https://videos.aaura.live/*`
4. **Click**: "Purge"

### Method 3: Purge via API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## 📝 Step 7: Vercel Configuration

### Ensure Vercel Doesn't Proxy Videos

**File: `vercel.json`** (create if doesn't exist):

```json
{
  "headers": [
    {
      "source": "/videos/:path*",
      "headers": [
        {
          "key": "X-Robots-Tag",
          "value": "noindex"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/videos/:path*",
      "destination": "https://videos.aaura.live/:path*"
    }
  ]
}
```

**OR** (Better - don't proxy at all):

```json
{
  "headers": []
}
```

**Recommendation**: Don't create rewrites for videos. Let them go directly to `videos.aaura.live`.

---

## 🔍 Step 8: Verify Implementation

### Checklist

- [ ] DNS: `videos.aaura.live` resolves to Cloudflare IPs
- [ ] CNAME: Proxied (Orange Cloud) enabled
- [ ] Page Rule: Created with correct pattern
- [ ] Code: URLs converted to `videos.aaura.live`
- [ ] Cache: Purged after setup
- [ ] Range Requests: Return `206 Partial Content`
- [ ] MP4 Videos: Play fully without stopping
- [ ] HLS Videos: Playlists and segments load correctly
- [ ] Network Tab: Shows `videos.aaura.live` URLs
- [ ] Headers: Include `Accept-Ranges: bytes`

---

## 🐛 Troubleshooting

### Videos Still Stop After 10-15 Seconds

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Cloudflare Page Rule is active
4. Cache is purged

**Solution**: See video playback fixes in `FeedCard.tsx` (already implemented)

### Range Requests Not Working

**Check:**
1. Page Rule has "Cache Level: Bypass"
2. Cloudflare is not caching aggressively
3. Firebase Storage rules allow Range requests

**Solution**: Ensure Page Rule is configured correctly

### HLS Playlists Not Loading

**Check:**
1. HLS files exist in Firebase Storage
2. URLs use `videos.aaura.live` subdomain
3. Storage rules allow public read for HLS files

**Solution**: Verify HLS files are accessible via direct URL

### CSP Errors

**Add to `next.config.js`:**
```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; media-src 'self' https://videos.aaura.live https://firebasestorage.googleapis.com;"
      }
    ]
  }
]
```

---

## 📊 Monitoring

### Cloudflare Analytics

1. **Go to**: Analytics → Web Traffic
2. **Filter by**: `videos.aaura.live`
3. **Monitor**:
   - Request volume
   - Cache hit ratio
   - Error rates

### Browser Console

Watch for:
- `[CDN] Converted Firebase URL to CDN URL (subdomain)`
- `206 Partial Content` responses
- No `403` or `404` errors

---

## ✅ Success Criteria

Your setup is working when:

1. ✅ Videos play from start to finish without stopping
2. ✅ Network tab shows `videos.aaura.live` URLs
3. ✅ Range requests return `206 Partial Content`
4. ✅ HLS playlists load and stream correctly
5. ✅ No CSP or fetch errors in console
6. ✅ Cloudflare cache is working (check Analytics)

---

## 🚀 Next Steps

1. **Create Cloudflare Page Rule** (Step 3)
2. **Purge Cache** (Step 6)
3. **Test Videos** (Step 5)
4. **Monitor** (Monitoring section)
5. **Deploy** to production

---

## 📞 Support

If issues persist:
1. Check Cloudflare Page Rule is active
2. Verify DNS propagation
3. Test direct URLs in browser
4. Check browser console for errors
5. Verify Firebase Storage rules allow public read







