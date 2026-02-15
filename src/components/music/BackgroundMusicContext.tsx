'use client';

import { createContext, useContext } from 'react';

export interface BackgroundMusicContextType {
  isEnabled: boolean;
  isPlaying: boolean;
  volume: number;
  toggle: () => void;
  setVolume: (v: number) => void;
  play: () => void;
  pause: () => void;
}

export const BackgroundMusicContext = createContext<BackgroundMusicContextType | null>(null);

export function useBackgroundMusic() {
  const ctx = useContext(BackgroundMusicContext);
  if (!ctx) {
    throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  }
  return ctx;
}
