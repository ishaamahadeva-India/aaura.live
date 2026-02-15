'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Gauge, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomPictureInPictureProps {
  videoElement: HTMLVideoElement | null;
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CustomPictureInPicture({
  videoElement,
  videoUrl,
  isOpen,
  onClose,
  caption,
}: CustomPictureInPictureProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with main video element
  useEffect(() => {
    if (!videoElement || !pipVideoRef.current) return;

    const pipVideo = pipVideoRef.current;
    const mainVideo = videoElement;

    // Sync playback state
    const handlePlay = () => {
      setIsPlaying(true);
      pipVideo.play().catch(() => {});
    };

    const handlePause = () => {
      setIsPlaying(false);
      pipVideo.pause();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(mainVideo.currentTime);
      if (Math.abs(pipVideo.currentTime - mainVideo.currentTime) > 0.5) {
        pipVideo.currentTime = mainVideo.currentTime;
      }
    };

    const handleDurationChange = () => {
      setDuration(mainVideo.duration || 0);
    };

    const handleRateChange = () => {
      setPlaybackRate(mainVideo.playbackRate);
      pipVideo.playbackRate = mainVideo.playbackRate;
    };

    mainVideo.addEventListener('play', handlePlay);
    mainVideo.addEventListener('pause', handlePause);
    mainVideo.addEventListener('timeupdate', handleTimeUpdate);
    mainVideo.addEventListener('durationchange', handleDurationChange);
    mainVideo.addEventListener('ratechange', handleRateChange);

    // Initial sync
    pipVideo.currentTime = mainVideo.currentTime;
    pipVideo.playbackRate = mainVideo.playbackRate;
    setIsPlaying(!mainVideo.paused);
    setCurrentTime(mainVideo.currentTime);
    setDuration(mainVideo.duration || 0);
    setPlaybackRate(mainVideo.playbackRate);

    return () => {
      mainVideo.removeEventListener('play', handlePlay);
      mainVideo.removeEventListener('pause', handlePause);
      mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
      mainVideo.removeEventListener('durationchange', handleDurationChange);
      mainVideo.removeEventListener('ratechange', handleRateChange);
    };
  }, [videoElement, isOpen]);

  // Sync PiP video with main video
  useEffect(() => {
    if (!pipVideoRef.current || !videoElement) return;

    const pipVideo = pipVideoRef.current;

    const handlePiPPlay = () => {
      if (videoElement.paused) {
        videoElement.play().catch(() => {});
      }
    };

    const handlePiPPause = () => {
      if (!videoElement.paused) {
        videoElement.pause();
      }
    };

    const handlePiPTimeUpdate = () => {
      if (Math.abs(videoElement.currentTime - pipVideo.currentTime) > 0.5) {
        videoElement.currentTime = pipVideo.currentTime;
      }
    };

    pipVideo.addEventListener('play', handlePiPPlay);
    pipVideo.addEventListener('pause', handlePiPPause);
    pipVideo.addEventListener('timeupdate', handlePiPTimeUpdate);

    return () => {
      pipVideo.removeEventListener('play', handlePiPPlay);
      pipVideo.removeEventListener('pause', handlePiPPause);
      pipVideo.removeEventListener('timeupdate', handlePiPTimeUpdate);
    };
  }, [videoElement, isOpen]);

  // Drag handling
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const togglePlayPause = () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play().catch(() => {});
    } else {
      videoElement.pause();
    }
  };

  const skipForward = () => {
    if (!videoElement) return;
    videoElement.currentTime = Math.min(videoElement.currentTime + 10, videoElement.duration);
  };

  const skipBackward = () => {
    if (!videoElement) return;
    videoElement.currentTime = Math.max(videoElement.currentTime - 10, 0);
  };

  const changeSpeed = () => {
    if (!videoElement) return;
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    videoElement.playbackRate = newSpeed;
    setPlaybackRate(newSpeed);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !videoElement) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] bg-black rounded-lg shadow-2xl overflow-hidden border-2 border-primary/50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleDragStart}
    >
      {/* Header - Draggable */}
      <div className="flex items-center justify-between p-2 bg-black/80 border-b border-primary/30">
        <div className="flex items-center gap-2 text-white text-sm font-semibold">
          <Maximize2 className="w-4 h-4" />
          Picture-in-Picture
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Video */}
      <div className="relative bg-black">
        <video
          ref={pipVideoRef}
          src={videoUrl}
          className="w-full aspect-video object-contain"
          muted={false}
          playsInline
          onLoadedMetadata={(e) => {
            const v = e.target as HTMLVideoElement;
            setDuration(v.duration);
            if (videoElement) {
              v.currentTime = videoElement.currentTime;
              v.playbackRate = videoElement.playbackRate;
            }
          }}
        />

        {/* Caption Overlay */}
        {caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-white text-sm line-clamp-2">{caption}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/90 p-3 space-y-2">
        {/* Time Display */}
        <div className="flex items-center justify-between text-white text-xs">
          <span>{formatTime(currentTime)}</span>
          <span className="text-muted-foreground">{formatTime(duration)}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={skipBackward}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={skipForward}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed Control */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-white hover:bg-white/20 flex items-center gap-1"
            onClick={changeSpeed}
          >
            <Gauge className="w-4 h-4" />
            <span className="text-xs font-semibold">{playbackRate}x</span>
          </Button>
        </div>
      </div>
    </div>
  );
}





