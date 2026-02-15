'use client';

import React, { useEffect, useRef, useState, useMemo, useTransition } from 'react';
import { Rewind, Download, SkipBack, SkipForward, Gauge, Subtitles, MessageCircle, Share2, Volume2, VolumeX, Cast, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { useChromecast } from '@/hooks/use-chromecast';
import { CastOverlay } from '@/components/CastOverlay';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, writeBatch, serverTimestamp, increment, deleteDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FlowerIcon } from '@/components/FlowerIcon';
import { Comments } from '@/components/comments';
import { useToast } from '@/hooks/use-toast';
import { ClientOnlyTime } from '@/components/ClientOnlyTime';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type Post = {
  id: string;
  type: 'video' | 'image' | 'text' | 'survey' | 'question';
  videoUrl?: string;
  imageUrl?: string;
  subtitleUrl?: string;
  title?: string;
  description?: string;
  content?: string; // For text-only posts
  authorId?: string;
  authorName?: string;
  authorPhoto?: string;
  createdAt?: any;
  likes?: number;
  commentsCount?: number;
  // Survey fields
  surveyOptions?: string[];
  surveyResponses?: Record<string, string[]>; // userId -> selected option index
  // Question fields
  questionOptions?: string[];
  correctAnswer?: number;
  questionResponses?: Record<string, number>; // userId -> selected option index
};

type SimpleFeedCardProps = {
  post: Post;
  activePostId: string | null;
  setActivePostId: (id: string | null) => void;
};

const SECTION_STYLE: React.CSSProperties = {
  marginBottom: 32,
  background: '#000',
  borderRadius: 12,
  position: 'relative',
};

const VIDEO_STYLE: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  maxHeight: '90vh',
  display: 'block',
  objectFit: 'contain',
  objectPosition: 'center',
  backgroundColor: '#000',
};

const IMAGE_STYLE: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  objectFit: 'contain',
  objectPosition: 'center',
  maxHeight: '90vh',
  backgroundColor: '#000',
};

export function SimpleFeedCard({ post, activePostId, setActivePostId }: SimpleFeedCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);

  const [isVisible, setIsVisible] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitleTrack, setSubtitleTrack] = useState<TextTrack | null>(null);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedQuestionAnswer, setSelectedQuestionAnswer] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showQuestionResult, setShowQuestionResult] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const playMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const isActive = activePostId === post.id;
  const [validVideoUrl, setValidVideoUrl] = useState<string | null>(null);
  const urlRefreshAttemptsRef = useRef(0);
  const blobFallbackAttemptedRef = useRef(false);
  const blobFallbackUrlRef = useRef<string | null>(null);
  const blobFallbackAbortRef = useRef<AbortController | null>(null);

  // Determine if content is long enough to need expand/collapse
  const textContent = post.content || post.description || '';
  const shouldShowExpand = textContent.length > 150; // Show expand if more than 150 chars

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set non-standard mobile video attributes via ref (React doesn't support them directly)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Set iOS Safari attributes
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x-webkit-airplay', 'allow');
    
    // Fix audio noise on mobile: Pause background music and ensure only one audio track plays
    const pauseAllOtherAudio = () => {
      // Pause all other audio/video elements to prevent conflicts
      const allMedia = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
      allMedia.forEach((media) => {
        if (media !== video && !media.paused) {
          media.pause();
        }
      });
    };
    
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice) {
      const handleAudioTracks = () => {
        try {
          // Select only the first audio track to prevent multiple tracks playing
          const audioTracks = (video as unknown as { audioTracks?: Array<{ enabled: boolean }> }).audioTracks;
          if (audioTracks && audioTracks.length > 0) {
            // Disable all audio tracks first
            for (let i = 0; i < audioTracks.length; i++) {
              audioTracks[i].enabled = false;
            }
            // Enable only the first audio track
            if (audioTracks[0]) {
              audioTracks[0].enabled = true;
            }
          }
          
          // Normalize audio settings for mobile
          video.volume = Math.min(video.volume, 1.0); // Ensure volume is not > 1.0
        } catch (e) {
          // AudioTracks API might not be available in all browsers
          if (process.env.NODE_ENV === 'development') {
            console.warn('[SimpleFeedCard] Audio tracks API not available:', e);
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
      
      return () => {
        video.removeEventListener('loadedmetadata', handleAudioTracks);
        video.removeEventListener('canplay', handleAudioTracks);
        video.removeEventListener('play', handlePlay);
      };
    }
    
    // Set Android/WeChat browser attributes
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-orientation', 'portrait');
    video.setAttribute('x5-playsinline', 'true');
  }, [post.videoUrl]);


  // Desktop-specific: Handle window visibility and focus to prevent stopping
  useEffect(() => {
    if (isMobile) return; // Only for desktop
    
    const video = videoRef.current;
    if (!video) return;

    const handleVisibilityChange = () => {
      // If page becomes visible and video should be playing, resume
      if (!document.hidden && isVisible && isActive && video.paused && !video.ended) {
        video.play().catch(() => {});
      }
    };

    const handleWindowFocus = () => {
      // When window regains focus, resume if video should be playing
      if (isVisible && isActive && video.paused && !video.ended) {
        video.play().catch(() => {});
      }
    };

    const handleWindowBlur = () => {
      // Don't pause on blur - let video continue playing
      // Only pause if explicitly not visible
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isMobile, isVisible, isActive]);

  // Firebase hooks
  const auth = useAuth();
  const db = useFirestore();
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [isLiking, startLikeTransition] = useTransition();

  // Refresh video URL - CRITICAL for fixing playback issues
  const refreshVideoUrl = async (): Promise<string | null> => {
    if (!post.videoUrl) return null;

    // IMPORTANT:
    // Some browsers/devices stall when streaming from Firebase download URLs:
    //   https://firebasestorage.googleapis.com/.../o/<path>?alt=media&token=...
    // To make playback stable across devices, prefer switching to a GCS signed URL:
    //   https://storage.googleapis.com/<bucket>/<path>?X-Goog-...
    // Our API can resolve the file across aaura-original-uploads and the default Firebase bucket(s).
    const currentUrl = post.videoUrl;
    
    const attempts = urlRefreshAttemptsRef.current;
    if (attempts >= 3) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[SimpleFeedCard] Max URL refresh attempts reached for video ${post.id}`);
      }
      return null;
    }
    
    urlRefreshAttemptsRef.current = attempts + 1;
    
    try {
      const storagePath = (post as any).mediaStoragePath || (post as any).videoStoragePath;
      if (!storagePath) return currentUrl;

      // GET endpoint does not require auth; keep it unauthenticated so playback works for all users.
      const urlResponse = await fetch(`/api/upload/signed-url?filePath=${encodeURIComponent(storagePath)}`);

      if (urlResponse.ok) {
        const { downloadUrl: freshUrl } = await urlResponse.json();
        if (freshUrl) {
          setValidVideoUrl(freshUrl);
          return freshUrl;
        }
      }

      // Any failure (including 404) -> keep current URL to avoid breaking playback.
      return currentUrl;
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[SimpleFeedCard] Failed to refresh URL for video ${post.id}:`, error);
      }
      return currentUrl || null;
    }
  };

  // Initialize video URL on mount or when post.videoUrl changes
  useEffect(() => {
    if (post.videoUrl) {
      // Reset refresh attempts when URL changes
      urlRefreshAttemptsRef.current = 0;

      // Always attempt to swap Firebase download URLs to a GCS signed URL for stable streaming.
      // If it fails, fall back to the stored URL.
      refreshVideoUrl().catch(() => setValidVideoUrl(post.videoUrl || null));
    } else {
      setValidVideoUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.videoUrl, user?.uid]);

  // Chromecast/AirPlay
  const { isAvailable: isCastAvailable, isCasting, isIOSDevice, castDeviceName, castMedia, stopCasting, setVideoRef } = useChromecast();

  // Extract postId (handle both formats: "post-xxx" and "xxx")
  const postId = useMemo(() => {
    if (!post.id) return null;
    const match = post.id.match(/^post-(.+)$/);
    return match ? match[1] : post.id;
  }, [post.id]);

  // Author data
  const authorRef = useMemo(() => post.authorId && db ? doc(db, 'users', post.authorId) : null, [db, post.authorId]);
  const [author] = useDocumentData(authorRef);

  // Like data
  const postRef = useMemo(() => postId && db ? doc(db, 'posts', postId) : null, [db, postId]);
  const likeRef = useMemo(() => postId && user && db ? doc(db, `posts/${postId}/likes/${user.uid}`) : null, [db, postId, user]);
  const [likeDoc] = useDocumentData(likeRef);
  const [isLiked, setIsLiked] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(post.likes || 0);

  useEffect(() => setIsLiked(!!likeDoc), [likeDoc]);
  useEffect(() => { if (post.likes !== undefined) setOptimisticLikes(post.likes); }, [post.likes]);

  // Check if user has already voted in survey
  const userVote = useMemo(() => {
    if (!user || !post.surveyResponses) return null;
    const userResponse = post.surveyResponses[user.uid];
    if (Array.isArray(userResponse)) {
      return userResponse[0] || null;
    }
    return userResponse || null;
  }, [user, post.surveyResponses]);

  // Calculate vote counts for survey
  const surveyVoteCounts = useMemo(() => {
    if (!post.surveyOptions || !post.surveyResponses) return {};
    const counts: Record<number, number> = {};
    post.surveyOptions.forEach((_, index) => {
      counts[index] = 0;
    });
    Object.values(post.surveyResponses).forEach((votes) => {
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
  }, [post.surveyOptions, post.surveyResponses]);

  const totalVotes = useMemo(() => {
    return Object.values(surveyVoteCounts).reduce((sum, count) => sum + count, 0);
  }, [surveyVoteCounts]);

  // Check if user has already answered the question
  const userQuestionAnswer = useMemo(() => {
    if (!user || !post.questionResponses) return null;
    return post.questionResponses[user.uid] ?? null;
  }, [user, post.questionResponses]);

  // Check if current user is the author
  const isAuthor = useMemo(() => {
    return user && post.authorId === user.uid;
  }, [user, post.authorId]);

  // Handle delete post
  const handleDelete = async () => {
    if (!postId || !user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const postRef = doc(db, 'posts', postId);
      await deleteDoc(postRef);
      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully.',
      });
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to delete post',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit post
  const handleEdit = () => {
    setEditContent(post.content || post.description || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!postId || !user || isEditing) return;
    if (!editContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'Content required',
        description: 'Post content cannot be empty.',
      });
      return;
    }

    setIsEditing(true);
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        content: editContent.trim(),
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully.',
      });
      setShowEditDialog(false);
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to update post',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsEditing(false);
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
      setShowQuestionResult(true);
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
      const currentResponses = post.surveyResponses || {};
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

  /* ---------- INTERSECTION OBSERVER ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Lower threshold to 0.5 (50%) to be less strict
        // Also check if video is actually playing before pausing
        const visible = entry.intersectionRatio >= 0.5;

        if (visible !== lastVisible) {
          lastVisible = visible;
          setIsVisible(visible);

          if (visible) {
            setActivePostId(post.id);
          }
        }
      },
      { threshold: [0.5], rootMargin: '0px' }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [post.id, setActivePostId]);

  /* ---------- PLAY / PAUSE ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use a small delay to batch state updates and avoid rapid play/pause cycles
    const playPauseTimeout = setTimeout(() => {
      if (!video) return;
      
      // Only play if both conditions are met, but be less aggressive about pausing
    if (isVisible && isActive) {
        // Only play if video is actually paused (don't interrupt if already playing)
        // Also check readyState to ensure video has data
        if (video.paused && !video.ended && video.readyState >= 2) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              // Only log if it's not a user-initiated pause
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.warn('Video play failed:', err);
              }
            });
          }
        }
      } else if (!isVisible) {
        // Only pause if video is not visible (not just if not active)
        // This prevents pausing when user is still viewing but video lost focus
        if (!video.paused && !video.ended) {
      video.pause();
    }
      }
    }, 50); // Small delay to batch updates

    return () => clearTimeout(playPauseTimeout);
  }, [isVisible, isActive]);

  // Cleanup any blob URL we create
  useEffect(() => {
    return () => {
      try {
        blobFallbackAbortRef.current?.abort();
      } catch {}
      blobFallbackAbortRef.current = null;

      if (blobFallbackUrlRef.current) {
        URL.revokeObjectURL(blobFallbackUrlRef.current);
        blobFallbackUrlRef.current = null;
      }
    };
  }, []);

  const tryBlobFallback = async (video: HTMLVideoElement) => {
    // One-time safety net for browsers that stop progressing around ~59s with signed URLs.
    if (blobFallbackAttemptedRef.current) return;
    const src = video.currentSrc || video.src;
    if (!src || src.startsWith('blob:')) return;

    blobFallbackAttemptedRef.current = true;

    try {
      blobFallbackAbortRef.current?.abort();
      const ac = new AbortController();
      blobFallbackAbortRef.current = ac;

      const currentTime = video.currentTime || 0;
      const res = await fetch(src, {
        mode: 'cors',
        cache: 'no-store',
        signal: ac.signal,
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobFallbackUrlRef.current = blobUrl;

      // Swap source to blob and continue from the same point
      video.src = blobUrl;
      video.load();
      // Keep a tiny rewind to avoid landing on an unbuffered boundary
      video.currentTime = Math.max(0, currentTime - 0.25);
      video.play().catch(() => {});
    } catch {
      // swallow - best effort
    }
  };

  /* ---------- NOTE ----------
   * We intentionally avoid frequent timers that call video.play() repeatedly.
   * "Play spam" can cause audible crackling/pops on some browsers/devices.
   * Unexpected pauses are handled below with a debounced/throttled handler.
   * ------------------------- */

  /* ---------- HANDLE UNEXPECTED PAUSES ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let pauseTimeout: NodeJS.Timeout | null = null;
    let lastPlayTime = 0;
    let pauseCount = 0;

    // Monitor for unexpected pauses and resume if needed
    const handleUnexpectedPause = () => {
      const now = Date.now();
      const timeSinceLastPlay = now - lastPlayTime;
      
      // Only handle pause if:
      // 1. Video should be playing (isVisible && isActive)
      // 2. Video is not ended
      // 3. Video has enough data to play (readyState >= 2)
      // 4. Pause wasn't too recent (avoid rapid pause/play loops)
      if (isVisible && isActive && video.paused && !video.ended && video.readyState >= 2 && timeSinceLastPlay > 500) {
        pauseCount++;
        
        // Clear any existing timeout
        if (pauseTimeout) {
          clearTimeout(pauseTimeout);
        }
        
        // Only resume if we haven't had too many rapid pauses (prevent loops)
        if (pauseCount < 3) {
          pauseTimeout = setTimeout(() => {
            // Double-check conditions before resuming
            if (isVisible && isActive && video.paused && !video.ended && video.readyState >= 2) {
              video.play().then(() => {
                lastPlayTime = Date.now();
                pauseCount = 0; // Reset counter on successful play
              }).catch(() => {
                // Play failed, don't retry immediately
              });
            }
          }, 500); // Increased delay to avoid rapid retries
        } else {
          // Too many rapid pauses, reset counter after delay
          setTimeout(() => {
            pauseCount = 0;
          }, 2000);
        }
      }
    };

    const handlePlay = () => {
      lastPlayTime = Date.now();
      pauseCount = 0;
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
      }
    };

    video.addEventListener('pause', handleUnexpectedPause);
    video.addEventListener('play', handlePlay);
    
    return () => {
      video.removeEventListener('pause', handleUnexpectedPause);
      video.removeEventListener('play', handlePlay);
      if (pauseTimeout) {
        clearTimeout(pauseTimeout);
      }
    };
  }, [isVisible, isActive]);

  /* ---------- RESET ONLY WHEN POST CHANGES ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (video && post.id) {
      // Only reset if video hasn't started playing yet or if it's a different post
      // Don't reset if video is currently playing
      if (video.paused && video.currentTime === 0) {
      video.currentTime = 0;
      video.playbackRate = 1;
      setPlaybackRate(1);
      }
    }
  }, [post.id]);

  /* ---------- SUBTITLE TRACK SETUP ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !post.subtitleUrl) return;

    // Remove existing subtitle tracks
    Array.from(video.textTracks).forEach(track => {
      if (track.kind === 'subtitles') {
        track.mode = 'hidden';
      }
    });

    // Add subtitle track if not exists
    let track = Array.from(video.textTracks).find(t => t.kind === 'subtitles' && t.label === 'Default');
    
    if (!track) {
      const trackElement = document.createElement('track');
      trackElement.kind = 'subtitles';
      trackElement.label = 'Default';
      trackElement.srclang = 'en';
      trackElement.src = post.subtitleUrl;
      video.appendChild(trackElement);
      
      track = video.textTracks[video.textTracks.length - 1];
    }

    if (track) {
      track.mode = 'showing';
      setSubtitleTrack(track);
    }

    return () => {
      if (track) {
        track.mode = 'hidden';
      }
    };
  }, [post.id, post.subtitleUrl]);

  /* ---------- PLAYBACK RATE CONTROL ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  /* ---------- CONTROLS VISIBILITY ---------- */
  useEffect(() => {
    if (isHovering || showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isHovering, showControls]);

  /* ---------- VIDEO CONTROL FUNCTIONS ---------- */
  const handleRewind10 = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - 10);
      setShowControls(true);
    }
  };

  const handleForward10 = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      setShowControls(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    setShowControls(true);
  };

  const handleDownload = async () => {
    if (!post.videoUrl) return;
    
    try {
      setShowControls(true);
      // Fetch the video with proper CORS handling
      const response = await fetch(post.videoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'video/mp4',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download video');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${post.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(post.videoUrl, '_blank');
    }
  };

  const toggleSubtitles = () => {
    if (subtitleTrack) {
      subtitleTrack.mode = subtitleTrack.mode === 'showing' ? 'hidden' : 'showing';
      setShowSubtitleMenu(false);
      setShowControls(true);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Don't interfere with double-tap
    e.stopPropagation();
    setShowControls(true);
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /* ---------- LIKE FUNCTIONALITY ---------- */
  const handleLike = () => {
    if (authLoading) return toast({ variant: 'destructive', title: 'Loading account…' });
    if (!user) return toast({ variant: 'destructive', title: 'Please log in to like posts.' });
    if (!postRef || !likeRef) return;

    const wasLiked = isLiked;
    startLikeTransition(() => {
      setIsLiked(!wasLiked);
      setOptimisticLikes(prev => wasLiked ? prev - 1 : prev + 1);
      const batch = writeBatch(db!);
      const likeData = { createdAt: serverTimestamp() };
      if (wasLiked) {
        batch.delete(likeRef!);
        batch.update(postRef!, { likes: increment(-1) });
      } else {
        batch.set(likeRef!, likeData);
        batch.update(postRef!, { likes: increment(1) });
      }
      batch.commit().catch(() => {
        setIsLiked(wasLiked);
        setOptimisticLikes(post.likes || 0);
        toast({ variant: 'destructive', title: 'Failed to like post.' });
      });
    });
  };

  /* ---------- DOUBLE TAP TO LIKE ---------- */
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

  /* ---------- SHARE FUNCTIONALITY ---------- */
  const handleShare = async () => {
    if (!post.videoUrl && !post.imageUrl) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = post.title || 'Check out this content';
    
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch (err) {
        // User cancelled or error
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied!' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Failed to copy link.' });
      }
    }
  };

  /* ---------- MUTE TOGGLE ---------- */
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(prev => {
      const newMuted = !prev;
      if (videoRef.current) {
        videoRef.current.muted = newMuted;
      }
      return newMuted;
    });
  };

  /* ---------- CHROMECAST/AIRPLAY FUNCTIONALITY ---------- */
  useEffect(() => {
    // Set video ref for AirPlay on iOS
    if (videoRef.current && isCastAvailable) {
      setVideoRef(videoRef.current);
    }
  }, [videoRef.current, isCastAvailable, setVideoRef]);

  const handleCast = async () => {
    if (!post.videoUrl) {
      toast({ variant: 'destructive', title: 'No video to cast.' });
      return;
    }

    if (isCasting && !isIOSDevice) {
      stopCasting();
      toast({ title: 'Stopped casting.' });
      return;
    }

    try {
      await castMedia(post.videoUrl, post.title, post.imageUrl);
      if (isIOSDevice) {
        toast({ title: 'Select AirPlay device...' });
      } else {
        toast({ title: 'Casting to Chromecast...' });
      }
      setShowControls(true);
    } catch (error: any) {
      // Check if user cancelled - don't show error for cancellations
      // Check all possible cancellation indicators BEFORE any logging
      const errorMessage = String(error?.message || error?.code || error?.toString() || '').toLowerCase();
      const errorCode = String(error?.code || error?.type || '').toLowerCase();
      const errorString = String(error).toLowerCase();
      
      const isCancellation = errorCode === 'cancel' || 
                            errorMessage.includes('cancel') ||
                            errorCode === 'cancelled' ||
                            errorMessage.includes('cancelled') ||
                            error?.message === 'cancel' ||
                            errorString.includes('cancel') ||
                            errorString.includes('cancelled');
      
      if (isCancellation) {
        // User cancelled - silently handle, no error message needed
        // Don't log to console either - just return silently
        return;
      }
      
      // Real error - log and show toast
      console.error('Cast error:', error);
      toast({ 
        variant: 'destructive', 
        title: isIOSDevice ? 'Failed to show AirPlay picker.' : 'Failed to cast video.',
        description: error.message || (isIOSDevice ? 'Please make sure AirPlay is available.' : 'Please make sure your Chromecast device is available.')
      });
    }
  };

  // Display values
  const displayAuthorName = post.authorName || author?.displayName || 'Anonymous';
  const displayAuthorPhoto = post.authorPhoto || author?.photoURL;
  const createdAtDate = post.createdAt?.toDate ? post.createdAt.toDate() : undefined;

  return (
    <div className="w-full max-w-2xl mx-auto my-4 md:my-6 border rounded-xl overflow-hidden shadow-lg bg-card">
      {/* Header with Author Info */}
      {post.authorId && (
        <div className="p-4 md:p-5 border-b flex items-center gap-3">
          <Link href={`/profile/${post.authorId}`}>
            <Avatar className="cursor-pointer">
              <AvatarImage src={displayAuthorPhoto} />
              <AvatarFallback>{displayAuthorName[0] || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${post.authorId}`} className="group">
              <p className="font-semibold group-hover:text-primary">{displayAuthorName}</p>
            </Link>
            {createdAtDate && (
              <p className="text-xs text-muted-foreground">
                <ClientOnlyTime date={createdAtDate} />
              </p>
            )}
          </div>
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
      )}

      {/* Title */}
      {post.title && (
        <div className="p-4 md:p-5 border-b">
          <h3 className="font-semibold text-lg md:text-xl">{post.title}</h3>
        </div>
      )}

      {/* Video/Image Section - Only show if there's media */}
      {(post.type === 'video' || post.type === 'image') && (post.videoUrl || post.imageUrl) && (
      <section 
        ref={containerRef} 
        style={{
          ...SECTION_STYLE,
          width: '100%',
          overflow: 'hidden',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
      {/* Double-tap Like Animation */}
      {showLikeAnimation && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 0.6 }}
        >
          <FlowerIcon size="xl" animated className="text-white drop-shadow-2xl" />
        </motion.div>
      )}

      {post.type === 'video' && post.videoUrl && (
        <div 
          style={{ position: 'relative', width: '100%' }}
          onClick={handleDoubleTap}
          onTouchEnd={handleDoubleTap}
        >
          <video
            ref={videoRef}
            src={validVideoUrl || post.videoUrl || ''}
            muted={muted}
            playsInline
            preload="auto"
            controls={false}
            onClick={handleVideoClick}
            onTouchStart={(e) => {
              // CRITICAL: Ensure user interaction is registered for mobile autoplay
              const video = e.currentTarget;
              // On mobile, explicitly load and play after user interaction
              if (isMobile && video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                video.load();
              }
              if (video.paused && isActive) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                  playPromise.catch((err) => {
                    // Log mobile-specific errors for debugging
                    if (isMobile) {
                      console.warn('[SimpleFeedCard] Mobile play failed:', err.name, err.message);
                    }
                  });
                }
              }
            }}
            onLoadedMetadata={(e) => {
              // On mobile, ensure video is ready to play after metadata loads
              const video = e.currentTarget;
              if (video.duration && !isNaN(video.duration)) {
                setDuration(video.duration);
              }
              if (isMobile && isVisible && isActive && video.paused && !video.ended) {
                // Small delay to ensure mobile browser is ready
                setTimeout(() => {
                  if (video.paused && isVisible && isActive) {
                    video.play().catch((err) => {
                      if (isMobile) {
                        console.warn('[SimpleFeedCard] Mobile autoplay after metadata failed:', err.name);
                      }
                    });
                  }
                }, 100);
              }
            }}
            onError={async (e) => {
              const video = e.currentTarget;
              const error = video.error;
              
              // Build comprehensive error info - ensure all values are defined
              const errorInfo: any = {
                networkState: video.networkState ?? 'unknown',
                readyState: video.readyState ?? 'unknown',
                src: (validVideoUrl || post.videoUrl || '')?.substring(0, 100) || 'no src',
                isMobile: isMobile ?? false,
                paused: video.paused ?? false,
                ended: video.ended ?? false,
                currentTime: video.currentTime ?? 0,
                duration: video.duration ?? 0,
                videoId: post.id || 'unknown',
              };
              
              // Add error details if available
              if (error) {
                errorInfo.errorCode = error.code ?? 'unknown';
                errorInfo.errorMessage = error.message ?? 'No message';
              } else {
                errorInfo.errorStatus = 'No error object available';
                // Try to infer error from network state
                const networkState = video.networkState;
                if (networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  errorInfo.inferredError = 'No source available (NETWORK_NO_SOURCE)';
                } else if (networkState === HTMLMediaElement.NETWORK_EMPTY) {
                  errorInfo.inferredError = 'Network empty (NETWORK_EMPTY)';
                } else if (networkState === HTMLMediaElement.NETWORK_IDLE) {
                  errorInfo.inferredError = 'Network idle (NETWORK_IDLE)';
                } else if (networkState === HTMLMediaElement.NETWORK_LOADING) {
                  errorInfo.inferredError = 'Network loading (NETWORK_LOADING)';
                } else if (networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  errorInfo.inferredError = 'No source (NETWORK_NO_SOURCE)';
                }
              }
              
              // Always log error info - use JSON.stringify to ensure it's visible
              if (process.env.NODE_ENV === 'development') {
                console.error('[SimpleFeedCard] Video playback error:', JSON.stringify(errorInfo, null, 2));
              } else {
                // In production, still log but more compact
                console.error('[SimpleFeedCard] Video playback error:', errorInfo);
              }
              
              // CRITICAL: Try URL refresh on any error - signed URLs may have expired
              if (error && isVisible && isActive) {
                const currentTime = video.currentTime;
                const freshUrl = await refreshVideoUrl();
                
                if (freshUrl && video.src !== freshUrl) {
                  // URL refreshed - reload video from current position
                  setTimeout(() => {
                    if (video && video.src !== freshUrl) {
                      video.src = freshUrl;
                      video.currentTime = Math.max(0, currentTime - 2); // Start 2s before error
                      video.load();
                      video.play().catch(() => {});
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[SimpleFeedCard] Reloaded video with fresh URL from position ${currentTime}`);
                      }
                    }
                  }, 500);
                  return;
                }
              }
              
              // Fallback: Try to recover from error on mobile
              if (error && isMobile) {
                if (error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[SimpleFeedCard] Video format not supported on mobile, trying reload');
                  }
                  // Try reloading the video source
                  setTimeout(() => {
                    if (video && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                      video.load();
                    }
                  }, 1000);
                } else if (error.code === 2) { // MEDIA_ERR_NETWORK
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[SimpleFeedCard] Network error on mobile, retrying...');
                  }
                  setTimeout(() => {
                    if (video) {
                      video.load();
                    }
                  }, 2000);
                }
              }
            }}
            style={VIDEO_STYLE}
            crossOrigin="anonymous"
            data-videoid={postId || post.id}
            data-post-id={postId || post.id}
            onProgress={(e) => {
              // Monitor buffering progress - GENTLE approach, don't interrupt normal playback
              const video = e.target as HTMLVideoElement;
              if (isVisible && isActive && !video.ended) {
                // Only resume if video is paused but has sufficient buffer
                // Don't force seeks - let the browser handle buffering naturally
                if (video.paused && !video.ended && video.readyState >= 2) {
                  const buffered = video.buffered;
                  if (buffered.length > 0) {
                    const bufferedEnd = buffered.end(buffered.length - 1);
                    const currentTime = video.currentTime;
                    // Only resume if we have at least 3 seconds buffered (more conservative)
                    if (bufferedEnd - currentTime > 3) {
                      video.play().catch(() => {});
                    }
                  }
                }
              }
            }}
            onWaiting={(e) => {
              // Video is buffering - GENTLE approach, let browser handle it naturally
              const video = e.target as HTMLVideoElement;
              if (isVisible && isActive) {
                // If we are repeatedly stalling around ~59s on some browsers, use blob fallback once.
                // Only attempt when we have essentially no forward buffer.
                try {
                  const buffered = video.buffered;
                  const bufferedEnd = buffered.length ? buffered.end(buffered.length - 1) : 0;
                  const bufferAhead = bufferedEnd - video.currentTime;
                  if (video.currentTime > 40 && video.currentTime < 90 && bufferAhead < 0.5) {
                    tryBlobFallback(video);
                  }
                } catch {}

                // CRITICAL: Do NOT refresh/swap URLs on waiting.
                // On some devices this interrupts playback around ~40s with no console error.
                const waitingTimeout = setTimeout(() => {}, 15000);
                
                const resumeHandler = () => {
                  clearTimeout(waitingTimeout);
                  if (isVisible && isActive && video.paused && !video.ended) {
                    video.play().catch(() => {});
                  }
                };
                video.addEventListener('canplay', resumeHandler, { once: true });
                video.addEventListener('canplaythrough', resumeHandler, { once: true });
              }
            }}
            onStalled={(e) => {
              // Video stalled - GENTLE approach, let browser recover naturally
              const video = e.target as HTMLVideoElement;
              if (isVisible && isActive) {
                // CRITICAL: Do NOT refresh/swap URLs on stalled.
                const stalledTimeout = setTimeout(() => {}, 10000);
                
                const resumeHandler = () => {
                  clearTimeout(stalledTimeout);
                  if (isVisible && isActive && video.paused && !video.ended) {
                    video.play().catch(() => {});
                  }
                };
                video.addEventListener('canplay', resumeHandler, { once: true });
                video.addEventListener('canplaythrough', resumeHandler, { once: true });
              }
            }}
            onCanPlay={() => {
              // No-op: avoid auto-resume loops that can cause audio crackling.
            }}
            onCanPlayThrough={() => {
              // No-op: avoid auto-resume loops that can cause audio crackling.
            }}
            onPlay={() => {
              // No-op: unexpected pauses are handled by the dedicated effect.
            }}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement;
              setCurrentTime(video.currentTime);
              if (video.duration && !isNaN(video.duration)) {
                setDuration(video.duration);
              }
              
              // IMPORTANT: Disable stuck detection/URL swapping.
              // It can incorrectly trigger and reset the source, causing playback to stop around ~40s
              // on some devices even when network/range requests are fine.
              if (isVisible && isActive && !video.ended && video.currentTime > 10) {
                // Only check if video is paused unexpectedly (should be playing) - but be conservative
                // Don't force play if video is naturally paused or buffering
                if (video.paused && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !video.seeking) {
                  // Only resume if we have good buffer and video should be playing
                  const buffered = video.buffered;
                  if (buffered.length > 0) {
                    const bufferedEnd = buffered.end(buffered.length - 1);
                    const currentTime = video.currentTime;
                    // Only resume if we have at least 5 seconds buffered (very conservative)
                    if (bufferedEnd - currentTime > 5) {
                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[SimpleFeedCard] Video paused with good buffer, resuming at ${currentTime.toFixed(2)}s`);
                      }
                      video.play().catch(() => {});
                    }
                  }
                }
                
                if (false && !video.paused && !video.seeking && !isMobile && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                  const lastTimeKey = `lastTime_${postId || post.id}`;
                  const lastTimeUpdateKey = `lastTimeUpdate_${postId || post.id}`;
                  const stuckCheckKey = `stuckCheck_${postId || post.id}`;
                  const lastTime = ((window as unknown) as Record<string, number>)[lastTimeKey] || video.currentTime;
                  const lastTimeUpdate = ((window as unknown) as Record<string, number>)[lastTimeUpdateKey] || Date.now();
                  const lastStuckCheck = ((window as unknown) as Record<string, number>)[stuckCheckKey] || 0;
                  
                  // Only check if time hasn't changed for 3+ seconds (much more conservative)
                  // AND we haven't checked for stuck state recently (avoid spam)
                  if (Math.abs(video.currentTime - lastTime) < 0.1 && 
                      Date.now() - lastTimeUpdate > 3000 &&
                      Date.now() - lastStuckCheck > 5000) {
                    
                    // Additional checks: ensure video is truly stuck, not just buffering
                    const buffered = video.buffered;
                    const hasBuffer = buffered.length > 0 && buffered.end(buffered.length - 1) > video.currentTime + 1;
                    const networkOk = video.networkState === HTMLMediaElement.NETWORK_LOADING || 
                                     video.networkState === HTMLMediaElement.NETWORK_IDLE;
                    
                    // Only intervene if: no buffer AND network is not loading (truly stuck)
                    if (!hasBuffer && (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || 
                                       video.networkState === HTMLMediaElement.NETWORK_IDLE)) {
                      if (process.env.NODE_ENV === 'development') {
                        console.warn(`[SimpleFeedCard] Video truly stuck at ${video.currentTime.toFixed(2)}s (no buffer, network: ${video.networkState}), trying recovery...`);
                      }
                      ((window as unknown) as Record<string, number>)[stuckCheckKey] = Date.now();
                      
                      // First, just try to play (gentle recovery)
                      video.play().catch(() => {});
                      
                      // Only refresh URL if still stuck after 5 more seconds
                      setTimeout(async () => {
                        if (Math.abs(video.currentTime - lastTime) < 0.1 && 
                            !video.paused && 
                            isVisible && 
                            isActive &&
                            !video.seeking) {
                          if (process.env.NODE_ENV === 'development') {
                            console.warn(`[SimpleFeedCard] Video still stuck after 5s, refreshing URL...`);
                          }
                          const freshUrl = await refreshVideoUrl();
                          if (freshUrl && video.src !== freshUrl) {
                            const currentTime = video.currentTime;
                            video.src = freshUrl;
                            video.currentTime = Math.max(0, currentTime - 2);
                            video.load();
                            video.play().catch(() => {});
                          }
                        }
                      }, 5000);
                    }
                  }
                  ((window as unknown) as Record<string, number>)[lastTimeKey] = video.currentTime;
                  ((window as unknown) as Record<string, number>)[lastTimeUpdateKey] = Date.now();
                }
              }
            }}
          />
          
          {/* Mute/Unmute Button */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={toggleMute}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          {/* Progress Bar for Mobile - Always visible */}
          {isMobile && duration > 0 && (
            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
              <div className="w-full h-1.5 bg-black/40">
                <div
                  className="h-full bg-white/90 transition-all duration-75 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Custom Controls Overlay */}
          {showControls && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleRewind10}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                title="Rewind 10 seconds"
              >
                <SkipBack size={20} />
              </button>

              <button
                onClick={handleForward10}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                title="Forward 10 seconds"
              >
                <SkipForward size={20} />
              </button>

              {/* Playback Speed Control */}
              <div style={{ position: 'relative' }} data-controls-menu>
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowSubtitleMenu(false);
                    setShowControls(true);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }}
                  title={`Playback Speed: ${playbackRate}x`}
                >
                  <Gauge size={20} />
                </button>
                
                {showSpeedMenu && (
                  <div
                    data-controls-menu
                    style={{
                      position: 'absolute',
                      bottom: '50px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.9)',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '100px',
                      zIndex: 20,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        style={{
                          background: playbackRate === speed ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          color: 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '14px',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = playbackRate === speed ? 'rgba(255, 255, 255, 0.3)' : 'transparent';
                        }}
                      >
                        {speed}x {speed === 1 ? '(Normal)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitle Control */}
              {post.subtitleUrl && (
                <div style={{ position: 'relative' }} data-controls-menu>
                  <button
                    onClick={() => {
                      toggleSubtitles();
                      setShowSpeedMenu(false);
                    }}
                    style={{
                      background: subtitleTrack?.mode === 'showing' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = subtitleTrack?.mode === 'showing' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = subtitleTrack?.mode === 'showing' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)';
                    }}
                    title={subtitleTrack?.mode === 'showing' ? 'Subtitles: On' : 'Subtitles: Off'}
                  >
                    <Subtitles size={20} />
                  </button>
                </div>
              )}

              <button
                onClick={handleDownload}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                title="Download video"
              >
                <Download size={20} />
              </button>

              {/* Chromecast/AirPlay Button */}
              {isCastAvailable && post.videoUrl && (
                <button
                  onClick={handleCast}
                  style={{
                    background: isCasting ? 'rgba(66, 133, 244, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isCasting ? 'rgba(66, 133, 244, 0.6)' : 'rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isCasting ? 'rgba(66, 133, 244, 0.5)' : 'rgba(255, 255, 255, 0.2)';
                  }}
                  title={isIOSDevice 
                    ? (isCasting ? 'AirPlay active' : 'Cast to AirPlay') 
                    : (isCasting ? 'Stop casting' : 'Cast to Chromecast')
                  }
                >
                  <Cast size={20} />
                </button>
              )}
              
              {/* Progress Bar and Time Display for Desktop */}
              {!isMobile && duration > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '60px', 
                  left: '16px', 
                  right: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {/* Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    const video = videoRef.current;
                    if (!video) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    video.currentTime = percent * duration;
                  }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: 'white',
                        width: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`,
                        transition: 'width 0.1s linear'
                      }}
                    />
                  </div>
                  
                  {/* Time Display */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                  }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {post.type === 'image' && post.imageUrl && (
        <div 
          style={{ 
            position: 'relative', 
            width: '100%', 
            minHeight: '200px',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleDoubleTap}
          onTouchEnd={handleDoubleTap}
        >
          <img 
            src={post.imageUrl} 
            alt={post.title || 'post'} 
            style={IMAGE_STYLE}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              console.error('Image failed to load:', post.imageUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              // Ensure image is visible after load
              img.style.display = 'block';
              img.style.opacity = '1';
            }}
          />
        </div>
      )}
      </section>
      )}

      {/* Text Content / Description */}
      {(post.content || post.description) && (
        <div className="p-4 md:p-5 border-t">
          <p 
            className={`text-sm md:text-base text-muted-foreground whitespace-pre-wrap ${
              shouldShowExpand && !isExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {post.content || post.description}
          </p>
          {shouldShowExpand && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Survey Options */}
      {post.type === 'survey' && post.surveyOptions && post.surveyOptions.length > 0 && (
        <div className="p-4 md:p-5 border-t space-y-3">
          <h4 className="font-semibold text-sm md:text-base mb-3">Survey Options</h4>
          {post.surveyOptions.map((option, index) => {
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
      {post.type === 'question' && post.questionOptions && post.questionOptions.length > 0 && (
        <div className="p-4 md:p-5 border-t space-y-3">
          <h4 className="font-semibold text-sm md:text-base mb-3">Select the correct answer</h4>
          {post.questionOptions.map((option, index) => {
            const hasAnswered = userQuestionAnswer !== null;
            const isSelected = selectedQuestionAnswer === index || userQuestionAnswer === index;
            const isCorrect = post.correctAnswer !== undefined && index === post.correctAnswer;
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
          {userQuestionAnswer !== null && post.correctAnswer !== undefined && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">
                {userQuestionAnswer === post.correctAnswer
                  ? '🎉 Congratulations! You got it right!'
                  : `The correct answer is: ${post.questionOptions[post.correctAnswer]}`}
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

      {/* Footer with Like, Comment, Share */}
      <CardFooter className="flex items-center justify-between p-4 md:p-5 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={authLoading || !user || isLiking}
            className="flex items-center gap-1.5"
          >
            <FlowerIcon size="sm" isLiked={isLiked} />
            <span>{optimisticLikes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(prev => !prev)}
            className="flex items-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentsCount || 0}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-1.5"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>

      {/* Comments Section */}
      {showComments && postId && (
        <>
          <Separator />
          <div className="p-4 md:p-5">
            <Comments contentId={postId} contentType="post" />
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What's on your mind?"
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
              disabled={isEditing || !editContent.trim()}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cast Overlay with Minimize, Maximize, and Close buttons */}
      <CastOverlay
        isCasting={isCasting}
        onClose={() => {
          stopCasting();
          toast({ title: 'Stopped casting.' });
        }}
        deviceName={castDeviceName || undefined}
        videoTitle={post.title || post.description || 'Video'}
      />
    </div>
  );
}

