# 🚀 Deployment Checklist

## Files Changed (Ready to Deploy)

✅ **2 files modified:**
1. `src/app/api/upload/signed-url/route.ts` - Reduced upload URL expiry to 10 minutes
2. `src/lib/firebase/signed-upload.ts` - Fixed download URL generation after upload

---

## Deployment Steps

### Step 1: Commit Changes

```bash
git add src/app/api/upload/signed-url/route.ts src/lib/firebase/signed-upload.ts
git commit -m "Fix 403/412 upload errors: Reduce URL expiry and fix Content-Type headers"
```

### Step 2: Push to Repository

```bash
git push origin main
# (or your branch name)
```

### Step 3: Deploy to Production

**If using Vercel:**
- Changes will auto-deploy if connected to GitHub
- Or manually deploy from Vercel dashboard

**If using Firebase App Hosting:**
```bash
firebase deploy
```

**If using other platform:**
- Follow your usual deployment process

---

## After Deployment

### ✅ Verify Deployment

1. **Check deployment logs** - Make sure build succeeded
2. **Wait 2-3 minutes** - For deployment to complete
3. **Test video upload** - Try uploading a new video
4. **Check browser console** - Should see no 403/412 errors

---

## What to Test

- [ ] Upload a new video - should succeed
- [ ] Check browser console - no 403 errors
- [ ] Check browser console - no 412 errors  
- [ ] Video should play after upload
- [ ] Old videos should still play (using fresh URLs)

---

## No Additional Configuration Needed

✅ **No environment variables to change**  
✅ **No Firebase configuration changes**  
✅ **No bucket permissions changes needed** (already set)  
✅ **Just deploy the code changes**

---

## Quick Deploy Commands

**If using Git + Vercel (auto-deploy):**
```bash
git add .
git commit -m "Fix upload errors"
git push
# Vercel will auto-deploy
```

**If using Firebase CLI:**
```bash
firebase deploy --only hosting
```

---

## Expected Result

After deployment:
- ✅ New video uploads work without 403/412 errors
- ✅ Content-Type headers match correctly
- ✅ Upload URLs expire in 10 minutes (plenty of time)
- ✅ Fresh download URLs generated after upload

---

**That's it! Just commit, push, and deploy. No additional configuration needed.**

