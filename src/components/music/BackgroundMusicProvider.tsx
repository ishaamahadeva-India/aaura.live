'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import { BackgroundMusicContext } from './BackgroundMusicContext';

export function BackgroundMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeVideoRef = useRef(false);

  const [isEnabled, setIsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  // Create audio only on client
  useEffect(() => {
    const audio = new Audio('/sounds/temple-bell.mp3');
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Auto-pause background music when videos play (fixes audio noise on mobile)
  useEffect(() => {
    const handleVideoPlay = (e: Event) => {
      const target = e.target as HTMLVideoElement;
      // Only pause if video has audio (not muted and volume > 0)
      if (target && !target.muted && target.volume > 0) {
        if (audioRef.current && !audioRef.current.paused) {
          wasPlayingBeforeVideoRef.current = true;
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    };

    const handleVideoPause = (e: Event) => {
      // When video pauses, resume background music if it was playing before
      if (wasPlayingBeforeVideoRef.current && isEnabled) {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
          wasPlayingBeforeVideoRef.current = false;
        }
      }
    };

    const handleVideoEnded = () => {
      // When video ends, resume background music if it was playing before
      if (wasPlayingBeforeVideoRef.current && isEnabled) {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
          wasPlayingBeforeVideoRef.current = false;
        }
      }
    };

    // Listen to all video elements
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('play', handleVideoPlay);
      video.addEventListener('pause', handleVideoPause);
      video.addEventListener('ended', handleVideoEnded);
    });

    // Also listen for new videos added dynamically
    const observer = new MutationObserver(() => {
      const newVideos = document.querySelectorAll('video');
      newVideos.forEach(video => {
        if (!video.hasAttribute('data-bg-music-listener')) {
          video.setAttribute('data-bg-music-listener', 'true');
          video.addEventListener('play', handleVideoPlay);
          video.addEventListener('pause', handleVideoPause);
          video.addEventListener('ended', handleVideoEnded);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      videos.forEach(video => {
        video.removeEventListener('play', handleVideoPlay);
        video.removeEventListener('pause', handleVideoPause);
        video.removeEventListener('ended', handleVideoEnded);
      });
      observer.disconnect();
    };
  }, [isEnabled]);

  const play = () => {
    if (!audioRef.current) return;
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const toggle = () => {
    if (isEnabled) {
      pause();
      setIsEnabled(false);
    } else {
      setIsEnabled(true);
      play();
    }
  };

  return (
    <BackgroundMusicContext.Provider
      value={{
        isEnabled,
        isPlaying,
        volume,
        toggle,
        setVolume,
        play,
        pause,
      }}
    >
      {children}
    </BackgroundMusicContext.Provider>
  );
}
