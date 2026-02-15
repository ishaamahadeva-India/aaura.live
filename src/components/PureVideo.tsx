'use client';

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface PureVideoProps {
  src?: string;           // Raw MP4 URL fallback
  hlsUrl?: string;        // HLS URL (.m3u8)
  videoId: string;
  isActive: boolean;
  poster?: string;
  muted: boolean;
  onPlay?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onLoadedMetadata?: () => void;
}

export const PureVideo = React.forwardRef<HTMLVideoElement, PureVideoProps>(
  ({ src, hlsUrl, videoId, isActive, poster, muted, onPlay, onTimeUpdate, onEnded, onLoadedMetadata }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const finalRef = (ref as React.RefObject<HTMLVideoElement>) || videoRef;
    const hlsInstance = useRef<Hls | null>(null);

    // ------------------- HLS setup -------------------
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;

      if (hlsUrl) {
        // Safari can play natively
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
        } else if (Hls.isSupported()) {
          if (hlsInstance.current) {
            hlsInstance.current.destroy();
            hlsInstance.current = null;
          }
          const hls = new Hls({ autoStartLoad: true });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hlsInstance.current = hls;
        } else {
          console.warn('HLS not supported in this browser');
        }
      } else if (src) {
        video.src = src;
      }

      return () => {
        if (hlsInstance.current) {
          hlsInstance.current.destroy();
          hlsInstance.current = null;
        }
      };
    }, [hlsUrl, src]);

    // ------------------- Active video control -------------------
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;

      if (isActive) {
        video.play().catch(() => {}); // ignore autoplay errors
      } else {
        video.pause();
      }
    }, [isActive]);

    return (
      <video
        ref={finalRef}
        poster={poster}
        muted={muted}
        playsInline
        preload="metadata"
        onPlay={onPlay}
        onTimeUpdate={e => onTimeUpdate?.((e.target as HTMLVideoElement).currentTime)}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        className="w-full h-full object-cover"
      />
    );
  }
);
