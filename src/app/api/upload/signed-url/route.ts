import { NextRequest, NextResponse } from 'next/server';
import { auth, storage } from '@/lib/firebase/admin';

/**
 * Get a fresh download URL for an existing file
 * GET /api/upload/signed-url?filePath=posts/userId/video.mp4
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure storage is initialized
    if (!storage) {
      console.error('Storage not initialized - Firebase Admin SDK may not be properly configured');
      return NextResponse.json(
        { error: 'Storage service not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing required parameter: filePath' },
        { status: 400 }
      );
    }

    // Get the custom bucket
    let bucket;
    try {
      bucket = storage.bucket('aaura-original-uploads');
      const [bucketExists] = await bucket.exists();
      if (!bucketExists) {
        return NextResponse.json(
          { 
            error: 'Bucket not found', 
            details: `Bucket '${bucket.name}' does not exist or is not accessible`,
            code: 'BUCKET_NOT_FOUND'
          },
          { status: 500 }
        );
      }
    } catch (bucketError: any) {
      console.error('Error accessing bucket:', bucketError);
      return NextResponse.json(
        { 
          error: 'Failed to access storage bucket', 
          details: bucketError.message,
          code: bucketError.code || 'BUCKET_ACCESS_ERROR'
        },
        { status: 500 }
      );
    }

    let file = bucket.file(filePath);
    
    // Check if file exists in custom bucket
    const [fileExists] = await file.exists();
    
    // If file doesn't exist in custom bucket, try default Firebase Storage bucket
    // This handles older files uploaded before the 2-bucket architecture
    if (!fileExists) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`File not found in custom bucket, checking default bucket: ${filePath}`);
      }
      
      try {
        // Try both possible default bucket names (Gen 1 and Gen 2)
        // Older files might be in Gen 1 bucket, newer in Gen 2
        const possibleDefaultBuckets = [
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          process.env.FIREBASE_STORAGE_BUCKET,
          'studio-9632556640-bd58d.firebasestorage.app', // Gen 2 (current default)
          'studio-9632556640-bd58d.appspot.com', // Gen 1 (older files might be here)
        ].filter(Boolean) as string[];
        
        // Try each possible default bucket
        for (const defaultBucketName of possibleDefaultBuckets) {
          try {
            const defaultBucket = storage.bucket(defaultBucketName);
            file = defaultBucket.file(filePath);
            
            const [defaultFileExists] = await file.exists();
            if (defaultFileExists) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`File found in default bucket: ${defaultBucketName}`);
              }
              // Generate fresh download URL from default bucket
              const [downloadUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (maximum allowed)
              });

              return NextResponse.json({
                downloadUrl,
                filePath,
                bucket: defaultBucketName,
                source: 'default-bucket',
              });
            }
          } catch (bucketError: any) {
            // Continue to next bucket if this one fails
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Error checking bucket ${defaultBucketName}:`, bucketError.message);
            }
          }
        }
      } catch (defaultBucketError: any) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error checking default buckets:', defaultBucketError);
        }
        // Continue to return 404 if all default bucket checks fail
      }
      
      // File not found in either bucket
      return NextResponse.json(
        { 
          error: 'File not found', 
          details: `File '${filePath}' does not exist in custom bucket or default bucket`,
          triedBuckets: ['aaura-original-uploads', 'default']
        },
        { status: 404 }
      );
    }

    // Generate fresh download URL from custom bucket
    // Use signed URL with longer expiry for playback (7 days max)
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (maximum allowed)
    });

    return NextResponse.json({
      downloadUrl,
      filePath,
      bucket: 'aaura-original-uploads',
      source: 'custom-bucket',
      // Include metadata to help with debugging
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating download URL:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'An error occurred while generating download URL',
        code: error.code || 'UNKNOWN',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a signed upload URL for authenticated users to upload videos to aaura-original-uploads bucket
 * POST /api/upload/signed-url
 * Body: { filePath: string, contentType: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin SDK is properly configured
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable must be set in production'
        },
        { status: 500 }
      );
    }

    // Ensure storage is initialized
    if (!storage) {
      console.error('Storage not initialized - Firebase Admin SDK may not be properly configured');
      return NextResponse.json(
        { error: 'Storage service not available. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Verify authentication token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token', details: error.message },
        { status: 401 }
      );
    }

    const { filePath, contentType } = await request.json();

    if (!filePath || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: filePath and contentType' },
        { status: 400 }
      );
    }

    // Validate filePath format (must be posts/{userId}/... or media/{userId}/...)
    if (!filePath.startsWith('posts/') && !filePath.startsWith('media/')) {
      return NextResponse.json(
        { error: 'Invalid filePath: must start with posts/ or media/' },
        { status: 400 }
      );
    }

    // Validate that userId in path matches authenticated user
    const pathParts = filePath.split('/');
    if (pathParts.length < 2 || pathParts[1] !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Forbidden: filePath userId must match authenticated user' },
        { status: 403 }
      );
    }

    // Validate content type is video
    if (!contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid contentType: must be a video type' },
        { status: 400 }
      );
    }

    // Get the custom bucket (use the initialized storage instance)
    let bucket;
    try {
      // Try accessing the bucket - this doesn't throw, it just returns a bucket reference
      bucket = storage.bucket('aaura-original-uploads');
      
      // Verify bucket exists by checking if we can access it
      // Note: bucket.exists() is async, but we'll test access when generating the URL
      console.log('Bucket reference created:', bucket.name);
    } catch (bucketError: any) {
      console.error('Error accessing bucket:', {
        message: bucketError.message,
        code: bucketError.code,
        stack: bucketError.stack,
      });
      return NextResponse.json(
        { 
          error: 'Failed to access storage bucket', 
          details: bucketError.message,
          code: bucketError.code || 'BUCKET_ACCESS_ERROR'
        },
        { status: 500 }
      );
    }

    const file = bucket.file(filePath);

    // Generate signed URL for upload (valid for 10 minutes - short-lived for security)
    let signedUrl: string;
    try {
      // Verify bucket exists and is accessible
      const [bucketExists] = await bucket.exists();
      if (!bucketExists) {
        console.error('Bucket does not exist:', bucket.name);
        return NextResponse.json(
          { 
            error: 'Bucket not found', 
            details: `Bucket '${bucket.name}' does not exist or is not accessible`,
            code: 'BUCKET_NOT_FOUND'
          },
          { status: 500 }
        );
      }

      // Generate signed URL for upload (valid for 10 minutes - short-lived for security)
      [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes (reduced from 1 hour)
        contentType: contentType,
      });

      // Note: We don't generate a download URL here because the file doesn't exist yet
      // After upload completes, client should call GET endpoint to get a fresh download URL
      // This ensures we get a valid URL for the actual file
    } catch (urlError: any) {
      console.error('Error generating signed URLs:', {
        message: urlError.message,
        code: urlError.code,
        stack: urlError.stack,
        bucket: bucket.name,
        filePath: filePath,
      });
      
      // Check for specific error types
      if (urlError.code === 403 || urlError.message?.includes('permission')) {
        return NextResponse.json(
          { 
            error: 'Permission denied', 
            details: `Service account does not have permission to access bucket '${bucket.name}'. Please grant 'Storage Object Admin' or 'Storage Admin' role to the service account.`,
            code: 'PERMISSION_DENIED'
          },
          { status: 500 }
        );
      }
      
      if (urlError.code === 404 || urlError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Bucket not found', 
            details: `Bucket '${bucket.name}' not found. Please verify the bucket name and ensure it exists in your Google Cloud project.`,
            code: 'BUCKET_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to generate signed URLs', 
          details: urlError.message || 'Unknown error occurred',
          code: urlError.code || 'SIGNED_URL_ERROR'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl,
      filePath,
      bucket: 'aaura-original-uploads',
      // Note: downloadUrl is not returned here because the file doesn't exist yet
      // Client should call GET endpoint after upload completes to get a fresh download URL
    });
  } catch (error: any) {
    console.error('Error generating signed upload URL:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      cause: error.cause,
    });
    
    // Always return error details to help debug (even in production)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message || 'An error occurred while generating upload URL',
        code: error.code || 'UNKNOWN',
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

