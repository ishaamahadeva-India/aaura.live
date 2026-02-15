'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useNetworkQuality } from '@/hooks/use-network-quality';

interface VideoDiagnosticsProps {
  videoElement: HTMLVideoElement | null;
  videoId: string;
  videoUrl: string;
  isActive: boolean;
}

interface DiagnosticData {
  timestamp: number;
  event: string;
  details: Record<string, any>;
}

export function VideoDiagnostics({ 
  videoElement, 
  videoId, 
  videoUrl, 
  isActive 
}: VideoDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticData[]>([]);
  const [videoStats, setVideoStats] = useState<Record<string, any>>({});
  const networkInfo = useNetworkQuality();
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Find video element in DOM if not provided
    let actualVideoElement = videoElement;
    if (!actualVideoElement && isActive && typeof document !== 'undefined') {
      // Try to find video element by data-videoid or data-post-id
      const videoEl = document.querySelector(`video[data-videoid="${videoId}"], video[data-post-id="${videoId}"]`) as HTMLVideoElement;
      if (videoEl) {
        actualVideoElement = videoEl;
      }
    }

    if (!isOpen || !actualVideoElement || !isActive) {
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
        statsInterval.current = null;
      }
      return;
    }

    // Collect video statistics
    const collectStats = () => {
      // Find video element if not provided
      let actualVideoElement = videoElement;
      if (!actualVideoElement && typeof document !== 'undefined') {
        const videoEl = document.querySelector(`video[data-videoid="${videoId}"], video[data-post-id="${videoId}"]`) as HTMLVideoElement;
        if (videoEl) {
          actualVideoElement = videoEl;
        }
      }
      if (!actualVideoElement) return;

      const stats = {
        currentTime: actualVideoElement.currentTime.toFixed(2),
        duration: actualVideoElement.duration ? actualVideoElement.duration.toFixed(2) : 'N/A',
        buffered: actualVideoElement.buffered.length > 0 
          ? `${(actualVideoElement.buffered.end(actualVideoElement.buffered.length - 1) - actualVideoElement.currentTime).toFixed(2)}s`
          : '0s',
        readyState: actualVideoElement.readyState,
        networkState: actualVideoElement.networkState,
        paused: actualVideoElement.paused,
        ended: actualVideoElement.ended,
        playbackRate: actualVideoElement.playbackRate,
        volume: actualVideoElement.volume,
        muted: actualVideoElement.muted,
        videoWidth: actualVideoElement.videoWidth,
        videoHeight: actualVideoElement.videoHeight,
        error: actualVideoElement.error ? {
          code: actualVideoElement.error.code,
          message: actualVideoElement.error.message,
        } : null,
      };

      setVideoStats(stats);
    };

    // Initial collection
    collectStats();

    // Collect stats every second
    statsInterval.current = setInterval(collectStats, 1000);

    // Listen for video events
    const events = [
      'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 
      'canplaythrough', 'playing', 'waiting', 'stalled', 
      'error', 'pause', 'play', 'ended', 'seeking', 'seeked'
    ];

    const eventHandlers: Record<string, EventListener> = {};

    events.forEach(eventName => {
      const handler = (e: Event) => {
        const video = e.target as HTMLVideoElement;
        setDiagnostics(prev => [{
          timestamp: Date.now(),
          event: eventName,
          details: {
            currentTime: video.currentTime.toFixed(2),
            readyState: video.readyState,
            networkState: video.networkState,
            paused: video.paused,
          },
        }, ...prev].slice(0, 50)); // Keep last 50 events
      };
      eventHandlers[eventName] = handler;
      actualVideoElement.addEventListener(eventName, handler);
    });

    return () => {
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
      // Find video element for cleanup
      let actualVideoElement = videoElement;
      if (!actualVideoElement && typeof document !== 'undefined') {
        const videoEl = document.querySelector(`video[data-videoid="${videoId}"], video[data-post-id="${videoId}"]`) as HTMLVideoElement;
        if (videoEl) {
          actualVideoElement = videoEl;
        }
      }
      if (actualVideoElement) {
        events.forEach(eventName => {
          if (eventHandlers[eventName]) {
            actualVideoElement.removeEventListener(eventName, eventHandlers[eventName]);
          }
        });
      }
    };
  }, [isOpen, videoElement, videoId, isActive]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-background/80 backdrop-blur-sm"
      >
        <Info className="w-4 h-4 mr-2" />
        Diagnostics
      </Button>
    );
  }

  const getReadyStateLabel = (state: number) => {
    const states = {
      0: 'HAVE_NOTHING',
      1: 'HAVE_METADATA',
      2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA',
      4: 'HAVE_ENOUGH_DATA',
    };
    return states[state as keyof typeof states] || `UNKNOWN (${state})`;
  };

  const getNetworkStateLabel = (state: number) => {
    const states = {
      0: 'EMPTY',
      1: 'IDLE',
      2: 'LOADING',
      3: 'NO_SOURCE',
    };
    return states[state as keyof typeof states] || `UNKNOWN (${state})`;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="fixed bottom-20 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 bg-background/95 backdrop-blur-sm border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Video Diagnostics</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Network Quality */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">Network Quality:</span>
            <Badge className={getQualityColor(networkInfo.quality)}>
              {networkInfo.quality.toUpperCase()}
            </Badge>
          </div>
          <div className="text-muted-foreground space-y-1">
            {networkInfo.effectiveType && (
              <div>Type: {networkInfo.effectiveType}</div>
            )}
            {networkInfo.downlink && (
              <div>Speed: {networkInfo.downlink.toFixed(2)} Mbps</div>
            )}
            {networkInfo.rtt && (
              <div>RTT: {networkInfo.rtt}ms</div>
            )}
            {networkInfo.saveData && (
              <div className="text-yellow-600">Data Saver: ON</div>
            )}
          </div>
        </div>

        {/* Video Stats */}
        <div>
          <div className="font-semibold mb-2">Video Stats:</div>
          <div className="space-y-1 text-muted-foreground">
            <div>Time: {videoStats.currentTime || '0.00'}s / {videoStats.duration || 'N/A'}s</div>
            <div>Buffered: {videoStats.buffered || '0s'}</div>
            <div>Ready State: {getReadyStateLabel(videoStats.readyState as number)}</div>
            <div>Network State: {getNetworkStateLabel(videoStats.networkState as number)}</div>
            <div>Status: {videoStats.paused ? '⏸️ Paused' : videoStats.ended ? '⏹️ Ended' : '▶️ Playing'}</div>
            {videoStats.error && (
              <div className="text-red-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Error: {videoStats.error.message} (Code: {videoStats.error.code})
              </div>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <div className="font-semibold mb-2">Recent Events ({diagnostics.length}):</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {diagnostics.length === 0 ? (
              <div className="text-muted-foreground text-xs">No events yet...</div>
            ) : (
              diagnostics.map((diag, idx) => (
                <div key={idx} className="text-xs border-l-2 border-primary/20 pl-2 py-1">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(diag.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="font-semibold">{diag.event}</div>
                  <div className="text-muted-foreground">
                    {Object.entries(diag.details).map(([key, value]) => (
                      <div key={key} className="text-[10px]">
                        {key}: {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Video URL */}
        <div>
          <div className="font-semibold mb-1">Video URL:</div>
          <div className="text-[10px] break-all text-muted-foreground font-mono">
            {videoUrl.substring(0, 60)}...
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

