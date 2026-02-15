/**
 * Firebase URL Sanitizer
 * 
 * Normalizes Firebase Storage URLs to prevent mixed/invalid URL formats
 * that can occur during Firebase SDK migration between googleapis.com and firebasestorage.app
 */

const BUCKET_NAME = 'studio-9632556640-bd58d';
const GOOGLEAPIS_FORMAT = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}.appspot.com/o/`;
const FIRESTORAGE_APP_FORMAT = `https://${BUCKET_NAME}.firebasestorage.app/o/`;

/**
 * Sanitizes a Firebase Storage URL to ensure it uses a consistent, valid format
 * 
 * Rules:
 * - If URL contains googleapis.com → use googleapis.com format
 * - If URL contains firebasestorage.app → use firebasestorage.app format
 * - Never allow mixed domains
 * - Remove duplicated domain segments
 * - Clean up bucket name issues
 * 
 * @param url - Firebase Storage URL (may be mixed/invalid)
 * @returns Sanitized, normalized Firebase Storage URL
 */
export function sanitizeFirebaseUrl(url: string): string {
  if (!url) return url;
  
  try {
    // CRITICAL FIX: Only fix corrupted bucket names (those with .firebasestorage.app in path)
    // DO NOT modify Gen 2 URLs that are already correct (just PROJECT_ID)
    // Gen 2 format: /v0/b/PROJECT_ID/o/... (correct - keep as-is)
    // Wrong format: /v0/b/PROJECT_ID.firebasestorage.app/o/... (fix by removing .firebasestorage.app)
    let fixedUrl = url
      // Fix bucket name in path format: /v0/b/BUCKET.firebasestorage.app/o/... → /v0/b/BUCKET/o/...
      .replace(/\/v0\/b\/([^/]+)\.firebasestorage\.app\/o\//g, '/v0/b/$1/o/')
      // Fix bucket name in path format: /v0/b/BUCKET.firebasestorage.app/... → /v0/b/BUCKET/...
      .replace(/\/v0\/b\/([^/]+)\.firebasestorage\.app\//g, '/v0/b/$1/');
    
    const urlObj = new URL(fixedUrl);
    
    // Check if it's a Firebase Storage URL
    const isGoogleapis = fixedUrl.includes('firebasestorage.googleapis.com');
    const isFirebasestorageApp = fixedUrl.includes('.firebasestorage.app');
    
    if (!isGoogleapis && !isFirebasestorageApp) {
      // Not a Firebase Storage URL, return as-is
      return fixedUrl;
    }
    
    // Detect mixed/invalid URL (should be fixed by now, but check anyway)
    const hasMixedDomains = isGoogleapis && isFirebasestorageApp;
    const hasCorruptedBucket = fixedUrl.includes(`${BUCKET_NAME}.firebasestorage.app`);
    
    if (hasMixedDomains || hasCorruptedBucket) {
      console.warn('[sanitizeFirebaseUrl] Detected corrupted Firebase URL format (should be fixed):', {
        original: url.substring(0, 150) + '...',
        fixed: fixedUrl.substring(0, 150) + '...',
        issue: hasMixedDomains ? 'mixed domains' : 'corrupted bucket name'
      });
    }
    
    // Extract path and query parameters
    let path = '';
    let queryParams = '';
    let bucketName = '';
    
    // Try to extract bucket name and path from /v0/b/{bucket}/o/{path} format
    const v0Match = urlObj.pathname.match(/\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (v0Match) {
      bucketName = v0Match[1];
      path = v0Match[2]; // Keep path URL-encoded as it comes from Firebase
    } else {
      // Try /o/{path} format (direct format)
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
      if (pathMatch) {
        // Keep path URL-encoded as it comes from Firebase
        path = pathMatch[1];
        // Extract bucket from hostname if it's .firebasestorage.app format
        if (urlObj.hostname.includes('.firebasestorage.app')) {
          bucketName = urlObj.hostname.replace('.firebasestorage.app', '');
        } else {
          // Use project ID as bucket name for Gen 2 format
          bucketName = BUCKET_NAME;
        }
      } else {
        // Couldn't extract path, return fixed URL (might not be a storage URL)
        console.warn('[sanitizeFirebaseUrl] Could not extract path from URL:', fixedUrl.substring(0, 100));
        return fixedUrl;
      }
    }
    
    // CRITICAL: Preserve query parameters exactly as they are
    // DO NOT add alt=media - getDownloadURL() already includes it
    // Adding it again causes duplicate query parameters: ?alt=media&token=XXX?alt=media&token=XXX
    queryParams = urlObj.search; // This already includes the ? prefix
    
    // Remove duplicate query parameters if they exist in the FULL URL (not just queryParams)
    // Check if URL has multiple ? characters (indicates duplicate query strings)
    const questionMarkCount = (fixedUrl.match(/\?/g) || []).length;
    if (questionMarkCount > 1) {
      // Multiple ? found - extract only the first query string
      const firstQueryIndex = fixedUrl.indexOf('?');
      const secondQueryIndex = fixedUrl.indexOf('?', firstQueryIndex + 1);
      if (secondQueryIndex !== -1) {
        // Extract query params from first ? to second ?
        queryParams = fixedUrl.substring(firstQueryIndex, secondQueryIndex);
        console.warn('[sanitizeFirebaseUrl] Removed duplicate query parameters', {
          original: urlObj.search,
          cleaned: queryParams,
          fullUrlBefore: fixedUrl.substring(0, 200)
        });
      }
    }
    
    // Use bucket name as-is - both .appspot.com and .firebasestorage.app formats are valid
    let finalBucketName = bucketName;
    
    // Build URL with correct bucket format
    const normalizedUrl = isGoogleapis 
      ? `https://firebasestorage.googleapis.com/v0/b/${finalBucketName}/o/${path}${queryParams}`
      : `https://${finalBucketName}.firebasestorage.app/o/${path}${queryParams}`;
    
    // Validate the normalized URL is valid
    try {
      const testUrl = new URL(normalizedUrl);
      if (!testUrl.pathname || !testUrl.pathname.includes('/o/')) {
        console.warn('[sanitizeFirebaseUrl] Normalized URL appears invalid, returning fixed URL:', normalizedUrl.substring(0, 150));
        return fixedUrl; // Return fixed URL if normalized URL is invalid
      }
    } catch (e) {
      console.error('[sanitizeFirebaseUrl] Normalized URL is invalid:', e, normalizedUrl.substring(0, 150));
      return fixedUrl; // Return fixed URL if validation fails
    }
    
    // Log if we fixed a corrupted URL
    if (url !== normalizedUrl) {
      console.log('[sanitizeFirebaseUrl] Normalized URL:', {
        original: url.substring(0, 150) + '...',
        normalized: normalizedUrl.substring(0, 150) + '...',
        format: 'googleapis.com (enforced)'
      });
    }
    
    return normalizedUrl;
  } catch (error) {
    console.error('[sanitizeFirebaseUrl] Error sanitizing URL:', error, url.substring(0, 100));
    // Try simple replacement as fallback - fix bucket names to include .appspot.com
    try {
      let fallbackUrl = url;
      
      // CRITICAL: For firebasestorage.googleapis.com URLs, bucket MUST have .appspot.com
      if (fallbackUrl.includes('firebasestorage.googleapis.com')) {
        // Remove .firebasestorage.app from bucket name and add .appspot.com
        fallbackUrl = fallbackUrl.replace(/\/v0\/b\/([^/]+)\.firebasestorage\.app\//g, (match, bucket) => {
          const projectId = bucket.replace('.firebasestorage.app', '');
          return `/v0/b/${projectId}.appspot.com/`;
        });
        
        // CRITICAL: If bucket doesn't have .appspot.com, add it
        if (!fallbackUrl.includes('.appspot.com')) {
          fallbackUrl = fallbackUrl.replace(/\/v0\/b\/([^/]+)\/o\//g, (match, bucket) => {
            if (!bucket.includes('.appspot.com') && !bucket.includes('.firebasestorage.app')) {
              const projectId = bucket.replace('.appspot.com', '').replace('.firebasestorage.app', '');
              return `/v0/b/${projectId}.appspot.com/o/`;
            }
            return match;
          });
        }
      }
      
      return fallbackUrl;
    } catch (e) {
      return url; // Return original if all else fails
    }
  }
}

/**
 * Checks if a URL is a Firebase Storage URL
 */
export function isFirebaseStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || 
         url.includes('.firebasestorage.app');
}

/**
 * Validates that a Firebase Storage URL is in a valid format
 * Returns true if valid, false if mixed/invalid
 */
export function isValidFirebaseUrl(url: string): boolean {
  if (!isFirebaseStorageUrl(url)) return true; // Not a Firebase URL, consider valid
  
  const hasGoogleapis = url.includes('firebasestorage.googleapis.com');
  const hasFirebasestorageApp = url.includes('.firebasestorage.app');
  
  // Mixed domains = invalid
  if (hasGoogleapis && hasFirebasestorageApp) {
    return false;
  }
  
  // Check for duplicated bucket name
  if (url.includes(`${BUCKET_NAME}.firebasestorage.app`) && 
      url.includes('firebasestorage.googleapis.com')) {
    return false;
  }
  
  return true;
}

