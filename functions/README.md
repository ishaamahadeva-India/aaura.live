# Firebase Cloud Functions - Video Processing

This Cloud Function automatically re-encodes uploaded videos to ensure they're web-streamable.

## What It Does

When a video is uploaded to Firebase Storage:
1. Detects video files in the `posts/` folder
2. Downloads the video to a temporary location
3. Re-encodes with `-movflags +faststart` (moves MOOV atom to beginning)
4. Uploads the processed video back (replaces original)
5. Updates Firestore documents if needed

## Why This Fixes Long Videos

Long videos stopping at 20-30 seconds is caused by:
- MOOV atom at the end of the file (not optimized for streaming)
- Browser can't play until it downloads enough data

The `-movflags +faststart` flag moves the MOOV atom to the beginning, allowing:
- Progressive download
- Immediate playback
- Full video playback without stopping

## Setup

1. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

2. **Deploy the function:**
   ```bash
   firebase deploy --only functions
   ```

## Configuration

- **Timeout**: 9 minutes (540 seconds) - for processing long videos
- **Memory**: 2GB - for video encoding
- **Trigger**: `storage.object().onFinalize()` - fires when upload completes

## How It Works

1. User uploads video → Firebase Storage
2. Cloud Function triggers automatically
3. Video is re-encoded with faststart
4. Processed video replaces original
5. Firestore is updated (if needed)
6. User's video now plays fully!

## Testing

1. Upload a long video (4+ minutes) through your app
2. Check Cloud Functions logs: `firebase functions:log`
3. Wait for processing to complete (may take a few minutes)
4. Play the video - it should play fully without stopping

## Notes

- Only processes videos in `posts/` folder
- Skips files already processed (containing `-processed`)
- Original file is replaced (saves storage space)
- If processing fails, original file remains available
- Processing happens automatically in the background

## Troubleshooting

**Function not triggering:**
- Check Firebase project is set: `firebase use <project-id>`
- Verify Storage rules allow the function to read/write

**Processing fails:**
- Check function logs: `firebase functions:log`
- Verify FFmpeg is installed in the function environment
- Check video file format is supported

**Videos still stopping:**
- Verify function deployed successfully
- Check function logs for errors
- Ensure videos are being uploaded to `posts/` folder


