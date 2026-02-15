'use client';

import { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    cast?: any;
    chrome?: {
      cast?: any;
    };
    webkit?: {
      messageHandlers?: any;
    };
  }
  interface HTMLVideoElement {
    webkitShowPlaybackTargetPicker?: () => void;
  }
}

// Detect iOS
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Global script loading state to prevent multiple loads
let globalScriptLoaded = false;
let globalScriptLoading = false;
let globalCastContext: any = null;
const castInitializationCallbacks: Array<() => void> = [];

export function useChromecast() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castSession, setCastSession] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [castDeviceName, setCastDeviceName] = useState<string | null>(null);
  const castContextRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // For iOS, AirPlay is available if video element supports it
      setIsAvailable(true);
      return;
    }

    // For non-iOS, load Chromecast SDK (only once globally)
    if (globalScriptLoaded) {
      // Script already loaded, use existing context
      if (globalCastContext) {
        castContextRef.current = globalCastContext;
        setIsAvailable(true);
      }
      return;
    }

    if (globalScriptLoading) {
      // Script is loading, wait for it
      const callback = () => {
        if (globalCastContext) {
          castContextRef.current = globalCastContext;
          setIsAvailable(true);
        }
      };
      castInitializationCallbacks.push(callback);
      return;
    }

    // Start loading script
    globalScriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    script.onload = () => {
      globalScriptLoaded = true;
      globalScriptLoading = false;
      initializeCast();
    };
    script.onerror = () => {
      console.warn('Failed to load Chromecast SDK');
      globalScriptLoading = false;
      setIsAvailable(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initializeCast = () => {
    try {
      // Wait a bit for the SDK to fully initialize
      setTimeout(() => {
        if (window.cast && window.cast.framework) {
          try {
            const context = window.cast.framework.CastContext.getInstance();
            
            // Use default receiver app ID if RECEIVER_APP_ID is not available
            const receiverAppId = window.cast.framework.CastContext?.CastOptions?.RECEIVER_APP_ID || 'CC1AD845';
            const autoJoinPolicy = window.cast.framework.CastContext?.CastOptions?.AutoJoinPolicy?.ORIGIN_SCOPED || 
                                   window.cast.framework.AutoJoinPolicy?.ORIGIN_SCOPED || 
                                   'origin_scoped';
            
            context.setOptions({
              receiverApplicationId: receiverAppId,
              autoJoinPolicy: autoJoinPolicy,
            });

            globalCastContext = context;
            castContextRef.current = context;
            
            // Set available immediately - button will show even if no devices found yet
            // User can still tap to discover devices
            setIsAvailable(true);

            // Notify all waiting callbacks
            castInitializationCallbacks.forEach(cb => cb());
            castInitializationCallbacks.length = 0;

            // Listen for cast state changes
            const castStateChanged = (event: any) => {
              const castState = event.castState;
              if (castState === window.cast.framework.CastState.CONNECTED) {
                setIsCasting(true);
                const session = context.getCurrentSession();
                setCastSession(session);
                // Get device name from session
                if (session?.getCastDevice) {
                  try {
                    const device = session.getCastDevice();
                    setCastDeviceName(device?.friendlyName || device?.deviceName || null);
                  } catch (e) {
                    // Device name not available
                    setCastDeviceName(null);
                  }
                }
              } else {
                setIsCasting(false);
                setCastSession(null);
                setCastDeviceName(null);
              }
            };

            context.addEventListener(
              window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
              castStateChanged
            );

            // Listen for cast availability changes
            const castAvailabilityChanged = (event: any) => {
              // Keep button available even if no devices found
              // This allows users to tap and discover devices
              setIsAvailable(true);
            };

            context.addEventListener(
              window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
              castAvailabilityChanged
            );

            // Check initial state
            const currentSession = context.getCurrentSession();
            if (currentSession) {
              setIsCasting(true);
              setCastSession(currentSession);
              // Get device name from session
              if (currentSession?.getCastDevice) {
                try {
                  const device = currentSession.getCastDevice();
                  setCastDeviceName(device?.friendlyName || device?.deviceName || null);
                } catch (e) {
                  setCastDeviceName(null);
                }
              }
            }
          } catch (initError: any) {
            console.warn('Chromecast initialization error (non-critical):', initError);
            // Still set available to show button - let user try
            setIsAvailable(true);
            castInitializationCallbacks.forEach(cb => cb());
            castInitializationCallbacks.length = 0;
          }
        } else {
          // Retry initialization after a delay
          console.warn('Chromecast SDK not ready, retrying...');
          setTimeout(initializeCast, 1000);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to initialize Chromecast:', error);
      // Still set available to show button - let user try
      setIsAvailable(true);
      castInitializationCallbacks.forEach(cb => cb());
      castInitializationCallbacks.length = 0;
    }
  };

  const setVideoRef = (ref: HTMLVideoElement | null) => {
    videoRef.current = ref;
  };

  const castMedia = async (mediaUrl: string, title?: string, thumbnailUrl?: string) => {
    if (!isAvailable) {
      throw new Error('Casting is not available');
    }

    // iOS AirPlay
    if (isIOSDevice) {
      if (videoRef.current && videoRef.current.webkitShowPlaybackTargetPicker) {
        try {
          videoRef.current.webkitShowPlaybackTargetPicker();
          setIsCasting(true);
          return;
        } catch (error: any) {
          console.error('Failed to show AirPlay picker:', error);
          throw new Error('Failed to show AirPlay picker');
        }
      } else {
        throw new Error('AirPlay is not available on this device');
      }
    }

    // Android/Chrome Chromecast
    if (!castContextRef.current) {
      throw new Error('Chromecast is not available');
    }

    try {
      let session = castContextRef.current.getCurrentSession();
      if (!session) {
        try {
          session = await castContextRef.current.requestSession();
        } catch (sessionError: any) {
          // User cancelled the cast dialog - this is normal, not an error
          // Google Cast SDK uses various error codes/messages for cancellation
          const errorMessage = String(sessionError?.message || sessionError?.code || '').toLowerCase();
          const errorCode = String(sessionError?.code || sessionError?.type || '').toLowerCase();
          
          if (errorCode === 'cancel' || 
              errorMessage.includes('cancel') ||
              errorCode === 'cancelled' ||
              errorMessage.includes('cancelled') ||
              sessionError?.code === window.cast?.framework?.ErrorCode?.CANCEL ||
              sessionError?.code === 'cancel') {
            // Silently handle cancellation - user just closed the dialog
            return;
          }
          // Re-throw if it's a real error
          throw sessionError;
        }
      }

      const mediaInfo = new window.cast.framework.messages.MediaInfo(mediaUrl, 'video/mp4');
      
      if (title) {
        mediaInfo.metadata = new window.cast.framework.messages.GenericMediaMetadata();
        mediaInfo.metadata.title = title;
      }

      if (thumbnailUrl) {
        mediaInfo.metadata.images = [
          new window.cast.framework.messages.Image(thumbnailUrl)
        ];
      }

      const request = new window.cast.framework.messages.LoadRequest(mediaInfo);
      request.currentTime = 0; // Start from beginning
      
      try {
        await session.loadMedia(request);
        setIsCasting(true);
        setCastSession(session);
        // Get device name from session
        if (session?.getCastDevice) {
          try {
            const device = session.getCastDevice();
            setCastDeviceName(device?.friendlyName || device?.deviceName || null);
          } catch (e) {
            setCastDeviceName(null);
          }
        }
      } catch (loadError: any) {
        // Check if it's a user cancellation - check BEFORE any logging
        const errorMessage = String(loadError?.message || loadError?.code || '').toLowerCase();
        const errorCode = String(loadError?.code || loadError?.type || '').toLowerCase();
        
        if (errorCode === 'cancel' || 
            errorMessage.includes('cancel') ||
            errorCode === 'cancelled' ||
            errorMessage.includes('cancelled') ||
            loadError?.code === window.cast?.framework?.ErrorCode?.CANCEL) {
          // User cancelled - silently handle, don't throw, don't log
          return;
        }
        // Real error - throw with original message to preserve error details
        throw loadError;
      }
    } catch (error: any) {
      // Check if it's a user cancellation - check all possible formats
      const errorMessage = String(error?.message || error?.code || '').toLowerCase();
      const errorCode = String(error?.code || error?.type || '').toLowerCase();
      
      // Also check the original error if it was wrapped
      const originalError = error?.originalError || error?.cause || error;
      const originalMessage = String(originalError?.message || originalError?.code || '').toLowerCase();
      const originalCode = String(originalError?.code || originalError?.type || '').toLowerCase();
      
      if (errorCode === 'cancel' || 
          errorMessage.includes('cancel') ||
          errorCode === 'cancelled' ||
          errorMessage.includes('cancelled') ||
          errorMessage === 'cancel' ||
          originalCode === 'cancel' ||
          originalMessage.includes('cancel') ||
          error?.code === window.cast?.framework?.ErrorCode?.CANCEL) {
        // User cancelled - silently handle, don't log as error, don't throw
        return;
      }
      // Real error - throw original error to preserve details
      throw error;
    }
  };

  const stopCasting = () => {
    if (castSession) {
      castSession.endSession(true);
      setIsCasting(false);
      setCastSession(null);
      setCastDeviceName(null);
    }
  };

  return {
    isAvailable,
    isCasting,
    isIOSDevice,
    castDeviceName,
    castMedia,
    stopCasting,
    setVideoRef,
  };
}

