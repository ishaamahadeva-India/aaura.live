// Final Cloudflare Worker for Firebase Storage CDN
// This version tries both bucket name formats and provides better error messages

// Try both bucket name formats (some Firebase projects use different formats)
const FIREBASE_BUCKET_SHORT = 'studio-9632556640-bd58d';
const FIREBASE_BUCKET_FULL = 'studio-9632556640-bd58d.firebasestorage.app';

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
    
    if (!storagePath) {
      return new Response(JSON.stringify({
        error: {
          code: 400,
          message: 'Bad Request',
          details: 'No file path provided after /videos/'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    // Firebase Storage requires each path segment to be encoded separately
    // Example: posts/userId/video.mp4 becomes posts%2FuserId%2Fvideo.mp4
    const pathSegments = storagePath.split('/');
    const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
    const encodedPath = encodedSegments.join('%2F'); // Use %2F for forward slashes
    
    // Debug logging
    console.log('[Worker] Request details:', {
      originalUrl: request.url,
      pathname: url.pathname,
      extractedPath: storagePath,
      pathSegments: pathSegments,
      encodedPath: encodedPath
    });
    
    // Try short bucket name first (most common)
    let firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/' + FIREBASE_BUCKET_SHORT + '/o/' + encodedPath + '?alt=media';
    console.log('[Worker] Constructed Firebase URL:', firebaseUrl);
    
    // Prepare headers for Firebase Storage request
    const fetchHeaders = new Headers();
    
    // Forward Range header for video streaming
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      fetchHeaders.set('Range', rangeHeader);
    }
    
    // Fetch from Firebase Storage
    try {
      let response = await fetch(firebaseUrl, {
        method: request.method,
        headers: fetchHeaders,
        cf: {
          cacheTtl: url.pathname.endsWith('.ts') ? 31536000 : 3600,
          cacheEverything: true,
        }
      });
      
      // If 404 with short bucket, try full bucket name
      // Note: 403 means permission denied (rules issue), 404 means file not found
      if (response.status === 404 && firebaseUrl.includes(FIREBASE_BUCKET_SHORT)) {
        console.log('[Worker] Short bucket name returned 404, trying full bucket name');
        const fullBucketUrl = 'https://firebasestorage.googleapis.com/v0/b/' + FIREBASE_BUCKET_FULL + '/o/' + encodedPath + '?alt=media';
        console.log('[Worker] Trying full bucket URL:', fullBucketUrl);
        const fullBucketResponse = await fetch(fullBucketUrl, {
          method: request.method,
          headers: fetchHeaders,
          cf: {
            cacheTtl: url.pathname.endsWith('.ts') ? 31536000 : 3600,
            cacheEverything: true,
          }
        });
        if (fullBucketResponse.ok || fullBucketResponse.status !== 404) {
          response = fullBucketResponse;
          firebaseUrl = fullBucketUrl;
        }
      }
      
      // If Firebase returns an error, provide detailed error message
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Worker] Firebase Storage error:', {
          status: response.status,
          statusText: response.statusText,
          firebaseUrl: firebaseUrl,
          storagePath: storagePath,
          errorText: errorText.substring(0, 200) // First 200 chars
        });
        
        let errorDetails = 'Failed to fetch from Firebase Storage.';
        
        if (response.status === 403) {
          errorDetails = 'Permission denied. Make sure Firebase Storage rules are deployed with "allow read: if true" for your file paths.';
        } else if (response.status === 404) {
          errorDetails = 'File not found. Check that the file path is correct and the file exists in Firebase Storage.';
          errorDetails += ' The Worker tried to access: ' + firebaseUrl;
        }
        
        return new Response(JSON.stringify({
          error: {
            code: response.status,
            message: response.statusText,
            details: errorDetails,
            firebaseUrl: firebaseUrl,
            storagePath: storagePath,
            encodedPath: encodedPath,
            bucketUsed: firebaseUrl.includes(FIREBASE_BUCKET_FULL) ? 'full' : 'short',
            troubleshooting: {
              step1: 'Verify file exists in Firebase Storage Console at path: ' + storagePath,
              step2: 'Test direct Firebase URL in browser: ' + firebaseUrl,
              step3: 'Check Cloudflare Worker logs for detailed error information',
              step4: 'Verify Firebase Storage rules allow public read access'
            }
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
          details: error.message,
          storagePath: storagePath
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

