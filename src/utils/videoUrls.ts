/**
 * Video URL Helper Utilities
 * 
 * Automatically converts Firebase Storage URLs to Cloudflare CDN URLs
 * for all video-related operations (MP4, HLS, etc.)
 * 
 * This ensures all video requests go through your proxied subdomain (videos.aaura.live),
 * so Cloudflare rules apply and Range requests are preserved.
 */

import { getCdnUrl, getHlsCdnUrl } from '@/lib/firebase/cdn-urls';

/**
 * Converts a Firebase Storage URL to Cloudflare proxied URL
 * 
 * Usage: Pass any Firebase URL, returns the Cloudflare URL
 * 
 * @param firebaseUrl - Firebase Storage URL
 * @returns Cloudflare CDN URL (videos.aaura.live) or original URL if conversion fails
 * 
 * @example
 * ```typescript
 * const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-9632556640-bd58d/o/posts%2Ffile.mp4?alt=media&token=XYZ';
 * const cdnUrl = getCdnVideoUrl(firebaseUrl);
 * // Returns: 'https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2Ffile.mp4?alt=media&token=XYZ'
 * ```
 */
export function getCdnVideoUrl(firebaseUrl: string | null | undefined): string | null {
  if (!firebaseUrl) return null;
  
  // Use the existing CDN conversion function
  return getCdnUrl(firebaseUrl);
}

/**
 * Converts HLS playlist URL to Cloudflare CDN URL
 * 
 * @param hlsUrl - HLS master playlist URL from Firebase Storage
 * @returns CDN URL for HLS playlist or null
 * 
 * @example
 * ```typescript
 * const hlsUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/posts%2Fplaylist.m3u8?alt=media&token=XYZ';
 * const cdnHlsUrl = getCdnHlsVideoUrl(hlsUrl);
 * // Returns: 'https://videos.aaura.live/v0/b/bucket/o/posts%2Fplaylist.m3u8?alt=media&token=XYZ'
 * ```
 */
export function getCdnHlsVideoUrl(hlsUrl: string | null | undefined): string | null {
  if (!hlsUrl) return null;
  
  // Use the existing HLS CDN conversion function
  return getHlsCdnUrl(hlsUrl);
}

/**
 * Auto-convert Firestore paths to CDN URLs
 * 
 * If your Firestore only stores paths, not full URLs, use this function
 * to generate CDN URLs directly from paths.
 * 
 * @param path - Storage path (e.g., "posts/5QC34TXttWhRWlvTo7sLZnU3Q9o1/1765509448793-KALABHAIRAVAASHTAKAM.mp4")
 * @param bucket - Firebase Storage bucket name (defaults to your bucket)
 * @param token - Optional download token
 * @returns Full CDN URL
 * 
 * @example
 * ```typescript
 * const path = 'posts/5QC34TXttWhRWlvTo7sLZnU3Q9o1/1765509448793-KALABHAIRAVAASHTAKAM.mp4';
 * const url = getCdnVideoUrlFromPath(path);
 * // Returns: 'https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2F5QC34TXttWhRWlvTo7sLZnU3Q9o1%2F1765509448793-KALABHAIRAVAASHTAKAM.mp4?alt=media'
 * ```
 */
export function getCdnVideoUrlFromPath(
  path: string,
  bucket: string = 'studio-9632556640-bd58d',
  token?: string
): string {
  const encodedPath = encodeURIComponent(path);
  const baseUrl = `https://videos.aaura.live/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  
  if (token) {
    return `${baseUrl}&token=${token}`;
  }
  
  return baseUrl;
}

/**
 * Batch convert multiple URLs to CDN URLs
 * 
 * @param urls - Array of Firebase URLs
 * @returns Array of CDN URLs
 */
export function convertUrlsToCdn(urls: (string | null | undefined)[]): (string | null)[] {
  return urls.map(url => getCdnVideoUrl(url));
}

/**
 * Checks if a URL is already a CDN URL
 * 
 * @param url - URL to check
 * @returns true if URL uses videos.aaura.live
 */
export function isCdnVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('videos.aaura.live');
}

/**
 * Gets Firebase URL from CDN URL (reverse operation)
 * 
 * Useful for debugging or fallback scenarios
 * 
 * @param cdnUrl - CDN URL
 * @returns Original Firebase URL
 */
export function getFirebaseUrlFromCdn(cdnUrl: string | null | undefined): string | null {
  if (!cdnUrl) return null;
  
  if (cdnUrl.includes('videos.aaura.live')) {
    return cdnUrl.replace('videos.aaura.live', 'firebasestorage.googleapis.com');
  }
  
  return cdnUrl;
}







