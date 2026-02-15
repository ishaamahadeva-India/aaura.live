'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useActiveVideo } from '@/contexts/ActiveVideoContext';
import { getHlsCdnUrl, getCdnUrl } from '@/lib/firebase/cdn-urls';

interface HLSVideoPlayerProps {
  hlsUrl: string | null;
  fallbackUrl?: string | null; // MP4 fallback if HLS not available
  videoId: string;
  isActive?: boolean;
  className?: string;
  poster?: string;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onError?: (error: Error) => void;
}

export function HLSVideoPlayer({
  hlsUrl,
  fallbackUrl,
  videoId,
  isActive = false,
  className = '',
  poster,
  controls = true,
  muted = false,
  loop = false,
  playsInline = true,
  preload = 'auto',
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onError,
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [isHlsSupported, setIsHlsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeVideoId, setActiveVideoId, saveVideoState, getVideoState } = useActiveVideo();
  const isActiveVideo = activeVideoId === videoId;

  // Check HLS support
  useEffect(() => {
    setIsHlsSupported(Hls.isSupported());
  }, []);

  // Initialize HLS or native HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Validate URLs before proceeding
    if (!hlsUrl && !fallbackUrl) {
      console.warn('[HLSVideoPlayer] No video URL provided');
      setError('No video URL available');
      setIsLoading(false);
      return;
    }

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Convert URLs to CDN URLs
    const cdnHlsUrl = hlsUrl ? getHlsCdnUrl(hlsUrl) : null;
    const cdnFallbackUrl = fallbackUrl ? getCdnUrl(fallbackUrl) : null;

    // Use HLS if URL is available
    if (cdnHlsUrl || hlsUrl) {
      const urlToUse = cdnHlsUrl || hlsUrl;
      
      if (Hls.isSupported()) {
        // Use hls.js for browsers that don't support native HLS
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          // Increased buffering for smooth playback (like Instagram/YouTube)
          backBufferLength: 90, // Keep 90 seconds in buffer behind current position
          maxBufferLength: 60, // Buffer up to 60 seconds ahead (increased from 30)
          maxMaxBufferLength: 120, // Maximum buffer length (increased from 60)
          maxBufferSize: 120 * 1000 * 1000, // 120MB buffer (increased from 60MB)
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLoadingTimeOut: 20,
          maxLoadingDelay: 4,
          fragLoadingTimeOut: 20,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3, // Increased retries
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 10000,
          levelLoadingMaxRetry: 4,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 1000,
          startFragPrefetch: true, // Enable prefetching (like major platforms)
          testBandwidth: true, // Test bandwidth for adaptive bitrate
          progressive: false,
          // Improved adaptive bitrate settings
          abrEwmaDefaultEstimate: 500000, // Default bandwidth estimate (500kbps)
          abrBandWidthFactor: 0.95, // Conservative bandwidth factor
          abrBandWidthUpFactor: 0.7, // Factor for switching up in quality
          abrMaxWithRealBitrate: false,
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,
          minAutoBitrate: 0, // Allow switching to lowest quality if needed
          // Enable automatic quality switching (adaptive bitrate)
          capLevelToPlayerSize: true, // Cap quality to player size
          emeEnabled: false,
          widevineLicenseUrl: undefined,
          drmSystemOptions: {},
          requestMediaKeySystemAccessFunc: undefined,
        });

        hls.loadSource(urlToUse);
        hls.attachMedia(video);

        // Set non-standard mobile video attributes
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'allow');
        video.setAttribute('x5-video-player-type', 'h5');
        video.setAttribute('x5-video-orientation', 'portrait');
        video.setAttribute('x5-playsinline', 'true');

        // Fix audio noise on mobile: Pause background music and ensure only one audio track plays
        const pauseAllOtherAudio = () => {
          // Pause all other audio/video elements to prevent conflicts
          const allMedia = document.querySelectorAll('audio, video');
          allMedia.forEach((media) => {
            if (media !== video && !media.paused) {
              (media as HTMLMediaElement).pause();
            }
          });
        };
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          const handleAudioTracks = () => {
            try {
              // Select only the first audio track to prevent multiple tracks playing
              if (video.audioTracks && video.audioTracks.length > 0) {
                // Disable all audio tracks first
                for (let i = 0; i < video.audioTracks.length; i++) {
                  video.audioTracks[i].enabled = false;
                }
                // Enable only the first audio track
                if (video.audioTracks[0]) {
                  video.audioTracks[0].enabled = true;
                }
              }
              
              // Normalize audio settings for mobile
              video.volume = Math.min(video.volume, 1.0); // Ensure volume is not > 1.0
            } catch (e) {
              // AudioTracks API might not be available in all browsers
              if (process.env.NODE_ENV === 'development') {
                console.warn('[HLSVideoPlayer] Audio tracks API not available:', e);
              }
            }
          };
          
          const handlePlay = () => {
            // Pause background music and other audio when video plays
            pauseAllOtherAudio();
          };
          
          video.addEventListener('loadedmetadata', handleAudioTracks);
          video.addEventListener('canplay', handleAudioTracks);
          video.addEventListener('play', handlePlay);
        }

        // HLS event handlers
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[HLSVideoPlayer] Manifest parsed, starting playback');
          setIsLoading(false);
          setError(null);
          if (isActive) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[HLSVideoPlayer] HLS error:', data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[HLSVideoPlayer] Fatal network error, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[HLSVideoPlayer] Fatal media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                console.error('[HLSVideoPlayer] Fatal error, destroying HLS instance');
                hls.destroy();
                // Fallback to MP4 if available
                if (cdnFallbackUrl || fallbackUrl) {
                  console.log('[HLSVideoPlayer] Falling back to MP4');
                  video.src = cdnFallbackUrl || fallbackUrl;
                  video.load();
                } else {
                  setError('Video playback error');
                  onError?.(new Error('HLS playback failed'));
                }
                break;
            }
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          // Fragment loaded successfully
          setIsLoading(false);
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, iOS)
        console.log('[HLSVideoPlayer] Using native HLS support');
        video.src = urlToUse;
        setIsHlsSupported(true);
        setIsLoading(false);
      } else {
        // No HLS support, use fallback
        console.warn('[HLSVideoPlayer] HLS not supported, using fallback');
        if (cdnFallbackUrl || fallbackUrl) {
          video.src = cdnFallbackUrl || fallbackUrl;
          setIsLoading(false);
        } else {
          setError('HLS not supported and no fallback available');
        }
      }
    } else if (cdnFallbackUrl || fallbackUrl) {
      // No HLS URL, use MP4 fallback
      console.log('[HLSVideoPlayer] No HLS URL, using MP4 fallback');
      video.src = cdnFallbackUrl || fallbackUrl;
      setIsLoading(false);
    } else {
      setError('No video URL available');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, fallbackUrl]); // Removed isActive from dependencies to prevent re-initialization

  // Restore playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActiveVideo) return;

    const savedState = getVideoState(videoId);
    if (savedState && savedState.currentTime > 0) {
      const restorePosition = () => {
        if (video.readyState >= 2) {
          try {
            video.currentTime = Math.min(savedState.currentTime, video.duration - 0.1);
            lastTimeRef.current = savedState.currentTime;
            if (savedState.isPlaying) {
              video.play().catch(() => {});
            }
          } catch (e) {
            console.warn('[HLSVideoPlayer] Could not restore position', e);
          }
        } else {
          video.addEventListener('loadeddata', restorePosition, { once: true });
        }
      };
      restorePosition();
    }
  }, [isActiveVideo, videoId, getVideoState]);

  // Control play/pause by isActive
  const lastActiveStateRef = useRef<boolean>(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Prevent infinite loops by checking if state actually changed
    if (isActive === lastActiveStateRef.current) return;

    if (isActive && !lastActiveStateRef.current) {
      // Just became active
      const savedState = getVideoState(videoId);
      if (savedState && savedState.currentTime > 0) {
        try {
          video.currentTime = Math.min(savedState.currentTime, video.duration - 0.1);
        } catch (e) {
          // Ignore
        }
      }
      video.play().catch(() => {});
      lastActiveStateRef.current = true;
    } else if (!isActive && lastActiveStateRef.current) {
      // Just became inactive
      console.trace('[HLSVideoPlayer] Pausing video (became inactive)', { videoId, isActive, currentTime: video.currentTime });
      video.pause();
      lastActiveStateRef.current = false;
    }
  }, [isActive, videoId, getVideoState]);

  // Save video state continuously
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (isActiveVideo && !video.ended) {
        lastTimeRef.current = video.currentTime;
        const now = Date.now();
        if (!(video as any).__lastSaveTime || now - (video as any).__lastSaveTime > 500) {
          saveVideoState(videoId, video.currentTime, !video.paused);
          (video as any).__lastSaveTime = now;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isActiveVideo, videoId, saveVideoState]);

  // Set as active video when playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      // Only set if not already active to prevent loops
      if (activeVideoId !== videoId) {
        setActiveVideoId(videoId);
      }
      onPlay?.();
    };

    const handlePause = () => {
      setTimeout(() => {
        if (video.paused && activeVideoId === videoId) {
          setActiveVideoId(null);
        }
      }, 2000);
      onPause?.();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', () => {
      onEnded?.();
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', onEnded || (() => {}));
    };
  }, [videoId, activeVideoId, setActiveVideoId, onPlay, onPause, onEnded]);

  // Monitor buffering
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      if (isActiveVideo) {
        console.warn(`[HLSVideoPlayer:${videoId}] Waiting for data`);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (isActiveVideo && video.paused) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [isActiveVideo, videoId]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-black text-white`}>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white">Loading video...</div>
        </div>
      )}
      <video
        ref={videoRef}
        data-video-id={videoId}
        data-videoid={videoId}
        data-post-id={videoId}
        className={className}
        controls={controls}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload={preload}
        poster={poster}
        disablePictureInPicture={false}
        controlsList="nodownload noplaybackrate"
        onPointerDown={(e) => {
          // CRITICAL: Stop all pointer events from bubbling to parent zoom handlers
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          // CRITICAL: Stop all touch events from bubbling to parent zoom handlers
          e.stopPropagation();
          // Ensure user interaction is registered for mobile autoplay
          const video = e.currentTarget;
          if (video.paused && isActive) {
            video.play().catch(() => {});
          }
        }}
        onClick={(e) => {
          // CRITICAL: Stop click from bubbling to parent and explicitly play
          e.stopPropagation();
          const video = e.currentTarget;
          if (video.paused) {
            video.play().catch(() => {
              // Ignore autoplay errors - user interaction required
            });
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          onTimeUpdate?.(v.currentTime);
        }}
        onError={(e) => {
          const target = e.target as HTMLVideoElement;
          console.error('[HLSVideoPlayer] Video error:', target.error);
          setError('Video playback error');
          onError?.(new Error(`Video error: ${target.error?.message || 'Unknown error'}`));
        }}
        style={{
          transform: 'none !important',
          touchAction: 'manipulation !important',
        }}
      />
    </>
  );
}

