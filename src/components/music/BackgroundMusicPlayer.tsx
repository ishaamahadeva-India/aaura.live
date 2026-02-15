'use client';

import { useState, useEffect } from 'react';
import { useBackgroundMusic } from './BackgroundMusicContext';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function BackgroundMusicPlayer({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { isEnabled, isPlaying, volume, toggle, setVolume } = useBackgroundMusic();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" /> Background Music
          </SheetTitle>
          <SheetDescription>
            Ambient music that auto-pauses when other media plays.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Enable / Disable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Background Music</p>
            </div>
            <Button size="icon" onClick={toggle}>
              {isEnabled ? <Volume2 /> : <VolumeX />}
            </Button>
          </div>

          {/* Volume */}
          {isEnabled && (
            <div>
              <p className="text-sm mb-2">Volume: {Math.round(volume * 100)}%</p>
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
