
"use client";
import React, { useRef, useEffect, useState, useMemo, useTransition, useCallback } from "react";
import type { FeedItem } from "@/types/feed";
import { useLanguage } from "@/hooks/use-language";
import { MessageCircle, Play, Pause, Share2, Loader2, Volume2, VolumeX, ChevronUp, ChevronDown, Download } from "lucide-react";
import { FlowerIcon } from "@/components/FlowerIcon";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Comments } from "@/components/comments";
import { useAuth, useFirestore } from "@/lib/firebase/provider";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { doc, writeBatch, increment, serverTimestamp } from "firebase/firestore";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { FirestorePermissionError } from "@/lib/firebase/errors";
import { errorEmitter } from "@/lib/firebase/error-emitter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveVideo } from "@/contexts/ActiveVideoContext";
import { HLSVideoPlayer } from "./HLSVideoPlayer";
// ReelsFeed uses URLs directly - no validation needed as they come from Firebase SDK

interface ReelItemProps {
  item: FeedItem;
  isActive: boolean;
  onLike: (id: string) => void;
  onComment: () => void;
  onShare: () => void;
  isLiked: boolean;
  optimisticLikes: number;
  optimisticCommentCount: number;
  isLiking: boolean;
  loadingLike: boolean;
  showLike: boolean;
  showPlayPause: { id: string; state: 'play' | 'pause' } | null;
  isPlaying: boolean;
  onPlayPause: (video: HTMLVideoElement | null) => void;
  onTap: (item: FeedItem, video: HTMLVideoElement | null) => void;
  getText: (field?: Record<string, string> | string) => string;
  contentId: string;
  commentContentType: 'post' | 'media' | 'manifestation';
  isMuted: boolean;
  onToggleMute: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

function ReelItem({
  item,
  isActive,
  onLike,
  onComment,
  onShare,
  isLiked,
  optimisticLikes,
  optimisticCommentCount,
  isLiking,
  loadingLike,
  showLike,
  showPlayPause,
  isPlaying,
  onPlayPause,
  onTap,
  getText,
  contentId,
  commentContentType,
  isMuted,
  onToggleMute,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
}: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const { activeVideoId, setActiveVideoId, saveVideoState, getVideoState } = useActiveVideo();
  const savedCurrentTimeRef = useRef<number>(0);
  const videoStateRestoredRef = useRef(false);
  const isActiveVideo = activeVideoId === item.id;

  // Sync muted state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  // Set as active video when playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.id) return;

    const handlePlay = () => {
      setActiveVideoId(item.id!);
    };

    const handlePause = () => {
      setTimeout(() => {
        if (video.paused && activeVideoId === item.id) {
          setActiveVideoId(null);
        }
      }, 2000);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [item.id, activeVideoId, setActiveVideoId]);

  // Save video state periodically
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.id) return;

    const interval = setInterval(() => {
      if (video && !video.ended && item.id) {
        saveVideoState(item.id, video.currentTime, !video.paused);
        savedCurrentTimeRef.current = video.currentTime;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [item.id, saveVideoState]);

  // Restore video state on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.id || !item.mediaUrl) return;

    const savedState = getVideoState(item.id);
    if (savedState && savedState.currentTime > 0 && !videoStateRestoredRef.current) {
      videoStateRestoredRef.current = true;
      const restoreState = () => {
        if (video.readyState >= 2) {
          video.currentTime = savedState.currentTime;
          if (savedState.isPlaying && isActiveVideo) {
            video.play().catch(() => {});
          }
        } else {
          video.addEventListener('loadeddata', restoreState, { once: true });
        }
      };
      restoreState();
    }
  }, [item.mediaUrl, item.id, getVideoState, isActiveVideo]);

  // IntersectionObserver for smooth autoplay
  // CRITICAL: Never pause or reset active video - it must stay playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Don't pause active video - it must stay mounted and playing
    if (isActiveVideo) {
      return; // Skip intersection observer for active video
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isActive && !isActiveVideo) {
            video.play().catch(() => {});
          } else if (!isActiveVideo) {
            video.pause();
            // Don't reset currentTime - preserve playback position
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [isActive, isActiveVideo]);

  // Handle long press for tooltip
  const handleTouchStart = useCallback(() => {
    const timer = setTimeout(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  if (!item) return null;

  return (
    <div
      className="h-screen w-full relative snap-start bg-black overflow-hidden"
      style={{ minHeight: '100vh', height: '100vh', width: '100%' }}
      onClick={(e) => {
        onTap(item, videoRef.current);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {item.hlsUrl ? (
        // Use HLS player for adaptive streaming
        <HLSVideoPlayer
          hlsUrl={item.hlsUrl}
          fallbackUrl={item.mediaUrl || ''}
          videoId={item.id || 'unknown'}
          isActive={isActive}
          className="absolute inset-0 w-full h-full object-cover"
          controls={false}
          muted={isMuted}
          loop={true}
          playsInline={true}
          preload="auto"
          poster={item.thumbnail || '/placeholder.jpg'}
          onPlay={() => {
            if (item.id) {
              setActiveVideoId(item.id);
            }
          }}
          onPause={() => {
            setTimeout(() => {
              if (item.id && activeVideoId === item.id) {
                setActiveVideoId(null);
              }
            }, 2000);
          }}
          onTimeUpdate={(currentTime) => {
            if (item.id && isActiveVideo) {
              saveVideoState(item.id, currentTime, true);
            }
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={item.mediaUrl || ''}
          poster={item.thumbnail || '/placeholder.jpg'}
          preload="auto"
          playsInline
          muted={isMuted}
          loop
          className="absolute inset-0 w-full h-full object-cover"
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          if (item.id && isActiveVideo && !video.ended) {
            saveVideoState(item.id, video.currentTime, !video.paused);
            savedCurrentTimeRef.current = video.currentTime;
          }
        }}
        onStalled={() => {
          const video = videoRef.current;
          if (!video || !isActiveVideo) return;
          
          console.warn(`[ReelsFeed:${item.id}] Video stalled at`, video.currentTime);
          
          // GENTLE recovery: Just wait for canplay, NO load() call
          // Browser will auto-resume when buffer is available
          video.addEventListener('canplay', () => {
            if (isActiveVideo && video.paused && !video.ended) {
              video.play().catch(() => {});
            }
          }, { once: true });
        }}
        onWaiting={() => {
          const video = videoRef.current;
          if (!video || !isActiveVideo) return;
          
          console.warn(`[ReelsFeed:${item.id}] Video waiting for data at`, video.currentTime);
          
          // GENTLE recovery: Wait for canplay, then resume
          // Only if waiting for more than 3 seconds, check buffer
          const waitingTimeout = setTimeout(() => {
            if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && isActiveVideo) {
              // Check buffer
              if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                if (bufferedEnd > video.currentTime + 1) {
                  // Buffer available, just wait
                  return;
                }
              }
              
              // No buffer - wait for canplay
              video.addEventListener('canplay', () => {
                if (isActiveVideo && video.paused && !video.ended) {
                  video.play().catch(() => {});
                }
              }, { once: true });
            }
          }, 3000);
          
          // Clear timeout when canplay fires
          video.addEventListener('canplay', () => {
            clearTimeout(waitingTimeout);
          }, { once: true });
        }}
      />
      )}

      <div className="absolute inset-0 pointer-events-none">
        {item?.id && showLike && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <FlowerIcon size="xl" className="text-white/90 filter drop-shadow-2xl" animated />
          </div>
        )}

        {item?.id && showPlayPause?.id === item.id && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 p-4 rounded-full">
              {showPlayPause.state === 'play' ? (
                <Play className="w-12 h-12 text-white" fill="currentColor" />
              ) : (
                <Pause className="w-12 h-12 text-white" fill="currentColor" />
              )}
            </div>
          </div>
        )}

        {/* Long press tooltip */}
        {showTooltip && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 px-4 py-2 rounded-lg">
              <span className="text-white text-sm font-semibold">Liked!</span>
            </div>
          </div>
        )}

        {/* Visible Play/Pause Button - Top Left */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPause(videoRef.current);
          }}
          className="absolute top-4 left-4 bg-black/50 hover:bg-black/70 rounded-full p-3 pointer-events-auto transition-all z-10"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" fill="currentColor" />
          ) : (
            <Play className="w-6 h-6 text-white" fill="currentColor" />
          )}
        </button>

        {/* Mute/Unmute Button - Top Right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-3 pointer-events-auto transition-all z-10"
          aria-label={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" fill="currentColor" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" fill="currentColor" />
          )}
        </button>

        {/* Next Video Button - Right Side */}
        {canGoNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-3 pointer-events-auto transition-all z-10"
            aria-label="Next video"
          >
            <ChevronUp className="w-6 h-6 text-white" fill="currentColor" />
          </button>
        )}

        {/* Previous Video Button - Right Side */}
        {canGoPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute right-4 bottom-20 bg-black/50 hover:bg-black/70 rounded-full p-3 pointer-events-auto transition-all z-10"
            aria-label="Previous video"
          >
            <ChevronDown className="w-6 h-6 text-white" fill="currentColor" />
          </button>
        )}

        {/* Caption - Bottom Left (buttons are now on right) */}
        <div className="absolute bottom-4 left-4 right-20 md:right-24 text-white p-2 z-10 pointer-events-none">
          <h3 className="font-bold drop-shadow-md text-sm md:text-base">{getText(item.title)}</h3>
          <p className="text-xs md:text-sm mt-1 line-clamp-2 drop-shadow-sm break-words">{getText(item.description)}</p>
        </div>

        {/* Action Buttons - Right Side */}
        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-3 md:gap-4 text-white pointer-events-auto z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item?.id) onLike(item.id);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                >
                  {isLiking || loadingLike ? (
                    <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin drop-shadow-lg" />
                  ) : (
                    <FlowerIcon size="lg" isLiked={isLiked} className="drop-shadow-lg" />
                  )}
                  <span className="text-xs md:text-sm drop-shadow-md font-bold">{optimisticLikes}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Double tap to like</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment();
            }}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          >
            <MessageCircle className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg" />
            <span className="text-xs md:text-sm drop-shadow-md font-bold">{optimisticCommentCount}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          >
            <Share2 className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg" />
            <span className="text-[10px] md:text-xs drop-shadow-md font-semibold">Share</span>
          </button>

          {/* Download Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const videoUrl = item.mediaUrl;
                if (!videoUrl) {
                  return;
                }
                
                // Create a temporary link and trigger download
                const link = document.createElement('a');
                link.href = videoUrl;
                link.download = `reel-${item.id || 'video'}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (error) {
                console.error('Download error:', error);
              }
            }}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          >
            <Download className="w-8 h-8 md:w-10 md:h-10 drop-shadow-lg" />
            <span className="text-[10px] md:text-xs drop-shadow-md font-semibold">Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReelsFeed({ items, isVisible, isPinned }: { items: FeedItem[]; isVisible?: boolean; isPinned?: boolean }) {
  const { language } = useLanguage();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [isLiking, startLikeTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeVideoId, setActiveVideoId, saveVideoState, getVideoState } = useActiveVideo();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showLike, setShowLike] = useState<string | null>(null);
  const [showPlayPause, setShowPlayPause] = useState<{ id: string; state: 'play' | 'pause' } | null>(null);
  const [isCommentSheetOpen, setCommentSheetOpen] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [isMuted, setIsMuted] = useState(true); // Default muted like Instagram

  const activeItem = items[activeIndex];
  const contentId = useMemo(() => {
    if (!activeItem?.id || typeof activeItem.id !== 'string') return '';
    return activeItem.id.replace(`${activeItem.kind}-`, '');
  }, [activeItem?.id, activeItem?.kind]);

  const contentCollection = useMemo(() => {
    if (activeItem?.kind === 'video') return 'media';
    return `${activeItem?.kind}s`;
  }, [activeItem?.kind]);

  const contentRef = useMemo(
    () => (contentId && db ? doc(db, contentCollection, contentId) : undefined),
    [db, contentCollection, contentId]
  );
  const [contentData] = useDocumentData(contentRef);

  const likeRef = useMemo(
    () =>
      user && contentRef ? doc(db, `${contentCollection}/${contentId}/likes/${user.uid}`) : undefined,
    [user, db, contentCollection, contentId, contentRef]
  );
  const [like, loadingLike] = useDocumentData(likeRef);

  const initialLikes = activeItem?.meta?.likes || contentData?.likes || 0;
  const [optimisticLikes, setOptimisticLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);

  const commentCount = contentData?.commentsCount ?? activeItem?.meta?.commentsCount ?? 0;
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(commentCount);

  useEffect(() => {
    setOptimisticLikes(contentData?.likes ?? initialLikes);
    setIsLiked(!!like);
  }, [contentData, like, initialLikes]);

  useEffect(() => {
    if (contentData?.commentsCount !== undefined) {
      setOptimisticCommentCount(contentData.commentsCount);
    }
  }, [contentData?.commentsCount]);

  // Handle scroll to change active video
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = window.innerHeight;
      const index = Math.round(scrollTop / height);
      if (index !== activeIndex && index >= 0 && index < items.length) {
        setActiveIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, items.length]);

  // Touch/swipe handling for mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;

      if (Math.abs(diff) > 50) {
        if (diff > 0 && activeIndex < items.length - 1) {
          // Swipe up - next video
          setActiveIndex(activeIndex + 1);
          container.scrollTo({ top: (activeIndex + 1) * window.innerHeight, behavior: 'smooth' });
        } else if (diff < 0 && activeIndex > 0) {
          // Swipe down - previous video
          setActiveIndex(activeIndex - 1);
          container.scrollTo({ top: (activeIndex - 1) * window.innerHeight, behavior: 'smooth' });
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeIndex, items.length]);

  const getText = (field?: Record<string, string> | string) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[language] || field['en'] || Object.values(field)[0] || '';
  };

  const lastTap = useRef<{ [key: string]: number }>({});
  const tapTimeout = useRef<{ [key: string]: ReturnType<typeof setTimeout> | null }>({});

  const handleTap = (item: FeedItem, video: HTMLVideoElement | null) => {
    if (!item?.id) return;
    const now = new Date().getTime();
    const DOUBLE_TAP_DELAY = 300;
    const itemId = item.id;

    if (tapTimeout.current[itemId]) {
      clearTimeout(tapTimeout.current[itemId]);
      tapTimeout.current[itemId] = null;
    }

    if (lastTap.current[itemId] && now - lastTap.current[itemId] < DOUBLE_TAP_DELAY) {
      handleLike(itemId);
    } else {
      tapTimeout.current[itemId] = setTimeout(() => {
        if (video && item.id) {
          const currentPlaying = isPlaying[item.id] ?? true;
          if (currentPlaying) {
            video.pause();
            setIsPlaying((prev) => ({ ...prev, [item.id]: false }));
            setShowPlayPause({ id: item.id, state: 'pause' });
          } else {
            video.play().catch(() => {});
            setIsPlaying((prev) => ({ ...prev, [item.id]: true }));
            setShowPlayPause({ id: item.id, state: 'play' });
          }
          setTimeout(() => setShowPlayPause(null), 1000);
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current[itemId] = now;
  };

  const handleLike = (id: string) => {
    if (!user || !contentRef || !likeRef) {
      toast({ variant: 'destructive', title: 'Please log in to like content.' });
      return;
    }
    if (!isLiked) {
      setShowLike(id);
      setTimeout(() => setShowLike(null), 1000);
    }

    startLikeTransition(() => {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setOptimisticLikes((prev: number) => (wasLiked ? prev - 1 : prev + 1));

      const batch = writeBatch(db);
      const likeData = { createdAt: serverTimestamp() };

      if (wasLiked) {
        batch.delete(likeRef);
        batch.update(contentRef, { likes: increment(-1) });
      } else {
        batch.set(likeRef, likeData);
        batch.update(contentRef, { likes: increment(1) });
      }

      batch.commit().catch(async (serverError: unknown) => {
        setIsLiked(wasLiked);
        setOptimisticLikes(initialLikes);
        const permissionError = new FirestorePermissionError({
          path: likeRef.path,
          operation: wasLiked ? 'delete' : 'create',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
    });
  };

  const handleShare = async (item: FeedItem) => {
    const shareUrl = `${window.location.origin}/watch/${contentId}`;
    const shareData = {
      title: getText(item.title) || 'Check out this video',
      text: getText(item.description) || 'Watch this video on Aaura',
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: 'Shared!', description: 'Video shared successfully.' });
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Link Copied!',
            description: 'The video link has been copied to your clipboard.',
          });
        } catch (clipboardError) {
          toast({
            title: 'Copy this link',
            description: shareUrl,
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: 'Link Copied!',
            description: 'The video link has been copied to your clipboard.',
          });
        } catch (clipboardError) {
          toast({
            variant: 'destructive',
            title: 'Share Failed',
            description: 'Could not share the video. Please try copying the link manually.',
          });
        }
      }
    }
  };

  const handlePlayPause = (item: FeedItem, video: HTMLVideoElement | null) => {
    if (!video || !item?.id) return;
    const currentPlaying = isPlaying[item.id] ?? true;
    if (currentPlaying) {
      video.pause();
      setIsPlaying((prev) => ({ ...prev, [item.id]: false }));
      setShowPlayPause({ id: item.id, state: 'pause' });
    } else {
      video.play().catch(() => {});
      setIsPlaying((prev) => ({ ...prev, [item.id]: true }));
      setShowPlayPause({ id: item.id, state: 'play' });
    }
    setTimeout(() => setShowPlayPause(null), 1000);
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleNext = () => {
    if (activeIndex < items.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      containerRef.current?.scrollTo({ top: nextIndex * window.innerHeight, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      const prevIndex = activeIndex - 1;
      setActiveIndex(prevIndex);
      containerRef.current?.scrollTo({ top: prevIndex * window.innerHeight, behavior: 'smooth' });
    }
  };

  const commentContentType = useMemo(() => {
    const kind = activeItem?.kind;
    if (kind === 'video') return 'media';
    if (kind === 'post') return 'post';
    return kind as 'post' | 'media' | 'manifestation';
  }, [activeItem]);

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory"
    >
      {items.map((item, index) => {
        const itemContentId = item?.id?.replace(`${item.kind}-`, '') || '';
        const isItemActive = index === activeIndex;
        // CRITICAL: Never virtualize the active video - it must stay mounted
        const isActiveVideo = activeVideoId === item.id;
        const shouldRender = isActiveVideo || isItemActive || Math.abs(index - activeIndex) <= 1;

        return (
          <div key={item.id || index}>
            {shouldRender ? (
            <ReelItem
              item={item}
              isActive={isItemActive}
              onLike={handleLike}
              onComment={() => setCommentSheetOpen(index)}
              onShare={() => handleShare(item)}
              isLiked={isLiked}
              optimisticLikes={optimisticLikes}
              optimisticCommentCount={optimisticCommentCount}
              isLiking={isLiking}
              loadingLike={loadingLike}
              showLike={showLike === item.id}
              showPlayPause={showPlayPause}
              isPlaying={isPlaying[item.id] ?? true}
              onPlayPause={(video) => handlePlayPause(item, video)}
              onTap={handleTap}
              getText={getText}
              contentId={itemContentId}
              commentContentType={commentContentType}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              canGoNext={index < items.length - 1}
              canGoPrevious={index > 0}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
            ) : (
              <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              </div>
            )}
            <Sheet open={isCommentSheetOpen === index} onOpenChange={(open) => setCommentSheetOpen(open ? index : null)}>
              <SheetContent side="bottom" className="h-[80vh] flex flex-col rounded-t-lg">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Comments ({optimisticCommentCount})</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                  <Comments contentId={itemContentId} contentType={commentContentType} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        );
      })}
    </div>
  );
}
