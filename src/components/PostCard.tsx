
'use client';

import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/lib/firebase/provider';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle, ThumbsUp, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTransition, useState, useMemo, useEffect, useRef } from 'react';
import { doc, writeBatch, increment, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Comments } from '@/components/comments';
import { ClientOnlyTime } from '@/components/ClientOnlyTime';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { getVideoMimeType, refreshVideoUrl } from '@/lib/firebase/storage-urls';
import { getFirebaseClient } from '@/lib/firebase/client';
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


const AuthorAvatar = ({ userId }: { userId: string }) => {
  const db = useFirestore();
  const authorRef = userId ? doc(db, 'users', userId) : undefined;
  const [author, loading] = useDocumentData(authorRef);

  if (loading || !author) {
    return (
        <Link href={`/profile/${userId}`} className="w-10 h-10 shrink-0">
            <Skeleton className="h-10 w-10 rounded-full" />
        </Link>
    );
  }

  return (
     <Link href={`/profile/${userId}`} className="w-10 h-10 shrink-0">
        <Avatar>
            <AvatarImage src={author.photoURL} />
            <AvatarFallback>{author.displayName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
     </Link>
  )
}

export function PostCard({ post }: { post: DocumentData; }) {
  // Early return if post or post.id is invalid
  if (!post || !post.id || typeof post.id !== 'string') {
    return null;
  }

  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [user, authLoading] = useAuthState(auth);
  const [isLiking, startLikeTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [selectedSurveyOption, setSelectedSurveyOption] = useState<number | null>(null);
  const [selectedQuestionAnswer, setSelectedQuestionAnswer] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [validVideoUrl, setValidVideoUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRetryingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastUrlRef = useRef<string | null>(null);
  const refreshAttemptedRef = useRef(false);

  // Get fresh video URL using Firebase SDK
  useEffect(() => {
    if (post.videoUrl) {
      // Only update if URL actually changed to prevent unnecessary re-renders
      if (post.videoUrl !== validVideoUrl) {
        // Set fetching state to prevent video from loading prematurely
        setIsFetchingUrl(true);
        // Clear any existing valid URL while fetching
        setValidVideoUrl(null);
        
        // Get fresh URL using Firebase SDK
        (async () => {
          try {
            const { storage } = getFirebaseClient();
            const freshUrl = await refreshVideoUrl(post.videoUrl, storage);
            if (freshUrl) {
              console.log('PostCard: Got fresh URL from Firebase SDK');
              setValidVideoUrl(freshUrl);
              setIsFetchingUrl(false);
              isLoadingRef.current = false;
              lastUrlRef.current = null;
              refreshAttemptedRef.current = false;
              isRetryingRef.current = false;
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
              }
            } else {
              // Fallback to original URL if refresh fails
              console.warn('PostCard: Refresh returned null, using original URL');
              setValidVideoUrl(post.videoUrl);
              setIsFetchingUrl(false);
              isLoadingRef.current = false;
              lastUrlRef.current = null;
              refreshAttemptedRef.current = false;
              isRetryingRef.current = false;
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
              }
            }
          } catch (error) {
            console.warn('PostCard: Could not get fresh URL, using original URL:', error);
            // Fallback to original URL if refresh fails
            setValidVideoUrl(post.videoUrl);
            setIsFetchingUrl(false);
            isLoadingRef.current = false;
            lastUrlRef.current = null;
            refreshAttemptedRef.current = false;
            isRetryingRef.current = false;
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
          }
        })();
      }
    } else {
      // No video URL - clear any existing valid URL
      if (validVideoUrl !== null) {
        setValidVideoUrl(null);
        isLoadingRef.current = false;
        lastUrlRef.current = null;
        refreshAttemptedRef.current = false;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [post.videoUrl]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const authorId = post.authorId;
  const authorRef = useMemo(() => authorId && db ? doc(db, 'users', authorId) : undefined, [db, authorId]);
  const [author, authorIsLoading] = useDocumentData(authorRef);
  
  // Double-check postId is a string before using string methods
  const postId = typeof post.id === 'string' ? post.id : '';
  if (!postId) {
    return null; // If postId is not a valid string, don't render
  }
  const isOptimistic = post.__optimistic === true;

  const postRef = useMemo(() => {
    if (!postId || !db || isOptimistic) return undefined;
    return doc(db, 'posts', postId);
  }, [db, postId, isOptimistic]);

  const likeRef = useMemo(() => {
    if (!user || !postId || !db || isOptimistic) return undefined;
    return doc(db, `posts/${postId}/likes/${user.uid}`);
  }, [db, postId, user, isOptimistic]);
  const [likeDoc, likeLoading] = useDocumentData(likeRef);
  
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setIsLiked(!!likeDoc);
  }, [likeDoc]);

  // Check if user has already voted in survey
  const userVote = useMemo(() => {
    if (!user || !post.surveyResponses) return null;
    const userResponse = post.surveyResponses[user.uid];
    if (Array.isArray(userResponse)) {
      return userResponse[0] || null;
    }
    return userResponse || null;
  }, [user, post.surveyResponses]);

  // Check if user has already answered the question
  const userQuestionAnswer = useMemo(() => {
    if (!user || !post.questionResponses) return null;
    return post.questionResponses[user.uid] ?? null;
  }, [user, post.questionResponses]);

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

  // Handle survey vote
  const handleSurveyVote = async (optionIndex: number) => {
    if (!user || !db || isVoting || !postId || isOptimistic) return;
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

  // Handle question answer
  const handleQuestionAnswer = async (optionIndex: number) => {
    if (!user || !db || isAnswering || !postId || isOptimistic) return;
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


  // Check if current user is the author
  const isAuthor = useMemo(() => {
    return user && post.authorId === user.uid;
  }, [user, post.authorId]);

  // Handle delete post
  const handleDelete = async () => {
    if (!postRef || !user || isDeleting || isOptimistic) return;
    
    setIsDeleting(true);
    try {
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
    setEditContent(post.content || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!postRef || !user || isEditing || isOptimistic) return;
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

  const handleLike = () => {
    if (authLoading) {
      toast({ variant: "destructive", title: "Loading your account… please try again." });
      return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "Please log in to like posts." });
      return;
    }
    if (!postRef || !likeRef || isOptimistic) {
      toast({ variant: "destructive", title: "Please wait until the post is published before liking." });
      return;
    }
    startLikeTransition(() => {
        const batch = writeBatch(db);
        const likeData = { createdAt: serverTimestamp() };

        if (isLiked) {
            batch.delete(likeRef);
            batch.update(postRef, { likes: increment(-1) });
        } else {
            batch.set(likeRef, likeData);
            batch.update(postRef, { likes: increment(1) });
        }
        
        batch.commit().catch(async (serverError: unknown) => {
            const operation = isLiked ? 'delete' : 'create';
            const permissionError = new FirestorePermissionError({
                path: likeRef.path,
                operation: operation,
                requestResourceData: operation === 'create' ? likeData : undefined,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    });
  };
  
  if (!post.id) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
          </div>
        </CardHeader>
        <CardContent>
           <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const createdAtDate = post.createdAt?.toDate ? post.createdAt.toDate() : undefined;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        {authorIsLoading ? <Skeleton className="h-10 w-10 rounded-full" /> : (
            <Link href={`/profile/${post.authorId}`}>
              <Avatar>
                <AvatarImage src={author?.photoURL} />
                <AvatarFallback>{author?.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </Link>
        )}
        <div className="w-full">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${post.authorId}`} className="group">
              <p className="font-semibold group-hover:text-primary">{author?.displayName || 'Anonymous'}</p>
            </Link>
            <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              <ClientOnlyTime date={createdAtDate} />
            </p>
              {isAuthor && !isOptimistic && (
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
        {/* Video support */}
        {post.videoUrl && (
          <div className="mt-4 aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20 bg-black">
            {post.videoUrl.includes('youtube.com') || post.videoUrl.includes('youtu.be') ? (
              <iframe
                src={post.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : post.videoUrl.includes('vimeo.com') ? (
              <iframe
                src={post.videoUrl.replace('/videos/', '/video/')}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : isFetchingUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-black/10">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : validVideoUrl ? (
              <video
                ref={videoRef}
                src={validVideoUrl}
                controls
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
                disablePictureInPicture={false}
                disableRemotePlayback={false}
                onLoadStart={(e) => {
                  const target = e.target as HTMLVideoElement;
                  if (lastUrlRef.current !== target.src) {
                    isLoadingRef.current = true;
                    lastUrlRef.current = target.src;
                    console.log('PostCard: Video load started:', {
                      src: target.src.substring(0, 100),
                      networkState: target.networkState
                    });
                  }
                }}
                onError={(e) => {
                  console.error('PostCard Video playback error:', e);
                  isLoadingRef.current = false;
                  // Error can come from either <source> or <video> element
                  const target = e.target as HTMLVideoElement | HTMLSourceElement;
                  const videoElement = target instanceof HTMLVideoElement ? target : (videoRef.current || null);
                  const currentSrc = validVideoUrl || post.videoUrl || '';
                  
                  // Wait a bit for video element to update its error state
                  setTimeout(() => {
                    if (!videoElement) return;
                    
                    const errorCode = videoElement.error?.code;
                    const errorMessage = videoElement.error?.message;
                    
                    console.error('Error details:', {
                      error: videoElement.error,
                      errorCode,
                      errorMessage,
                      networkState: videoElement.networkState,
                      readyState: videoElement.readyState,
                      src: videoElement.src || videoElement.currentSrc,
                      expectedSrc: currentSrc,
                      srcMatches: (videoElement.src || videoElement.currentSrc) === currentSrc,
                      sourceError: target instanceof HTMLSourceElement,
                      isLoading: isLoadingRef.current
                    });
                    
                    // If we get error code 4, the token might be expired
                    // In this case, we should try to fetch a fresh URL from Firebase Storage
                    if (errorCode === 4 && !refreshAttemptedRef.current) {
                      console.warn('PostCard: Error code 4 with valid URL format - token may be expired. Attempting to refresh URL...');
                      refreshAttemptedRef.current = true;
                      
                      // Try to fetch a fresh URL (async IIFE since onError callback is not async)
                      (async () => {
                        try {
                          const { storage } = getFirebaseClient();
                          const freshUrl = await refreshVideoUrl(currentSrc, storage);
                          if (freshUrl && freshUrl !== currentSrc) {
                            console.log('PostCard: Successfully refreshed download URL, updating video source');
                            setValidVideoUrl(freshUrl);
                            isLoadingRef.current = false;
                            lastUrlRef.current = null;
                            // Don't call load() - React will handle src change naturally
                            // videoRef.current.load() causes video to reset and stop playback
                          } else {
                            console.warn('PostCard: Could not refresh URL or URL unchanged');
                          }
                        } catch (refreshError) {
                          console.error('PostCard: Error refreshing download URL:', refreshError);
                        }
                      })();
                      return; // Don't proceed with other error handling while refresh is in progress
                    }
                    
                    // Don't retry on source errors - they're usually not fixable by retrying
                    // Source errors often indicate format/URL issues that won't be resolved
                    if (!errorCode && videoElement.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                      console.warn('PostCard: Source failed to load (NETWORK_NO_SOURCE). This usually indicates a URL or format issue that cannot be fixed by retrying.');
                      return;
                    }
                    
                    // Don't retry on certain errors that won't be fixed by retrying
                    // MEDIA_ERR_SRC_NOT_SUPPORTED (4) - format not supported or URL invalid (after refresh attempt)
                    // MEDIA_ERR_ABORTED (1) - user aborted
                    if (errorCode === 4 || errorCode === 1) {
                      if (errorCode === 4 && refreshAttemptedRef.current) {
                        console.error('PostCard: Video error persists after URL refresh attempt', { errorCode, errorMessage });
                      } else {
                        console.error('PostCard: Video error cannot be fixed by retry', { errorCode, errorMessage });
                      }
                      return;
                    }
                    
                    // Only retry on network errors (MEDIA_ERR_NETWORK = 2)
                    if (videoElement.error && errorCode === 2) {
                      // Check if we're already retrying
                      if (isRetryingRef.current) {
                        console.warn('PostCard: Already retrying network error, skipping');
                        return;
                      }
                      
                      const retryCount = (videoElement as any).__retryCount || 0;
                      if (retryCount < 1) { // Only 1 retry for network errors
                        isRetryingRef.current = true;
                        (videoElement as any).__retryCount = retryCount + 1;
                        
                        // Clear any existing timeout
                        if (retryTimeoutRef.current) {
                          clearTimeout(retryTimeoutRef.current);
                        }
                        
                        retryTimeoutRef.current = setTimeout(() => {
                          isRetryingRef.current = false;
                          // Don't call load() - it resets the video
                          // Browser will retry automatically when network recovers
                          console.log(`PostCard: Network error detected, browser will retry automatically`);
                        }, 5000); // Single retry after 5 seconds
                      } else {
                        console.error('PostCard: Max retries reached, giving up');
                      }
                    }
                  }, 100);
                }}
                onLoadedMetadata={(e) => {
                  const target = e.target as HTMLVideoElement;
                  isLoadingRef.current = false;
                  const currentSrc = validVideoUrl || post.videoUrl || '';
                  console.log('PostCard Video metadata loaded:', {
                    duration: target.duration,
                    videoWidth: target.videoWidth,
                    videoHeight: target.videoHeight,
                    src: target.src.substring(0, 100)
                  });
                }}
                onCanPlay={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.log('PostCard Video can play, duration:', target.duration);
                }}
                onWaiting={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.warn('PostCard Video waiting for data, buffering...', {
                    currentTime: target.currentTime,
                    buffered: target.buffered.length > 0 ? target.buffered.end(target.buffered.length - 1) : 0,
                    networkState: target.networkState
                  });
                }}
                onStalled={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.warn('PostCard Video stalled!', {
                    currentTime: target.currentTime,
                    buffered: target.buffered.length > 0 ? target.buffered.end(target.buffered.length - 1) : 0,
                    networkState: target.networkState,
                    readyState: target.readyState,
                    src: target.src.substring(0, 100)
                  });
                  // Don't call load() - it resets the video. Instead, wait for more data to buffer
                  // The browser will automatically resume when data is available
                  // Only intervene if the video is truly stuck
                  if (!target.ended && videoRef.current && target.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                  // Don't call load() - it resets the video
                  // Just wait for browser to buffer more data
                  console.log('PostCard: Video stalled, waiting for browser to buffer more data');
                  videoRef.current.addEventListener('canplay', () => {
                    if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
                      videoRef.current.play().catch(() => {});
                    }
                  }, { once: true });
                  }
                }}
                onSeeking={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.log('PostCard Video seeking to:', target.currentTime);
                }}
                onSeeked={(e) => {
                  const target = e.target as HTMLVideoElement;
                  console.log('PostCard Video seeked to:', target.currentTime);
                }}
                onProgress={(e) => {
                  const target = e.target as HTMLVideoElement;
                  if (target.buffered.length > 0) {
                    const bufferedEnd = target.buffered.end(target.buffered.length - 1);
                    const duration = target.duration;
                    if (duration > 0) {
                      const bufferedPercent = (bufferedEnd / duration) * 100;
                      // Only log every 10% to reduce console spam
                      const rounded = Math.floor(bufferedPercent / 10) * 10;
                      if (rounded !== (target as any).__lastLoggedPercent) {
                        (target as any).__lastLoggedPercent = rounded;
                        console.log(`PostCard Video buffered: ${bufferedPercent.toFixed(1)}% (${bufferedEnd.toFixed(1)}s / ${duration.toFixed(1)}s)`);
                      }
                    }
                  }
                }}
                onTimeUpdate={(e) => {
                  const target = e.target as HTMLVideoElement;
                  // Log if video stops unexpectedly
                  if (target.paused && !target.ended && target.currentTime > 0 && target.currentTime < target.duration - 1) {
                    const timeSinceLastUpdate = Date.now() - ((target as any).__lastTimeUpdate || 0);
                    if (timeSinceLastUpdate > 2000) {
                      console.warn('PostCard Video appears to have stopped unexpectedly', {
                        currentTime: target.currentTime,
                        duration: target.duration,
                        paused: target.paused,
                        ended: target.ended,
                        networkState: target.networkState,
                        readyState: target.readyState
                      });
                    }
                    (target as any).__lastTimeUpdate = Date.now();
                  } else {
                    (target as any).__lastTimeUpdate = Date.now();
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
              ) : (
                <div className="w-full aspect-video bg-black flex items-center justify-center text-white">
                  <p>Loading video...</p>
                </div>
              )}
          </div>
        )}
        {/* Image support (only if no video) */}
        {post.imageUrl && !post.videoUrl && (
          <div className="mt-4 aspect-video relative rounded-lg overflow-hidden border-2 border-accent/20">
            <Image
              src={post.imageUrl}
              alt={post.content?.substring(0, 50) || 'Post image'}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        {/* Survey Options */}
        {post.postType === 'survey' && post.surveyOptions && post.surveyOptions.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-sm md:text-base mb-3">Survey Options</h4>
            {post.surveyOptions.map((option: string, index: number) => {
              const voteCount = surveyVoteCounts[index] || 0;
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isSelected = userVote === index.toString() || selectedSurveyOption === index;
              const hasVoted = userVote !== null;

              return (
                <div key={index} className="space-y-2">
                  <button
                    onClick={() => !hasVoted && handleSurveyVote(index)}
                    disabled={hasVoted || isVoting || !user || isOptimistic}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : hasVoted
                        ? 'border-muted bg-muted/30 cursor-default'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                    } ${!user || isOptimistic ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        {post.postType === 'question' && post.questionOptions && post.questionOptions.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-sm md:text-base mb-3">Select the correct answer</h4>
            {post.questionOptions.map((option: string, index: number) => {
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
                    disabled={hasAnswered || isAnswering || !user || isOptimistic}
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
                    } ${!user || isOptimistic ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      </CardContent>
      {isClient && (
        <CardFooter className="flex justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={authLoading || !user || isOptimistic || isLiking || likeLoading}
            title={
              isOptimistic
                ? 'Please wait until this post finishes publishing.'
                : authLoading
                  ? 'Loading your account…'
                  : undefined
            }
          >
              <ThumbsUp className={`mr-2 h-4 w-4 ${isLiked ? 'text-blue-500 fill-current' : ''}`} /> 
              {isLiking || likeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : post.likes || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5"
            disabled={isOptimistic}
            title={isOptimistic ? 'Please wait until this post finishes publishing.' : undefined}
          >
              <MessageCircle className="mr-2 h-4 w-4" /> {post.commentsCount || 0} comments
          </Button>
        </CardFooter>
      )}
      {showComments && postId && !isOptimistic && (
        <CardContent>
            <Separator className="mb-4" />
            <Comments contentId={postId} contentType="post" />
        </CardContent>
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
    </Card>
  );
}
