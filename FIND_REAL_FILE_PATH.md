# How to Find a Real File Path and Test It

## Step 1: Find a Real File in Firebase Storage

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select project: `studio-9632556640-bd58d`
   - Click "Storage" in left sidebar

2. **Browse Your Files**
   - Look in the `posts/` folder
   - Click on a user folder (e.g., `posts/abc123xyz/`)
   - You'll see files like: `1234567890-video.mp4`

3. **Copy the Full Path**
   - The full path will be: `posts/abc123xyz/1234567890-video.mp4`
   - (Replace `abc123xyz` with actual user ID, `1234567890` with timestamp, `video.mp4` with actual filename)

## Step 2: Test Direct Firebase Storage URL

Construct the Firebase Storage URL:

**Format:**
```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2FUSER_ID%2FTIMESTAMP-FILENAME.mp4?alt=media
```

**Example:**
If your file path is: `posts/user123/1704123456789-myvideo.mp4`

Then the URL is:
```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2Fuser123%2F1704123456789-myvideo.mp4?alt=media
```

**How to encode:**
- Each segment (separated by `/`) must be URL-encoded
- `posts` → `posts` (no change)
- `user123` → `user123` (no change, but if it has special chars, encode it)
- `1704123456789-myvideo.mp4` → `1704123456789-myvideo.mp4` (no change)
- Join with `%2F` (encoded forward slash)

**Quick encoding:**
- Use this tool: https://www.urlencoder.org/
- Or in JavaScript: `encodeURIComponent('posts/user123/1704123456789-myvideo.mp4')` → `posts%2Fuser123%2F1704123456789-myvideo.mp4`

## Step 3: Test in Browser

1. **Open the URL in a new browser tab**
   - If file downloads → ✅ Rules are working!
   - If 403 → Rules not deployed correctly
   - If 404 → File path is wrong (double-check the path)

## Step 4: Test Through Cloudflare Worker

Once direct Firebase URL works, test through your CDN:

**CDN URL Format:**
```
https://aaura.live/videos/posts/USER_ID/TIMESTAMP-FILENAME.mp4
```

**Example:**
If your file path is: `posts/user123/1704123456789-myvideo.mp4`

Then the CDN URL is:
```
https://aaura.live/videos/posts/user123/1704123456789-myvideo.mp4
```

**Note:** No encoding needed in the CDN URL - the Worker will encode it automatically.

## Step 5: Check Worker Logs

If CDN URL doesn't work:

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Logs

2. **Look for the Worker Request**
   - You'll see the exact Firebase URL the Worker tried to access
   - Compare it with the direct Firebase URL that worked

## Common File Path Formats

Based on your code, files are stored as:

- **Posts:** `posts/{userId}/{timestamp}-{filename}`
- **Media:** `media/{mediaId}/{filename}`
- **Reels:** `reels/{timestamp}-{filename}`
- **HLS Files:** `posts/{userId}/hls/{videoId}/master.m3u8` or `posts/{userId}/hls/{videoId}/segment0.ts`

## Quick Test Script

You can also test programmatically. Open browser console on your site and run:

```javascript
// Replace with actual file path from Firebase Storage
const filePath = 'posts/user123/1704123456789-video.mp4';
const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '%2F');
const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/${encodedPath}?alt=media`;

console.log('Testing Firebase URL:', firebaseUrl);
fetch(firebaseUrl)
  .then(r => {
    console.log('Status:', r.status);
    if (r.ok) {
      console.log('✅ File is accessible!');
    } else {
      console.log('❌ Error:', r.status, r.statusText);
    }
    return r.text();
  })
  .then(text => console.log('Response:', text.substring(0, 100)))
  .catch(err => console.error('Error:', err));
```









