'use client';

import { useEffect, useState } from 'react';

let razorpayLoadPromise: Promise<void> | null = null;

/**
 * Loads the Razorpay checkout script once and exposes its readiness state.
 */
export function useRazorpay() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRazorpayScript() {
      if (typeof window === 'undefined') {
        return;
      }

      if (window.Razorpay) {
        setIsReady(true);
        return;
      }

      if (!razorpayLoadPromise) {
        razorpayLoadPromise = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay checkout SDK.'));
          document.body.appendChild(script);
        });
      }

      try {
        await razorpayLoadPromise;
        if (!cancelled) {
          if (window.Razorpay) {
            setIsReady(true);
          } else {
            setError('Razorpay SDK is unavailable after loading.');
            razorpayLoadPromise = null;
          }
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load Razorpay checkout SDK.';
          setError(message);
          razorpayLoadPromise = null;
        }
      }
    }

    loadRazorpayScript();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, error };
}
