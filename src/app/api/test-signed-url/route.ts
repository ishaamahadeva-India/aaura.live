import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/admin';

/**
 * Diagnostic endpoint to test signed URL generation
 * GET /api/test-signed-url
 * 
 * This helps verify:
 * - FIREBASE_SERVICE_ACCOUNT_KEY is set
 * - Storage is initialized
 * - Bucket exists and is accessible
 * - Service account has permissions
 */
export async function GET() {
  try {
    // Check environment variable
    const hasServiceAccountKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!hasServiceAccountKey) {
      return NextResponse.json({ 
        error: 'FIREBASE_SERVICE_ACCOUNT_KEY not set',
        diagnostic: {
          hasServiceAccountKey: false,
          storageInitialized: false,
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 500 });
    }

    // Check storage initialization
    if (!storage) {
      return NextResponse.json({ 
        error: 'Storage not initialized',
        diagnostic: {
          hasServiceAccountKey: true,
          storageInitialized: false,
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 500 });
    }

    // Try to access the bucket
    const bucket = storage.bucket('aaura-original-uploads');
    
    let bucketExists = false;
    let bucketError: any = null;
    try {
      [bucketExists] = await bucket.exists();
    } catch (error: any) {
      bucketError = {
        message: error.message,
        code: error.code,
      };
    }

    if (!bucketExists && !bucketError) {
      return NextResponse.json({ 
        error: 'Bucket does not exist or is not accessible',
        diagnostic: {
          hasServiceAccountKey: true,
          storageInitialized: true,
          bucketExists: false,
          bucketName: 'aaura-original-uploads',
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 404 });
    }

    if (bucketError) {
      return NextResponse.json({ 
        error: 'Error accessing bucket',
        details: bucketError.message,
        code: bucketError.code,
        diagnostic: {
          hasServiceAccountKey: true,
          storageInitialized: true,
          bucketError: bucketError,
          bucketName: 'aaura-original-uploads',
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 500 });
    }

    // Try to generate a signed URL
    const testFilePath = 'test-file-' + Date.now() + '.txt';
    const file = bucket.file(testFilePath);
    
    let signedUrl: string;
    let urlError: any = null;
    try {
      [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        contentType: 'text/plain',
      });
    } catch (error: any) {
      urlError = {
        message: error.message,
        code: error.code,
        details: error.details,
      };
    }

    if (urlError) {
      // Check for specific error types
      if (urlError.code === 403 || urlError.message?.includes('permission')) {
        return NextResponse.json({ 
          error: 'Permission denied - Service account lacks IAM permissions',
          details: urlError.message,
          code: urlError.code,
          diagnostic: {
            hasServiceAccountKey: true,
            storageInitialized: true,
            bucketExists: true,
            bucketName: 'aaura-original-uploads',
            urlError: urlError,
            nodeEnv: process.env.NODE_ENV,
            fix: 'Grant Storage Object Admin role to firebase-adminsdk-fbsvc@studio-9632556640-bd58d.iam.gserviceaccount.com on bucket aaura-original-uploads',
          }
        }, { status: 403 });
      }

      return NextResponse.json({ 
        error: 'Failed to generate signed URL',
        details: urlError.message,
        code: urlError.code,
        diagnostic: {
          hasServiceAccountKey: true,
          storageInitialized: true,
          bucketExists: true,
          bucketName: 'aaura-original-uploads',
          urlError: urlError,
          nodeEnv: process.env.NODE_ENV,
        }
      }, { status: 500 });
    }

    // Success!
    return NextResponse.json({ 
      success: true,
      message: 'Signed URL generation works correctly',
      diagnostic: {
        hasServiceAccountKey: true,
        storageInitialized: true,
        bucketExists: true,
        bucketName: 'aaura-original-uploads',
        signedUrlGenerated: true,
        nodeEnv: process.env.NODE_ENV,
      },
      // Don't return the actual signed URL for security
      signedUrlPreview: signedUrl.substring(0, 100) + '...',
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: error.message,
      code: error.code,
      diagnostic: {
        hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
        storageInitialized: !!storage,
        nodeEnv: process.env.NODE_ENV,
        unexpectedError: {
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }
      }
    }, { status: 500 });
  }
}

