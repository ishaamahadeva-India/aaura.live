// Fixed Cloudflare Worker for Firebase Storage CDN
// This version handles Firebase Storage URLs correctly

// Your Firebase Storage bucket name
// IMPORTANT: Use just the bucket name, NOT the full domain
// The bucket name is: studio-9632556640-bd58d (without .firebasestorage.app)
const FIREBASE_BUCKET = 'studio-9632556640-bd58d';
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
    // Format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media
    const firebaseUrl = FIREBASE_STORAGE_BASE + encodedPath + '?alt=media';
    
    console.log('Worker: Fetching from Firebase Storage:', {
      originalPath: storagePath,
      encodedPath: encodedPath,
      firebaseUrl: firebaseUrl
    });
    
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
          // Cache settings
          cacheTtl: url.pathname.endsWith('.ts') ? 31536000 : 3600,
          cacheEverything: true,
        }
      });
      
      // If Firebase returns an error, log it and return the error
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Worker: Firebase Storage error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          firebaseUrl: firebaseUrl
        });
        
        return new Response(JSON.stringify({
          error: {
            code: response.status,
            message: response.statusText,
            details: 'Failed to fetch from Firebase Storage. Check storage rules and file path.',
            firebaseUrl: firebaseUrl
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
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year for segments
      } else if (url.pathname.endsWith('.m3u8')) {
        newHeaders.set('Cache-Control', 'public, max-age=3600'); // 1 hour for playlists
      } else {
        newHeaders.set('Cache-Control', 'public, max-age=86400'); // 1 day for other files
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
      console.error('Worker: Fetch error:', error);
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

