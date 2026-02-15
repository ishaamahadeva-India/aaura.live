/**
 * CDN URL conversion utilities
 * Converts Firebase Storage URLs to Cloudflare CDN URLs
 */

import { sanitizeFirebaseUrl } from './url-sanitizer';
import { ensureFirebaseMediaUrl } from './storage-urls';

// Your Cloudflare subdomain for videos
// This is a CNAME that proxies to firebasestorage.googleapis.com
const CLOUDFLARE_VIDEOS_DOMAIN = process.env.NEXT_PUBLIC_CDN_VIDEOS_DOMAIN || 'videos.aaura.live';
const CLOUDFLARE_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN || 'aaura.live'; // Keep for backward compatibility

// Toggle to enable/disable CDN (set to false to use direct Firebase Storage URLs)
// Can also be disabled if CDN is consistently failing
// DEFAULT: CDN is ENABLED (use videos.aaura.live for all video URLs)
const USE_CDN = process.env.NEXT_PUBLIC_USE_CDN !== 'false';

// Track CDN failures to disable CDN if it's consistently failing
let cdnFailureCount = 0;
const MAX_CDN_FAILURES = 5; // Disable CDN after 5 failures
let cdnDisabled = false;

// Check if CDN should be disabled
// CRITICAL: CDN is now required for proper video streaming - auto-enable it
// Only disable if there are actual persistent failures (handled by reportCdnFailure)
if (typeof window !== 'undefined') {
  const storedCdnDisabled = localStorage.getItem('cdn_disabled');
  if (storedCdnDisabled === 'true') {
    // CDN was previously disabled, but we should re-enable it for video streaming
    // Clear the disabled flag to allow CDN to work
    console.warn('[CDN] CDN was previously disabled, but re-enabling for video streaming.');
    console.info('[CDN] Clearing disabled flag. CDN is now required for proper video playback.');
    localStorage.removeItem('cdn_disabled');
    cdnDisabled = false; // Re-enable CDN
    cdnFailureCount = 0; // Reset failure count
  } else {
    // CDN is enabled - clear any old failure counts
    cdnFailureCount = 0;
    cdnDisabled = false;
  }
}

/**
 * Disables CDN globally (useful when CDN is consistently failing)
 */
export function disableCdn() {
  cdnDisabled = true;
  if (typeof window !== 'undefined') {
    localStorage.setItem('cdn_disabled', 'true');
    console.warn('[CDN] CDN has been disabled due to failures. Videos will use Firebase Storage directly.');
  }
}

/**
 * Re-enables CDN (clears the disabled flag)
 */
export function enableCdn() {
  cdnDisabled = false;
  cdnFailureCount = 0;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cdn_disabled');
    console.log('[CDN] CDN has been re-enabled. Reload page to apply changes.');
  }
}

// Expose functions globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).enableCdn = enableCdn;
  (window as any).disableCdn = disableCdn;
}

/**
 * Reports a CDN failure (called when a CDN URL fails to load)
 */
export function reportCdnFailure() {
  cdnFailureCount++;
  if (cdnFailureCount >= MAX_CDN_FAILURES && !cdnDisabled) {
    console.error(`[CDN] ${cdnFailureCount} CDN failures detected. Disabling CDN.`);
    disableCdn();
  }
}

/**
 * Converts Firebase Storage URL to Cloudflare CDN URL using subdomain
 * 
 * Simple domain replacement: firebasestorage.googleapis.com → videos.aaura.live
 * Keeps the same path, query params, and everything else
 * 
 * @param firebaseStorageUrl - Original Firebase Storage URL
 * @returns CDN URL or original URL if CDN is disabled
 * 
 * @example
 * Input:  https://firebasestorage.googleapis.com/v0/b/bucket/o/posts%2FuserId%2Fvideo.mp4?alt=media&token=...
 * Output: https://videos.aaura.live/v0/b/bucket/o/posts%2FuserId%2Fvideo.mp4?alt=media&token=...
 */
export function getCdnUrl(firebaseStorageUrl: string | null | undefined): string | null {
  // CRITICAL: Skip CDN conversion for MOV files to avoid format/codec errors
  if (firebaseStorageUrl) {
    const lowerUrl = firebaseStorageUrl.toLowerCase();
    if (lowerUrl.endsWith('.mov') || lowerUrl.includes('.mov?')) {
      // Sanitize and ensure alt=media is present
      const sanitized = sanitizeFirebaseUrl(firebaseStorageUrl);
      const urlWithAltMedia = ensureFirebaseMediaUrl(sanitized);
      console.log('[CDN] Skipping CDN for MOV file, using Firebase URL directly', {
        urlPreview: urlWithAltMedia.substring(0, 200)
      });
      return urlWithAltMedia;
    }
  }

  // Check localStorage again (in case it was cleared after module load)
  // CRITICAL: CDN is required for video streaming - only disable if explicitly set AND failures persist
  if (typeof window !== 'undefined') {
    const storedCdnDisabled = localStorage.getItem('cdn_disabled');
    if (storedCdnDisabled === 'true' && cdnFailureCount >= MAX_CDN_FAILURES) {
      // Only disable if we've had multiple failures AND it's explicitly disabled
      cdnDisabled = true;
    } else {
      // Re-enable CDN if localStorage was cleared or failures are below threshold
      cdnDisabled = false;
      if (storedCdnDisabled === 'true') {
        // Clear the disabled flag if it exists but we're re-enabling
        localStorage.removeItem('cdn_disabled');
        console.log('[CDN] Re-enabling CDN (was previously disabled)');
      }
    }
  }
  
  // Check if CDN is disabled
  if (!USE_CDN || cdnDisabled || !firebaseStorageUrl) {
    if (firebaseStorageUrl && typeof window !== 'undefined') {
      // CRITICAL: Sanitize URL even when CDN is disabled
      const sanitized = sanitizeFirebaseUrl(firebaseStorageUrl);
      // CRITICAL: Ensure alt=media is present even when CDN is disabled
      // Import dynamically to avoid circular dependency
      import('./storage-urls').then(({ ensureFirebaseMediaUrl }) => {
        const urlWithAltMedia = ensureFirebaseMediaUrl(sanitized);
        console.log('[CDN] CDN disabled or not configured, using Firebase URL directly', {
          USE_CDN,
          cdnDisabled,
          hasUrl: !!firebaseStorageUrl,
          hasAltMedia: urlWithAltMedia.includes('alt=media')
        });
        return urlWithAltMedia;
      }).catch(() => sanitized);
      // Return sanitized immediately (async ensureFirebaseMediaUrl is handled in storage-urls.ts)
      return sanitized;
    }
    return firebaseStorageUrl || null;
  }

  // CRITICAL: Sanitize URL before CDN conversion to ensure valid format
  // Do this outside try block so it's available in catch block
  const sanitizedUrl = sanitizeFirebaseUrl(firebaseStorageUrl);

  try {
    // Handle Firebase URL formats:
    // 1. https://firebasestorage.googleapis.com/v0/b/BUCKET.firebasestorage.app/o/path?alt=media&token=...
    // 2. https://firebasestorage.googleapis.com/v0/b/BUCKET/o/path?alt=media&token=...
    // 3. https://BUCKET.firebasestorage.app/o/path?alt=media&token=...
    
    if (sanitizedUrl.includes('firebasestorage.googleapis.com')) {
      // Format 1 or 2: Contains firebasestorage.googleapis.com
      // Need to handle case where bucket includes .firebasestorage.app in path
      
      try {
        const url = new URL(sanitizedUrl);
        const pathMatch = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        
        if (pathMatch) {
          let bucketName = pathMatch[1];
          const storagePath = pathMatch[2];
          const queryString = url.search; // Preserves ?alt=media&token=...
          
          // Use bucket name as-is - both .appspot.com and .firebasestorage.app formats are valid
          
          // CRITICAL: Ensure queryString has alt=media (required for streaming)
          let finalQueryString = queryString;
          if (!finalQueryString.includes('alt=media')) {
            finalQueryString = finalQueryString ? `${finalQueryString}&alt=media` : '?alt=media';
            console.warn('[CDN] Added missing alt=media to CDN URL query string');
          }
          
          // Reconstruct CDN URL with correct format (preserve .appspot.com)
          const cdnUrl = `https://${CLOUDFLARE_VIDEOS_DOMAIN}/v0/b/${bucketName}/o/${storagePath}${finalQueryString}`;
          
          console.log('[CDN] Converted Firebase URL to CDN URL (videos.aaura.live)', {
            original: firebaseStorageUrl.substring(0, 200) + (firebaseStorageUrl.length > 200 ? '...' : ''),
            cdn: cdnUrl.substring(0, 200) + (cdnUrl.length > 200 ? '...' : ''),
            originalLength: firebaseStorageUrl.length,
            cdnLength: cdnUrl.length,
            hasQueryParams: cdnUrl.includes('?'),
            hasAltMedia: cdnUrl.includes('alt=media'),
            hasToken: cdnUrl.includes('token='),
            bucketFixed: bucketName,
            cdnDomain: CLOUDFLARE_VIDEOS_DOMAIN
          });
          
          return cdnUrl;
        } else {
          // Fallback: simple string replace if path doesn't match expected format
          const cdnUrl = sanitizedUrl.replace(
            'firebasestorage.googleapis.com',
            CLOUDFLARE_VIDEOS_DOMAIN
          ).replace(/\.firebasestorage\.app/g, ''); // Remove .firebasestorage.app from anywhere in URL
          
          console.log('[CDN] Converted Firebase URL (fallback method)', {
            original: firebaseStorageUrl.substring(0, 200) + (firebaseStorageUrl.length > 200 ? '...' : ''),
            cdn: cdnUrl.substring(0, 200) + (cdnUrl.length > 200 ? '...' : '')
          });
          
          return cdnUrl;
        }
      } catch (e) {
        console.warn('[CDN] Error parsing Firebase URL, using simple replace:', e);
        // Fallback: simple string replace (use sanitized URL)
        const cdnUrl = sanitizedUrl.replace(
          'firebasestorage.googleapis.com',
          CLOUDFLARE_VIDEOS_DOMAIN
        ).replace(/\.firebasestorage\.app/g, ''); // Remove .firebasestorage.app
        return cdnUrl;
      }
    } else if (sanitizedUrl.includes('.firebasestorage.app')) {
      // Format 3: https://BUCKET.firebasestorage.app/o/path?alt=media&token=...
      // Convert to: https://videos.aaura.live/v0/b/BUCKET/o/path?alt=media&token=...
      try {
        const url = new URL(sanitizedUrl);
        const bucketName = url.hostname.replace('.firebasestorage.app', '');
        const pathAfterO = url.pathname.replace('/o/', '');
        let queryString = url.search; // Preserves query params
        
        // CRITICAL: Ensure alt=media is present
        if (!queryString.includes('alt=media')) {
          queryString = queryString ? `${queryString}&alt=media` : '?alt=media';
          console.warn('[CDN] Added missing alt=media to .firebasestorage.app CDN URL');
        }
        
        // Reconstruct in standard format
        const cdnUrl = `https://${CLOUDFLARE_VIDEOS_DOMAIN}/v0/b/${bucketName}/o/${pathAfterO}${queryString}`;
        
        console.log('[CDN] Converted .firebasestorage.app URL to CDN URL (videos.aaura.live)', {
          original: firebaseStorageUrl.substring(0, 200) + (firebaseStorageUrl.length > 200 ? '...' : ''),
          cdn: cdnUrl.substring(0, 200) + (cdnUrl.length > 200 ? '...' : ''),
          bucket: bucketName,
          hasQueryParams: cdnUrl.includes('?'),
          hasAltMedia: cdnUrl.includes('alt=media'),
          hasToken: cdnUrl.includes('token='),
          cdnDomain: CLOUDFLARE_VIDEOS_DOMAIN
        });
        
        return cdnUrl;
      } catch (e) {
        console.warn('[CDN] Error parsing .firebasestorage.app URL:', e);
        return sanitizedUrl; // Return sanitized URL instead of original
      }
    } else {
      // URL doesn't match Firebase format
      console.warn('[CDN] URL does not contain firebasestorage.googleapis.com or .firebasestorage.app, returning sanitized:', sanitizedUrl.substring(0, 200));
      return sanitizedUrl; // Return sanitized URL
    }
  } catch (error) {
    console.warn('[CDN] Error converting to CDN URL:', error, sanitizedUrl);
    return sanitizedUrl; // Fallback to sanitized URL
  }
}

/**
 * Converts HLS URL to Cloudflare CDN URL
 * 
 * @param hlsUrl - HLS master playlist URL from Firebase Storage
 * @returns CDN URL for HLS playlist or null
 */
export function getHlsCdnUrl(hlsUrl: string | null | undefined): string | null {
  if (!hlsUrl) return null;
  return getCdnUrl(hlsUrl);
}

/**
 * Checks if a URL is already a CDN URL
 */
export function isCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === CLOUDFLARE_VIDEOS_DOMAIN || 
           urlObj.hostname === CLOUDFLARE_DOMAIN || 
           urlObj.hostname.endsWith(`.${CLOUDFLARE_DOMAIN}`);
  } catch {
    return false;
  }
}

/**
 * Gets the original Firebase Storage URL from a CDN URL
 * (Reverse operation - useful for debugging)
 */
export function getFirebaseUrlFromCdn(cdnUrl: string | null | undefined): string | null {
  if (!cdnUrl || !isCdnUrl(cdnUrl)) {
    return cdnUrl || null;
  }

  try {
    const url = new URL(cdnUrl);
    const path = url.pathname.replace('/videos/', '');
    const encodedPath = encodeURIComponent(path);
    
    // CRITICAL: Preserve existing query parameters from CDN URL
    // DO NOT add ?alt=media - the original Firebase URL already has it
    // If CDN URL has query params, preserve them; otherwise use empty string
    const queryParams = url.search || '';
    
    // You'll need to replace BUCKET_NAME with your actual bucket
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-9632556640-bd58d';
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}${queryParams}`;
  } catch (error) {
    console.warn('[CDN] Error converting CDN URL to Firebase URL:', error);
    return cdnUrl;
  }
}



