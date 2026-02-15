/**
 * Helper function to upload videos to aaura-original-uploads bucket using signed URLs
 */

export async function uploadVideoToOriginalsBucket(
  file: File,
  userId: string,
  authToken: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> {
  const fileName = `posts/${userId}/${Date.now()}.mp4`;

  // Get signed upload URL from backend
  const signedUrlResponse = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      filePath: fileName,
      contentType: file.type || 'video/mp4',
    }),
  });

  if (!signedUrlResponse.ok) {
    let errorData: any;
    try {
      errorData = await signedUrlResponse.json();
    } catch (e) {
      // If response is not JSON, use status text
      throw new Error(`Failed to get signed upload URL: ${signedUrlResponse.status} ${signedUrlResponse.statusText}`);
    }
    
    // Include detailed error message from API
    const errorMessage = errorData.details 
      ? `${errorData.error}: ${errorData.details}` 
      : errorData.error || 'Failed to get signed upload URL';
    
    console.error('Signed URL API error:', {
      status: signedUrlResponse.status,
      statusText: signedUrlResponse.statusText,
      error: errorData.error,
      details: errorData.details,
      code: errorData.code,
    });
    
    throw new Error(errorMessage);
  }

  const { signedUrl, filePath: storagePath } = await signedUrlResponse.json();
  // Note: downloadUrl is not returned from POST endpoint anymore
  // We'll generate a fresh one after upload completes via GET endpoint

  // Upload directly to signed URL using XMLHttpRequest for progress tracking
  return new Promise<{ url: string; path: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let uploadTimeout: NodeJS.Timeout;

    // Set timeout (30 minutes for large videos)
    const timeoutDuration = 30 * 60 * 1000; // 30 minutes
    uploadTimeout = setTimeout(() => {
      xhr.abort();
      reject(new Error(`Upload timeout: The upload took longer than ${timeoutDuration / 60000} minutes. Please try again with a smaller file or check your internet connection.`));
    }, timeoutDuration);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', async () => {
      clearTimeout(uploadTimeout);
      if (xhr.status >= 200 && xhr.status < 300) {
        // CRITICAL: Generate a fresh download URL after upload completes
        // The downloadUrl from the API was generated before the file existed
        // Use GET endpoint to get a fresh URL for the existing file
        try {
          const freshUrlResponse = await fetch(`/api/upload/signed-url?filePath=${encodeURIComponent(storagePath)}`, {
            method: 'GET',
          });

          if (freshUrlResponse.ok) {
            const { downloadUrl: freshDownloadUrl } = await freshUrlResponse.json();
            resolve({
              url: freshDownloadUrl,
              path: storagePath,
            });
          } else {
            // If refresh fails, we cannot proceed without a valid URL
            const errorText = await freshUrlResponse.text();
            console.error('Failed to refresh download URL after upload:', {
              status: freshUrlResponse.status,
              statusText: freshUrlResponse.statusText,
              error: errorText,
            });
            reject(new Error(`Upload succeeded but failed to get download URL: ${freshUrlResponse.status} ${freshUrlResponse.statusText}`));
            return;
          }
        } catch (refreshError) {
          console.error('Error refreshing download URL:', refreshError);
          reject(new Error(`Upload succeeded but failed to get download URL: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`));
          return;
        }
      } else {
        // Provide more detailed error information
        let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        if (xhr.status === 403) {
          errorMessage = 'Upload failed: Permission denied. The signed URL may have expired or you may not have permission to upload.';
        } else if (xhr.status === 400) {
          errorMessage = 'Upload failed: Bad request. The file may be corrupted or the signed URL is invalid.';
        } else if (xhr.status === 0) {
          errorMessage = 'Upload failed: Network error. Please check your internet connection and try again.';
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', (event) => {
      clearTimeout(uploadTimeout);
      console.error('XHR upload error:', {
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText?.substring(0, 200),
        event: event,
      });
      
      // Provide more specific error message
      let errorMessage = 'Upload failed: Network error. ';
      if (xhr.status === 0) {
        errorMessage += 'This could be a CORS issue. Please check browser console for CORS errors.';
      } else if (xhr.status) {
        errorMessage += `Server responded with status ${xhr.status}: ${xhr.statusText}`;
      } else {
        errorMessage += 'Please check your internet connection and try again.';
      }
      
      reject(new Error(errorMessage));
    });

    xhr.addEventListener('abort', () => {
      clearTimeout(uploadTimeout);
      reject(new Error('Upload was canceled'));
    });

    xhr.addEventListener('timeout', () => {
      clearTimeout(uploadTimeout);
      reject(new Error('Upload timeout: The request took too long. Please try again.'));
    });

    xhr.open('PUT', signedUrl);
    // CRITICAL: Set Content-Type header to match what was used when generating the signed URL
    // This must match exactly or Google Storage will return 412 Precondition Failed
    const contentType = file.type || 'video/mp4';
    xhr.setRequestHeader('Content-Type', contentType);
    // Set a timeout for the request itself (browser-level)
    xhr.timeout = timeoutDuration;
    xhr.send(file);
  });
}

