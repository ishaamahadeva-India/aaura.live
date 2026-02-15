'use client';

import { useState, useEffect } from 'react';
import { BackgroundMusicButton } from './BackgroundMusicButton';
import { BackgroundMusicPlayer } from './BackgroundMusicPlayer';

export function BackgroundMusic() {
  const [isClient, setIsClient] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setIsClient(true), []);

  if (!isClient) return null;

  return (
    <>
      <BackgroundMusicButton onClick={() => setOpen(true)} />
      <BackgroundMusicPlayer isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
