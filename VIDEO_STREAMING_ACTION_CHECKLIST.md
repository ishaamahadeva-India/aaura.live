# ✅ Video Streaming Setup - Action Checklist

## 🎯 Quick Action Items

Follow these steps **in order** to complete the video streaming setup:

---

## ✅ Step 1: Cloudflare Subdomain (DONE)

- [x] CNAME record created: `videos.aaura.live` → `firebasestorage.googleapis.com`
- [x] Proxy status: **Proxied** (Orange Cloud) ✅

**Status**: ✅ **COMPLETE**

---

## ✅ Step 2: Code Updates (DONE)

- [x] Code updated to use `videos.aaura.live` subdomain
- [x] All Firebase URLs automatically converted
- [x] CSP headers updated to include `videos.aaura.live`

**Status**: ✅ **COMPLETE**

---

## ⚠️ Step 3: Cloudflare Page Rule (REQUIRED - DO THIS NOW)

**This is CRITICAL for Range requests to work!**

### Action Required:

1. **Go to**: https://dash.cloudflare.com → Your Domain → Rules → Page Rules

2. **Create Rule:**
   - **URL Pattern**: `*videos.aaura.live/*/o/*`
   - **Settings**:
     - Cache Level: **Bypass**
     - Origin Cache Control: **On**
     - Browser Cache TTL: **Respect Existing Headers**

3. **Save and Deploy**

**Detailed Instructions**: See `CLOUDFLARE_PAGE_RULE_SETUP.md`

**Status**: ⚠️ **ACTION REQUIRED**

---

## ⚠️ Step 4: Purge Cloudflare Cache (REQUIRED)

**After creating Page Rule:**

1. **Go to**: Cloudflare Dashboard → Caching → Purge Cache
2. **Select**: "Purge Everything"
3. **Click**: "Purge Everything"
4. **Wait**: 30 seconds

**Status**: ⚠️ **ACTION REQUIRED**

---

## ✅ Step 5: Test Video Streaming

### Quick Test:

1. **Restart dev server**
2. **Play a video**
3. **Open DevTools** (F12) → Network tab
4. **Check**:
   - ✅ URLs use `videos.aaura.live`
   - ✅ Status: `206 Partial Content`
   - ✅ Headers include: `Accept-Ranges: bytes`
   - ✅ Video plays fully without stopping

### Detailed Test:

Run the test script:
```bash
./scripts/test-video-streaming.sh
```

**Status**: ⚠️ **TEST AFTER STEPS 3 & 4**

---

## 📋 Complete Checklist

### Infrastructure
- [x] Cloudflare CNAME subdomain created
- [x] Proxy enabled (Orange Cloud)
- [ ] **Cloudflare Page Rule created** ⚠️
- [ ] **Cloudflare cache purged** ⚠️

### Code
- [x] CDN URL conversion implemented
- [x] CSP headers updated
- [x] Helper utilities created
- [x] All video components use CDN

### Testing
- [ ] DNS resolves to Cloudflare
- [ ] Range requests return 206
- [ ] Videos play fully
- [ ] HLS playlists work
- [ ] No CSP errors

---

## 🚨 Critical: Page Rule Must Be Created

**Without the Page Rule:**
- ❌ Range requests won't work
- ❌ Videos will stop after 10-15 seconds
- ❌ 206 Partial Content won't be returned

**With the Page Rule:**
- ✅ Range requests work correctly
- ✅ Videos stream fully
- ✅ 206 Partial Content returned
- ✅ Signed URLs work with caching

---

## 📚 Documentation Created

1. **`COMPLETE_VIDEO_STREAMING_SETUP.md`** - Full setup guide
2. **`CLOUDFLARE_PAGE_RULE_SETUP.md`** - Page Rule instructions
3. **`VIDEO_STREAMING_ACTION_CHECKLIST.md`** - This file
4. **`src/lib/firebase/video-url-helper.ts`** - Helper utilities
5. **`scripts/test-video-streaming.sh`** - Test script

---

## 🎯 Next Steps (In Order)

1. **Create Cloudflare Page Rule** (Step 3) - ⚠️ CRITICAL
2. **Purge Cloudflare Cache** (Step 4)
3. **Restart dev server**
4. **Test video playback** (Step 5)
5. **Verify Range requests** (Network tab)
6. **Deploy to production**

---

## ✅ Success Criteria

Your setup is complete when:

- [x] Subdomain created ✅
- [x] Code updated ✅
- [ ] Page Rule active ⚠️
- [ ] Cache purged ⚠️
- [ ] Videos play fully ⚠️
- [ ] Range requests return 206 ⚠️
- [ ] No errors in console ⚠️

---

## 🆘 If Videos Still Stop

1. **Check Page Rule is active** (most common issue)
2. **Verify cache is purged**
3. **Check browser console** for errors
4. **Test Range requests** manually
5. **Verify DNS** resolves to Cloudflare
6. **Check Firebase Storage rules** allow public read

---

## 📞 Quick Reference

- **Page Rule Setup**: `CLOUDFLARE_PAGE_RULE_SETUP.md`
- **Full Guide**: `COMPLETE_VIDEO_STREAMING_SETUP.md`
- **Test Script**: `./scripts/test-video-streaming.sh`
- **Helper Functions**: `src/lib/firebase/video-url-helper.ts`

---

**Priority**: Create the Cloudflare Page Rule NOW - it's the missing piece! 🚨







