# CDN and Infrastructure Setup Guide

## Overview
This guide explains how to implement CDN, multiple bitrates, and better infrastructure to match major platforms like Instagram/YouTube.

## What's Already Implemented ✅

1. **Multiple Bitrates**: Cloud Function now generates 240p, 480p, 720p, 1080p
2. **Increased Buffering**: HLS player buffers 60-120 seconds ahead
3. **Fast-Start Encoding**: Videos optimized for instant playback
4. **Adaptive Bitrate**: HLS.js automatically switches quality based on network

## What Still Needs Implementation

### 1. CDN (Content Delivery Network)

#### Option A: Cloudflare (Recommended - Free Tier Available)

**Why Cloudflare:**
- Free tier includes CDN
- Easy integration with Firebase Storage
- Global edge network (200+ locations)
- Automatic caching and optimization

**Setup Steps:**

1. **Create Cloudflare Account**
   ```bash
   # Visit: https://dash.cloudflare.com/sign-up
   ```

2. **Add Your Domain**
   - Go to Cloudflare Dashboard
   - Add your domain (e.g., aaura.live)
   - Update DNS nameservers

3. **Configure Firebase Storage CDN**
   - Option 1: Use Cloudflare Workers to proxy Firebase Storage
   - Option 2: Use Cloudflare R2 (S3-compatible storage) and migrate videos
   - Option 3: Use Cloudflare Stream (dedicated video service)

4. **Cloudflare Workers Script** (Proxy Firebase Storage)
   ```javascript
   // workers/firebase-storage-proxy.js
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })

   async function handleRequest(request) {
     const url = new URL(request.url)
     
     // Proxy Firebase Storage requests
     if (url.pathname.startsWith('/videos/')) {
       const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET/o/${url.pathname}`
       
       // Cache for 1 year (segments) or 1 hour (playlists)
       const cacheControl = url.pathname.endsWith('.ts') 
         ? 'public, max-age=31536000'
         : 'public, max-age=3600'
       
       const response = await fetch(firebaseUrl, {
         headers: {
           'Authorization': request.headers.get('Authorization') || ''
         }
       })
       
       return new Response(response.body, {
         headers: {
           ...response.headers,
           'Cache-Control': cacheControl,
           'Access-Control-Allow-Origin': '*'
         }
       })
     }
     
     return fetch(request)
   }
   ```

**Cost:** Free tier: 100,000 requests/day, $5/month for more

#### Option B: Firebase Hosting CDN (Easiest)

**Why Firebase Hosting:**
- Already integrated with Firebase
- Automatic CDN
- Free tier: 10GB storage, 360MB/day transfer

**Setup Steps:**

1. **Enable Firebase Hosting**
   ```bash
   firebase init hosting
   ```

2. **Configure firebase.json**
   ```json
   {
     "hosting": {
       "public": "public",
       "rewrites": [
         {
           "source": "/videos/**",
           "destination": "https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET/o/videos/**"
         }
       ],
       "headers": [
         {
           "source": "**/*.m3u8",
           "headers": [
             {
               "key": "Cache-Control",
               "value": "public, max-age=3600"
             }
           ]
         },
         {
           "source": "**/*.ts",
           "headers": [
             {
               "key": "Cache-Control",
               "value": "public, max-age=31536000"
             }
           ]
         }
       ]
     }
   }
   ```

3. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

**Cost:** Free tier sufficient for small-medium traffic

#### Option C: AWS CloudFront (Most Scalable)

**Why CloudFront:**
- AWS global network
- Best for high traffic
- Integrates with S3

**Setup Steps:**

1. **Create S3 Bucket** (or use existing)
2. **Create CloudFront Distribution**
3. **Configure Origin**: Point to Firebase Storage or S3
4. **Set Cache Behaviors**:
   - `.m3u8` files: Cache 1 hour
   - `.ts` files: Cache 1 year
5. **Update Video URLs**: Use CloudFront domain instead of Firebase Storage

**Cost:** Pay-as-you-go, ~$0.085/GB for first 10TB

### 2. Multiple Bitrates (Already Implemented ✅)

The Cloud Function now generates:
- **240p**: 400kbps (for slow networks)
- **480p**: 1000kbps (for medium networks)
- **720p**: 2500kbps (for good networks)
- **1080p**: 5000kbps (for fast networks)

**How It Works:**
- Master playlist (`master.m3u8`) contains all bitrates
- HLS.js automatically selects best quality based on:
  - Available bandwidth
  - Player size
  - Network conditions

**No Additional Setup Needed** - Already working!

### 3. Better Infrastructure

#### A. Multi-Region Storage

**Current:** Single Firebase Storage region (likely US)

**Solution:** Replicate to multiple regions

**Option 1: Firebase Storage Multi-Region** (Not directly supported)
- Use Cloud Functions to replicate to multiple buckets
- Route users to nearest bucket

**Option 2: Use CDN** (Recommended)
- CDN automatically routes to nearest edge location
- No need for multi-region storage

#### B. Load Balancing

**Current:** Direct Firebase Storage access

**Solution:** Use CDN (handles load balancing automatically)

#### C. Monitoring and Analytics

**Implement Video Analytics:**

1. **Track Playback Events**
   ```javascript
   // In HLSVideoPlayer.tsx
   hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
     // Track quality switch
     analytics.track('video_quality_switch', {
       from: data.level,
       to: data.level + 1,
       videoId: videoId
     })
   })

   hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
     // Track buffering
     analytics.track('video_segment_loaded', {
       videoId: videoId,
       segment: data.frag.url
     })
   })
   ```

2. **Monitor Buffering**
   ```javascript
   video.addEventListener('waiting', () => {
     analytics.track('video_buffering', {
       videoId: videoId,
       currentTime: video.currentTime
     })
   })
   ```

3. **Track Quality Distribution**
   - Monitor which bitrates users watch
   - Optimize bitrate selection

## Implementation Priority

### Phase 1: Immediate (Already Done ✅)
- [x] Multiple bitrates generation
- [x] Increased buffering
- [x] Fast-start encoding
- [x] Adaptive bitrate switching

### Phase 2: Short-term (1-2 weeks)
- [ ] Set up Firebase Hosting CDN (easiest)
- [ ] Update video URLs to use CDN
- [ ] Test playback from different regions

### Phase 3: Medium-term (1-2 months)
- [ ] Implement video analytics
- [ ] Monitor playback metrics
- [ ] Optimize bitrate selection based on data

### Phase 4: Long-term (3-6 months)
- [ ] Consider Cloudflare or AWS CloudFront for scale
- [ ] Implement advanced pre-buffering
- [ ] Add video thumbnail generation
- [ ] Implement video transcoding queue

## Cost Estimates

### Current Setup (Firebase Storage Only)
- **Storage**: ~$0.026/GB/month
- **Bandwidth**: ~$0.12/GB
- **Functions**: ~$0.40 per million invocations

### With Firebase Hosting CDN
- **Storage**: Same as above
- **Hosting**: Free tier (10GB, 360MB/day)
- **Additional**: $0.026/GB for extra storage

### With Cloudflare (Free Tier)
- **Storage**: Same as Firebase
- **CDN**: Free (100k requests/day)
- **Bandwidth**: Free (unlimited on paid plans)

### With AWS CloudFront
- **Storage**: S3 (~$0.023/GB/month)
- **CDN**: ~$0.085/GB for first 10TB
- **Requests**: ~$0.0075 per 10,000 requests

## Testing Checklist

After implementing CDN:

1. **Test from Different Locations**
   - Use VPN or online tools (e.g., https://www.dotcom-tools.com)
   - Check latency from different countries

2. **Test Quality Switching**
   - Throttle network in Chrome DevTools
   - Verify automatic quality switching

3. **Test Buffering**
   - Play long videos (10+ minutes)
   - Verify no stalling

4. **Monitor Analytics**
   - Track buffering events
   - Monitor quality distribution
   - Check CDN cache hit rates

## Next Steps

1. **Deploy Updated Cloud Function** (with multiple bitrates)
   ```bash
   cd functions
   npm install
   firebase deploy --only functions:convertVideoToHLS
   ```

2. **Set Up Firebase Hosting CDN** (easiest option)
   ```bash
   firebase init hosting
   # Configure as per guide above
   firebase deploy --only hosting
   ```

3. **Update Video URLs** to use CDN domain

4. **Test and Monitor**

## Support

For issues or questions:
- Check Firebase Hosting docs: https://firebase.google.com/docs/hosting
- Cloudflare docs: https://developers.cloudflare.com/
- AWS CloudFront docs: https://docs.aws.amazon.com/cloudfront/










