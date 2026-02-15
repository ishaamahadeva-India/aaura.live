'use client';

import { useEffect, useRef } from 'react';

export function ChunkErrorHandler() {
  const hasReloadedRef = useRef(false);
  const isHandlingRef = useRef(false);

  useEffect(() => {
    // Prevent infinite reload loops
    if (hasReloadedRef.current || typeof window === 'undefined') {
      return;
    }

    // Handle chunk loading errors globally
    const handleChunkError = (event: ErrorEvent) => {
      // Prevent handling the same error multiple times
      if (isHandlingRef.current) return;
      
      const error = event.error;
      
      // Check if it's a chunk loading error
      if (
        error?.name === 'ChunkLoadError' ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Failed to load chunk')
      ) {
        // Mark as handling to prevent duplicate reloads
        isHandlingRef.current = true;
        hasReloadedRef.current = true;
        
        console.warn('Chunk loading error detected, reloading page...', error);
        
        // Prevent infinite reload loop - check sessionStorage
        const reloadKey = 'chunk-error-reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        
        // Only reload if we haven't reloaded in the last 5 seconds
        if (!lastReload || (now - parseInt(lastReload)) > 5000) {
          sessionStorage.setItem(reloadKey, now.toString());
          
          // Clear service worker caches and reload
          if ('serviceWorker' in navigator && 'caches' in window) {
            caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
              );
            }).then(() => {
              // Reload after clearing caches
              setTimeout(() => window.location.reload(), 100);
            }).catch(() => {
              // If cache clearing fails, just reload
              setTimeout(() => window.location.reload(), 100);
            });
          } else {
            // If no service worker, just reload
            setTimeout(() => window.location.reload(), 100);
          }
        } else {
          console.warn('Skipping reload - already reloaded recently');
        }
        
        // Prevent default error handling
        event.preventDefault();
        return true;
      }
      
      return false;
    };

    // Handle unhandled promise rejections (chunk loading errors often come as promise rejections)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent handling the same error multiple times
      if (isHandlingRef.current || hasReloadedRef.current) return;
      
      const reason = event.reason;
      
      // Check if it's a chunk loading error
      if (
        reason?.name === 'ChunkLoadError' ||
        reason?.message?.includes('Loading chunk') ||
        reason?.message?.includes('Failed to fetch dynamically imported module') ||
        reason?.message?.includes('Failed to load chunk') ||
        (typeof reason?.message === 'string' && reason.message.includes('chunk'))
      ) {
        // Mark as handling to prevent duplicate reloads
        isHandlingRef.current = true;
        hasReloadedRef.current = true;
        
        console.warn('Chunk loading error detected in promise rejection, reloading page...', reason);
        
        // Prevent infinite reload loop - check sessionStorage
        const reloadKey = 'chunk-error-reload';
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        
        // Only reload if we haven't reloaded in the last 5 seconds
        if (!lastReload || (now - parseInt(lastReload)) > 5000) {
          sessionStorage.setItem(reloadKey, now.toString());
          
          // Clear service worker caches and reload
          if ('serviceWorker' in navigator && 'caches' in window) {
            caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
              );
            }).then(() => {
              // Reload after clearing caches
              setTimeout(() => window.location.reload(), 100);
            }).catch(() => {
              // If cache clearing fails, just reload
              setTimeout(() => window.location.reload(), 100);
            });
          } else {
            // If no service worker, just reload
            setTimeout(() => window.location.reload(), 100);
          }
        } else {
          console.warn('Skipping reload - already reloaded recently');
        }
        
        // Prevent default error handling
        event.preventDefault();
        return true;
      }
      
      return false;
    };

    // Add event listeners
    window.addEventListener('error', handleChunkError as EventListener, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleChunkError as EventListener, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

