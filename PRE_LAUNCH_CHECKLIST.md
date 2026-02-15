# 🚀 Pre-Launch Checklist - Launch Tomorrow?

## ⚠️ Critical Items (MUST DO Before Launch)

### 1. ✅ Verify Cloud Function Deployment
**Status:** ⚠️ **NEEDS VERIFICATION**

**Action Required:**
```bash
# Check if function is deployed
firebase functions:list

# If not deployed, deploy it:
cd functions
npm install
firebase deploy --only functions:convertVideoToHLS
```

**Why Critical:** Without this, new video uploads won't get HLS conversion, causing playback issues.

---

### 2. ✅ Deploy Firestore Rules
**Status:** ⚠️ **VERIFY DEPLOYED**

**Action Required:**
```bash
firebase deploy --only firestore:rules
```

**Verify:**
- Go to Firebase Console → Firestore → Rules
- Ensure rules are deployed and match `firestore.rules`

**Why Critical:** Users won't be able to read/write data without proper rules.

---

### 3. ✅ Deploy Storage Rules
**Status:** ⚠️ **VERIFY DEPLOYED**

**Action Required:**
```bash
firebase deploy --only storage:rules
```

**Verify:**
- Go to Firebase Console → Storage → Rules
- Ensure HLS files are publicly readable

**Why Critical:** Videos won't play if storage rules block access.

---

### 4. ✅ Verify Firestore Indexes
**Status:** ⚠️ **VERIFY DEPLOYED**

**Action Required:**
```bash
firebase deploy --only firestore:indexes
```

**Or manually:**
- Go to Firebase Console → Firestore → Indexes
- Check for any missing index errors in console
- Create indexes as needed (see `INDEX_DETAILED_GUIDE.md`)

**Why Critical:** Queries will fail without proper indexes.

---

### 5. ✅ Environment Variables Configuration
**Status:** ✅ **CONFIGURED** (but verify in production)

**Verify:**
- Firebase App Hosting environment variables are set:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `FIREBASE_SERVICE_ACCOUNT_KEY` (for server-side features)

**Action:**
- Check `apphosting.yaml` and `apphosting.production.yaml`
- Ensure all values are correct for production

---

### 6. ✅ Build & Test Production Build
**Status:** ⚠️ **MUST TEST**

**Action Required:**
```bash
npm run build
npm start
```

**Test:**
- [ ] App builds without errors
- [ ] No console errors on page load
- [ ] Authentication works
- [ ] Video playback works
- [ ] All major features functional

---

## 🔶 Important Items (Should Do Before Launch)

### 7. ⚠️ Test Video Upload & HLS Conversion
**Action:**
1. Upload a test video
2. Wait 5-10 minutes for HLS processing
3. Check Firebase Console → Storage for HLS files
4. Verify video plays smoothly

**Check:**
- Cloud Function logs show successful conversion
- Firestore document has `hlsUrl` and `hlsProcessed: true`
- Video plays without stalling

---

### 8. ⚠️ Verify CDN Setup (Cloudflare Worker)
**Status:** ⚠️ **NOT WORKING** (but not critical for launch)

**Current Situation:**
- CDN URLs (`aaura.live/videos/...`) are failing with error code 4
- Automatic fallback to Firebase Storage is working perfectly
- Videos are playing correctly using Firebase Storage directly
- CDN will auto-disable after 5 failures (already implemented)

**Action (Optional - Can Do After Launch):**
- Test CDN URLs are working (currently failing)
- Verify Cloudflare Worker is deployed and routing traffic
- Check if CDN URLs are faster than direct Firebase Storage
- Fix Cloudflare Worker configuration if needed

**For Launch:**
- ✅ **CDN is NOT required** - Videos work perfectly without it
- ✅ **Firebase Storage fallback is working** - No user impact
- ✅ **Can fix CDN after launch** - It's a performance optimization, not a blocker

**See:** `CDN_TROUBLESHOOTING.md` for detailed troubleshooting guide.

---

### 9. ⚠️ Test Existing Videos
**Problem:** Videos uploaded before HLS implementation won't have HLS URLs.

**Options:**
- **Option A:** Accept that old videos use MP4 (may stall on long videos)
- **Option B:** Batch convert existing videos (takes time)
- **Option C:** Show message to users to re-upload videos

**Recommendation:** Launch with Option A, batch convert later.

---

### 10. ⚠️ Error Monitoring Setup
**Action:**
- Set up error tracking (Sentry, LogRocket, or Firebase Crashlytics)
- Monitor console errors in production
- Set up alerts for critical errors

**Why Important:** You need to know if things break after launch.

---

## 🔵 Nice-to-Have (Can Do After Launch)

### 11. Performance Optimization
- Image optimization
- Code splitting improvements
- Caching strategies

### 12. SEO Enhancements
- Meta tags for all pages
- Open Graph tags
- Structured data

### 13. Analytics
- Google Analytics
- Firebase Analytics
- User behavior tracking

---

## 📋 Pre-Launch Testing Checklist

### Core Functionality
- [ ] User registration/login works
- [ ] Video upload works
- [ ] Video playback works (new videos with HLS)
- [ ] Video playback works (old videos with MP4 fallback)
- [ ] Like/comment/share features work
- [ ] Feed loads correctly
- [ ] Search works (if implemented)
- [ ] Profile pages work
- [ ] Admin panel works (if applicable)

### Cross-Device Testing
- [ ] Desktop browser (Chrome, Firefox, Safari)
- [ ] Mobile browser (iOS Safari, Android Chrome)
- [ ] Tablet (iPad, Android tablet)

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] Video starts playing < 2 seconds
- [ ] No major performance issues
- [ ] Works on slow 3G connection

### Error Handling
- [ ] Graceful error messages
- [ ] No white screen of death
- [ ] Proper fallbacks for failed operations

---

## 🚀 Deployment Steps (In Order)

### Step 1: Final Code Review
```bash
# Check for any uncommitted changes
git status

# Run linter
npm run lint

# Run type check
npm run typecheck
```

### Step 2: Deploy Firebase Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### Step 3: Deploy Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### Step 4: Build Production App
```bash
npm run build
```

### Step 5: Deploy to Firebase App Hosting
```bash
# If using Firebase App Hosting
firebase deploy --only hosting

# Or if using custom deployment
# Follow your deployment process
```

### Step 6: Verify Deployment
- [ ] App is accessible at production URL
- [ ] All features work
- [ ] No console errors
- [ ] Videos play correctly

---

## ⏱️ Time Estimate

### Minimum Time Required (Critical Items Only):
- **Cloud Function Deployment:** 10-15 minutes
- **Rules & Indexes Deployment:** 5 minutes
- **Production Build & Test:** 15-20 minutes
- **Final Deployment:** 10-15 minutes
- **Smoke Testing:** 30 minutes

**Total: ~1.5-2 hours** (if everything goes smoothly)

### Recommended Time (Including Important Items):
- **All Critical Items:** 1.5-2 hours
- **Video Upload Testing:** 30 minutes
- **Cross-Device Testing:** 1 hour
- **Error Monitoring Setup:** 30 minutes

**Total: ~3-4 hours** (recommended)

---

## ✅ Can You Launch Tomorrow?

### **YES, if you:**
1. ✅ Complete all **Critical Items** (1-6) - ~2 hours
2. ✅ Do basic smoke testing - ~30 minutes
3. ✅ Accept that old videos may not have HLS (will use MP4 fallback)
4. ✅ Are okay with monitoring and fixing issues post-launch

### **NO, if:**
1. ❌ Cloud Function is not deployed
2. ❌ Firestore/Storage rules are not deployed
3. ❌ Production build fails
4. ❌ Critical features don't work

---

## 🎯 Recommended Launch Plan

### Today (Before Launch):
1. ✅ Complete all Critical Items (1-6)
2. ✅ Test production build locally
3. ✅ Deploy to staging/preview environment
4. ✅ Do basic smoke testing

### Tomorrow Morning (Launch Day):
1. ✅ Final verification of all deployments
2. ✅ Deploy to production
3. ✅ Monitor for first 2-3 hours
4. ✅ Fix any critical issues immediately

### After Launch:
1. ✅ Monitor error logs
2. ✅ Batch convert old videos to HLS
3. ✅ Gather user feedback
4. ✅ Fix bugs as they appear

---

## 🆘 Emergency Rollback Plan

If something goes wrong:

1. **Revert Deployment:**
   ```bash
   # Revert to previous version
   firebase hosting:rollback
   ```

2. **Disable Problematic Features:**
   - Temporarily disable video uploads if needed
   - Show maintenance message

3. **Monitor Logs:**
   ```bash
   firebase functions:log
   ```

---

## 📞 Support Resources

- **Firebase Console:** https://console.firebase.google.com
- **Documentation:**
  - `APPLICATION_STATUS.md` - Current status
  - `NEXT_STEPS.md` - Implementation details
  - `TROUBLESHOOTING_403.md` - Permission issues
  - `INDEX_DETAILED_GUIDE.md` - Index setup

---

## 🎉 Final Checklist Before Launch

- [ ] All Critical Items (1-6) completed
- [ ] Production build successful
- [ ] All Firebase rules deployed
- [ ] Cloud Functions deployed
- [ ] Environment variables configured
- [ ] Basic smoke testing passed
- [ ] Error monitoring set up
- [ ] Rollback plan ready
- [ ] Team notified of launch time

---

**Good luck with your launch! 🚀**

