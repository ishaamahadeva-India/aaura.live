
'use client';

import { useEffect, useRef } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/lib/firebase/errors';

function isFirestorePermissionError(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false;
  const err = reason as { code?: string; message?: string };
  return (
    err.code === 'permission-denied' ||
    (typeof err.message === 'string' && err.message.includes('Missing or insufficient permissions'))
  );
}

// This is a client-side only component that handles Firestore permission errors globally.
export function FirebaseErrorListener() {
  const { toast } = useToast();
  const permissionToastShown = useRef(false);

  useEffect(() => {
    const showPermissionToast = () => {
      if (permissionToastShown.current) return;
      permissionToastShown.current = true;
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Some content may be limited. Try signing in if you haven’t.',
      });
      setTimeout(() => {
        permissionToastShown.current = false;
      }, 8000);
    };

    const handleError = () => showPermissionToast();
    errorEmitter.on('permission-error', handleError);

    // Also handle custom event from the early inline script (catches rejections before React)
    const onCustomPermissionError = () => showPermissionToast();
    window.addEventListener('firebase-permission-error', onCustomPermissionError);

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isFirestorePermissionError(event.reason)) return;
      event.preventDefault();
      event.stopPropagation();
      const err =
        event.reason instanceof Error
          ? event.reason
          : new FirestorePermissionError({
              path: '',
              operation: 'get',
            });
      errorEmitter.emit('permission-error', err as any);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      errorEmitter.off('permission-error', handleError);
      window.removeEventListener('firebase-permission-error', onCustomPermissionError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [toast]);

  // This component does not render anything to the DOM.
  return null;
}
