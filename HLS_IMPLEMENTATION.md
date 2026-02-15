# HLS Video Streaming Implementation

## Overview
This document describes the full HLS (HTTP Live Streaming) implementation for aaura.live, enabling adaptive streaming for all long videos to eliminate stalling and playback interruptions.

## Components Implemented

### 1. Frontend Components

#### HLSVideoPlayer Component (`src/components/HLSVideoPlayer.tsx`)
- Uses `hls.js` library for HLS playback in browsers that don't support native HLS
- Falls back to native HLS for Safari/iOS
- Falls back to MP4 if HLS is not available
- Integrates with `ActiveVideoContext` for state management
- Handles buffering, errors, and recovery gracefully

#### Updated Components
- **video-player.tsx**: Uses HLS when `hlsUrl` is available in media document
- **FeedCard.tsx**: Uses HLS when `hlsUrl` is available in feed item
- **ReelsFeed.tsx**: Uses HLS when `hlsUrl` is available in reel item
- **reels/page.tsx**: Includes `hlsUrl` when processing videos from both collections

### 2. Backend (Firebase Cloud Functions)

#### Cloud Function: `convertVideoToHLS`
- Triggered on video upload to `posts/` or `media/` directories
- Converts MP4 to HLS format using FFmpeg
- Creates:
  - `master.m3u8` playlist file
  - Segment files: `segment000.ts`, `segment001.ts`, etc.
- Uploads HLS files to Firebase Storage at: `{originalPath}/hls/{videoId}/`
- Updates Firestore with `hlsUrl` field
- Sets `hlsProcessed: true` when complete

#### FFmpeg Configuration
```bash
ffmpeg -i input.mp4 \
  -codec: copy \
  -start_number 0 \
  -hls_time 4 \
  -hls_list_size 0 \
  -f hls master.m3u8
```

- **Segment duration**: 4 seconds
- **Codec**: Copy (no re-encoding, faster processing)
- **Playlist**: Includes all segments (no size limit)

### 3. Data Model Updates

#### FeedItem Type (`src/types/feed.ts`)
```typescript
export type FeedItem = {
  // ... existing fields
  mediaUrl?: string;  // MP4 fallback
  hlsUrl?: string;    // HLS streaming (preferred)
  meta?: {
    // ... existing fields
    hlsProcessed?: boolean;
  };
};
```

#### Firestore Schema
- `posts/{id}`: Added `hlsUrl` and `hlsProcessed` fields
- `media/{id}`: Added `hlsUrl` and `hlsProcessed` fields

### 4. Fallback Logic

1. **HLS Available**: Use `HLSVideoPlayer` with HLS URL
2. **HLS Processing**: Show "Processing..." placeholder
3. **HLS Failed/Not Available**: Fallback to MP4 using standard `<video>` element
4. **No Video**: Show error or loading state

## Deployment Steps

### 1. Deploy Cloud Function
```bash
cd functions
npm install
firebase deploy --only functions:convertVideoToHLS
```

### 2. Update Storage Rules
Ensure HLS files are publicly readable:
```javascript
match /posts/{userId}/hls/{videoId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}

match /media/{userId}/hls/{videoId}/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

### 3. Process Existing Videos (Optional)
For existing videos, you can:
- Re-upload them to trigger HLS conversion
- Or create a script to manually trigger conversion

## Benefits

1. **Zero Stalling**: HLS adaptive streaming prevents buffering issues
2. **Smooth Playback**: Segments load progressively, no need to buffer entire video
3. **Better Performance**: Browser can request appropriate quality based on network
4. **Scalability**: Works for videos of any length
5. **Mobile Optimized**: Native HLS support on iOS/Safari

## Testing

1. Upload a new video - should trigger HLS conversion
2. Check Firestore - `hlsUrl` should be populated after processing
3. Play video - should use HLS player if available
4. Test fallback - disable HLS URL, should fallback to MP4
5. Test long videos - should play without stopping at 14-20 seconds

## Monitoring

- Check Cloud Function logs for conversion progress
- Monitor Firestore for `hlsProcessed` status
- Check browser console for HLS playback logs
- Monitor video playback metrics

## Future Enhancements

1. **Multi-bitrate HLS**: Generate multiple quality levels
2. **Thumbnail Generation**: Extract thumbnails during HLS conversion
3. **Progress Tracking**: Show conversion progress to users
4. **Retry Logic**: Retry failed conversions automatically
5. **CDN Integration**: Use CDN for HLS segment delivery

