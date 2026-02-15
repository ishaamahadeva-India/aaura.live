'use client';

import React, { useRef, useState, useMemo, useEffect, useTransition } from "react";
import { MessageCircle, Play, Pause, Volume2, VolumeX, Video, Home, PlusCircle, User, Share2, Download, AlertCircle, Info, Maximize2, Edit, Trash2, MoreVertical } from "lucide-react";
import { FlowerIcon } from "@/components/FlowerIcon";
import { useAuth, useFirestore } from "@/lib/firebase/provider";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData, useCollection } from "react-firebase-hooks/firestore";
import { doc, writeBatch, increment, serverTimestamp, collection, query, orderBy, where, deleteDoc, updateDoc } from "firebase/firestore";
import { Comments } from "@/components/comments";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { HLSVideoPlayer } from "@/components/HLSVideoPlayer";
import { ResumeButton } from "@/components/video/ResumeButton";
import { VideoDiagnostics } from "@/components/video/VideoDiagnostics";
import { CustomPictureInPicture } from "@/components/video/CustomPictureInPicture";
import { useNetworkQuality } from "@/hooks/use-network-quality";
import { useRouter } from "next/navigation";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useStorage } from "@/lib/firebase/provider";

type FeedItem = {
  id: string;
  mediaUrl: string;
  videoUrl?: string;
  hlsUrl?: string; // HLS URL for adaptive streaming
  caption?: string;
  content?: string;
  likes: number;
  likedByUser?: boolean;
  commentsCount?: number;
  createdAt?: any;
  userId?: string;
  authorId?: string;
  sourceCollection: 'posts' | 'media'; // Track which collection this came from
  hlsProcessed?: boolean; // Whether HLS conversion is complete
};

type FloatingFlower = {
  id: string;
  x: number;
  y: number;
  rotation: number;
};

export default function ReelsPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showPlayPause, setShowPlayPause] = useState<{ id: string; state: 'play' | 'pause' } | null>(null);
  const [floatingFlowers, setFloatingFlowers] = useState<FloatingFlower[]>([]);
  const [isLiking, startLikeTransition] = useTransition();
  const [allVideos, setAllVideos] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentSheetOpen, setCommentSheetOpen] = useState<string | null>(null);
  const [showResumeButton, setShowResumeButton] = useState<number | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showPiP, setShowPiP] = useState(false);
  const [pipVideoIndex, setPipVideoIndex] = useState<number | null>(null);
  const networkInfo = useNetworkQuality();
  const storage = useStorage();
  
  // URL refresh state - track which videos need URL refresh
  const urlRefreshAttempts = useRef<Map<number, number>>(new Map());
  const blobFallbackAttempted = useRef<Map<number, boolean>>(new Map());
  const blobFallbackUrl = useRef<Map<number, string>>(new Map());
  const blobFallbackAbort = useRef<Map<number, AbortController>>(new Map());
  const videoUrls = useRef<Map<number, string>>(new Map());
  
  // Edit/Delete state
  const [showEditDialog, setShowEditDialog] = useState<{ postId: string; description: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const lastTap = useRef(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  // NOTE: We intentionally avoid aggressive "play spam" monitoring loops.
  // Repeatedly calling video.play() (e.g. every 100ms) can cause audible crackling/pops on some devices.
  const lastPlayAttempt = useRef<Map<number, number>>(new Map());
  const userInteractionRef = useRef<boolean>(false);
  const lastInteractionTime = useRef<number>(Date.now());

  // Keep all video elements in sync with the muted state
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = muted;
      }
    });
  }, [muted]);

  // Fix audio noise on mobile: Pause background music and ensure only one audio track plays
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const pauseAllOtherAudio = (currentVideo: HTMLVideoElement) => {
      // Pause all other audio/video elements to prevent conflicts
      const allMedia = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
      allMedia.forEach((media) => {
        if (media !== currentVideo && !media.paused) {
          media.pause();
        }
      });
    };
    
    const handleAudioTracks = (video: HTMLVideoElement) => {
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
          console.warn('[Reels] Audio tracks API not available:', e);
        }
      }
    };
    
    const cleanupFunctions: Array<() => void> = [];
    
    videoRefs.current.forEach((video) => {
      if (!video) return;
      
      const handleLoadedMetadata = () => handleAudioTracks(video);
      const handleCanPlay = () => handleAudioTracks(video);
      const handlePlay = () => pauseAllOtherAudio(video);
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('play', handlePlay);
      
      // Store cleanup function
      cleanupFunctions.push(() => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('play', handlePlay);
      });
    });
    
    // Return cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [allVideos]);

  // Fetch from both collections
  // Note: media collection uses "uploadDate", posts collection uses "createdAt"
  // Only fetch approved media items
  const mediaQuery = useMemo(() => {
    if (!db) return null;
    return query(
      collection(db, "media"), 
      where("status", "==", "approved"),
      orderBy("uploadDate", "desc")
    );
  }, [db]);

  const postsQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "posts"), orderBy("createdAt", "desc"));
  }, [db]);

  // Use useCollection to get document IDs reliably
  const [mediaSnapshot] = useCollection(mediaQuery);
  const [postsSnapshot] = useCollection(postsQuery);
  
  // Extract data with IDs from snapshots
  const mediaItems = useMemo(() => {
    if (!mediaSnapshot) return null;
    return mediaSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any[];
  }, [mediaSnapshot]);
  
  const postsItems = useMemo(() => {
    if (!postsSnapshot) return null;
    return postsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any[];
  }, [postsSnapshot]);

  // Merge and filter videos from both collections
  useEffect(() => {
    if (!db) return;
    
    const mergeVideos = async () => {
      setLoading(true);
      try {
        const videos: FeedItem[] = [];

        // Process media collection
        if (mediaItems) {
          for (const item of mediaItems) {
            if (item.mediaUrl || item.videoUrl) {
              // Ensure we have a valid ID
              const itemId = item.id || item.docId || (item as Record<string, unknown>).__id as string || '';
              if (!itemId) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Reels: Media item missing ID, skipping', item);
                }
                continue;
              }
              
              // Filter: Only show vertical videos in reels
              const videoOrientation = item.videoOrientation;
              const videoAspectRatio = item.videoAspectRatio;
              const videoWidth = item.videoWidth;
              const videoHeight = item.videoHeight;
              
              // Determine if video is vertical
              let isVertical = false;
              if (videoOrientation === 'vertical') {
                isVertical = true;
              } else if (videoAspectRatio !== undefined) {
                // Aspect ratio < 1 means height > width (vertical)
                isVertical = videoAspectRatio < 0.95;
              } else if (videoWidth && videoHeight) {
                // Calculate aspect ratio from dimensions
                const aspectRatio = videoWidth / videoHeight;
                isVertical = aspectRatio < 0.95;
              } else {
                // If dimensions are not available, skip to avoid showing horizontal videos
                continue;
              }
              
              // Only add vertical videos to reels
              if (!isVertical) {
                continue; // Skip horizontal videos
              }
              
              videos.push({
                id: itemId,
                mediaUrl: item.mediaUrl || item.videoUrl,
                hlsUrl: item.hlsUrl,
                caption: item.caption || item.description_en || item.title_en,
                likes: item.likes || 0,
                commentsCount: item.commentsCount || 0,
                createdAt: item.createdAt || item.uploadDate, // Use uploadDate as fallback for media collection
                userId: item.userId || item.authorId,
                sourceCollection: 'media',
                hlsProcessed: item.hlsProcessed !== false,
              });
            }
          }
        }

        // Process posts collection
        if (postsItems) {
          for (const item of postsItems) {
            if (item.videoUrl) {
              // Ensure we have a valid ID - use doc.id if item.id is missing
              const itemId = item.id || item.docId || (item as Record<string, unknown>).__id as string || '';
              if (!itemId) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Reels: Post item missing ID, skipping', item);
                }
                continue;
              }
              
              // Filter: Only show vertical videos in reels
              const videoOrientation = item.videoOrientation;
              const videoAspectRatio = item.videoAspectRatio;
              const videoWidth = item.videoWidth;
              const videoHeight = item.videoHeight;
              
              // Determine if video is vertical
              let isVertical = false;
              if (videoOrientation === 'vertical') {
                isVertical = true;
              } else if (videoAspectRatio !== undefined) {
                isVertical = videoAspectRatio < 0.95;
              } else if (videoWidth && videoHeight) {
                const aspectRatio = videoWidth / videoHeight;
                isVertical = aspectRatio < 0.95;
              } else {
                // Skip videos without orientation data
                continue;
              }
              
              // Only add vertical videos to reels
              if (!isVertical) {
                continue; // Skip horizontal videos
              }
              
              videos.push({
                id: itemId,
                mediaUrl: item.videoUrl,
                videoUrl: item.videoUrl,
                hlsUrl: item.hlsUrl,
                caption: item.content || item.caption,
                likes: item.likes || 0,
                commentsCount: item.commentsCount || 0,
                createdAt: item.createdAt,
                userId: item.authorId || item.userId,
                sourceCollection: 'posts',
                hlsProcessed: item.hlsProcessed !== false,
              });
            }
          }
        }

        // Sort by createdAt or uploadDate (newest first)
        videos.sort((a, b) => {
          // Handle both createdAt (posts) and uploadDate (media) fields
          const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.seconds * 1000 || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.seconds * 1000 || 0;
          return bTime - aTime;
        });

        // Set likedByUser to false initially (will be updated on interaction)
        const videosWithLikes = videos.map(v => ({ ...v, likedByUser: false }));
        setAllVideos(videosWithLikes);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (process.env.NODE_ENV === 'development') {
          console.error('Error merging videos:', error);
        }
        // Silently handle - videos will just be empty
      } finally {
        setLoading(false);
      }
    };

    mergeVideos();
  }, [mediaItems, postsItems, db, user]);

  // Auto-play/pause videos (throttled, event-driven)
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeIndex) {
        // Play active video (throttled)
        const now = Date.now();
        const lastAttempt = lastPlayAttempt.current.get(index) || 0;
        if (now - lastAttempt > 1000) {
          lastPlayAttempt.current.set(index, now);
          video.play().catch(() => {
            setShowResumeButton(index);
          });
        }
      } else {
        video.pause();
        lastPlayAttempt.current.delete(index);
      }
    });
    
    // Cleanup on unmount
    return () => {
      lastPlayAttempt.current.clear();
    };
  }, [activeIndex, allVideos]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const height = window.innerHeight;
    const index = Math.round(scrollTop / height);
    setActiveIndex(index);
  };

  const handleTap = (post: FeedItem) => {
    if (!post?.id || !user) return;

    // On user interaction, unmute videos (desktop browsers require a gesture)
    if (muted) {
      setMuted(false);
      videoRefs.current.forEach((v) => {
        if (v) v.muted = false;
      });
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (tapTimeout.current) clearTimeout(tapTimeout.current);

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      handleLike(post);
      spawnFlowers();
    } else {
      tapTimeout.current = setTimeout(() => {
        const video = videoRefs.current[activeIndex];
        if (video && post?.id) {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (video.paused) {
            video.play().catch(() => {});
            setShowPlayPause({ id: post.id, state: 'play' });
          } else {
            // On desktop, don't allow manual pause - videos should play continuously
            // Only allow pause on mobile
            if (isMobile) {
              video.pause();
              setShowPlayPause({ id: post.id, state: 'pause' });
            } else {
              // On desktop, just show play icon briefly but don't actually pause
              setShowPlayPause({ id: post.id, state: 'play' });
            }
          }
          setTimeout(() => {
            setShowPlayPause(prev => {
              // Only clear if it's still the same play/pause state
              if (prev?.id === post.id) {
                return null;
              }
              return prev;
            });
          }, 1000);
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTap.current = now;
  };

  const spawnFlowers = () => {
    const flowers: FloatingFlower[] = Array.from({ length: 4 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
      rotation: Math.random() * 360,
    }));
    setFloatingFlowers(prev => [...prev, ...flowers]);
    setTimeout(() => setFloatingFlowers(prev => prev.slice(flowers.length)), 1000);
  };

  // Refresh video URL from Firestore storage path - CRITICAL for fixing playback stopping
  const refreshVideoUrl = async (post: FeedItem, videoIndex: number): Promise<string | null> => {
    if (!post) return null;

    // IMPORTANT:
    // Prefer switching Firebase download URLs (firebasestorage.googleapis.com alt=media&token=...)
    // to GCS signed URLs (storage.googleapis.com) for stable long playback across devices.
    // Our API can resolve the file across buckets.
    
    const attempts = urlRefreshAttempts.current.get(videoIndex) || 0;
    if (attempts >= 3) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Reels] Max URL refresh attempts reached for video ${videoIndex}`);
      }
      return null;
    }
    
    urlRefreshAttempts.current.set(videoIndex, attempts + 1);
    
    try {
      const storagePath = (post as any).mediaStoragePath || (post as any).videoStoragePath;
      if (!storagePath) return null;

      const urlResponse = await fetch(`/api/upload/signed-url?filePath=${encodeURIComponent(storagePath)}`);
      if (!urlResponse.ok) return null;

      const { downloadUrl: freshUrl } = await urlResponse.json();
      if (!freshUrl) return null;

      videoUrls.current.set(videoIndex, freshUrl);
      setAllVideos(prev =>
        prev.map((v, idx) => (idx === videoIndex ? { ...v, mediaUrl: freshUrl, videoUrl: freshUrl } : v))
      );
      return freshUrl;
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Reels] Failed to refresh URL for video ${videoIndex}:`, error);
      }
    }
    
    return null;
  };

  const tryBlobFallback = async (video: HTMLVideoElement, videoIndex: number) => {
    if (blobFallbackAttempted.current.get(videoIndex)) return;
    const src = video.currentSrc || video.src;
    if (!src || src.startsWith('blob:')) return;

    blobFallbackAttempted.current.set(videoIndex, true);
    try {
      const prev = blobFallbackAbort.current.get(videoIndex);
      try { prev?.abort(); } catch {}
      const ac = new AbortController();
      blobFallbackAbort.current.set(videoIndex, ac);

      const currentTime = video.currentTime || 0;
      const res = await fetch(src, { mode: 'cors', cache: 'no-store', signal: ac.signal });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const prevUrl = blobFallbackUrl.current.get(videoIndex);
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      blobFallbackUrl.current.set(videoIndex, blobUrl);

      video.src = blobUrl;
      video.load();
      video.currentTime = Math.max(0, currentTime - 0.25);
      video.play().catch(() => {});
    } catch {
      // best effort
    }
  };

  const handleLike = (post: FeedItem) => {
    if (!user || !post?.id) return;

    const collectionName = post.sourceCollection || 'media';
    const likeRef = doc(db, `${collectionName}/${post.id}/likes/${user.uid}`);
    const postRef = doc(db, `${collectionName}/${post.id}`);

    startLikeTransition(() => {
      const batch = writeBatch(db);
      const likeData = { createdAt: serverTimestamp() };

      if (post.likedByUser) {
        batch.delete(likeRef);
        batch.update(postRef, { likes: increment(-1) });
      } else {
        batch.set(likeRef, likeData);
        batch.update(postRef, { likes: increment(1) });
      }

      batch.commit().catch((error: unknown) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error committing like batch:', error);
        }
      });
      
      // Optimistically update UI
      setAllVideos(prev => prev.map(v => 
        v.id === post.id 
          ? { ...v, likedByUser: !v.likedByUser, likes: v.likedByUser ? v.likes - 1 : v.likes + 1 }
          : v
      ));
    });
  };

  // Handle delete media/post
  const handleDelete = async (postId: string, sourceCollection: 'posts' | 'media') => {
    if (!postId || !user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const docRef = doc(db, sourceCollection, postId);
      await deleteDoc(docRef);
      toast({
        title: 'Deleted',
        description: 'Your content has been deleted successfully.',
      });
      setShowDeleteDialog(null);
      // Remove from local state
      setAllVideos(prev => prev.filter(v => v.id !== postId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      if (process.env.NODE_ENV === 'development') {
        console.error('Error deleting:', error);
      }
      toast({
        variant: 'destructive',
        title: 'Failed to delete',
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit media/post
  const handleEdit = (post: FeedItem) => {
    const currentDescription = post.caption || post.content || '';
    setEditDescription(currentDescription);
    setShowEditDialog({ postId: post.id, description: currentDescription });
  };

  const handleSaveEdit = async () => {
    if (!showEditDialog || !user || isEditing) return;
    if (!editDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Description required',
        description: 'Content cannot be empty.',
      });
      return;
    }

    setIsEditing(true);
    try {
      const post = allVideos.find(v => v.id === showEditDialog.postId);
      if (!post) {
        toast({ variant: 'destructive', title: 'Post not found' });
        return;
      }

      const collectionName = post.sourceCollection || 'media';
      const docRef = doc(db, collectionName, showEditDialog.postId);
      
      // Update based on collection type
      if (collectionName === 'media') {
        await updateDoc(docRef, {
          description_en: editDescription.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(docRef, {
          content: editDescription.trim(),
          updatedAt: serverTimestamp(),
        });
      }
      
      toast({
        title: 'Updated',
        description: 'Your content has been updated successfully.',
      });
      setShowEditDialog(null);
      
      // Update local state
      setAllVideos(prev => prev.map(v => 
        v.id === showEditDialog.postId 
          ? { ...v, caption: editDescription.trim(), content: editDescription.trim() }
          : v
      ));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating:', error);
      }
      toast({
        variant: 'destructive',
        title: 'Failed to update',
        description: errorMessage,
      });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="relative h-screen w-screen bg-background dark:bg-gray-900 flex flex-col overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Video className="w-16 h-16 animate-pulse text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      ) : allVideos?.length ? (
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth w-screen" style={{ width: '100vw' }} onScroll={handleScroll}>
          {allVideos.map((post, index) => (
            <div
              key={`${post.sourceCollection}-${post.id}`}
              className="h-screen w-full relative snap-start bg-black dark:bg-black overflow-hidden"
              style={{ minHeight: '100vh', height: '100vh', width: '100vw' }}
              onClick={() => handleTap(post)}
            >
              {/* Use HLS player if hlsUrl is available, otherwise use regular video */}
              {post.hlsUrl ? (
                <div className="absolute inset-0 w-full h-full">
                  <HLSVideoPlayer
                    hlsUrl={post.hlsUrl}
                    fallbackUrl={post.mediaUrl || post.videoUrl || null}
                    videoId={post.id}
                    isActive={activeIndex === index}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted={muted}
                    loop
                    playsInline
                    preload="auto"
                    onPlay={() => {
                      setShowResumeButton(null);
                    }}
                    onPause={() => {
                      if (activeIndex === index) {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile) {
                          setShowResumeButton(index);
                        }
                      }
                    }}
                    onError={(error: unknown) => {
                      if (process.env.NODE_ENV === 'development') {
                        console.error(`[Reels] HLS playback error for video ${index}:`, error);
                      }
                      setShowResumeButton(index);
                    }}
                  />
                </div>
              ) : (
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el!;
                    // No monitor cleanup needed (we intentionally avoid play/heartbeat timers).
                  }}
                  src={post.mediaUrl || post.videoUrl || ''}
                  muted={muted}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ 
                    width: '100vw', 
                    height: '100vh', 
                    objectFit: 'cover',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                loop
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                disablePictureInPicture={false}
                controlsList="nodownload noplaybackrate"
                onMouseEnter={(e) => {
                  // Keep user interaction active when hovering over video
                  userInteractionRef.current = true;
                  lastInteractionTime.current = Date.now();
                }}
                onTouchStart={(e) => {
                  // CRITICAL: Keep user interaction active on touch for mobile autoplay
                  userInteractionRef.current = true;
                  lastInteractionTime.current = Date.now();
                  const video = e.currentTarget;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  // On mobile, explicitly load and play after user interaction
                  if (isMobile && video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
                    video.load();
                  }
                  if (isMobile && activeIndex === index && video.paused && !video.ended) {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                      playPromise.catch((err: unknown) => {
                        if (process.env.NODE_ENV === 'development' && err instanceof Error) {
                          console.warn(`[Reels] Mobile play failed for video ${index}:`, err.name);
                        }
                      });
                    }
                  }
                }}
                onLoadedMetadata={(e) => {
                  // Ensure video is ready to play, especially on mobile
                  const video = e.target as HTMLVideoElement;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (activeIndex === index && video.paused && !video.ended) {
                    if (isMobile) {
                      // Small delay for mobile browsers
                      setTimeout(() => {
                        if (video.paused && activeIndex === index) {
                          video.play().catch((err: unknown) => {
                            if (process.env.NODE_ENV === 'development' && err instanceof Error) {
                              console.warn(`[Reels] Mobile autoplay after metadata failed for video ${index}:`, err.name);
                            }
                          });
                        }
                      }, 100);
                    } else {
                      video.play().catch(() => {});
                    }
                  }
                }}
                onProgress={(e) => {
                  // Monitor buffering progress and ensure playback continues
                  const video = e.target as HTMLVideoElement;
                  if (activeIndex === index) {
                    // Check if video unexpectedly paused during playback
                    if (video.paused && !video.ended && video.readyState >= 2) {
                      const buffered = video.buffered;
                      if (buffered.length > 0) {
                        const bufferedEnd = buffered.end(buffered.length - 1);
                        const currentTime = video.currentTime;
                        // If we have at least 2 seconds buffered ahead, try to play
                        if (bufferedEnd - currentTime > 2) {
                          video.play().catch(() => {});
                        } else if (bufferedEnd - currentTime < 0.5) {
                          // Buffer ran out - might need URL refresh
                          if (process.env.NODE_ENV === 'development') {
                            console.warn(`[Reels] Video ${index} buffer exhausted at ${currentTime.toFixed(2)}s`);
                          }
                        }
                      }
                    }
                    
                    // Proactive buffering check - if we're close to end of buffer, preload more
                    const buffered = video.buffered;
                    if (buffered.length > 0 && !video.paused && !video.ended) {
                      const bufferedEnd = buffered.end(buffered.length - 1);
                      const currentTime = video.currentTime;
                      // If we're within 5 seconds of buffer end, ensure we're loading more
                      if (bufferedEnd - currentTime < 5 && video.networkState === HTMLMediaElement.NETWORK_IDLE) {
                        // Force a small seek to trigger more buffering
                        const targetTime = Math.min(currentTime + 0.1, video.duration - 0.1);
                        if (targetTime > currentTime) {
                          video.currentTime = targetTime;
                        }
                      }
                    }
                  }
                }}
                onTimeUpdate={(e) => {
                  // CRITICAL: Monitor playback state and detect unexpected stops (especially after 45-60s)
                  const video = e.target as HTMLVideoElement;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  
                  if (activeIndex === index && !video.ended) {
                    // Check if video is paused but should be playing
                    if (video.paused && video.readyState >= 2) {
                      const now = Date.now();
                      const lastAttempt = lastPlayAttempt.current.get(index) || 0;
                      // Only try to resume if we haven't tried recently (avoid spam)
                      if (now - lastAttempt > 2000) {
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`[Reels] Video ${index} paused during playback at ${video.currentTime.toFixed(2)}s, resuming...`);
                        }
                        lastPlayAttempt.current.set(index, now);
                        video.play().catch((err: unknown) => {
                          if (process.env.NODE_ENV === 'development') {
                            console.warn(`[Reels] Failed to resume video ${index} in onTimeUpdate:`, err);
                          }
                          // If play fails after 30+ seconds, try URL refresh (common issue at 45-60s)
                          if (video.currentTime > 30 && (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || 
                              video.networkState === HTMLMediaElement.NETWORK_IDLE)) {
                            refreshVideoUrl(post, index).then((freshUrl) => {
                              if (freshUrl && video.src !== freshUrl) {
                                const currentTime = video.currentTime;
                                video.src = freshUrl;
                                video.currentTime = Math.max(0, currentTime - 2);
                                video.load();
                                video.play().catch(() => {});
                              }
                            });
                          }
                        });
                      }
                    }
                    
                    // CRITICAL: Disable stuck detection/URL swapping.
                    // It can incorrectly trigger and reset the source (causing stops around ~40s)
                    // even when the underlying MP4 is valid and range requests are supported.
                    if (false && !isMobile && !video.paused && !video.seeking && video.currentTime > 10 && 
                        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                      const lastTimeKey = `lastTime_${index}`;
                      const lastTimeUpdateKey = `lastTimeUpdate_${index}`;
                      const stuckCheckKey = `stuckCheck_${index}`;
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
                        
                        // Only intervene if: no buffer AND network is not loading (truly stuck)
                        if (!hasBuffer && (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || 
                                           video.networkState === HTMLMediaElement.NETWORK_IDLE)) {
                          if (process.env.NODE_ENV === 'development') {
                            console.warn(`[Reels] Video ${index} truly stuck at ${video.currentTime.toFixed(2)}s (no buffer, network: ${video.networkState}), trying recovery...`);
                          }
                          ((window as unknown) as Record<string, number>)[stuckCheckKey] = Date.now();
                          
                          // First, just try to play (gentle recovery)
                          video.play().catch(() => {});
                          
                          // Only refresh URL if still stuck after 5 more seconds
                          setTimeout(() => {
                            if (Math.abs(video.currentTime - lastTime) < 0.1 && 
                                !video.paused && 
                                activeIndex === index &&
                                !video.seeking) {
                              if (process.env.NODE_ENV === 'development') {
                                console.warn(`[Reels] Video ${index} still stuck after 5s, refreshing URL...`);
                              }
                              refreshVideoUrl(post, index).then((freshUrl) => {
                                if (freshUrl && video.src !== freshUrl) {
                                  video.src = freshUrl;
                                  video.currentTime = Math.max(0, lastTime - 2);
                                  video.load();
                                  video.play().catch(() => {});
                                }
                              });
                            }
                          }, 5000);
                        }
                      }
                      ((window as unknown) as Record<string, number>)[lastTimeKey] = video.currentTime;
                      ((window as unknown) as Record<string, number>)[lastTimeUpdateKey] = Date.now();
                    }
                  }
                }}
                data-videoid={post.id}
                data-post-id={post.id}
                onWaiting={(e) => {
                  // Video is buffering - resume when ready, but also check for URL expiration
                  const video = e.target as HTMLVideoElement;
                  if (activeIndex === index) {
                    // One-time blob fallback for browsers that stop progressing around ~59s.
                    // Only attempt when we have essentially no forward buffer.
                    try {
                      const buffered = video.buffered;
                      const bufferedEnd = buffered.length ? buffered.end(buffered.length - 1) : 0;
                      const bufferAhead = bufferedEnd - video.currentTime;
                      if (video.currentTime > 40 && video.currentTime < 90 && bufferAhead < 0.5) {
                        tryBlobFallback(video, index);
                      }
                    } catch {}

                    // CRITICAL: Do NOT refresh/swap URLs on waiting.
                    // This can interrupt playback around ~40s on some devices with no console error.
                    const waitingTimeout = setTimeout(() => {}, 15000);
                    
                    const resumeHandler = () => {
                      clearTimeout(waitingTimeout);
                      if (video.paused && !video.ended && activeIndex === index) {
                        video.play().catch(() => {});
                      }
                    };
                    video.addEventListener('canplay', resumeHandler, { once: true });
                    video.addEventListener('canplaythrough', resumeHandler, { once: true });
                  }
                }}
                onStalled={(e) => {
                  // Video stalled - try to resume when data is available, or refresh URL
                  const video = e.target as HTMLVideoElement;
                  if (activeIndex === index) {
                    // CRITICAL: Do NOT refresh/swap URLs on stalled.
                    const stalledTimeout = setTimeout(() => {}, 10000);
                    
                    const resumeHandler = () => {
                      clearTimeout(stalledTimeout);
                      if (video.paused && !video.ended && activeIndex === index) {
                        video.play().catch(() => {});
                      }
                    };
                    video.addEventListener('canplay', resumeHandler, { once: true });
                    video.addEventListener('canplaythrough', resumeHandler, { once: true });
                  }
                }}
                onCanPlay={(e) => {
                  // Video can play - resume if it should be playing
                  const video = e.target as HTMLVideoElement;
                  if (video.paused && !video.ended && activeIndex === index) {
                    video.play().catch(() => {});
                  }
                }}
                onCanPlayThrough={(e) => {
                  // Video has enough data to play through - ensure it's playing
                  const video = e.target as HTMLVideoElement;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (video.paused && !video.ended && activeIndex === index) {
                    if (isMobile) {
                      setTimeout(() => {
                        if (video.paused && activeIndex === index) {
                          video.play().catch((err: unknown) => {
                            if (process.env.NODE_ENV === 'development' && err instanceof Error) {
                              console.warn(`[Reels] Mobile play after canplaythrough failed for video ${index}:`, err.name);
                            }
                          });
                        }
                      }, 100);
                    } else {
                      video.play().catch(() => {});
                    }
                  }
                }}
                onError={async (e) => {
                  const video = e.target as HTMLVideoElement;
                  const error = video.error;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (process.env.NODE_ENV === 'development') {
                    console.error(`[Reels] Video playback error for video ${index}:`, {
                      code: error?.code,
                      message: error?.message,
                      networkState: video.networkState,
                      readyState: video.readyState,
                      src: (post.mediaUrl || post.videoUrl)?.substring(0, 100),
                      isMobile,
                    });
                  }
                  
                  // CRITICAL FIX: Refresh URL on any error - signed URLs may have expired
                  if (error && activeIndex === index) {
                    const currentTime = video.currentTime;
                    const freshUrl = await refreshVideoUrl(post, index);
                    
                    if (freshUrl) {
                      // URL refreshed - reload video from current position
                      setTimeout(() => {
                        if (video && video.src !== freshUrl) {
                          video.src = freshUrl;
                          video.currentTime = Math.max(0, currentTime - 2); // Start 2s before error
                          video.load();
                          video.play().catch(() => {});
                          if (process.env.NODE_ENV === 'development') {
                            console.log(`[Reels] Reloaded video ${index} with fresh URL from position ${currentTime}`);
                          }
                        }
                      }, 500);
                      return;
                    }
                  }
                  
                  // Try to recover from error
                  if (error && activeIndex === index) {
                    if (error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
                      if (process.env.NODE_ENV === 'development') {
                        console.warn(`[Reels] Video format not supported for video ${index}, trying reload`);
                      }
                      setTimeout(() => {
                        if (video && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                          video.load();
                        }
                      }, 1000);
                    } else if (error.code === 2) { // MEDIA_ERR_NETWORK
                      if (process.env.NODE_ENV === 'development') {
                        console.warn(`[Reels] Network error for video ${index}, retrying...`);
                      }
                      // Try URL refresh first, then reload
                      const freshUrl = await refreshVideoUrl(post, index);
                      setTimeout(() => {
                        if (video) {
                          if (freshUrl && video.src !== freshUrl) {
                            video.src = freshUrl;
                          }
                          video.load();
                          video.play().catch(() => {});
                        }
                      }, 2000);
                    } else if (error.code === 3) { // MEDIA_ERR_DECODE
                      if (process.env.NODE_ENV === 'development') {
                        console.warn(`[Reels] Decode error for video ${index}, trying reload`);
                      }
                      setTimeout(() => {
                        if (video) {
                          video.load();
                        }
                      }, 1000);
                    } else if (error.code === 1) { // MEDIA_ERR_ABORTED
                      // Aborted usually means URL changed or network issue - try refresh
                      const freshUrl = await refreshVideoUrl(post, index);
                      if (freshUrl && video.src !== freshUrl) {
                        video.src = freshUrl;
                        video.load();
                        video.play().catch(() => {});
                      }
                    }
                  }
                }}
                onPlay={() => {
                  // No-op: avoid aggressive monitoring loops ("play spam") which can cause crackles/stalls.
                  setShowResumeButton(null);
                }}
                onPause={() => {
                  // If the active reel pauses unexpectedly, show the resume UI (user gesture fixes many browsers).
                  if (activeIndex === index) {
                    setShowResumeButton(index);
                  }
                }}
              />
              )}
              
              {/* Resume Button - shown when video is paused unexpectedly */}
              {showResumeButton === index && (
                <ResumeButton
                  videoElement={videoRefs.current[index] || null}
                  isVisible={showResumeButton === index}
                  onResume={() => {
                    setShowResumeButton(null);
                  }}
                />
              )}
              
              {/* Video Diagnostics - only for active video */}
              {activeIndex === index && showDiagnostics && (
                <VideoDiagnostics
                  videoElement={videoRefs.current[index] || null}
                  videoId={post.id}
                  videoUrl={post.hlsUrl || post.mediaUrl || post.videoUrl || ''}
                  isActive={activeIndex === index}
                />
              )}

              {floatingFlowers.map((f) => (
                <div
                  key={f.id}
                  className="absolute pointer-events-none"
                  style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `rotate(${f.rotation}deg)` }}
                >
                  <FlowerIcon size="md" className="text-pink-400 animate-flower-pop" />
                </div>
              ))}

              {showPlayPause?.id === post.id && showPlayPause && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 dark:bg-white/30 p-4 rounded-full">
                    {showPlayPause.state === 'play' ? <Play className="w-12 h-12 text-white dark:text-black" /> : <Pause className="w-12 h-12 text-white dark:text-black" />}
                  </div>
                </div>
              )}

              {/* Action Buttons - Right Side */}
              <div className="absolute bottom-4 right-2 md:right-4 flex flex-col items-center gap-2 md:gap-3 text-white dark:text-gray-200 pointer-events-auto z-50 max-w-[60px] md:max-w-none">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleLike(post); 
                  }} 
                  className="flex flex-col items-center gap-0.5 md:gap-1 hover:scale-110 transition-transform active:scale-95 w-full"
                >
                  <FlowerIcon size="lg" isLiked={post.likedByUser} className="drop-shadow-lg w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-[10px] md:text-xs drop-shadow-md font-bold leading-tight">{post.likes}</span>
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const postId = post?.id;
                    const sourceCollection = post?.sourceCollection;
                    if (process.env.NODE_ENV === 'development') {
                      console.log('Reels: Comment button clicked', { 
                        postId, 
                        sourceCollection,
                        post: post,
                        allVideosLength: allVideos.length
                      });
                    }
                    
                    if (!postId) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Reels: Cannot open comments - post.id is missing', post);
                      }
                      toast({ 
                        variant: 'destructive', 
                        title: 'Error', 
                        description: 'Unable to open comments. Post ID is missing.' 
                      });
                      return;
                    }
                    
                    if (!sourceCollection) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Reels: Cannot open comments - sourceCollection is missing', post);
                      }
                      toast({ 
                        variant: 'destructive', 
                        title: 'Error', 
                        description: 'Unable to open comments. Source collection is missing.' 
                      });
                      return;
                    }
                    
                    setCommentSheetOpen(postId);
                    if (process.env.NODE_ENV === 'development') {
                      console.log('Reels: Set commentSheetOpen to', postId);
                    }
                  }}
                  className="flex flex-col items-center gap-0.5 md:gap-1 hover:scale-110 transition-transform active:scale-95 w-full"
                >
                  <MessageCircle className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg" />
                  <span className="text-[10px] md:text-xs drop-shadow-md font-bold leading-tight">{post.commentsCount || 0}</span>
                </button>

                <button 
                  className="flex flex-col items-center gap-0.5 md:gap-1 hover:scale-110 transition-transform active:scale-95 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Share functionality
                    const shareUrl = window.location.href;
                    if (navigator.share) {
                      navigator.share({
                        title: post.caption || 'Check out this reel',
                        text: post.caption || '',
                        url: shareUrl,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareUrl).catch(() => {});
                    }
                  }}
                >
                  <Share2 className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg" />
                  <span className="text-[9px] md:text-[10px] drop-shadow-md font-semibold leading-tight">Share</span>
                </button>

                {/* Download Button */}
                <button 
                  className="flex flex-col items-center gap-0.5 md:gap-1 hover:scale-110 transition-transform active:scale-95 w-full"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const videoUrl = post.mediaUrl || post.videoUrl;
                      if (!videoUrl) {
                        toast({ variant: 'destructive', title: 'Video URL not available' });
                        return;
                      }
                      
                      // Create a temporary link and trigger download
                      const link = document.createElement('a');
                      link.href = videoUrl;
                      link.download = `reel-${post.id}.mp4`;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      toast({ title: 'Download started', description: 'Video download has started.' });
                    } catch (error: unknown) {
                      if (process.env.NODE_ENV === 'development') {
                        console.error('Download error:', error);
                      }
                      toast({
                        variant: 'destructive',
                        title: 'Download failed',
                        description: error instanceof Error ? error.message : 'Download failed',
                      });
                    }
                  }}
                >
                  <Download className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg" />
                  <span className="text-[9px] md:text-[10px] drop-shadow-md font-semibold leading-tight">Save</span>
                </button>

                {/* Edit/Delete Button - Only show if user is the author */}
                {user && post.userId === user.uid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        className="flex flex-col items-center gap-0.5 md:gap-1 hover:scale-110 transition-transform active:scale-95 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-6 h-6 md:w-8 md:h-8 drop-shadow-lg" />
                        <span className="text-[9px] md:text-[10px] drop-shadow-md font-semibold leading-tight">More</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(post); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setShowDeleteDialog(post.id); 
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Network Quality Indicator - Top Left (only on poor network) */}
              {networkInfo.quality === 'poor' && activeIndex === index && (
                <div className="absolute top-4 left-4 z-30 bg-yellow-500/80 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Poor Network - Buffering may occur
                </div>
              )}
              
              {/* PiP Button - Top Right (desktop only) */}
              {activeIndex === index && typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPipVideoIndex(index);
                    setShowPiP(true);
                  }}
                  className="absolute top-4 right-28 z-40 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full shadow-2xl border border-white/20 transition-all hover:scale-110"
                  aria-label="Open Picture-in-Picture"
                  title="Picture-in-Picture (PiP)"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              )}
              
              {/* Diagnostics Toggle Button - Top Right (desktop only) */}
              {activeIndex === index && typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDiagnostics(!showDiagnostics);
                  }}
                  className="absolute top-4 right-16 z-40 bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full shadow-2xl border border-white/20 transition-all hover:scale-110"
                  aria-label="Toggle diagnostics"
                  title="Video Diagnostics"
                >
                  <Info className="w-5 h-5" />
                </button>
              )}
              
              {/* Mute Button - Top Right */}
              <button 
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 md:p-3 text-white dark:text-gray-200 z-20 transition-all pointer-events-auto" 
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted(!muted);
                }}
              >
                {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
              </button>

              {/* Caption - Bottom Left (buttons are now on right) */}
              {post.caption && (
                <div className="absolute bottom-4 left-4 right-16 md:right-20 text-white dark:text-gray-100 text-sm md:text-base drop-shadow-lg z-10 pointer-events-none">
                  <p className="line-clamp-2 break-words">{post.caption}</p>
                </div>
              )}
            </div>
          ))}
          
          {/* Custom Picture-in-Picture Window */}
          {showPiP && pipVideoIndex !== null && allVideos[pipVideoIndex] && (
            <CustomPictureInPicture
              videoElement={videoRefs.current[pipVideoIndex] || null}
              videoUrl={allVideos[pipVideoIndex].hlsUrl || allVideos[pipVideoIndex].mediaUrl || allVideos[pipVideoIndex].videoUrl || ''}
              isOpen={showPiP}
              onClose={() => {
                setShowPiP(false);
                setPipVideoIndex(null);
              }}
              caption={allVideos[pipVideoIndex].caption}
            />
          )}
          
          {/* Comments Sheet - Single Sheet for all posts */}
          {(() => {
            const selectedPost = allVideos.find(p => p.id === commentSheetOpen);
            
            if (!selectedPost) {
              return null;
            }
            
            const contentType = selectedPost.sourceCollection === 'posts' ? 'post' : 'media';
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Reels: Rendering comment sheet for post', { 
                contentId: selectedPost.id, 
                contentType, 
                sourceCollection: selectedPost.sourceCollection,
                commentSheetOpen,
                allVideosCount: allVideos.length
              });
            }
            
            return (
              <Sheet 
                open={!!commentSheetOpen} 
                onOpenChange={(open) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Reels: Comment sheet onOpenChange', { 
                      open, 
                      currentSheetOpen: commentSheetOpen,
                      selectedPostId: selectedPost.id
                    });
                  }
                  if (!open) {
                    setCommentSheetOpen(null);
                  }
                }}
              >
                <SheetContent side="bottom" className="h-[85vh] flex flex-col rounded-t-lg z-[100]">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Comments ({selectedPost.commentsCount || 0})</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedPost.id && selectedPost.sourceCollection ? (
                      <Comments 
                        key={`comments-${selectedPost.id}-${selectedPost.sourceCollection}`}
                        contentId={selectedPost.id} 
                        contentType={contentType} 
                      />
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">Unable to load comments. Missing post information.</p>
                        <p className="text-xs mt-2">Post ID: {selectedPost.id || 'missing'}</p>
                        <p className="text-xs">Source: {selectedPost.sourceCollection || 'missing'}</p>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            );
          })()}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground dark:text-gray-100 text-lg">No reels yet...</p>
            <p className="text-muted-foreground mt-2">Upload videos to see them here</p>
          </div>
        </div>
      )}

      <BottomNavigation 
        activeTab="reels" 
        setActiveTab={(tab) => {
          if (tab === 'home') {
            router.push('/feed');
          } else if (tab === 'create') {
            router.push('/upload');
          } else if (tab === 'profile') {
            router.push(user ? `/profile/${user.uid}` : '/login');
          }
          // 'reels' tab is already active, no navigation needed
        }} 
      />

      {/* Delete Dialog */}
      {showDeleteDialog && (() => {
        const post = allVideos.find(v => v.id === showDeleteDialog);
        if (!post) return null;
        return (
          <AlertDialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Content</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this {post.sourceCollection === 'media' ? 'video' : 'post'}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDelete(showDeleteDialog, post.sourceCollection)}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

      {/* Edit Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={(open) => !open && setShowEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Update the description for your {showEditDialog ? (allVideos.find(v => v.id === showEditDialog.postId)?.sourceCollection === 'media' ? 'video' : 'post') : 'content'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter description..."
              rows={6}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(null)}
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

function BottomNavigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: 'home' | 'reels' | 'create' | 'profile') => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 z-50">
      <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center ${activeTab === 'home' ? 'text-primary' : 'text-foreground dark:text-gray-100'}`}><Home className="w-6 h-6" /></button>
      <button onClick={() => setActiveTab('reels')} className={`flex flex-col items-center justify-center ${activeTab === 'reels' ? 'text-primary' : 'text-foreground dark:text-gray-100'}`}><Video className="w-6 h-6" /></button>
      <button onClick={() => setActiveTab('create')} className={`flex flex-col items-center justify-center ${activeTab === 'create' ? 'text-primary' : 'text-foreground dark:text-gray-100'}`}><PlusCircle className="w-6 h-6" /></button>
      <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center ${activeTab === 'profile' ? 'text-primary' : 'text-foreground dark:text-gray-100'}`}><User className="w-6 h-6" /></button>
    </div>
  );
}
