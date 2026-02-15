'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to detect when any video or audio elements are playing
 * and call callbacks when media starts/stops
 */
export function useMediaDetection(
  onMediaStart: () => void,
  onMediaStop: () => void,
  enabled: boolean = true
) {
  const mediaElementsRef = useRef<Set<HTMLMediaElement>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const handlePlay = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      if (target && !target.muted && target.volume > 0) {
        onMediaStart();
      }
    };

    const handlePause = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      // Check if any other media is still playing
      setTimeout(() => {
        const anyPlaying = Array.from(mediaElementsRef.current).some(
          el => !el.paused && !el.ended && el.volume > 0 && !el.muted
        );
        if (!anyPlaying) {
          onMediaStop();
        }
      }, 100);
    };

    const handleEnded = () => {
      setTimeout(() => {
        const anyPlaying = Array.from(mediaElementsRef.current).some(
          el => !el.paused && !el.ended && el.volume > 0 && !el.muted
        );
        if (!anyPlaying) {
          onMediaStop();
        }
      }, 100);
    };

    // Observe the document for new media elements
    const observer = new MutationObserver(() => {
      // Find all video and audio elements
      const videos = document.querySelectorAll('video');
      const audios = document.querySelectorAll('audio');

      // Add new elements
      videos.forEach(video => {
        if (!mediaElementsRef.current.has(video)) {
          mediaElementsRef.current.add(video);
          video.addEventListener('play', handlePlay);
          video.addEventListener('pause', handlePause);
          video.addEventListener('ended', handleEnded);
        }
      });

      audios.forEach(audio => {
        if (!mediaElementsRef.current.has(audio)) {
          mediaElementsRef.current.add(audio);
          audio.addEventListener('play', handlePlay);
          audio.addEventListener('pause', handlePause);
          audio.addEventListener('ended', handleEnded);
        }
      });

      // Remove detached elements
      mediaElementsRef.current.forEach(el => {
        if (!document.contains(el)) {
          mediaElementsRef.current.delete(el);
          el.removeEventListener('play', handlePlay);
          el.removeEventListener('pause', handlePause);
          el.removeEventListener('ended', handleEnded);
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial scan for existing media elements
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');

    videos.forEach(video => {
      mediaElementsRef.current.add(video);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
    });

    audios.forEach(audio => {
      mediaElementsRef.current.add(audio);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
    });

    // Cleanup
    return () => {
      observer.disconnect();
      mediaElementsRef.current.forEach(el => {
        el.removeEventListener('play', handlePlay);
        el.removeEventListener('pause', handlePause);
        el.removeEventListener('ended', handleEnded);
      });
      mediaElementsRef.current.clear();
    };
  }, [enabled, onMediaStart, onMediaStop]);
}

