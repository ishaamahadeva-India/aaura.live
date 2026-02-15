
'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { Loader2, Share2, Edit, Trash2, MoreVertical, AlertCircle } from 'lucide-react';
import { FlowerIcon } from '@/components/FlowerIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Comments } from './comments';
import { Separator } from './ui/separator';
import { SaveToPlaylistDialog } from './SaveToPlaylistDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getVideoMimeType, refreshVideoUrl } from '@/lib/firebase/storage-urls';
import { useActiveVideo } from '@/contexts/ActiveVideoContext';
import { HLSVideoPlayer } from './HLSVideoPlayer';

export function VideoPlayer({ contentId, onVideoEnd }: { contentId: string, onVideoEnd: () => void }) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  
  // PERSISTENT video element - NEVER recreate
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef<number>(0);
  const stallRecoveryRef = useRef<{ tries: number; lastTS: number }>({ tries: 0, lastTS: 0 });
  const videoStateRestoredRef = useRef(false);
  
  const [validVideoUrl, setValidVideoUrl] = useState<string | null>(null);
  const [cdnFailed, setCdnFailed] = useState(false); // Track if CDN failed
  
  const { activeVideoId, setActiveVideoId, saveVideoState, getVideoState } = useActiveVideo();
  const isActiveVideo = activeVideoId === contentId;

  const mediaRef = useMemo(() => doc(db, 'media', contentId), [db, contentId]);
  const [media, loadingMedia] = useDocumentData(mediaRef);
  
  // Get HLS URL if available, otherwise use MP4
  const hlsUrl = media?.hlsUrl || null;
  const mp4Url = media?.mediaUrl || null;
  
  const authorId = media?.userId;
  const authorRef = useMemo(() => (authorId ? doc(db, 'users', authorId) : undefined), [db, authorId]);
  const [author, loadingAuthor] = useDocumentData(authorRef);
  
  const likeRef = useMemo(() => (user ? doc(db, `media/${contentId}/likes/${user.uid}`) : undefined), [db, contentId, user]);
  const [like, loadingLike] = useDocumentData(likeRef);

  const followingRef = useMemo(() => (user && authorId ? doc(db, `users/${user.uid}/following`, authorId) : undefined), [db, user, authorId]);
  const [following, loadingFollowing] = useDocumentData(followingRef);

  // Edit/Delete state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isAuthor = user && authorId && user.uid === authorId;

  // Get fresh video URL using Firebase SDK - ONLY if URL actually changed
  // For HLS, we use the URL directly from Firestore (no refresh needed)
  const lastMediaUrlRef = useRef<string | null>(null);
  const [hlsUrlReady, setHlsUrlReady] = useState<string | null>(null);
  
  useEffect(() => {
    // If HLS URL is available, use it directly
    if (hlsUrl) {
      setHlsUrlReady(hlsUrl);
      setValidVideoUrl(null); // Clear MP4 URL when HLS is available
      return;
    }
    
    // Otherwise, get fresh MP4 URL
    if (media?.mediaUrl) {
      if (media.mediaUrl !== lastMediaUrlRef.current) {
        lastMediaUrlRef.current = media.mediaUrl;
        (async () => {
          try {
            const { storage } = await import('@/lib/firebase/client').then(m => m.getFirebaseClient());
            const freshUrl = await refreshVideoUrl(media.mediaUrl, storage);
            if (freshUrl && freshUrl !== validVideoUrl) {
              setValidVideoUrl(freshUrl);
            } else if (!validVideoUrl) {
              setValidVideoUrl(media.mediaUrl);
            }
          } catch (error) {
            console.warn('VideoPlayer: Could not get fresh URL, using original:', error);
            if (!validVideoUrl) {
              setValidVideoUrl(media.mediaUrl);
            }
          }
        })();
      }
    } else {
      setValidVideoUrl(null);
      lastMediaUrlRef.current = null;
    }
  }, [media?.mediaUrl, hlsUrl, validVideoUrl]);

  // Set non-standard mobile video attributes via ref
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Set iOS Safari attributes
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x-webkit-airplay', 'allow');
    
    // Set Android/WeChat browser attributes
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-orientation', 'portrait');
    video.setAttribute('x5-playsinline', 'true');
  }, [validVideoUrl, contentId]);

  // Fix audio noise on mobile: Pause background music and ensure only one audio track plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Import background music context dynamically to avoid circular dependencies
    let backgroundMusicPause: (() => void) | null = null;
    let backgroundMusicPlay: (() => void) | null = null;
    
    // Try to get background music controls
    try {
      import('@/components/music/BackgroundMusicContext').then((module) => {
        // We can't directly use the hook here, so we'll pause all audio elements instead
      }).catch(() => {
        // Background music not available, continue without it
      });
    } catch (e) {
      // Ignore
    }
    
    const pauseAllOtherAudio = () => {
      // Pause all other audio/video elements to prevent conflicts
      const allMedia = document.querySelectorAll('audio, video');
      allMedia.forEach((media) => {
        if (media !== video && !media.paused) {
          (media as HTMLMediaElement).pause();
        }
      });
    };
    
    const handleLoadedMetadata = () => {
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
        video.muted = false; // Ensure audio is not muted (unless user wants it)
      } catch (e) {
        // AudioTracks API might not be available in all browsers
        if (process.env.NODE_ENV === 'development') {
          console.warn('[VideoPlayer] Audio tracks API not available:', e);
        }
      }
    };
    
    const handleCanPlay = () => {
      // Re-apply audio track selection when video can play
      try {
        if (video.audioTracks && video.audioTracks.length > 0) {
          // Ensure only first track is enabled
          for (let i = 0; i < video.audioTracks.length; i++) {
            video.audioTracks[i].enabled = (i === 0);
          }
        }
      } catch (e) {
        // Ignore if API not available
      }
    };
    
    const handlePlay = () => {
      // Pause background music and other audio when video plays
      pauseAllOtherAudio();
    };
    
    const handlePause = () => {
      // Video paused - other audio can resume if needed
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [validVideoUrl, contentId]);

  // Persist currentTime periodically
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const onTimeUpdate = () => {
      if (isActiveVideo && !v.ended) {
        lastTimeRef.current = v.currentTime;
        saveVideoState(contentId, v.currentTime, !v.paused);
      }
    };
    
    v.addEventListener('timeupdate', onTimeUpdate);
    return () => v.removeEventListener('timeupdate', onTimeUpdate);
  }, [contentId, isActiveVideo, saveVideoState]);

  // Restore position and handle canplay
  const handleCanPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !validVideoUrl) return;

    // Restore saved time if available
    const savedState = getVideoState(contentId);
    if (savedState && savedState.currentTime > 0 && !videoStateRestoredRef.current) {
      videoStateRestoredRef.current = true;
      const savedTime = Math.min(savedState.currentTime, Math.max(0, (v.duration || Infinity) - 0.1));
      if (Math.abs(v.currentTime - savedTime) > 0.5) {
        try {
          v.currentTime = savedTime;
        } catch (e) {
          console.warn('VideoPlayer: Could not restore time', e);
        }
      }
    } else if (lastTimeRef.current > 0 && Math.abs(v.currentTime - lastTimeRef.current) > 0.5) {
      try {
        v.currentTime = Math.min(lastTimeRef.current, Math.max(0, (v.duration || Infinity) - 0.1));
      } catch (e) {
        // Ignore
      }
    }

    // Autoplay if active
    if (isActiveVideo) {
      setTimeout(() => {
        v.play().catch(() => {});
      }, 50);
    }
  }, [contentId, validVideoUrl, isActiveVideo, getVideoState]);

  // Stall/waiting recovery - GENTLE approach, NO video.load() unless absolutely necessary
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let waitingTimeout: NodeJS.Timeout | null = null;
    let lastWaitingTime = 0;

    const onWaiting = () => {
      if (!isActiveVideo) return; // Only recover active videos
      
      const now = Date.now();
      const timeSinceLastWait = now - lastWaitingTime;
      lastWaitingTime = now;

      console.warn(`[VideoPlayer:${contentId}] waiting at`, v.currentTime, 'readyState', v.readyState, 'networkState', v.networkState);
      
      // Clear any existing timeout
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }

      // GENTLE recovery: Wait for canplay, then resume - NO load() call
      // Only if waiting for more than 3 seconds, try gentle recovery
      waitingTimeout = setTimeout(() => {
        if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && isActiveVideo) {
          console.warn(`[VideoPlayer:${contentId}] Still waiting after 3s, checking buffer...`);
          
          // Check if we have buffered data ahead
          if (v.buffered.length > 0) {
            const bufferedEnd = v.buffered.end(v.buffered.length - 1);
            const currentTime = v.currentTime;
            
            if (bufferedEnd > currentTime + 1) {
              // We have buffer ahead, just wait for canplay
              console.log(`[VideoPlayer:${contentId}] Buffer available, waiting for canplay...`);
              return;
            }
          }
          
          // Only as LAST RESORT: gentle reload without losing position
          const savedTime = Math.max(0, lastTimeRef.current || v.currentTime);
          console.warn(`[VideoPlayer:${contentId}] No buffer, attempting gentle recovery from`, savedTime);
          
          // Don't call load() - it resets everything. Instead, just try to play when ready
          v.addEventListener('canplay', () => {
            if (isActiveVideo && v.paused) {
              try {
                // Try to restore position if we lost it
                if (Math.abs(v.currentTime - savedTime) > 1) {
                  v.currentTime = Math.min(savedTime, v.duration - 0.1);
                }
              } catch (e) {
                // Ignore
              }
              v.play().catch(() => {});
            }
          }, { once: true });
        }
      }, 3000); // Wait 3 seconds before attempting recovery
    };

    const onStalled = () => {
      if (!isActiveVideo) return;
      console.warn(`[VideoPlayer:${contentId}] stalled at`, v.currentTime);
      // Stalled is usually temporary - browser will auto-resume
      // Just ensure we resume when canplay fires
      v.addEventListener('canplay', () => {
        if (isActiveVideo && v.paused && !v.ended) {
          v.play().catch(() => {});
        }
      }, { once: true });
    };

    const onCanPlay = () => {
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
        waitingTimeout = null;
      }
      handleCanPlay();
    };

    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onStalled);
    v.addEventListener('canplay', onCanPlay);

    return () => {
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onStalled);
      v.removeEventListener('canplay', onCanPlay);
      if (waitingTimeout) {
        clearTimeout(waitingTimeout);
      }
    };
  }, [contentId, handleCanPlay, isActiveVideo]);

  // Control play/pause by isActive - ONLY when isActiveVideo changes
  const lastActiveStateRef = useRef<boolean>(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !validVideoUrl) return;

    // Only act if active state actually changed
    if (isActiveVideo && !lastActiveStateRef.current) {
      // Just became active - restore time and play
      const savedState = getVideoState(contentId);
      if (savedState && savedState.currentTime > 0 && Math.abs(v.currentTime - savedState.currentTime) > 0.5) {
        try {
          v.currentTime = Math.min(savedState.currentTime, Math.max(0, (v.duration || Infinity) - 0.1));
        } catch (e) {
          // Ignore
        }
      }
      v.play().catch(() => {});
      lastActiveStateRef.current = true;
    } else if (!isActiveVideo && lastActiveStateRef.current) {
      // Just became inactive - pause
      v.pause();
      lastActiveStateRef.current = false;
    }
  }, [isActiveVideo, validVideoUrl, contentId, getVideoState]);

  // Set as active video when playing starts
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handlePlay = () => {
      setActiveVideoId(contentId);
    };

    const handlePause = () => {
      setTimeout(() => {
        if (v.paused && activeVideoId === contentId) {
          setActiveVideoId(null);
        }
      }, 2000);
    };

    v.addEventListener('play', handlePlay);
    v.addEventListener('pause', handlePause);

    return () => {
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('pause', handlePause);
    };
  }, [contentId, activeVideoId, setActiveVideoId]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const handleViewCount = () => {
      if (typeof window !== 'undefined') {
        const viewed = sessionStorage.getItem(`viewed-${contentId}`);
        if (!viewed) {
          updateDoc(mediaRef, { views: increment(1) });
          sessionStorage.setItem(`viewed-${contentId}`, 'true');
        }
      }
    };

    if (videoElement) {
      videoElement.addEventListener('ended', onVideoEnd);
      videoElement.addEventListener('play', handleViewCount, { once: true });
      return () => {
        videoElement.removeEventListener('ended', onVideoEnd);
        videoElement.removeEventListener('play', handleViewCount);
      };
    }
  }, [contentId, onVideoEnd, mediaRef]);

  // Handle delete media
  const handleDelete = async () => {
    if (!contentId || !user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(mediaRef);
      toast({
        title: 'Video deleted',
        description: 'Your video has been deleted successfully.',
      });
      setShowDeleteDialog(false);
      // Navigate away or refresh
      if (typeof window !== 'undefined') {
        window.location.href = '/feed';
      }
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete video',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit media
  const handleEdit = () => {
    const currentDescription = media?.[`description_${language}`] || media?.description_en || '';
    setEditDescription(currentDescription);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!contentId || !user || isEditing) return;
    if (!editDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description required',
        description: 'Video description cannot be empty.',
      });
      return;
    }

    setIsEditing(true);
    try {
      const updateData: any = {
        [`description_${language}`]: editDescription.trim(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(mediaRef, updateData);
      toast({
        title: 'Video updated',
        description: 'Your video has been updated successfully.',
      });
      setShowEditDialog(false);
    } catch (error: any) {
      console.error('Error updating video:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update video',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleLike = async () => {
    if (!user || !likeRef) {
      toast({ variant: 'destructive', title: "You must be logged in to like a video." });
      return;
    }
    const batch = writeBatch(db);
    try {
        if (like) {
            batch.delete(likeRef);
            batch.update(mediaRef, { likes: increment(-1) });
        } else {
            batch.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
            batch.update(mediaRef, { likes: increment(1) });
        }
        await batch.commit();
    } catch(e) {
        console.error("Error liking video: ", e);
        toast({ variant: 'destructive', title: 'Something went wrong.'});
    }
  };
  
  const handleShare = () => {
    if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: "Link Copied!", description: "The video link has been copied to your clipboard." });
    }
  }

  const handleFollow = async () => {
    if (!user || !followingRef || !authorId || !authorRef) {
      toast({ variant: 'destructive', title: "You must be logged in to follow a user." });
      return;
    }
    
    const currentUserRef = doc(db, 'users', user.uid);
    const targetUserRef = doc(db, 'users', authorId);
    const userFollowersRef = doc(db, `users/${authorId}/followers`, user.uid);

    const batch = writeBatch(db);

    try {
        if (following) {
            batch.delete(followingRef);
            batch.delete(userFollowersRef);
            batch.update(currentUserRef, { followingCount: increment(-1) });
            batch.update(targetUserRef, { followerCount: increment(-1) });

            toast({ title: "Unfollowed", description: `You have unfollowed ${author?.displayName || 'this creator'}.` });
        } else {
           batch.set(followingRef, {
              userId: authorId,
              followedAt: serverTimestamp(),
            });
           batch.set(userFollowersRef, {
              userId: user.uid,
              followedAt: serverTimestamp(),
           });
            batch.update(currentUserRef, { followingCount: increment(1) });
            batch.update(targetUserRef, { followerCount: increment(1) });

          toast({ title: "Followed!", description: `You are now following ${author?.displayName || 'this creator'}.` });
        }
        await batch.commit();
    } catch (e) {
        console.error("Error following user: ", e);
        toast({ variant: 'destructive', title: 'Something went wrong.'});
    }
  }

  if (loadingMedia || loadingAuthor) {
    return (
      <div className="flex justify-center items-center aspect-video bg-secondary rounded-lg">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!media) {
    return <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">Video not found.</div>;
  }

  const title = media[`title_${language}`] || media.title_en;
  const description = media[`description_${language}`] || media.description_en;
  const isFollowing = !!following;

  // Check if this is a MOV file (not web-compatible)
  const isMovFile = media?.mediaStoragePath?.toLowerCase().endsWith('.mov') || 
                    media?.mediaUrl?.toLowerCase().includes('.mov') ||
                    validVideoUrl?.toLowerCase().includes('.mov');

  return (
    <div className="w-full">
      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
        {/* Show error message for MOV files */}
        {isMovFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 z-50">
            <div className="text-center max-w-md">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2">Video Format Not Supported</h3>
              <p className="text-sm mb-4">
                This video is in MOV format, which is not compatible with web browsers. 
                MOV files cannot be played in Chrome, Firefox, or other web browsers.
              </p>
              <p className="text-xs text-gray-300 mb-4">
                Please contact the video owner to re-upload the video in MP4 format (H.264 + AAC codec).
              </p>
              {isAuthor && (
                <div className="mt-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                  <p className="text-sm font-semibold mb-2">You are the owner of this video</p>
                  <p className="text-xs">
                    Please delete this video and re-upload it in MP4 format. MOV files are not supported for web playback.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {!isMovFile && (
          <>
          {hlsUrlReady ? (
          // Use HLS player for adaptive streaming
          <HLSVideoPlayer
            hlsUrl={hlsUrlReady}
            fallbackUrl={validVideoUrl}
            videoId={contentId}
            isActive={isActiveVideo}
            className="w-full h-full"
            controls={true}
            muted={false}
            loop={false}
            playsInline={true}
            preload="auto"
            onPlay={() => setActiveVideoId(contentId)}
            onPause={() => {
              setTimeout(() => {
                if (activeVideoId === contentId) {
                  setActiveVideoId(null);
                }
              }, 2000);
            }}
            onEnded={onVideoEnd}
            onTimeUpdate={(currentTime) => {
              if (isActiveVideo) {
                lastTimeRef.current = currentTime;
                const now = Date.now();
                if (!(videoRef.current as any)?.__lastSaveTime || now - (videoRef.current as any).__lastSaveTime > 500) {
                  saveVideoState(contentId, currentTime, true);
                  (videoRef.current as any).__lastSaveTime = now;
                }
              }
            }}
            onError={(error) => {
              console.error('[VideoPlayer HLS error]', contentId, error);
              // Fallback to MP4 if HLS fails
              if (validVideoUrl) {
                setHlsUrlReady(null);
              }
            }}
          />
        ) : validVideoUrl ? (
          // Fallback to MP4 player
          <video 
            ref={videoRef}
            data-video-id={contentId}
            src={validVideoUrl}
            controls 
            autoPlay={false}
            preload="auto"
            playsInline
            muted={false}
            className="w-full h-full"
            disablePictureInPicture={false}
            disableRemotePlayback={false}
            onTouchStart={(e) => {
              // CRITICAL: Ensure user interaction is registered for mobile autoplay
              const video = e.currentTarget;
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              // On mobile, explicitly load and play after user interaction
              if (isMobile && video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                video.load();
              }
              if (video.paused && isActiveVideo) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                  playPromise.catch((err) => {
                    if (isMobile) {
                      console.warn('[VideoPlayer] Mobile play failed:', err.name);
                    }
                  });
                }
              }
            }}
            onLoadedMetadata={(e) => {
              // On mobile, ensure video is ready to play after metadata loads
              const video = e.currentTarget;
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile && isActiveVideo && video.paused && !video.ended) {
                setTimeout(() => {
                  if (video.paused && isActiveVideo) {
                    video.play().catch((err) => {
                      console.warn('[VideoPlayer] Mobile autoplay after metadata failed:', err.name);
                    });
                  }
                }, 100);
              }
            }}
            onError={(e) => {
              const video = e.currentTarget;
              const error = video.error;
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              console.error('[VideoPlayer] Video playback error:', {
                code: error?.code,
                message: error?.message,
                networkState: video.networkState,
                readyState: video.readyState,
                src: validVideoUrl?.substring(0, 100),
                isMobile,
              });
              // Try to recover from error on mobile
              if (error && isMobile) {
                if (error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                  console.warn('[VideoPlayer] Video format not supported on mobile, trying reload');
                  setTimeout(() => {
                    if (video && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                      video.load();
                    }
                  }, 1000);
                } else if (error.code === 2) { // MEDIA_ERR_NETWORK
                  console.warn('[VideoPlayer] Network error on mobile, retrying...');
                  setTimeout(() => {
                    if (video) {
                      video.load();
                    }
                  }, 2000);
                }
              }
            }}
            onProgress={(e) => {
              // Avoid auto-calling play() from progress events; can cause audio crackling/pops.
              const v = e.currentTarget;
              if (v.buffered.length > 0 && isActiveVideo && !v.ended) {
                lastTimeRef.current = v.currentTime;
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (isActiveVideo && !v.ended) {
                lastTimeRef.current = v.currentTime;
                const now = Date.now();
                if (!(v as any).__lastSaveTime || now - (v as any).__lastSaveTime > 500) {
                  saveVideoState(contentId, v.currentTime, !v.paused);
                  (v as any).__lastSaveTime = now;
                }
              }
            }}
        >
          Your browser does not support the video tag.
        </video>
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center text-white">
            <p>Loading video...</p>
          </div>
        )}
          </>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl lg:text-2xl font-bold font-headline leading-tight flex-1">{title}</h1>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={author?.photoURL} />
            <AvatarFallback>{author?.displayName?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{author?.displayName || 'Creator'}</p>
            <p className="text-sm text-muted-foreground">{author?.followerCount || 0} {t.topnav.followers}</p> 
          </div>
           {user && user.uid !== authorId && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={loadingFollowing} >
                        {isFollowing ? t.buttons.subscribed : t.buttons.subscribe}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isFollowing ? t.channelDetail.unfollowConfirmation : t.channelDetail.followConfirmation} {author?.displayName || 'this creator'}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t.channelDetail.confirmationPrompt}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.buttons.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFollow}>{isFollowing ? t.channelDetail.unfollowConfirmation : t.channelDetail.followConfirmation}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
           )}
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={handleLike} disabled={loadingLike || !user}>
            <FlowerIcon size="sm" isLiked={!!like} className="mr-2" /> {media.likes || 0}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" /> {t.buttons.share}
          </Button>
          {user && <SaveToPlaylistDialog mediaId={contentId} />}
        </div>
      </div>
      
      <div className="bg-secondary/50 p-4 rounded-lg mt-4">
        <p className="font-semibold text-sm">Description</p>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap mt-1">{description}</p>
      </div>

      <Separator className="my-6" />
      <Comments contentId={contentId} contentType="media" />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Video Description</DialogTitle>
            <DialogDescription>
              Update the description for your video.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter video description..."
              rows={6}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isEditing || !editDescription.trim()}
            >
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
