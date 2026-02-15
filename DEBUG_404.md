# Debugging 404 Error

## Step 1: Verify File Exists in Firebase Storage

1. **Go to Firebase Console**
   - https://console.firebase.google.com
   - Project: `studio-9632556640-bd58d`
   - Storage → Files

2. **Navigate to the file**
   - Go to: `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/`
   - Look for: `1765460588597-mytestfiles.mp4`
   - **Does it exist?** ✅ or ❌

3. **If file exists, copy the exact path**
   - Right-click the file → Copy URL or Copy path
   - Share the exact path you see

## Step 2: Test Direct Firebase URL

Test this EXACT URL in your browser (not via fetch, open directly):

```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media
```

**What happens?**
- ✅ Video downloads → File exists, proceed to Step 3
- ❌ 404 → File path is wrong or file doesn't exist
- ❌ 403 → Storage rules issue

## Step 3: Check Cloudflare Worker Logs

1. **Go to Cloudflare Dashboard**
   - Workers & Pages → Your Worker → Logs

2. **Make a request to CDN URL:**
   ```
   https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4
   ```

3. **Check Worker logs**
   - Look for the Firebase URL the Worker tried to access
   - Compare it with the direct Firebase URL from Step 2
   - Are they the same?

## Step 4: Verify Path Encoding

The Worker should:
- Receive: `/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4`
- Extract: `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4`
- Encode: `posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4`
- Construct: `https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media`

## Common Issues

### Issue 1: File doesn't exist
- **Solution:** Verify file exists in Firebase Storage Console
- **Check:** File path matches exactly (case-sensitive)

### Issue 2: Wrong bucket name
- **Solution:** Worker tries both `studio-9632556640-bd58d` and `studio-9632556640-bd58d.firebasestorage.app`
- **Check:** Worker logs show which bucket name was used

### Issue 3: Path encoding issue
- **Solution:** Worker encodes each segment separately
- **Check:** Worker logs show the encoded path

### Issue 4: File in different location
- **Solution:** Check if file is actually in `posts/` or `media/` folder
- **Check:** Firebase Storage Console shows actual path

## Quick Test Script

Run this in browser console to test both URLs:

```javascript
// Test 1: Direct Firebase URL
const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media';
console.log('Testing direct Firebase URL:', firebaseUrl);
fetch(firebaseUrl)
  .then(r => {
    console.log('Direct Firebase Status:', r.status, r.ok ? '✅' : '❌');
    if (!r.ok) return r.text().then(t => console.log('Error:', t));
  })
  .catch(err => console.error('Direct Firebase Error:', err));

// Test 2: CDN URL
const cdnUrl = 'https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4';
console.log('Testing CDN URL:', cdnUrl);
fetch(cdnUrl)
  .then(r => {
    console.log('CDN Status:', r.status, r.ok ? '✅' : '❌');
    if (!r.ok) return r.json().then(err => console.log('CDN Error:', err));
  })
  .catch(err => console.error('CDN Error:', err));
```









