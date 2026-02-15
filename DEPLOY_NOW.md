# 🚀 Deploy Cloud Function Now

## Step 1: Navigate to Project Directory

```bash
cd /home/surya/Downloads/aaura-india-main\(2\)/aaura-india-main
```

## Step 2: Deploy the Function

```bash
firebase deploy --only functions:processVideoUpload
```

## What to Expect

1. **Packaging** - Function code will be packaged (47-50 KB)
2. **API Checks** - Firebase will verify all required APIs are enabled
3. **Service Identity** - Eventarc service account should be created successfully
4. **Upload** - Function code will be uploaded
5. **Build** - Cloud Build will compile and build the function
6. **Deploy** - Function will be deployed to Firebase

**Total time:** 3-5 minutes for first deployment

## Success Message

You should see:
```
✔  functions[processVideoUpload(us-central1)] Successful create operation.
✔  Deploy complete!
```

## Verify Deployment

1. **Check Firebase Console:**
   - Go to: https://console.firebase.google.com/
   - Select project: `studio-9632556640-bd58d`
   - Click **Functions** in left menu
   - You should see `processVideoUpload`

2. **Check via CLI:**
   ```bash
   firebase functions:list
   ```

## Test the Function

1. **Upload a new video** through your app
2. **Wait 2-5 minutes** for processing
3. **Check logs:**
   ```bash
   firebase functions:log
   ```
4. **Play the video** - it should play fully without stopping!

## Troubleshooting

If deployment still fails:
- Check logs: `firebase functions:log`
- Verify Eventarc is enabled in Google Cloud Console
- Make sure you're logged in: `firebase login`
- Verify project: `firebase use studio-9632556640-bd58d`


