# Deploy Cloud Function for Automatic Video Re-encoding

This Cloud Function automatically re-encodes uploaded videos to fix the issue where long videos stop playing at 20-30 seconds.

## Prerequisites

1. **Firebase CLI installed:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged in to Firebase:**
   ```bash
   firebase login
   ```

3. **Set your Firebase project:**
   ```bash
   firebase use studio-9632556640-bd58d
   ```

## Setup Steps

### Step 1: Install Function Dependencies

```bash
cd functions
npm install
```

This installs:
- `firebase-admin` - Firebase Admin SDK
- `firebase-functions` - Firebase Functions SDK
- `fluent-ffmpeg` - FFmpeg wrapper for Node.js
- `@ffmpeg-installer/ffmpeg` - FFmpeg binary for Cloud Functions

### Step 2: Deploy the Function

```bash
# From project root
firebase deploy --only functions:processVideoUpload
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

### Step 3: Verify Deployment

Check the deployment status:
```bash
firebase functions:list
```

View function logs:
```bash
firebase functions:log
```

## How It Works

1. **Trigger**: When a video is uploaded to `posts/{userId}/{filename}.mp4`
2. **Download**: Function downloads the video to a temporary location
3. **Re-encode**: Uses FFmpeg with `-movflags +faststart` to optimize for streaming
4. **Upload**: Replaces the original file with the processed version
5. **Update**: Updates Firestore if the video is referenced in a post

## What Gets Fixed

- ✅ Long videos (4+ minutes) will play fully
- ✅ Videos stop playing at 20-30 seconds - FIXED
- ✅ All future uploads are automatically optimized
- ✅ No manual re-encoding needed

## Testing

1. Upload a long video (4+ minutes) through your app
2. Wait 2-5 minutes for processing (check logs)
3. Play the video - it should play fully without stopping

## Monitoring

**View logs in real-time:**
```bash
firebase functions:log --only processVideoUpload
```

**Check function status:**
```bash
firebase functions:list
```

## Troubleshooting

### Function not triggering
- Verify Storage rules allow function access
- Check function is deployed: `firebase functions:list`
- Verify video is uploaded to `posts/` folder

### Processing fails
- Check logs: `firebase functions:log`
- Verify FFmpeg is available (should be automatic with `@ffmpeg-installer/ffmpeg`)
- Check video format is supported (MP4, WebM, MOV)

### Videos still stopping
- Verify function completed successfully (check logs)
- Ensure video was uploaded AFTER function deployment
- Check that processed video exists in Storage

## Cost Considerations

- **Compute**: ~$0.40 per million function invocations
- **Storage**: Processed videos replace originals (no extra storage)
- **Network**: Download + upload of video (one-time per upload)

For 1000 video uploads/month:
- Function invocations: ~$0.0004
- Processing time: ~5 minutes per video (depends on length)
- Total cost: Very minimal

## Important Notes

- ⚠️ Function timeout: 9 minutes (540 seconds)
- ⚠️ Memory: 2GB allocated
- ⚠️ Only processes videos in `posts/` folder
- ⚠️ Skips already processed videos (containing `-processed`)
- ⚠️ Original file is replaced (saves storage space)

## For Existing Videos

To process existing videos that were uploaded before this function:

1. **Option 1**: Re-upload them (function will process automatically)
2. **Option 2**: Use the bulk upload script with re-encoding:
   ```bash
   ./scripts/reencodeVideos.sh existing-video.mp4
   node scripts/uploadVideos.js
   ```

## Success Indicators

After deployment, you should see:
- ✅ Function appears in Firebase Console → Functions
- ✅ Videos uploaded after deployment are processed automatically
- ✅ Long videos play fully without stopping
- ✅ Logs show successful processing


