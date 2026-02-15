'use client';

import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: SwipeHandlers,
  threshold: number = 50
) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchEnd.current = null;
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEnd.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return;

      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Determine if horizontal or vertical swipe
      if (absX > absY && absX > threshold) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else if (absY > absX && absY > threshold) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handlers, threshold]);
}





