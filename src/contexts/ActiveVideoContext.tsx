'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface VideoState {
  currentTime: number;
  isPlaying: boolean;
}

interface ActiveVideoState {
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  videoStates: Map<string, VideoState>;
  saveVideoState: (id: string, currentTime: number, isPlaying: boolean) => void;
  getVideoState: (id: string) => VideoState | null;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
}

const ActiveVideoContext = createContext<ActiveVideoState | null>(null);

export function ActiveVideoProvider({ children }: { children: React.ReactNode }) {
  const [activeVideoId, setActiveVideoIdState] = useState<string | null>(null);
  const videoStatesRef = useRef<Map<string, VideoState>>(new Map());
  const playingVideoRef = useRef<HTMLVideoElement | null>(null);

  const setActiveVideoId = useCallback((id: string | null) => {
    setActiveVideoIdState(id);
  }, []);

  const saveVideoState = useCallback((id: string, currentTime: number, isPlaying: boolean) => {
    videoStatesRef.current.set(id, { currentTime, isPlaying });
  }, []);

  const getVideoState = useCallback((id: string) => {
    return videoStatesRef.current.get(id) || null;
  }, []);

  const playVideo = useCallback((id: string) => {
    setActiveVideoIdState(id);
    const state = videoStatesRef.current.get(id);
    videoStatesRef.current.set(id, { currentTime: state?.currentTime || 0, isPlaying: true });
  }, []);

  const pauseVideo = useCallback((id: string) => {
    const state = videoStatesRef.current.get(id);
    if (state) {
      videoStatesRef.current.set(id, { ...state, isPlaying: false });
    }
  }, []);

  // Effect to pause other videos when a new one becomes active
  // CRITICAL: Never pause the active video - it must play to completion
  useEffect(() => {
    // 🚫 CRITICAL GUARD: If no active video, do nothing
    if (!activeVideoId) return;

    // Use requestAnimationFrame to batch DOM queries and avoid interfering with playback
    const rafId = requestAnimationFrame(() => {
      // Pause all other videos EXCEPT the active one
      document.querySelectorAll('video').forEach(video => {
        // Check both data-videoid and data-post-id attributes (FeedCard uses data-post-id)
        const videoElementId = video.getAttribute('data-videoid') || video.getAttribute('data-post-id');
        
      // 🚫 CRITICAL: Never pause the active video - it must continue playing
        const isActiveVideo = videoElementId === activeVideoId;
        
      // ONLY pause non-active videos that are playing
        // Also check if video is actually playing (not just paused) to avoid unnecessary operations
        if (!isActiveVideo && !video.paused && !video.ended && video.readyState > 0) {
          // Only pause if video is actually playing
          try {
          video.pause();
          } catch (e) {
            // Ignore pause errors (video might be in invalid state)
          }
      }
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeVideoId]);

  // Persist video states to sessionStorage
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const states = Array.from(videoStatesRef.current.entries());
        sessionStorage.setItem('videoStates', JSON.stringify(states));
      } catch (e) {
        // Ignore storage errors
      }
    }, 2000); // Save every 2 seconds

    // Load saved states on mount
    try {
      const saved = sessionStorage.getItem('videoStates');
      if (saved) {
        const states = JSON.parse(saved);
        videoStatesRef.current = new Map(states);
      }
    } catch (e) {
      // Ignore parse errors
    }

    return () => clearInterval(interval);
  }, []);

  const value = useMemo(() => ({
    activeVideoId,
    setActiveVideoId,
    videoStates: videoStatesRef.current,
    saveVideoState,
    getVideoState,
    playVideo,
    pauseVideo,
  }), [activeVideoId, setActiveVideoId, saveVideoState, getVideoState, playVideo, pauseVideo]);

  return (
    <ActiveVideoContext.Provider value={value}>
      {children}
    </ActiveVideoContext.Provider>
  );
}

export function useActiveVideo() {
  const context = useContext(ActiveVideoContext);
  if (!context) {
    throw new Error('useActiveVideo must be used within ActiveVideoProvider');
  }
  return context;
}

