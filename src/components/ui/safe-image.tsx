'use client';

import Image, { ImageProps } from 'next/image';

/**
 * Returns true if the URL is from Firebase Storage (with or without token).
 * These URLs often break Vercel's image optimizer (502 OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID)
 * when the ?alt=media&token=... query is truncated or mishandled.
 */
export function isFirebaseStorageUrl(src: string | undefined | null): boolean {
  if (!src || typeof src !== 'string') return false;
  try {
    const u = new URL(src);
    return (
      u.hostname === 'firebasestorage.googleapis.com' ||
      u.hostname.endsWith('.firebasestorage.app')
    );
  } catch {
    return false;
  }
}

/**
 * Next.js Image that uses unoptimized for Firebase Storage URLs to avoid
 * Vercel 502 OPTIMIZED_EXTERNAL_IMAGE_REQUEST_INVALID (token query param handling).
 */
export function SafeImage({ src, unoptimized: unoptimizedProp, ...props }: ImageProps) {
  const fromFirebase =
    typeof src === 'string' ? isFirebaseStorageUrl(src) : false;
  const useUnoptimized = unoptimizedProp ?? fromFirebase;
  return <Image src={src} unoptimized={useUnoptimized} {...props} />;
}
