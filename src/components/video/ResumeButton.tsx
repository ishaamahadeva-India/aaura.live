'use client';

import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResumeButtonProps {
  videoElement: HTMLVideoElement | null;
  isVisible: boolean;
  onResume: () => void;
  className?: string;
}

export function ResumeButton({ 
  videoElement, 
  isVisible, 
  onResume,
  className 
}: ResumeButtonProps) {
  if (!isVisible || !videoElement) return null;

  const handleResume = () => {
    if (videoElement && videoElement.paused && !videoElement.ended) {
      videoElement.play().catch((err) => {
        console.warn('[ResumeButton] Failed to resume video:', err);
      });
      onResume();
    }
  };

  return (
    <Button
      onClick={handleResume}
      size="lg"
      className={cn(
        "fixed inset-0 m-auto w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-white shadow-2xl z-40",
        "flex items-center justify-center",
        "animate-pulse",
        "pointer-events-auto",
        className
      )}
      style={{ pointerEvents: 'auto' }}
      aria-label="Resume video"
    >
      <Play className="w-10 h-10 fill-white" />
    </Button>
  );
}

