'use client';

import { useState, useEffect, useRef } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface NetworkInfo {
  quality: NetworkQuality;
  effectiveType?: string;
  downlink?: number; // Mbps
  rtt?: number; // ms
  saveData?: boolean;
  isOnline: boolean;
  connectionType?: string;
}

/**
 * Hook to detect network quality and connection status
 * Uses Network Information API when available, falls back to online/offline detection
 */
export function useNetworkQuality(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'unknown',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const lastCheckTime = useRef<number>(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateNetworkInfo = () => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      
      // Check Network Information API (Chrome, Edge, some mobile browsers)
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType || 'unknown';
        const downlink = connection.downlink || 0;
        const rtt = connection.rtt || 0;
        const saveData = connection.saveData || false;

        // Determine quality based on effectiveType and downlink
        let quality: NetworkQuality = 'unknown';
        
        if (effectiveType === '4g' && downlink >= 10) {
          quality = 'excellent';
        } else if (effectiveType === '4g' && downlink >= 1.5) {
          quality = 'good';
        } else if (effectiveType === '4g' || effectiveType === '3g') {
          quality = 'fair';
        } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
          quality = 'poor';
        } else if (downlink >= 10) {
          quality = 'excellent';
        } else if (downlink >= 1.5) {
          quality = 'good';
        } else if (downlink >= 0.5) {
          quality = 'fair';
        } else {
          quality = 'poor';
        }

        setNetworkInfo({
          quality,
          effectiveType,
          downlink,
          rtt,
          saveData,
          isOnline,
          connectionType: connection.type || 'unknown',
        });
      } else {
        // Fallback: Use online/offline status
        setNetworkInfo({
          quality: isOnline ? 'good' : 'poor',
          isOnline,
        });
      }
    };

    // Initial check
    updateNetworkInfo();

    // Listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    // Periodic check (every 5 seconds) to catch changes
    checkInterval.current = setInterval(() => {
      const now = Date.now();
      if (now - lastCheckTime.current > 5000) {
        updateNetworkInfo();
        lastCheckTime.current = now;
      }
    }, 5000);

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, []);

  return networkInfo;
}





