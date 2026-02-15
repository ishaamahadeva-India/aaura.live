# Test URLs for Your File

## Your File Details
- **Storage Path:** `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4`
- **User ID:** `9RwsoEEkWPR3Wpv6wKZmhos1xTG2`
- **Filename:** `1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4`

## Step 1: Test Direct Firebase Storage URL

**Direct Firebase URL:**
```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765386915714-WhatsApp%20Video%202025-12-09%20at%2018.44.03.mp4?alt=media
```

**How to test:**
1. Copy the URL above
2. Paste in a new browser tab
3. Press Enter

**Expected results:**
- ✅ **File downloads** → Storage rules are working! Proceed to Step 2
- ❌ **403 Permission denied** → Storage rules not deployed correctly
- ❌ **404 Not found** → File path is wrong (unlikely with your path)

## Step 2: Test Through Cloudflare CDN

**CDN URL:**
```
https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4
```

**How to test:**
1. Copy the URL above
2. Paste in a new browser tab
3. Press Enter

**Expected results:**
- ✅ **File downloads** → CDN is working perfectly! 🎉
- ❌ **403 Permission denied** → Worker can't access Firebase (check Worker logs)
- ❌ **404 Not found** → Worker path encoding issue

## Step 3: If Direct Firebase Works But CDN Doesn't

Check Cloudflare Worker logs:

1. Go to Cloudflare Dashboard
2. Workers & Pages → Your Worker → Logs
3. Look for the request to your file
4. Check what Firebase URL the Worker tried to access

The Worker should be constructing:
```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765386915714-WhatsApp%20Video%202025-12-09%20at%2018.44.03.mp4?alt=media
```

## Quick Test Commands

### Test Direct Firebase (in browser console):
```javascript
const path = 'posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4';
const encoded = encodeURIComponent(path).replace(/\//g, '%2F');
const url = `https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/${encoded}?alt=media`;
console.log('Testing:', url);
fetch(url).then(r => console.log('Status:', r.status, r.ok ? '✅' : '❌'));
```

### Test CDN:
```javascript
const cdnUrl = 'https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765386915714-WhatsApp Video 2025-12-09 at 18.44.03.mp4';
console.log('Testing CDN:', cdnUrl);
fetch(cdnUrl).then(r => console.log('Status:', r.status, r.ok ? '✅' : '❌'));
```

## Notes

- The filename has spaces and special characters (`WhatsApp Video 2025-12-09 at 18.44.03.mp4`)
- These need to be URL-encoded as `%20` for spaces
- The Worker should handle this automatically
- If CDN fails, check that the Worker is encoding spaces correctly









