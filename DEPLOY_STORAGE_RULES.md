# Deploy Storage Rules - REQUIRED

## ✅ Your storage rules are correct!

Your `storage.rules` file has the correct rules:
```javascript
match /posts/{userId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## 🚀 Deploy Methods (Choose One)

### Method 1: Firebase Console (Easiest - 2 minutes)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules
   - Or: Firebase Console → Select Project → Storage → Rules tab

2. **Copy Storage Rules**
   - Open file: `storage.rules` in your project
   - Copy **ALL** the contents (Ctrl+A, Ctrl+C)

3. **Paste and Deploy**
   - Paste into the Firebase Console rules editor
   - Click **Publish** button
   - Wait for "Rules published successfully" message

4. **Verify**
   - Rules should show `allow read: if true` for `posts/` paths
   - Test upload again

---

### Method 2: Using npx (No Installation Needed)

```bash
cd "/home/surya/Downloads/aaura-india-main(2)/aaura-india-main"
npx firebase-tools deploy --only storage:rules
```

**If you get authentication error:**
```bash
npx firebase-tools login
npx firebase-tools deploy --only storage:rules
```

---

### Method 3: Install Firebase CLI (Permanent)

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only storage:rules
```

---

## ✅ Verify Rules Are Deployed

### Check in Firebase Console:

1. Go to: https://console.firebase.google.com/project/studio-9632556640-bd58d/storage/rules
2. You should see your rules in the editor
3. Rules should match your `storage.rules` file

---

## 🚨 IMPORTANT

**Storage rules MUST be deployed for uploads to work!**

Without deployed rules:
- ❌ Uploads will fail with 403 Forbidden
- ❌ Even if code is correct, Firebase will block uploads
- ✅ After deploying, uploads will work immediately

---

## Quick Test After Deploy

1. Hard refresh browser (Ctrl+Shift+R)
2. Try uploading a video
3. Should work without 412 or 403 errors
