'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const register = async () => {
        try {
          // First, unregister all existing service workers to clear old cache
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            // Clear all caches associated with old service workers
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => {
                if (cacheName.startsWith('aaura-shell-') && cacheName !== 'aaura-shell-v3') {
                  return caches.delete(cacheName);
                }
                return Promise.resolve();
              })
            );
          }

          // Wait a bit to ensure cleanup is complete
          await new Promise(resolve => setTimeout(resolve, 100));

          // Register the new service worker
          const registration = await navigator.serviceWorker.register('/sw.js', {
            updateViaCache: 'none' // Always check for updates, never use cached version
          });
          
          // Force update on registration
          await registration.update();
          
          if (process.env.NODE_ENV === 'development') {
            console.debug('Service worker registered', registration);
          }
        } catch (error) {
          console.error('Service worker registration failed:', error);
        }
      };

      register();
    }
  }, []);

  return null;
}


