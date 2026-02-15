'use client';

import React, { useState, useEffect, useRef, useMemo, useTransition } from 'react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { getFirebaseClient } from '@/lib/firebase/client';
import type { FeedItem } from '@/types/feed';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FlowerIcon } from '@/components/FlowerIcon';
import { MessageCircle, Share2, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveVideo } from '@/contexts/ActiveVideoContext';

// ------------------- PureVideo -------------------
interface PureVideoProps {
  src?: string;
  hlsUrl?: string;
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

    // Play/pause on active
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;
      if (isActive) {
        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    }, [isActive]);

    // Set non-standard mobile video attributes via ref
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;
      
      // Set iOS Safari attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x-webkit-airplay', 'allow');
      
      // Set Android/WeChat browser attributes
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-orientation', 'portrait');
      video.setAttribute('x5-playsinline', 'true');
    }, [hlsUrl, src]);

    // Fix audio noise on mobile: Pause background music and ensure only one audio track plays
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;
      
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
        } catch (e) {
          // AudioTracks API might not be available in all browsers
          if (process.env.NODE_ENV === 'development') {
            console.warn('[FeedCard] Audio tracks API not available:', e);
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
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('play', handlePlay);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('play', handlePlay);
      };
    }, [hlsUrl, src]);

    // Handle buffering (event-driven; avoid play() loops that can cause audio crackling)
    useEffect(() => {
      const video = finalRef.current;
      if (!video) return;

      const handleWaiting = () => {
        if (isActive && video.paused && !video.ended) {
          video.addEventListener('canplay', () => {
            if (isActive && video.paused && !video.ended) {
              video.play().catch(() => {});
            }
          }, { once: true });
        }
      };

      const handleStalled = () => {
        if (isActive && video.paused && !video.ended) {
          video.addEventListener('canplay', () => {
            if (isActive && video.paused && !video.ended) {
              video.play().catch(() => {});
            }
          }, { once: true });
        }
      };

      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('stalled', handleStalled);

      return () => {
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('stalled', handleStalled);
      };
    }, [isActive]);

    return (
      <video
        ref={finalRef}
        src={hlsUrl || src}
        poster={poster}
        muted={muted}
        playsInline
        preload="auto"
        onPlay={onPlay}
        onTimeUpdate={e => onTimeUpdate?.((e.target as HTMLVideoElement).currentTime)}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
        onTouchStart={(e) => {
          // CRITICAL: Ensure user interaction is registered for mobile autoplay
          const video = e.currentTarget;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          // On mobile, explicitly load and play after user interaction
          if (isMobile && video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
            video.load();
          }
          if (video.paused && isActive) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                if (isMobile) {
                  console.warn('[FeedCard] Mobile play failed:', err.name);
                }
              });
            }
          }
        }}
        onLoadedMetadata={(e) => {
          // On mobile, ensure video is ready to play after metadata loads
          const video = e.currentTarget;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (isMobile && isActive && video.paused && !video.ended) {
            setTimeout(() => {
              if (video.paused && isActive) {
                video.play().catch((err) => {
                  console.warn('[FeedCard] Mobile autoplay after metadata failed:', err.name);
                });
              }
            }, 100);
          }
        }}
        onError={(e) => {
          const video = e.currentTarget;
          const error = video.error;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          console.error('[FeedCard] Video playback error:', {
            code: error?.code,
            message: error?.message,
            networkState: video.networkState,
            readyState: video.readyState,
            src: (hlsUrl || src)?.substring(0, 100),
            isMobile,
          });
          // Try to recover from error on mobile
          if (error && isMobile) {
            if (error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
              console.warn('[FeedCard] Video format not supported on mobile, trying reload');
              setTimeout(() => {
                if (video && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  video.load();
                }
              }, 1000);
            } else if (error.code === 2) { // MEDIA_ERR_NETWORK
              console.warn('[FeedCard] Network error on mobile, retrying...');
              setTimeout(() => {
                if (video) {
                  video.load();
                }
              }, 2000);
            }
          }
        }}
        className="w-full h-full object-cover"
      />
    );
  }
);

// ------------------- FeedCard -------------------
interface FeedCardProps {
  videoUrl?: string;
  item?: FeedItem;
  posterUrl?: string;
  title?: string;
  onVideoLoaded?: () => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ videoUrl, item, posterUrl, title, onVideoLoaded }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null);
  const [selectedQuestionAnswer, setSelectedQuestionAnswer] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  const auth = useAuth();
  const db = useFirestore();
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [isLiking, startLikeTransition] = useTransition();

  const { activeVideoId, setActiveVideoId, saveVideoState } = useActiveVideo();

  const postId = useMemo(() => {
    if (!item?.id) return null;
    const match = item.id.match(/^post-(.+)$/);
    return match ? match[1] : item.id;
  }, [item?.id]);

  const isActiveVideo = useMemo(() => postId ? activeVideoId === postId : false, [activeVideoId, postId]);

  const postRef = useMemo(() => postId && db ? doc(db, 'posts', postId) : null, [db, postId]);
  const likeRef = useMemo(() => postId && user && db ? doc(db, `posts/${postId}/likes/${user.uid}`) : null, [db, postId, user]);
  const [likeDoc] = useDocumentData(likeRef);
  const [isLiked, setIsLiked] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(item?.meta?.likes || 0);

  useEffect(() => setIsLiked(!!likeDoc), [likeDoc]);
  useEffect(() => { if (item?.meta?.likes !== undefined) setOptimisticLikes(item.meta.likes); }, [item?.meta?.likes]);

  // Check if user has already voted in survey
  const userVote = useMemo(() => {
    if (!user || !item?.meta?.surveyResponses) return null;
    const userResponse = item.meta.surveyResponses[user.uid];
    if (Array.isArray(userResponse)) {
      return userResponse[0] || null;
    }
    return userResponse || null;
  }, [user, item?.meta?.surveyResponses]);

  // Check if user has already answered the question
  const userQuestionAnswer = useMemo(() => {
    if (!user || !item?.meta?.questionResponses) return null;
    return item.meta.questionResponses[user.uid] ?? null;
  }, [user, item?.meta?.questionResponses]);

  // Calculate vote counts for survey
  const surveyVoteCounts = useMemo(() => {
    if (!item?.meta?.surveyOptions || !item?.meta?.surveyResponses) return {};
    const counts: Record<number, number> = {};
    item.meta.surveyOptions.forEach((_, index) => {
      counts[index] = 0;
    });
    Object.values(item.meta.surveyResponses).forEach((votes) => {
      if (Array.isArray(votes)) {
        votes.forEach((voteIndex: string | number) => {
          const idx = typeof voteIndex === 'string' ? parseInt(voteIndex) : voteIndex;
          if (!isNaN(idx) && counts[idx] !== undefined) {
            counts[idx] = (counts[idx] || 0) + 1;
          }
        });
      } else if (typeof votes === 'string' || typeof votes === 'number') {
        const idx = typeof votes === 'string' ? parseInt(votes) : votes;
        if (!isNaN(idx) && counts[idx] !== undefined) {
          counts[idx] = (counts[idx] || 0) + 1;
        }
      }
    });
    return counts;
  }, [item?.meta?.surveyOptions, item?.meta?.surveyResponses]);

  const totalVotes = useMemo(() => {
    return Object.values(surveyVoteCounts).reduce((sum, count) => sum + count, 0);
  }, [surveyVoteCounts]);

  // Handle survey vote
  const handleSurveyVote = async (optionIndex: number) => {
    if (!user || !db || isVoting || !postId) return;
    if (userVote !== null) {
      toast({
        variant: 'default',
        title: 'Already voted',
        description: 'You have already voted in this survey.',
      });
      return;
    }

    setIsVoting(true);
    try {
      const postRef = doc(db, 'posts', postId);
      const batch = writeBatch(db);
      
      // Add user's vote
      const currentResponses = item?.meta?.surveyResponses || {};
      const userVotes = currentResponses[user.uid] || [];
      batch.update(postRef, {
        [`surveyResponses.${user.uid}`]: [...userVotes, optionIndex.toString()],
      });

      await batch.commit();
      
      setSelectedSurveyOption(optionIndex);
      toast({
        title: 'Vote recorded!',
        description: 'Your vote has been recorded.',
      });
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to vote',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsVoting(false);
    }
  };

  // Handle question answer
  const handleQuestionAnswer = async (optionIndex: number) => {
    if (!user || !db || isAnswering || !postId) return;
    if (userQuestionAnswer !== null) {
      toast({
        variant: 'default',
        title: 'Already answered',
        description: 'You have already answered this question.',
      });
      return;
    }

    setIsAnswering(true);
    try {
      const postRef = doc(db, 'posts', postId);
      const batch = writeBatch(db);
      
      // Add user's answer
      batch.update(postRef, {
        [`questionResponses.${user.uid}`]: optionIndex,
      });

      await batch.commit();
      
      setSelectedQuestionAnswer(optionIndex);
      toast({
        title: 'Answer recorded!',
        description: 'Your answer has been recorded.',
      });
    } catch (error: any) {
      console.error('Error answering question:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to answer',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsAnswering(false);
    }
  };

  const hlsUrl = item?.hlsUrl || item?.meta?.hlsUrl;
  const videoStoragePath = item?.meta?.videoStoragePath;

  // ------------------- Load Video -------------------
  useEffect(() => {
    if (hlsUrl) {
      setSrc(hlsUrl);
      setLoading(false);
      return;
    }
    if (!videoStoragePath) return;

    let isMounted = true;
    const loadVideoUrl = async () => {
      try {
        setLoading(true);
        const { storage } = getFirebaseClient();
        const url = await getDownloadURL(storageRef(storage, videoStoragePath));
        if (isMounted) { setSrc(url); setLoading(false); onVideoLoaded?.(); }
      } catch (err: any) {
        if (isMounted) { setError(true); setLoading(false); toast({ variant:'destructive', title: err?.message || 'Failed to load video' }); }
      }
    };
    loadVideoUrl();
    return () => { isMounted = false; };
  }, [videoStoragePath, hlsUrl, onVideoLoaded, toast]);

  // ------------------- IntersectionObserver -------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    intersectionObserverRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!video) return;
          if (entry.intersectionRatio >= 0.6 && !isActiveVideo) setActiveVideoId(postId);
          else if (entry.intersectionRatio < 0.6 && isActiveVideo) setActiveVideoId(null);
        });
      },
      { threshold: [0.5], rootMargin: '0px' }
    );
    intersectionObserverRef.current.observe(video);
    return () => { intersectionObserverRef.current?.disconnect(); };
  }, [src, isActiveVideo, postId, setActiveVideoId]);

  // ------------------- Like -------------------
  const handleLike = () => {
    if (authLoading) return toast({ variant:'destructive', title:'Loading account…' });
    if (!user) return toast({ variant:'destructive', title:'Please log in to like posts.' });
    if (!postRef || !likeRef) return;

    const wasLiked = isLiked;
    startLikeTransition(() => {
      setIsLiked(!wasLiked);
      setOptimisticLikes(prev => wasLiked ? prev - 1 : prev + 1);
      const batch = writeBatch(db!);
      const likeData = { createdAt: serverTimestamp() };
      if (wasLiked) { batch.delete(likeRef!); batch.update(postRef!, { likes: increment(-1) }); }
      else { batch.set(likeRef!, likeData); batch.update(postRef!, { likes: increment(1) }); }
      batch.commit().catch(() => { setIsLiked(wasLiked); setOptimisticLikes(item?.meta?.likes || 0); toast({ variant:'destructive', title:'Failed to like post.' }); });
    });
  };

  const handleShare = async () => {
    if (!src) return;
    if (navigator.share) await navigator.share({ title: title || 'Check out this video', url: window.location.href }).catch(()=>{});
    else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); toast({ title:'Link copied!' }); }
  };

  const toggleMute = (e: React.MouseEvent) => { e.stopPropagation(); setMuted(prev => !prev); if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; };

  const displayTitle = title || item?.title?.en || item?.title?.te || Object.values(item?.title || {})[0];
  const displayDescription = item?.description?.en || item?.description?.te || Object.values(item?.description || {})[0];
  const displayPoster = posterUrl || item?.thumbnail;

  // ------------------- Double tap -------------------
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleLike();
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
    lastTapRef.current = now;
  };

  return (
    <div className="feed-card w-full max-w-2xl md:max-w-4xl mx-auto my-4 md:my-6 border rounded-xl overflow-hidden shadow-lg bg-card">
      {displayTitle && <div className="p-4 md:p-5 border-b"><h3 className="font-semibold text-lg md:text-xl">{displayTitle}</h3></div>}
      <div className="video-wrapper relative w-full aspect-video bg-black" onClick={handleDoubleTap} onTouchEnd={handleDoubleTap}>
        {showLikeAnimation && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                       transition={{ duration: 0.6 }}>
            <FlowerIcon size="xl" animated className="text-white drop-shadow-2xl" />
          </motion.div>
        )}
        {loading && <div className="absolute inset-0 flex items-center justify-center text-white z-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        {displayPoster && !videoReady && <div className="absolute inset-0 z-10 bg-black"><img src={displayPoster} alt={displayTitle || 'Video thumbnail'} className="w-full h-full object-contain" /></div>}
        
        <PureVideo
          ref={videoRef}
          src={src || undefined}
          hlsUrl={hlsUrl}
          videoId={postId || item?.id || 'unknown'}
          isActive={isActiveVideo}
          poster={displayPoster || undefined}
          muted={muted}
          onPlay={() => { setVideoReady(true); setLoading(false); if (postId) setActiveVideoId(postId); }}
          onTimeUpdate={currentTime => { if (postId && isActiveVideo) saveVideoState(postId, currentTime, true); }}
          onEnded={() => { if (postId && activeVideoId === postId) setActiveVideoId(null); }}
          onLoadedMetadata={() => { setVideoReady(true); setLoading(false); }}
        />
        <div className="absolute top-4 right-4 z-20">
          <button onClick={toggleMute} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {displayDescription && <div className="p-4 md:p-5 border-t"><p className="text-sm md:text-base text-muted-foreground line-clamp-3">{displayDescription}</p></div>}

      {/* Survey Options */}
      {item?.meta?.postType === 'survey' && item?.meta?.surveyOptions && item.meta.surveyOptions.length > 0 && (
        <div className="p-4 md:p-5 border-t space-y-3">
          <h4 className="font-semibold text-sm md:text-base mb-3">Survey Options</h4>
          {item.meta.surveyOptions.map((option: string, index: number) => {
            const voteCount = surveyVoteCounts[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userVote === index.toString() || selectedSurveyOption === index;
            const hasVoted = userVote !== null;

            return (
              <div key={index} className="space-y-2">
                <button
                  onClick={() => !hasVoted && handleSurveyVote(index)}
                  disabled={hasVoted || isVoting || !user}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : hasVoted
                      ? 'border-muted bg-muted/30 cursor-default'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium">{option}</span>
                    {hasVoted && (
                      <span className="text-xs text-muted-foreground">
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'} ({percentage}%)
                      </span>
                    )}
                  </div>
                  {hasVoted && (
                    <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
          {totalVotes > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Total votes: {totalVotes}
            </p>
          )}
          {!user && (
            <p className="text-xs text-muted-foreground mt-2">
              Please log in to vote
            </p>
          )}
        </div>
      )}

      {/* Question Options with Answering */}
      {item?.meta?.postType === 'question' && item?.meta?.questionOptions && item.meta.questionOptions.length > 0 && (
        <div className="p-4 md:p-5 border-t space-y-3">
          <h4 className="font-semibold text-sm md:text-base mb-3">Select the correct answer</h4>
          {item.meta.questionOptions.map((option: string, index: number) => {
            const hasAnswered = userQuestionAnswer !== null;
            const isSelected = selectedQuestionAnswer === index || userQuestionAnswer === index;
            const isCorrect = item.meta.correctAnswer !== undefined && index === item.meta.correctAnswer;
            const isUserAnswer = userQuestionAnswer === index;
            const showCorrect = hasAnswered && isCorrect;
            const showIncorrect = hasAnswered && isUserAnswer && !isCorrect;

            return (
              <div key={index} className="space-y-2">
                <button
                  onClick={() => !hasAnswered && handleQuestionAnswer(index)}
                  disabled={hasAnswered || isAnswering || !user}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : showIncorrect
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : isSelected
                      ? 'border-primary bg-primary/10'
                      : hasAnswered
                      ? 'border-muted bg-muted/30 cursor-default'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-base font-medium">{option}</span>
                    {showCorrect && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        ✓ Correct
                      </span>
                    )}
                    {showIncorrect && (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        ✗ Incorrect
                      </span>
                    )}
                    {hasAnswered && !isSelected && isCorrect && (
                      <span className="text-xs text-muted-foreground">
                        Correct answer
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
          {userQuestionAnswer !== null && item.meta.correctAnswer !== undefined && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">
                {userQuestionAnswer === item.meta.correctAnswer
                  ? '🎉 Congratulations! You got it right!'
                  : `The correct answer is: ${item.meta.questionOptions[item.meta.correctAnswer]}`}
              </p>
            </div>
          )}
          {!user && (
            <p className="text-xs text-muted-foreground mt-2">
              Please log in to answer
            </p>
          )}
        </div>
      )}

      <CardFooter className="flex items-center justify-between p-4 md:p-5 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleLike} disabled={authLoading || !user || isLiking} className="flex items-center gap-1.5">
            <FlowerIcon size="sm" isLiked={isLiked} />
            <span>{optimisticLikes}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowComments(prev => !prev)} className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span>{item?.meta?.commentsCount || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare} className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>

      {showComments && postId && <>
        <Separator />
        <div className="p-4 md:p-5"><Comments contentId={postId} contentType="post" /></div>
      </>}
    </div>
  );
};
