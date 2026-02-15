# Cloudflare Worker Quick Start Guide

## ⚠️ CRITICAL: Deploy Firebase Storage Rules FIRST!

**Before setting up the Worker, you MUST deploy Firebase Storage rules to allow public read access.**

### Step 0: Deploy Firebase Storage Rules

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Select your project: `studio-9632556640-bd58d`

2. **Navigate to Storage → Rules**
   - Click "Storage" in left sidebar
   - Click "Rules" tab

3. **Deploy the Storage Rules**
   ```bash
   # From your project root directory
   firebase deploy --only storage
   ```
   
   Or manually copy the rules from `storage.rules` file in your project.

4. **Verify Rules are Deployed**
   - Rules should show `allow read: if true` for `posts/` and `media/` paths
   - This allows public read access (required for CDN to work)

**If you skip this step, you'll get 403 Permission Denied errors!**

---

## Step-by-Step: Creating Your First Worker

### Step 1: Create Worker

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Select your domain (aaura.live)

2. **Navigate to Workers & Pages**
   - Click "Workers & Pages" in left sidebar
   - Click "Create application" button

3. **Choose Template**
   - **Select: "Start with Hello World"** ✅
   - This gives you a blank template to edit
   - (Don't select "Connect to GitHub" or "Connect to GitLab" - not needed for this)

4. **Name Your Worker**
   - Worker name: `video-cdn` (or any name you like)
   - Click "Deploy" button

### Step 2: Edit Worker Code

After deployment, you'll see the Worker editor with default "Hello World" code.

**Replace ALL the code** with this:

```javascript
// Fixed Cloudflare Worker for Firebase Storage CDN
// IMPORTANT: Deploy Firebase Storage Rules FIRST (see Step 0 below)

// Your Firebase Storage bucket name
const FIREBASE_BUCKET = 'studio-9632556640-bd58d.firebasestorage.app';
const FIREBASE_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/' + FIREBASE_BUCKET + '/o/';

export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle OPTIONS for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  // Only handle video/HLS requests
  if (url.pathname.startsWith('/videos/')) {
    // Extract the path after /videos/
    let storagePath = url.pathname.replace('/videos/', '');
    
    // Remove leading slash if present
    if (storagePath.startsWith('/')) {
      storagePath = storagePath.substring(1);
    }
    
    // Firebase Storage requires each path segment to be encoded separately
    // Example: posts/userId/video.mp4 becomes posts%2FuserId%2Fvideo.mp4
    const pathSegments = storagePath.split('/');
    const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
    const encodedPath = encodedSegments.join('%2F'); // Use %2F for forward slashes
    
    // Build Firebase Storage URL
    const firebaseUrl = FIREBASE_STORAGE_BASE + encodedPath + '?alt=media';
    
    // Prepare headers for Firebase Storage request
    const fetchHeaders = new Headers();
    
    // Forward Range header for video streaming
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      fetchHeaders.set('Range', rangeHeader);
    }
    
    // Fetch from Firebase Storage
    try {
      const response = await fetch(firebaseUrl, {
        method: request.method,
        headers: fetchHeaders,
        cf: {
          cacheTtl: url.pathname.endsWith('.ts') ? 31536000 : 3600,
          cacheEverything: true,
        }
      });
      
      // If Firebase returns an error, return it with details
      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({
          error: {
            code: response.status,
            message: response.statusText,
            details: 'Failed to fetch from Firebase Storage. Make sure storage rules are deployed and file exists.',
          }
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      
      // Create response with proper headers
      const newHeaders = new Headers(response.headers);
      
      // Set CORS headers
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', 'Range');
      
      // Set cache headers
      if (url.pathname.endsWith('.ts')) {
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (url.pathname.endsWith('.m3u8')) {
        newHeaders.set('Cache-Control', 'public, max-age=3600');
      } else {
        newHeaders.set('Cache-Control', 'public, max-age=86400');
      }
      
      // Ensure proper content type
      if (!newHeaders.has('Content-Type')) {
        if (url.pathname.endsWith('.m3u8')) {
          newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
        } else if (url.pathname.endsWith('.ts')) {
          newHeaders.set('Content-Type', 'video/mp2t');
        } else if (url.pathname.endsWith('.mp4')) {
          newHeaders.set('Content-Type', 'video/mp4');
        }
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: {
          code: 500,
          message: 'Internal Server Error',
          details: error.message
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  }
  
  // For non-video requests, return 404
  return new Response('Not Found', { status: 404 });
}
```

### Step 3: Update Firebase Bucket Name

**Important**: Replace `studio-9632556640-bd58d` with your actual Firebase Storage bucket name.

To find your bucket name:
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Storage
4. Click Settings (gear icon)
5. Look for "Bucket" - it will be something like `studio-9632556640-bd58d.firebasestorage.app`

### Step 4: Save and Deploy

1. Click "Save and deploy" button (top right)
2. Wait for deployment (usually takes 10-30 seconds)
3. You'll see "Successfully deployed" message

### Step 5: Add Route

1. **Go to Worker Settings**
   - Click on your worker name (`video-cdn`)
   - Click "Settings" tab
   - Scroll down to "Triggers" section

2. **Add Custom Route**
   - Click "Add route" button
   - **Route**: `aaura.live/videos/*`
   - **Zone**: Select your domain from dropdown
   - Click "Save"

### Step 6: Verify Setup

1. **Check Worker is Active**
   - Go to Workers & Pages
   - Your worker should show "Active" status

2. **Test the Route**
   - Visit: `https://aaura.live/videos/test`
   - Should return "Not Found" (this is normal - means worker is working)

## Visual Guide

```
Cloudflare Dashboard
├── Workers & Pages
    ├── Create application
        ├── [SELECT] "Start with Hello World" ✅
        ├── Name: video-cdn
        ├── Deploy
        ├── [REPLACE CODE with code above]
        ├── Save and deploy
        └── Settings → Triggers → Add route
            ├── Route: aaura.live/videos/*
            └── Save
```

## Troubleshooting

### Issue: Can't find "Start with Hello World"
- Make sure you're in "Workers & Pages" section
- Look for "Create" or "Create application" button
- The options should show: "Start with Hello World", "Connect to GitHub", etc.

### Issue: Code editor not showing
- After clicking "Deploy", you should see the code editor
- If not, click on your worker name to open it
- Then click "Edit code" or "Quick edit"

### Issue: Route not working
- Make sure route is: `aaura.live/videos/*` (with asterisk)
- Make sure zone is selected correctly
- Wait 1-2 minutes for DNS propagation

### Issue: 404 errors
- Check Firebase bucket name is correct
- Check the path in your video URLs matches `/videos/...`
- Check browser console for errors

## Next Steps

After Worker is set up:
1. ✅ Worker deployed
2. ✅ Route configured
3. ✅ Test with a new video upload
4. ✅ Check CDN URLs in browser DevTools

Your videos will now be served through Cloudflare CDN! 🚀

