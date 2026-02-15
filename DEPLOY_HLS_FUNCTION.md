# Deploy HLS Function - Quick Guide

## Option 1: Using npx (Recommended - No Installation Needed)

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
npx firebase-tools deploy --only functions:convertVideoToHLS
```

## Option 2: Install Firebase CLI Globally

```bash
npm install -g firebase-tools
firebase login
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
firebase deploy --only functions:convertVideoToHLS
```

## Option 3: Deploy via Firebase Console (Easiest)

1. **Go to Firebase Console**
   - https://console.firebase.google.com/project/studio-9632556640-bd58d/functions

2. **Check if function exists**
   - Look for `convertVideoToHLS` in the functions list
   - If it exists, it's already deployed ✅
   - If not, proceed to deploy

3. **Deploy via Console** (if needed)
   - Go to Functions → Deploy
   - Or use the CLI commands above

## Verify Deployment

After deployment, check:

1. **Firebase Console → Functions**
   - Should see `convertVideoToHLS` function
   - Status should be "Active"

2. **Test the Function**
   - Upload a new video
   - Check Firestore for `hlsUrl` field (should appear after processing)
   - Check `hlsProcessed` field (should be `true` when complete)

3. **Check Function Logs**
   ```bash
   npx firebase-tools functions:log --only convertVideoToHLS
   ```

## Troubleshooting

### If deployment fails:
- Make sure you're logged in: `npx firebase-tools login`
- Check Firebase project: `npx firebase-tools projects:list`
- Set correct project: `npx firebase-tools use studio-9632556640-bd58d`

### If function doesn't trigger:
- Check Storage triggers in Firebase Console
- Verify function is listening to correct path: `posts/` or `media/`
- Check function logs for errors







