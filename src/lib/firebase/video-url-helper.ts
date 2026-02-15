/**
 * Video URL Helper Utilities
 * 
 * Automatically converts Firebase Storage URLs to Cloudflare CDN URLs
 * for all video-related operations.
 */

/**
 * Converts any Firebase Storage URL to videos.aaura.live CDN URL
 * 
 * @param firebaseUrl - Firebase Storage URL
 * @returns CDN URL using videos.aaura.live subdomain
 * 
 * @example
 * ```typescript
 * const firebaseUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/posts%2Fvideo.mp4?alt=media&token=xyz';
 * const cdnUrl = convertToCdnUrl(firebaseUrl);
 * // Returns: 'https://videos.aaura.live/v0/b/bucket/o/posts%2Fvideo.mp4?alt=media&token=xyz'
 * ```
 */
export function convertToCdnUrl(firebaseUrl: string | null | undefined): string | null {
  if (!firebaseUrl) return null;
  
  // Simple domain replacement
  if (firebaseUrl.includes('firebasestorage.googleapis.com')) {
    return firebaseUrl.replace('firebasestorage.googleapis.com', 'videos.aaura.live');
  }
  
  // Already a CDN URL or invalid
  return firebaseUrl;
}

/**
 * Converts Firebase Storage path to CDN URL
 * 
 * @param storagePath - Storage path (e.g., "posts/userId/video.mp4")
 * @param bucket - Firebase Storage bucket name
 * @param token - Optional download token
 * @returns Full CDN URL
 * 
 * @example
 * ```typescript
 * const url = buildCdnUrl('posts/userId/video.mp4', 'studio-9632556640-bd58d');
 * // Returns: 'https://videos.aaura.live/v0/b/studio-9632556640-bd58d/o/posts%2FuserId%2Fvideo.mp4?alt=media'
 * ```
 */
export function buildCdnUrl(
  storagePath: string,
  bucket: string = 'studio-9632556640-bd58d',
  token?: string
): string {
  const encodedPath = encodeURIComponent(storagePath);
  const baseUrl = `https://videos.aaura.live/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  
  if (token) {
    return `${baseUrl}&token=${token}`;
  }
  
  return baseUrl;
}

/**
 * Converts HLS playlist URL to CDN URL
 * 
 * @param hlsUrl - HLS master playlist URL
 * @returns CDN URL for HLS playlist
 */
export function convertHlsToCdnUrl(hlsUrl: string | null | undefined): string | null {
  return convertToCdnUrl(hlsUrl);
}

/**
 * Checks if a URL is already a CDN URL
 * 
 * @param url - URL to check
 * @returns true if URL uses videos.aaura.live
 */
export function isCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('videos.aaura.live');
}

/**
 * Gets Firebase URL from CDN URL (reverse operation)
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

/**
 * Batch convert multiple URLs to CDN URLs
 * 
 * @param urls - Array of Firebase URLs
 * @returns Array of CDN URLs
 */
export function convertUrlsToCdn(urls: (string | null | undefined)[]): (string | null)[] {
  return urls.map(url => convertToCdnUrl(url));
}

/**
 * Extract storage path from Firebase or CDN URL
 * 
 * @param url - Firebase or CDN URL
 * @returns Storage path (e.g., "posts/userId/video.mp4")
 */
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch (error) {
    console.warn('Failed to extract storage path from URL:', error);
  }
  
  return null;
}

/**
 * Validate CDN URL format
 * 
 * @param url - URL to validate
 * @returns true if URL is valid CDN URL
 */
export function isValidCdnUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'videos.aaura.live' && 
           urlObj.pathname.includes('/v0/b/') &&
           urlObj.pathname.includes('/o/');
  } catch {
    return false;
  }
}







