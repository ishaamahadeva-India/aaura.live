'use client';

import { BackgroundMusicProvider } from './BackgroundMusicProvider';
import { BackgroundMusic } from './BackgroundMusic';

export default function BackgroundMusicWithProvider() {
  return (
    <BackgroundMusicProvider>
      <BackgroundMusic />
    </BackgroundMusicProvider>
  );
}
