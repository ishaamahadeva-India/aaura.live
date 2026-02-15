# ⚠️ URGENT: Deploy Storage Rules to Fix CDN 403 Errors

## Current Status
- ❌ CDN returning **403 Forbidden** errors
- ✅ Cloudflare Worker is working (server: cloudflare)
- ❌ Firebase Storage rules **NOT deployed** (root cause)

## The Problem
Firebase Storage is rejecting CDN requests because storage rules are not published. The Cloudflare Worker is working fine, but Firebase Storage says "Permission denied".

## Solution: Deploy Storage Rules NOW

### Step 1: Open Firebase Console
**Go to**: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules

### Step 2: Copy Rules from File
Open `storage.rules` file in your project and copy **ALL** the content.

### Step 3: Paste in Firebase Console
1. Click **Edit rules** button
2. **Delete** all existing rules
3. **Paste** the rules from `storage.rules` file
4. Click **Publish** (NOT just "Save")

### Step 4: Verify
- Look for **"Published"** status (green checkmark)
- Should see "Last published: [current date/time]"
- NOT just "Saved" - must be "Published"

### Step 5: Test CDN
```bash
curl -I "https://aaura.live/videos/test"
```
Should return: **200 OK** (not 403)

---

## Quick Copy-Paste Rules

If you can't access the file, here are the critical rules:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Public read access for posts
    match /posts/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for media
    match /media/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read access for HLS files
    match /posts/{userId}/hls/{videoId}/{allPaths=**} {
      allow read: if true;
    }
    
    match /media/{userId}/hls/{videoId}/{allPaths=**} {
      allow read: if true;
    }
  }
}
```

**IMPORTANT**: Copy the **ENTIRE** `storage.rules` file content, not just this snippet!

---

## Why This Happens

1. **Storage rules exist in code** but aren't published to Firebase
2. **CDN Worker works** but Firebase Storage rejects requests
3. **403 = Permission denied** = Rules not allowing public read access

---

## After Deploying Rules

1. **Wait 1-2 minutes** for rules to propagate
2. **Test CDN**: `curl -I "https://aaura.live/videos/test"`
3. **Re-enable CDN** in browser console:
   ```javascript
   localStorage.removeItem('cdn_disabled');
   location.reload();
   ```
4. **Check console** - should see CDN URLs being used

---

## Verification Checklist

- [ ] Rules copied from `storage.rules` file
- [ ] Rules pasted in Firebase Console
- [ ] Clicked **Publish** (not just Save)
- [ ] See "Published" status (green checkmark)
- [ ] Test CDN: `curl -I "https://aaura.live/videos/test"` → 200 OK
- [ ] Re-enabled CDN in browser console
- [ ] Videos loading from CDN (check network tab)

---

## Still Getting 403?

1. **Check rules syntax** - Make sure no typos
2. **Verify bucket name** - Should match your Firebase project
3. **Wait longer** - Rules can take 2-5 minutes to propagate
4. **Check Firebase Console** - Rules should show "Published" status
5. **Test direct Firebase URL** - Should also work if rules are correct

---

## This is THE Fix

**Once storage rules are published, CDN will work immediately.** The Cloudflare Worker is already deployed and working - it just needs Firebase Storage to allow the requests.







