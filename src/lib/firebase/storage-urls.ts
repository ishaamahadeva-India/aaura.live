/**
 * Firebase Storage URL Utilities
 * 
 * Uses ONLY the official Firebase SDK methods.
 * NO manual URL construction - all URLs come from getDownloadURL().
 * 
 * This ensures:
 * - Correct CORS headers
 * - Proper token handling
 * - Support for large video streaming
 * - No URL truncation issues
 */

import { ref, getDownloadURL, listAll, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseStorage } from './client';
import { sanitizeFirebaseUrl } from './url-sanitizer';

/**
 * Ensures Firebase Storage URL has required query parameters for media streaming
 * Firebase requires ?alt=media for byte-range requests and progressive streaming
 * 
 * @param url - Firebase Storage URL
 * @returns URL with alt=media parameter if missing
 */
export function ensureFirebaseMediaUrl(url: string): string {
  if (!url || !url.includes('firebasestorage.googleapis.com')) {
    return url; // Not a Firebase Storage URL, return as-is
  }

  // Check if alt=media is already present
  if (url.includes('alt=media')) {
    return url; // Already has alt=media
  }

  // Add alt=media parameter
  const separator = url.includes('?') ? '&' : '?';
  const fixedUrl = url + separator + 'alt=media';
  
  console.warn('ensureFirebaseMediaUrl: Added missing alt=media parameter', {
    original: url.substring(0, 200),
    fixed: fixedUrl.substring(0, 200)
  });
  
  return fixedUrl;
}

/**
 * Finds the actual video file in a storage folder by listing files
 * This is a fallback when the exact path doesn't exist
 */
async function findVideoFileInFolder(folderPath: string, storage?: FirebaseStorage): Promise<string | null> {
  try {
    const storageInstance = storage || getFirebaseStorage();
    const folderRef = ref(storageInstance, folderPath);
    const result = await listAll(folderRef);
    
    // Look for video files (mp4, webm, etc.)
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    for (const item of result.items) {
      const name = item.name.toLowerCase();
      if (videoExtensions.some(ext => name.endsWith(ext))) {
        console.log('findVideoFileInFolder: Found video file:', item.fullPath);
        return item.fullPath;
      }
    }
    
    // If no video found in root, check subfolders
    for (const prefix of result.prefixes) {
      const subfolderPath = prefix.fullPath;
      const videoPath = await findVideoFileInFolder(subfolderPath, storage);
      if (videoPath) return videoPath;
    }
    
    return null;
  } catch (err: any) {
    console.error('findVideoFileInFolder: Error listing folder', {
      error: err,
      path: folderPath
    });
    return null;
  }
}

/**
 * Gets a download URL from Firebase Storage using ONLY the official SDK
 * 
 * CRITICAL: Returns URL UNCHANGED from getDownloadURL() - no mutations, sanitization, or CDN conversion
 * Any modification to signed Firebase URLs breaks byte-range streaming (Error 4)
 * 
 * @param storagePath - The storage path (e.g., "posts/USERID/FILE.mp4")
 * @param storage - Optional Firebase Storage instance
 * @returns Download URL from Firebase SDK UNCHANGED, or null if path is missing/invalid
 */
export async function getVideoUrlFromPath(
  storagePath: string, 
  storage?: FirebaseStorage
): Promise<string | null> {
  if (!storagePath) {
    console.error('getVideoUrlFromPath: No storage path provided');
    return null;
  }
  
  try {
    // Use provided storage instance or get shared storage (ensures correct bucket)
    const storageInstance = storage || getFirebaseStorage();
    const storageRef = ref(storageInstance, storagePath);
    
    // CRITICAL: Use ONLY getDownloadURL() and return URL UNCHANGED
    // DO NOT modify, sanitize, append, or rebuild the URL
    // Firebase SDK returns correctly signed URLs that must remain untouched
    const url = await getDownloadURL(storageRef);
    
    console.log('getVideoUrlFromPath: Got URL from Firebase SDK (unchanged)', {
      path: storagePath,
      urlLength: url.length,
      urlPreview: url.substring(0, 150)
    });
    
    return url;
  } catch (getUrlError: any) {
    // If file not found (404) or bad request (400), try to find it in the folder
    if (getUrlError?.code === 'storage/object-not-found' || getUrlError?.code === 'storage/invalid-argument') {
      console.warn('getVideoUrlFromPath: File not found at exact path, trying to find in folder', {
        path: storagePath,
        error: getUrlError.code
      });
      
      // Try to find the file by listing the parent folder
      const pathParts = storagePath.split('/');
      if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join('/');
        const foundPath = await findVideoFileInFolder(folderPath, storage);
        if (foundPath) {
          try {
            const storageInstance = storage || getFirebaseStorage();
            const foundRef = ref(storageInstance, foundPath);
            const foundUrl = await getDownloadURL(foundRef);
            console.log('getVideoUrlFromPath: Found video file in folder', {
              originalPath: storagePath,
              foundPath: foundPath,
              urlLength: foundUrl.length
            });
            return foundUrl; // Return unchanged
          } catch (foundError) {
            console.error('getVideoUrlFromPath: Failed to get URL for found file', foundError);
          }
        }
      }
      
      // If path looks like a folder (ends without extension), try to find the file
      const hasExtension = /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(storagePath);
      if (!hasExtension) {
        console.log('getVideoUrlFromPath: Path not found, trying to find file in folder:', storagePath);
        const actualPath = await findVideoFileInFolder(storagePath, storage);
        if (actualPath) {
          return getVideoUrlFromPath(actualPath, storage);
        }
      }
    }
    
    console.error('getVideoUrlFromPath: Failed to get download URL', {
      error: getUrlError,
      path: storagePath
    });
    return null;
  }
}

/**
 * Gets a Firebase Storage URL with CDN conversion enabled
 * This function now converts to CDN URLs (videos.aaura.live) by default
 * 
 * @param storagePath - The storage path (e.g., "posts/USERID/FILE.mp4")
 * @param storage - Optional Firebase Storage instance
 * @returns Firebase Storage URL converted to CDN (videos.aaura.live) if CDN is enabled
 */
export async function getFirebaseUrlFromPath(
  storagePath: string, 
  storage?: FirebaseStorage
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }
  
  try {
    // Use provided storage instance or get shared storage (ensures correct bucket)
    const storageInstance = storage || getFirebaseStorage();
    const storageRef = ref(storageInstance, storagePath);
    let url = await getDownloadURL(storageRef);
    
    // Extract bucket name from URL for logging (no validation - both formats are valid)
    const bucketMatch = url.match(/\/v0\/b\/([^/]+)\/o\//);
    const bucketInUrl = bucketMatch ? bucketMatch[1] : 'unknown';
    
    console.log('getFirebaseUrlFromPath: Got Firebase URL from SDK (will convert to CDN)', {
      urlLength: url.length,
      hasToken: url.includes('token='),
      urlPreview: url.substring(0, 150),
      bucketInUrl: bucketInUrl
    });
    
    // Validate URL is complete (not truncated)
    if (!url || url.length < 50) {
      console.error('getFirebaseUrlFromPath: URL appears truncated or invalid', {
        urlLength: url?.length,
        url: url?.substring(0, 200)
      });
      return null;
    }
    
    // Check if URL has token parameter (required for Firebase Storage)
    if (!url.includes('token=')) {
      console.warn('getFirebaseUrlFromPath: URL missing token parameter', {
        url: url.substring(0, 200)
      });
    }
    
    // CRITICAL: Sanitize URL to prevent mixed/invalid formats
    const sanitizedUrl = sanitizeFirebaseUrl(url);
    
    // Validate sanitized URL is still complete
    if (!sanitizedUrl || sanitizedUrl.length < 50) {
      console.error('getFirebaseUrlFromPath: Sanitized URL appears truncated', {
        originalLength: url.length,
        sanitizedLength: sanitizedUrl?.length
      });
      return url; // Return original if sanitization broke it
    }
    
    // CRITICAL: Ensure alt=media is present for byte-range requests
    const urlWithAltMedia = ensureFirebaseMediaUrl(sanitizedUrl);
    
    // If file is MOV, skip CDN to avoid codec/format issues in some browsers
    const isMov = storagePath.toLowerCase().endsWith('.mov') || sanitizedUrl.toLowerCase().includes('.mov?');

    let finalUrlWithAltMedia: string;
    if (isMov) {
      finalUrlWithAltMedia = urlWithAltMedia;
      console.warn('getFirebaseUrlFromPath: Skipping CDN for MOV file', {
        path: storagePath,
        urlPreview: finalUrlWithAltMedia.substring(0, 200),
      });
    } else {
      // CRITICAL: Convert to CDN URL (videos.aaura.live) for better performance
      // CDN conversion preserves query parameters (alt=media&token=)
      const { getCdnUrl } = await import('@/lib/firebase/cdn-urls');
      const cdnUrl = getCdnUrl(urlWithAltMedia);
      
      // Use CDN URL if available, otherwise fallback to Firebase URL
      const finalUrl = cdnUrl || urlWithAltMedia;
      
      // Final safety check: ensure alt=media is still present after CDN conversion
      finalUrlWithAltMedia = ensureFirebaseMediaUrl(finalUrl);
    }
    
    // Verify CDN URL has correct format
    if (finalUrlWithAltMedia.includes('videos.aaura.live')) {
      console.log('getFirebaseUrlFromPath: Using CDN URL (videos.aaura.live)', {
        cdnUrl: finalUrlWithAltMedia.substring(0, 200),
        hasAltMedia: finalUrlWithAltMedia.includes('alt=media'),
        hasToken: finalUrlWithAltMedia.includes('token=')
      });
    } else {
      console.log('getFirebaseUrlFromPath: Using Firebase URL (CDN disabled or unavailable)', {
        firebaseUrl: finalUrlWithAltMedia.substring(0, 200),
        hasAltMedia: finalUrlWithAltMedia.includes('alt=media'),
        hasToken: finalUrlWithAltMedia.includes('token=')
      });
    }
    
    return finalUrlWithAltMedia; // Return CDN URL (videos.aaura.live) or Firebase URL if CDN disabled
  } catch (err: any) {
    console.error('getFirebaseUrlFromPath: Failed to get Firebase URL', {
      error: err,
      path: storagePath
    });
    return null;
  }
}

/**
 * Ensures URL is safe for video playback.
 * 
 * CRITICAL: Always use videoStoragePath from Firestore - NEVER extract from URLs!
 * URLs in Firestore may be truncated and cannot be trusted.
 * 
 * @param url - Legacy parameter, ignored if storagePath is provided
 * @param storage - Optional Firebase Storage instance
 * @param storagePath - The REAL storage path from Firestore (e.g., "posts/USERID/FILE.mp4")
 * @returns Fresh download URL from Firebase SDK with alt=media, or null if path is missing
 */
export async function ensureVideoUrl(
  url: string | null | undefined, 
  storage?: FirebaseStorage,
  storagePath?: string
): Promise<string | null> {
  // ALWAYS prioritize storagePath from Firestore - it's the source of truth
  if (storagePath) {
    // CRITICAL: Return URL UNCHANGED from getDownloadURL() - no mutations
    // Any modification to signed Firebase URLs breaks byte-range streaming (Error 4)
    const videoUrl = await getVideoUrlFromPath(storagePath, storage);
    return videoUrl; // Return unchanged - Firebase SDK returns correctly signed URLs
  }

  // If no storagePath, we cannot proceed - URLs are unreliable and truncated
  console.error('ensureVideoUrl: No storagePath provided - cannot proceed safely. URLs may be truncated.');
  console.warn('ensureVideoUrl: Post should have videoStoragePath field in Firestore');
  return null;
}

/**
 * Detects MIME type for video URLs
 */
export function getVideoMimeType(url: string | null | undefined): string {
  if (!url) return 'video/mp4';
  const ext = url.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg': return 'video/ogg';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'mkv': return 'video/x-matroska';
    default: return 'video/mp4';
  }
}

/**
 * Extracts storage path from a Firebase Storage URL
 * Returns null if the URL is not a Firebase Storage URL
 */
export function getStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Pattern: /v0/b/{bucket}/o/{path}?...
    // or: /o/{path}?...
    let pathMatch = urlObj.pathname.match(/\/v0\/b\/[^/]+\/o\/([^?]+)/);
    if (!pathMatch) {
      pathMatch = urlObj.pathname.match(/\/o\/([^?]+)/);
    }
    
    if (pathMatch) {
      // Decode the path (it's URL-encoded in the URL)
      let path = decodeURIComponent(pathMatch[1]);
      
      // Handle double encoding
      if (path.includes('%')) {
        try {
          const doubleDecoded = decodeURIComponent(path);
          if (doubleDecoded !== path && !doubleDecoded.includes('%')) {
            path = doubleDecoded;
          }
        } catch (e) {
          // If double decode fails, use single decoded
        }
      }
      
      return path;
    }
    
    return null;
  } catch (e) {
    console.error('getStoragePathFromUrl error', e);
    return null;
  }
}

/**
 * Gets a fresh download URL from an existing Firebase Storage URL
 * Extracts the path and uses getDownloadURL to get a fresh URL
 * 
 * @param url - Existing Firebase Storage URL
 * @param storage - Optional Firebase Storage instance
 * @returns Fresh download URL from Firebase SDK, or null if URL is invalid
 */
export async function refreshVideoUrl(
  url: string | null | undefined,
  storage?: FirebaseStorage
): Promise<string | null> {
  if (!url) return null;
  
  // Check if it's a Firebase Storage URL
  const isFirebaseStorageUrl = url.includes('firebasestorage.googleapis.com') || 
                                url.includes('.firebasestorage.app');
  
  if (!isFirebaseStorageUrl) {
    // Not a Firebase Storage URL, return as-is (e.g., YouTube URLs)
    return url;
  }
  
  // Extract path from URL
  const storagePath = getStoragePathFromUrl(url);
  if (!storagePath) {
    console.warn('refreshVideoUrl: Could not extract path from URL:', url.substring(0, 100));
    // Try to convert existing URL to CDN as fallback
    const { getCdnUrl } = await import('@/lib/firebase/cdn-urls');
    return getCdnUrl(url);
  }
  
  // Get fresh URL using SDK
  const freshUrl = await getVideoUrlFromPath(storagePath, storage);
  
  // Convert to CDN URL if CDN is enabled
  if (freshUrl) {
    const { getCdnUrl } = await import('@/lib/firebase/cdn-urls');
    return getCdnUrl(freshUrl);
  }
  
  return null;
}

/**
 * Prefetch video URL (injects <link rel="preload">)
 */
export function prefetchVideoUrl(url: string) {
  if (!url) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Synchronously validates and converts a video URL to CDN URL
 * This is a synchronous version for use in JSX where async is not possible
 * 
 * @param url - Video URL (Firebase Storage or other)
 * @returns CDN URL if it's a Firebase Storage URL, otherwise original URL
 */
export function validateVideoUrlSync(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Check if it's a Firebase Storage URL
  const isFirebaseStorageUrl = url.includes('firebasestorage.googleapis.com') || 
                                url.includes('.firebasestorage.app');
  
  if (!isFirebaseStorageUrl) {
    // Not a Firebase Storage URL, return as-is (e.g., YouTube URLs)
    return url;
  }

  // If MOV, skip CDN conversion to avoid format/codec issues
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.mov') || lowerUrl.includes('.mov?')) {
    return ensureFirebaseMediaUrl(url);
  }
  
  // Convert to CDN URL synchronously
  // Import at module level to avoid require() issues
  try {
    // Use dynamic import result cached at module level
    const cdnModule = require('@/lib/firebase/cdn-urls');
    return cdnModule.getCdnUrl(url) || url;
  } catch (error) {
    // If import fails, try to convert manually
    try {
      // Use the new subdomain approach - simple domain replacement
      if (url.includes('firebasestorage.googleapis.com')) {
        const cdnUrl = url.replace('firebasestorage.googleapis.com', 'videos.aaura.live');
        return cdnUrl;
      }
    } catch (e) {
      // Fallback to original URL
    }
    console.warn('validateVideoUrlSync: Error converting to CDN, using original URL:', error);
    return url;
  }
}
