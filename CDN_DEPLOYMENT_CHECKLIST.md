# CDN Deployment Checklist - Quick Setup

## ⚡ Quick Setup (5 Steps)

### ✅ Step 1: Deploy Storage Rules (2 minutes)

**Via Firebase Console:**
1. Go to: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules
2. Copy contents of `storage.rules`
3. Paste and click **Publish**

**OR via CLI:**
```bash
firebase deploy --only storage:rules
```

---

### ✅ Step 2: Create Cloudflare Worker (5 minutes)

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com
   - Select domain: **aaura.live**

2. **Create Worker**
   - Click: **Workers & Pages** → **Create application** → **Create Worker**
   - Name: `video-cdn`
   - Click **Deploy**

3. **Add Code**
   - Click **Edit code** (or Quick edit)
   - **Delete all code**
   - **Copy entire file**: `CLOUDFLARE_WORKER_FINAL.js`
   - **Paste** into editor
   - Click **Save and deploy**

---

### ✅ Step 3: Add Route (1 minute)

1. In Worker page, click **Settings** tab
2. Scroll to **Triggers** section
3. Click **Add route**
4. Enter:
   - Route: `aaura.live/videos/*`
   - Zone: `aaura.live`
5. Click **Save**

---

### ✅ Step 4: Test CDN (2 minutes)

1. **Test Worker**
   - Visit: `https://aaura.live/videos/test`
   - Should return JSON error (not 404) = Worker is working

2. **Test with Real Video**
   - Get a video path from Firestore (e.g., `posts/userId/video.mp4`)
   - Test: `https://aaura.live/videos/posts/userId/video.mp4`
   - Should return video or proper error

3. **Check Logs**
   - Cloudflare Dashboard → Workers & Pages → video-cdn → Logs
   - Look for errors

---

### ✅ Step 5: Enable CDN in App (1 minute)

1. **Clear CDN Disable Flag** (if it was auto-disabled):
   ```javascript
   // In browser console:
   localStorage.removeItem('cdn_disabled');
   location.reload();
   ```

2. **Verify CDN is Enabled**
   - Check browser console for `[CDN]` messages
   - Check Network tab - should see `aaura.live/videos/...` requests

---

## 🔍 Verification

After setup, verify:

- [ ] Storage rules deployed (check Firebase Console)
- [ ] Worker deployed and active (check Cloudflare Dashboard)
- [ ] Route configured: `aaura.live/videos/*`
- [ ] Test URL works (even if returns error, means Worker is working)
- [ ] Videos load from CDN (check Network tab in browser)
- [ ] No 403 errors (means rules are deployed)
- [ ] No 404 errors (means route is working)

---

## 🐛 Common Issues & Quick Fixes

### 403 Permission Denied
→ **Fix**: Deploy storage rules (Step 1)

### 404 Not Found  
→ **Fix**: Check route is `aaura.live/videos/*` (Step 3)

### Worker Not Responding
→ **Fix**: Redeploy Worker (Step 2)

### Videos Still from Firebase
→ **Fix**: Clear `localStorage.removeItem('cdn_disabled')` (Step 5)

---

## 📋 Files You Need

1. **Worker Code**: `CLOUDFLARE_WORKER_FINAL.js`
2. **Storage Rules**: `storage.rules`
3. **CDN Config**: Already in code (`src/lib/firebase/cdn-urls.ts`)

---

## ⏱️ Total Time: ~10 minutes

Once done, your videos will:
- ✅ Load faster from CDN
- ✅ Play smoothly without stalling
- ✅ Buffer better for long videos
- ✅ Work globally with edge servers

---

## 🆘 Need Help?

1. **Check Worker Logs**: Cloudflare Dashboard → Workers → Logs
2. **Check Storage Rules**: Firebase Console → Storage → Rules
3. **Test Direct URLs**: Try Firebase URL vs CDN URL
4. **See Full Guide**: `CDN_SETUP_COMPLETE_GUIDE.md`

---

**After completing these 5 steps, your CDN will be fully configured!** 🚀








