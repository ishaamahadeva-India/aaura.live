'use client';

import { BackgroundMusicProvider } from './BackgroundMusicProvider';
import { BackgroundMusic } from './BackgroundMusic';

export function BackgroundMusicWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BackgroundMusicProvider>
      {children}
      <BackgroundMusic />
    </BackgroundMusicProvider>
  );
}

export default BackgroundMusicWrapper;
