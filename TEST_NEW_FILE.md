# Test URLs for Your New File

## Your File Details
- **Storage Path:** `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4`
- **User ID:** `9RwsoEEkWPR3Wpv6wKZmhos1xTG2`
- **Filename:** `1765460588597-mytestfiles.mp4`
- **No spaces or special characters** ✅

## Step 1: Test Direct Firebase Storage URL

**Direct Firebase URL:**
```
https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media
```

**How to test:**
1. Copy the URL above
2. Paste in a new browser tab
3. Press Enter

**Expected results:**
- ✅ **File downloads** → Storage rules are working! Proceed to Step 2
- ❌ **403 Permission denied** → Storage rules not deployed correctly
- ❌ **404 Not found** → File path is wrong or file doesn't exist

## Step 2: Test Through Cloudflare CDN

**CDN URL:**
```
https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4
```

**How to test:**
1. Copy the URL above
2. Paste in a new browser tab
3. Press Enter

**Expected results:**
- ✅ **File downloads** → CDN is working perfectly! 🎉
- ❌ **403 Permission denied** → Worker can't access Firebase (check Worker logs)
- ❌ **404 Not found** → Worker path encoding issue

## Quick Test in Browser Console

Open browser console (F12) and run:

```javascript
// Test Direct Firebase URL
const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media';
fetch(firebaseUrl)
  .then(r => {
    console.log('Direct Firebase:', r.status, r.ok ? '✅ WORKS' : '❌ FAILED');
    return r.text();
  })
  .then(text => console.log('Response length:', text.length))
  .catch(err => console.error('Error:', err));

// Test CDN URL
const cdnUrl = 'https://aaura.live/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4';
fetch(cdnUrl)
  .then(r => {
    console.log('CDN:', r.status, r.ok ? '✅ WORKS' : '❌ FAILED');
    if (!r.ok) {
      return r.json().then(err => console.log('Error details:', err));
    }
  })
  .catch(err => console.error('Error:', err));
```

## What the Worker Will Construct

The Worker receives:
- **CDN URL path:** `/videos/posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4`
- **Extracts:** `posts/9RwsoEEkWPR3Wpv6wKZmhos1xTG2/1765460588597-mytestfiles.mp4`
- **Encodes:** `posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4`
- **Constructs Firebase URL:** `https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2F9RwsoEEkWPR3Wpv6wKZmhos1xTG2%2F1765460588597-mytestfiles.mp4?alt=media`

This should match the direct Firebase URL exactly!









