'use client';

import { useState, useEffect } from 'react';
import { Music, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBackgroundMusic } from './BackgroundMusicContext';

export function BackgroundMusicButton({ onClick }: { onClick: () => void }) {
  const [mounted, setMounted] = useState(false);
  const { isEnabled, isPlaying } = useBackgroundMusic();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={onClick}
      className={cn(
        "fixed bottom-20 right-4 z-50 md:bottom-4 rounded-full shadow-lg",
        isPlaying && isEnabled && "ring-2 ring-primary/50"
      )}
    >
      {isEnabled && isPlaying ? (
        <Music className="h-5 w-5 text-primary" />
      ) : (
        <MicOff className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
