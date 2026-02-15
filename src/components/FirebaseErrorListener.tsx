
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

// This is a client-side only component that handles Firestore permission errors globally.
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      // In development, this will throw the error so Next.js's overlay can catch it.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
      // In production, show a toast.
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to perform this action.',
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component does not render anything to the DOM.
  return null;
}
