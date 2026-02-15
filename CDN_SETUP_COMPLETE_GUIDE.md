# Complete CDN Setup Guide - Get Videos Playing Smoothly

## Why CDN is Important

CDN (Content Delivery Network) helps videos play smoothly by:
- **Faster loading**: Videos load from edge servers closer to users
- **Better buffering**: CDN caches video segments for instant playback
- **Reduced stalling**: Better bandwidth management prevents mid-playback stops
- **Global performance**: Users worldwide get fast video delivery

## Prerequisites Checklist

Before setting up CDN, ensure:

- [ ] Firebase Storage rules are deployed (CRITICAL!)
- [ ] You have a Cloudflare account
- [ ] Your domain `aaura.live` is on Cloudflare
- [ ] You have access to Cloudflare Dashboard

---

## Step 1: Deploy Firebase Storage Rules (CRITICAL!)

**This MUST be done first, or CDN will return 403 errors!**

### Option A: Via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `studio-9632556640-bd58d`
3. Click **Storage** → **Rules** tab
4. Copy contents of `storage.rules` file
5. Paste into the editor
6. Click **Publish**

### Option B: Via Firebase CLI

```bash
cd "/home/surya/Downloads/aaura-india-main(2)/aaura-india-main"
firebase deploy --only storage:rules
```

**Verify**: Rules should show `allow read: if true` for `posts/` paths.

---

## Step 2: Create Cloudflare Worker

### 2.1 Access Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Click on domain: **aaura.live**

### 2.2 Create New Worker

1. Click **Workers & Pages** in left sidebar
2. Click **Create application** button
3. Select **"Create Worker"** (or "Start with Hello World")
4. Name it: `video-cdn` (or any name you prefer)
5. Click **Deploy**

### 2.3 Edit Worker Code

After deployment, you'll see the code editor:

1. **Delete all existing code**
2. **Copy the entire contents** of `CLOUDFLARE_WORKER_FINAL.js` from your project
3. **Paste it** into the Cloudflare editor
4. **Verify bucket name** is correct: `studio-9632556640-bd58d`
5. Click **Save and deploy**

---

## Step 3: Configure Worker Route

### 3.1 Add Custom Route

1. In your Worker page, click **Settings** tab
2. Scroll down to **Triggers** section
3. Click **Add route** button
4. Enter:
   - **Route**: `aaura.live/videos/*`
   - **Zone**: Select `aaura.live` from dropdown
5. Click **Save**

### 3.2 Verify Route

- Route should appear in the Triggers list
- Status should be "Active"

---

## Step 4: Test CDN Setup

### 4.1 Test Worker Directly

1. Get a video URL from your app (e.g., from Firestore)
2. Extract the storage path (e.g., `posts/userId/video.mp4`)
3. Test CDN URL: `https://aaura.live/videos/posts/userId/video.mp4`
4. Should return video (not error)

### 4.2 Check Worker Logs

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on your worker (`video-cdn`)
3. Click **Logs** tab
4. Check for any errors

### 4.3 Test in Browser

1. Open browser DevTools → Network tab
2. Play a video in your app
3. Look for requests to `aaura.live/videos/...`
4. Check response status (should be 200, not 403 or 404)

---

## Step 5: Verify CDN is Working

### 5.1 Check CDN URLs in Code

Your code already converts Firebase URLs to CDN URLs automatically. Verify:

1. Open browser console
2. Look for: `[CDN]` messages
3. Check if URLs are being converted to `aaura.live/videos/...`

### 5.2 Test Video Playback

1. Upload a new video
2. Play it in your app
3. Check Network tab - should see requests to `aaura.live`
4. Video should play smoothly without stalling

### 5.3 Performance Check

- **Before CDN**: Videos load from `firebasestorage.googleapis.com`
- **After CDN**: Videos load from `aaura.live` (faster, cached)

---

## Troubleshooting

### Issue: 403 Permission Denied

**Cause**: Firebase Storage rules not deployed

**Fix**:
```bash
firebase deploy --only storage:rules
```

Or deploy via Firebase Console (see Step 1).

---

### Issue: 404 Not Found

**Possible Causes**:

1. **Wrong file path**
   - Check the path in Firestore matches actual file in Storage
   - Verify file exists in Firebase Storage Console

2. **Wrong bucket name**
   - Check Worker code has correct bucket: `studio-9632556640-bd58d`
   - Try both formats: short and full bucket name

3. **Route not configured**
   - Verify route `aaura.live/videos/*` is added
   - Wait 1-2 minutes for DNS propagation

**Fix**:
- Check Cloudflare Worker logs for exact error
- Test direct Firebase URL to verify file exists
- Verify route is active in Cloudflare

---

### Issue: CORS Errors

**Cause**: Worker not sending CORS headers

**Fix**: The Worker code already includes CORS headers. If you see CORS errors:
1. Check Worker code has CORS headers (should be there)
2. Redeploy Worker
3. Clear browser cache

---

### Issue: Videos Still Loading from Firebase

**Cause**: CDN conversion not working

**Check**:
1. Verify `NEXT_PUBLIC_USE_CDN` is not set to `false`
2. Check browser console for `[CDN]` messages
3. Verify `getCdnUrl()` is being called

**Fix**:
- Check `src/lib/firebase/cdn-urls.ts` - should convert URLs
- Check `src/lib/firebase/storage-urls.ts` - should call `getCdnUrl()`

---

### Issue: Worker Not Responding

**Possible Causes**:

1. **Worker not deployed**
   - Check Workers & Pages → Your worker shows "Active"
   - Redeploy if needed

2. **Route not configured**
   - Check Settings → Triggers → Route exists
   - Route should be: `aaura.live/videos/*`

3. **DNS not propagated**
   - Wait 2-5 minutes after adding route
   - Try clearing DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

**Fix**:
- Redeploy Worker
- Re-add route
- Wait for DNS propagation

---

## Step 6: Enable CDN in Your App

### 6.1 Verify Environment Variable

Check if CDN is enabled:

```bash
# In your app, check:
echo $NEXT_PUBLIC_USE_CDN
# Should be empty or "true" (not "false")
```

### 6.2 Clear CDN Disable Flag

If CDN was auto-disabled due to failures:

```javascript
// In browser console:
localStorage.removeItem('cdn_disabled');
location.reload();
```

### 6.3 Test CDN

1. Clear browser cache
2. Reload app
3. Play a video
4. Check Network tab - should see `aaura.live/videos/...` requests

---

## Verification Checklist

After setup, verify:

- [ ] Firebase Storage rules deployed
- [ ] Cloudflare Worker created and deployed
- [ ] Route `aaura.live/videos/*` configured
- [ ] Worker logs show no errors
- [ ] Test URL works: `https://aaura.live/videos/test`
- [ ] Videos load from CDN (check Network tab)
- [ ] Videos play smoothly without stalling
- [ ] No CORS errors in console

---

## Expected Results

### Before CDN:
- Videos load from: `firebasestorage.googleapis.com/...`
- May stall during playback
- Slower loading for users far from Firebase servers

### After CDN:
- Videos load from: `aaura.live/videos/...`
- Smooth playback with better buffering
- Faster loading from edge servers worldwide
- Better performance, especially for long videos

---

## Quick Reference

### Worker Code Location
- File: `CLOUDFLARE_WORKER_FINAL.js`
- Bucket: `studio-9632556640-bd58d`
- Route: `aaura.live/videos/*`

### CDN URL Conversion
- Function: `getCdnUrl()` in `src/lib/firebase/cdn-urls.ts`
- Domain: `aaura.live` (from `NEXT_PUBLIC_CDN_DOMAIN`)

### Storage Rules
- File: `storage.rules`
- Deploy: `firebase deploy --only storage:rules`

---

## Support

If you encounter issues:

1. **Check Cloudflare Worker Logs**
   - Dashboard → Workers & Pages → Your Worker → Logs

2. **Check Firebase Storage Rules**
   - Console → Storage → Rules (should be deployed)

3. **Check Browser Console**
   - Look for `[CDN]` messages
   - Check Network tab for request status

4. **Test Direct URLs**
   - Test Firebase URL directly
   - Test CDN URL directly
   - Compare responses

---

## Next Steps After CDN is Working

1. ✅ Monitor CDN performance
2. ✅ Check video playback quality
3. ✅ Monitor Cloudflare analytics
4. ✅ Optimize cache settings if needed
5. ✅ Set up CDN monitoring/alerts

---

**Your CDN should now be fully configured! Videos will play smoothly without stopping in the middle.** 🚀








