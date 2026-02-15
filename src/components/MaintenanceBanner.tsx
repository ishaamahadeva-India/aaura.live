'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Maintenance Banner Component
 * 
 * Shows a maintenance alert to users.
 * 
 * To enable: Set NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=true in .env.local
 * To disable: Set NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER=false or remove the env var
 */
export function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if maintenance banner should be shown
    const showBanner = process.env.NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER === 'true';
    
    // Check if user has dismissed it (stored in localStorage)
    const dismissed = typeof window !== 'undefined' 
      ? localStorage.getItem('maintenance-banner-dismissed') === 'true'
      : false;

    if (showBanner && !dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maintenance-banner-dismissed', 'true');
    }
  };

  // Add padding to body when banner is visible
  useEffect(() => {
    if (isVisible && !isDismissed) {
      document.body.style.paddingTop = '60px';
      return () => {
        document.body.style.paddingTop = '';
      };
    }
  }, [isVisible, isDismissed]);

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full">
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 m-0 rounded-none border-x-0 border-t-0">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="flex items-center justify-between w-full pr-2 py-2">
          <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            <strong>aaura.live</strong> is undergoing significant changes. Please visit us on <strong>24-12-2025</strong>.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 ml-2"
            aria-label="Dismiss maintenance banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

