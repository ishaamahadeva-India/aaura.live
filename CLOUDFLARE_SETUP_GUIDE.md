# Cloudflare Setup Guide for aaura.live

## ✅ Step 1: Domain Added to Cloudflare (Done!)

You've already:
- Added domain to Cloudflare dashboard
- Updated nameservers in GoDaddy

## 🔧 Step 2: Configure Cloudflare Workers (Recommended)

### Option A: Use Cloudflare Workers (Best Performance)

Cloudflare Workers will proxy your Firebase Storage requests and cache them globally.

#### 2.1 Create a Worker

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com
   - Select your domain (aaura.live)

2. **Go to Workers & Pages**
   - Click "Workers & Pages" in the left sidebar
   - Click "Create application"
   - Click "Create Worker"

3. **Name Your Worker**
   - Name: `video-cdn` (or any name you prefer)
   - Click "Deploy"

4. **Edit Worker Code**

Replace the default code with this:

```javascript
// Get your Firebase Storage bucket name from Firebase Console
// Format: studio-9632556640-bd58d.firebasestorage.app
const FIREBASE_BUCKET = 'studio-9632556640-bd58d.firebasestorage.app';
const FIREBASE_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/' + FIREBASE_BUCKET + '/o/';

export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Only handle video/HLS requests
  // Example: https://aaura.live/videos/posts/userId/videoId/hls/master.m3u8
  if (url.pathname.startsWith('/videos/') || 
      url.pathname.startsWith('/hls/') ||
      url.pathname.includes('.m3u8') ||
      url.pathname.includes('.ts')) {
    
    // Extract the path after /videos/
    let storagePath = url.pathname.replace('/videos/', '');
    
    // If path starts with hls/, handle it
    if (storagePath.startsWith('hls/')) {
      storagePath = storagePath.replace('hls/', '');
    }
    
    // URL encode the path for Firebase Storage
    const encodedPath = encodeURIComponent(storagePath);
    
    // Build Firebase Storage URL
    const firebaseUrl = FIREBASE_STORAGE_BASE + encodedPath + '?alt=media';
    
    // Get the original request headers
    const headers = new Headers();
    
    // Forward necessary headers
    if (request.headers.get('Range')) {
      headers.set('Range', request.headers.get('Range'));
    }
    
    // Fetch from Firebase Storage
    const response = await fetch(firebaseUrl, {
      headers: headers,
      cf: {
        // Cache settings
        cacheTtl: url.pathname.endsWith('.ts') ? 31536000 : 3600, // 1 year for segments, 1 hour for playlists
        cacheEverything: true,
      }
    });
    
    // Create response with proper headers
    const newHeaders = new Headers(response.headers);
    
    // Set CORS headers
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Range');
    
    // Set cache headers
    if (url.pathname.endsWith('.ts')) {
      newHeaders.set('Cache-Control', 'public, max-age=31536000'); // 1 year for segments
    } else if (url.pathname.endsWith('.m3u8')) {
      newHeaders.set('Cache-Control', 'public, max-age=3600'); // 1 hour for playlists
    } else {
      newHeaders.set('Cache-Control', 'public, max-age=86400'); // 1 day for other files
    }
    
    // Copy content type
    if (response.headers.get('Content-Type')) {
      newHeaders.set('Content-Type', response.headers.get('Content-Type'));
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  // For non-video requests, return 404
  return new Response('Not Found', { status: 404 });
}
```

5. **Update Firebase Bucket Name**
   - Replace `studio-9632556640-bd58d` with your actual Firebase Storage bucket name
   - You can find it in Firebase Console → Storage → Settings

6. **Save and Deploy**
   - Click "Save and deploy"

#### 2.2 Add Custom Route

1. **Go to Workers & Pages**
   - Click on your worker (`video-cdn`)
   - Go to "Settings" tab
   - Scroll to "Triggers"

2. **Add Route**
   - Click "Add route"
   - Route: `aaura.live/videos/*` (or `*.aaura.live/videos/*` if using subdomain)
   - Zone: Select your domain
   - Click "Save"

### Option B: Use Cloudflare Page Rules (Simpler, Less Control)

If Workers seem complex, you can use Page Rules:

1. **Go to Rules → Page Rules**
2. **Create Page Rule**
   - URL: `aaura.live/videos/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 1 year
   - Click "Save and Deploy"

## 🔧 Step 3: Configure DNS Records

1. **Go to DNS → Records**

2. **Add/Update Records**:
   - **A Record** (if not exists):
     - Name: `@` (or your root domain)
     - IPv4: `192.0.2.1` (dummy IP, Cloudflare will proxy)
     - Proxy: ✅ (Orange cloud ON)
   
   - **CNAME Record** (for subdomain):
     - Name: `videos` (optional, for videos.aaura.live)
     - Target: `aaura.live`
     - Proxy: ✅ (Orange cloud ON)

3. **Important**: Make sure the proxy (orange cloud) is ON for video routes

## 🔧 Step 4: Configure Caching Rules

1. **Go to Rules → Cache Rules** (or "Caching" in older dashboard)

2. **Create Cache Rule**:
   - Rule name: "Video Files Cache"
   - When: `(http.request.uri.path contains ".ts") or (http.request.uri.path contains ".m3u8")`
   - Then:
     - Cache status: Eligible
     - Edge TTL: 1 month (for .ts), 1 hour (for .m3u8)
     - Browser TTL: 1 year

3. **Create Another Rule for HLS Playlists**:
   - Rule name: "HLS Playlists Cache"
   - When: `http.request.uri.path contains ".m3u8"`
   - Then:
     - Edge TTL: 1 hour
     - Browser TTL: 1 hour

## 🔧 Step 5: Update Your App Code

Now update your app to use Cloudflare URLs instead of direct Firebase Storage URLs.

### 5.1 Create CDN URL Helper

Create or update `src/lib/firebase/cdn-urls.ts`:

```typescript
/**
 * Converts Firebase Storage URLs to Cloudflare CDN URLs
 */

const CLOUDFLARE_DOMAIN = 'aaura.live'; // Your domain
const USE_CDN = true; // Toggle to enable/disable CDN

export function getCdnUrl(firebaseStorageUrl: string): string {
  if (!USE_CDN || !firebaseStorageUrl) {
    return firebaseStorageUrl;
  }

  try {
    const url = new URL(firebaseStorageUrl);
    
    // Extract path from Firebase Storage URL
    // Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/path%2Fto%2Ffile?alt=media&token=...
    const pathMatch = url.pathname.match(/\/o\/(.+)$/);
    if (!pathMatch) {
      return firebaseStorageUrl; // Fallback to original
    }
    
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    // Build Cloudflare CDN URL
    // Format: https://aaura.live/videos/path/to/file
    const cdnUrl = `https://${CLOUDFLARE_DOMAIN}/videos/${decodedPath}`;
    
    return cdnUrl;
  } catch (error) {
    console.warn('Error converting to CDN URL:', error);
    return firebaseStorageUrl; // Fallback to original
  }
}

export function getHlsCdnUrl(hlsUrl: string | null): string | null {
  if (!hlsUrl) return null;
  return getCdnUrl(hlsUrl);
}
```

### 5.2 Update Video Components

Update `src/components/HLSVideoPlayer.tsx`:

```typescript
import { getHlsCdnUrl } from '@/lib/firebase/cdn-urls';

// In the component, before using hlsUrl:
const cdnHlsUrl = getHlsCdnUrl(hlsUrl);
// Use cdnHlsUrl instead of hlsUrl
```

Update `src/components/FeedCard.tsx`:

```typescript
import { getCdnUrl, getHlsCdnUrl } from '@/lib/firebase/cdn-urls';

// When setting HLS URL:
const cdnHlsUrl = getHlsCdnUrl(hlsUrl);

// When setting MP4 fallback:
const cdnMp4Url = getCdnUrl(src);
```

## 🔧 Step 6: Test CDN

1. **Upload a new video** through your app
2. **Wait for HLS conversion**
3. **Check the video URL**:
   - Should be: `https://aaura.live/videos/posts/.../hls/.../master.m3u8`
   - Not: `https://firebasestorage.googleapis.com/...`

4. **Test from different locations**:
   - Use VPN or online tools
   - Check latency improvement

5. **Check Cloudflare Analytics**:
   - Go to Analytics → Workers
   - See cache hit rates
   - Monitor bandwidth savings

## 🔧 Step 7: Optimize Cloudflare Settings

### 7.1 Speed Settings

1. **Go to Speed → Optimization**
   - Enable: Auto Minify (JavaScript, CSS, HTML)
   - Enable: Brotli compression
   - Enable: HTTP/2
   - Enable: HTTP/3 (with QUIC)

### 7.2 Security Settings

1. **Go to Security → Settings**
   - SSL/TLS: Full (strict) - if you have SSL certificate
   - Or: Full - if using Cloudflare's free SSL

### 7.3 Network Settings

1. **Go to Network**
   - Enable: HTTP/2
   - Enable: HTTP/3 (with QUIC)
   - Enable: 0-RTT Connection Resumption

## 📊 Monitoring

### Check CDN Performance

1. **Cloudflare Dashboard → Analytics**
   - Bandwidth saved
   - Cache hit ratio
   - Request count

2. **Browser DevTools**
   - Network tab
   - Check response headers:
     - `CF-Cache-Status: HIT` (cached)
     - `CF-Cache-Status: MISS` (not cached)

## 🐛 Troubleshooting

### Issue: Videos Not Loading

**Check**:
1. Worker is deployed and active
2. Route is configured correctly
3. DNS is propagated (can take 24-48 hours)
4. Firebase Storage bucket name is correct

### Issue: 404 Errors

**Check**:
1. URL path matches Firebase Storage path
2. Worker code handles the path correctly
3. Firebase Storage file exists

### Issue: CORS Errors

**Solution**: Worker already sets CORS headers, but verify:
- `Access-Control-Allow-Origin: *` is set
- Browser console shows no CORS errors

### Issue: Cache Not Working

**Check**:
1. Cache rules are configured
2. `Cache-Control` headers are set
3. `CF-Cache-Status` header in response

## ✅ Success Checklist

- [ ] Worker deployed and active
- [ ] Route configured (`aaura.live/videos/*`)
- [ ] DNS records updated
- [ ] Caching rules configured
- [ ] App code updated to use CDN URLs
- [ ] Test video uploads and plays correctly
- [ ] CDN URLs working (check browser network tab)
- [ ] Cache hit rate > 50% (check Cloudflare analytics)

## 🎯 Expected Results

After setup:
- ✅ Videos load faster (lower latency)
- ✅ Reduced bandwidth costs
- ✅ Better global performance
- ✅ Automatic caching
- ✅ DDoS protection (included with Cloudflare)

## 📞 Next Steps

1. Deploy the Worker code
2. Configure the route
3. Update your app code to use CDN URLs
4. Test with a new video upload
5. Monitor Cloudflare analytics

Your videos will now be served through Cloudflare's global CDN! 🚀

