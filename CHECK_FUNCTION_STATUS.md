# Quick Check: Is HLS Function Deployed?

## Step 1: Check Firebase Console

1. **Open**: https://console.firebase.google.com/project/studio-9632556640-bd58d/functions

2. **Look for**: `convertVideoToHLS` function

3. **Status**:
   - ✅ **If you see it** → Function is deployed, you're good!
   - ❌ **If you DON'T see it** → Function needs deployment

## Step 2: If Function Exists, Test It

1. **Upload a new video** (any video file)
2. **Wait 2-5 minutes** (processing time)
3. **Check Firestore**:
   - Go to: https://console.firebase.google.com/project/studio-9632556640-bd58d/firestore
   - Find the post/media document you just uploaded
   - Look for `hlsUrl` field
   - Look for `hlsProcessed: true`

## Step 3: If Function Doesn't Exist

You need to deploy it. Options:

### Option A: Install Firebase CLI (Recommended)
```bash
sudo apt install npm
npm install -g firebase-tools
firebase login
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
firebase deploy --only functions:convertVideoToHLS
```

### Option B: Use Online Terminal
- Use Google Cloud Shell (has Firebase CLI pre-installed)
- Or use any online terminal with Firebase CLI

## What to Expect

**After deployment:**
- Function appears in Firebase Console
- New video uploads trigger HLS conversion
- Firestore gets `hlsUrl` field after processing
- Videos play smoothly without stopping

**Note**: Old videos won't have HLS until re-uploaded or manually processed.







