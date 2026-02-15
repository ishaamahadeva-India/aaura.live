
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { FeedItem } from "@/types/feed";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuth, useFirestore } from "@/lib/firebase/provider";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs
} from "firebase/firestore";
import type { QuerySnapshot, DocumentChange } from "firebase/firestore";

export type FeedFilter = 'all' | 'posts' | 'videos' | 'temples' | 'stories' | 'deities';

const normalizeFeed = (feed?: FeedItem[]): FeedItem[] => {
  if (!Array.isArray(feed)) return [];
  return feed.filter((item: FeedItem | undefined | null): item is FeedItem => !!item);
};

const mapPostDocToFeedItem = (docSnap: any): FeedItem => {
  const data = docSnap.data();
  return {
    id: `post-${docSnap.id}`,
    kind: "post",
    title: undefined,
    description: { en: data?.content || '' },
    // CRITICAL: Never use videoUrl for thumbnail - next/image doesn't support videos
    // Only use actual image URLs (thumbnail, imageUrl) - never video URLs
    thumbnail: data?.thumbnail || data?.imageUrl || undefined,
    mediaUrl: data?.videoUrl || undefined,
    hlsUrl: data?.hlsUrl || undefined, // HLS URL for adaptive streaming
    createdAt: data?.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    meta: {
      authorId: data?.authorId,
      likes: data?.likes || 0,
      commentsCount: data?.commentsCount || 0,
      contextId: data?.contextId,
      contextType: data?.contextType,
      postType: data?.postType || 'general',
      imageUrl: data?.imageUrl,
      videoUrl: data?.videoUrl,
      thumbnail: data?.thumbnail, // Include thumbnail in meta for reference
      // Include videoStoragePath if available (for new uploads)
      videoStoragePath: data?.videoStoragePath || undefined,
      hlsProcessed: data?.hlsProcessed || false,
      // Survey data
      surveyOptions: data?.surveyOptions || undefined,
      surveyResponses: data?.surveyResponses || undefined,
      // Question data
      questionOptions: data?.questionOptions || undefined,
      correctAnswer: data?.correctAnswer !== undefined ? data.correctAnswer : undefined,
      questionResponses: data?.questionResponses || undefined,
    },
  };
};

export function useFeed(pageSize: number = 20, filter: FeedFilter = 'all', trending: boolean = false) {
  // Initialize hooks in proper order - auth first, then firestore
  const auth = useAuth();
  const [user, authLoading] = useAuthState(auth);
  const db = useFirestore();
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [lastCursor, setLastCursor] = useState<string | undefined>();
  const loadingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const realTimeEnabledRef = useRef(false);
  // If we mutate the feed list while a video is playing, cards can temporarily lose visibility/active state
  // (IntersectionObserver flicker / re-render) and the <video> can pause around 40-60s with no console error.
  // To prevent this, queue updates while media is playing and flush once playback stops.
  const pendingRealtimeAddsRef = useRef<FeedItem[]>([]);
  const pendingRefreshRef = useRef<FeedItem[] | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const pendingRequestRef = useRef<Promise<any> | null>(null);

  const fetchFeed = useCallback(async (cursor?: string) => {
    if (loadingRef.current) {
      // If there's a pending request, wait for it
      if (pendingRequestRef.current) {
        return await pendingRequestRef.current;
      }
      return [];
    }

    // Create request key for deduplication
    const requestKey = `${user?.uid || 'anonymous'}-${pageSize}-${cursor || 'initial'}-${filter}-${trending}`;
    
    // Check if there's already a pending request for this exact query
    if (pendingRequestRef.current) {
      return await pendingRequestRef.current;
    }

    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
    });

    if (user?.uid) {
      params.set("userId", user.uid);
    }

    if (cursor) {
      params.set("lastCursor", cursor);
    }

    if (filter !== 'all') {
      params.set("filter", filter);
    }

    if (trending) {
      params.set("trending", "true");
    }

    // Create the request promise and store it for deduplication
    const requestPromise = (async () => {
      try {
    const response = await fetch(`/api/feed?${params.toString()}`, {
      method: "GET",
          // Use cache for better performance during high-traffic periods
          cache: cursor ? "no-store" : "default",
          next: cursor ? undefined : { revalidate: 15 }, // Revalidate every 15 seconds for initial loads
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const data = await response.json();
    return { feed: data.feed ?? [], cursor: data.cursor };
      } finally {
        // Clear pending request after completion
        pendingRequestRef.current = null;
      }
    })();

    pendingRequestRef.current = requestPromise;
    return await requestPromise;
  }, [pageSize, user?.uid, filter, trending]);

  const fetchFirestoreFallback = useCallback(async () => {
    if (!db) return [];
    try {
      const snapshot = await getDocs(
        query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(pageSize))
      );
      return snapshot.docs.map(mapPostDocToFeedItem);
    } catch (error) {
      console.error("Fallback Firestore fetch failed:", error);
      return [];
    }
  }, [db, pageSize]);

  const isAnyMediaPlaying = () => {
    try {
      if (typeof document === 'undefined') return false;
      const media = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      return media.some((m) => !m.paused && !m.ended);
    } catch {
      return false;
    }
  };

  const shouldDeferFeedMutations = () => {
    try {
      return typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        isAnyMediaPlaying();
    } catch {
      return false;
    }
  };

  const flushPendingIfSafe = useCallback(() => {
    if (shouldDeferFeedMutations()) return;

    // Apply any pending refresh first (it represents the latest full feed state)
    const pendingRefresh = pendingRefreshRef.current;
    if (pendingRefresh && pendingRefresh.length > 0) {
      pendingRefreshRef.current = null;
      setAllItems(pendingRefresh);
      return;
    }

    const pendingAdds = pendingRealtimeAddsRef.current;
    if (pendingAdds.length > 0) {
      pendingRealtimeAddsRef.current = [];
      setAllItems((prevItems: FeedItem[]) => {
        const existingIds = new Set(prevItems.map((item: FeedItem) => item?.id).filter(Boolean));
        const newItems = pendingAdds.filter((item: FeedItem) => item?.id && !existingIds.has(item.id));
        return newItems.length ? [...newItems, ...prevItems] : prevItems;
      });
    }
  }, []);

  // Keep a lightweight flusher alive while the hook is mounted.
  useEffect(() => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = window.setInterval(() => {
      flushPendingIfSafe();
    }, 1500);
    return () => {
      if (flushTimerRef.current != null) {
        window.clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [flushPendingIfSafe]);

  // Real-time updates for new posts - MUST be declared before loadInitialFeed
  const enableRealTimeUpdates = useCallback(() => {
    if (!db || !user || realTimeEnabledRef.current) return;
    
    realTimeEnabledRef.current = true;
    
    // Listen for new posts (general feed posts - we'll filter client-side)
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot: QuerySnapshot) => {
      const newPosts = snapshot.docChanges()
        .filter((change: DocumentChange) => {
          // Only include general feed posts (no contextId/contextType)
          if (change.type !== 'added') return false;
          const data = change.doc.data();
          return !data.contextId && !data.contextType;
        })
        .map((change: DocumentChange) => {
          const data = change.doc.data();
          const docId = change.doc.id;
          if (!docId) return null; // Skip if doc has no ID
          return {
            id: `post-${docId}`,
            kind: 'post' as const,
            title: undefined,
            description: { en: data.content },
            // CRITICAL: Never use videoUrl for thumbnail - next/image doesn't support videos
            thumbnail: data.thumbnail || data.imageUrl || undefined,
            mediaUrl: data.videoUrl || undefined,
            createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
            meta: {
              authorId: data.authorId,
              likes: data.likes || 0,
              commentsCount: data.commentsCount || 0,
              contextId: data.contextId,
              contextType: data.contextType,
              postType: data.postType || 'general',
              imageUrl: data.imageUrl,
              videoUrl: data.videoUrl,
              thumbnail: data.thumbnail, // Include thumbnail in meta for reference
            },
          } as FeedItem;
        })
        .filter((item): item is FeedItem => item !== null); // Filter out null items

      if (newPosts.length > 0) {
        // IMPORTANT: Do not mutate feed list while media is actively playing.
        if (shouldDeferFeedMutations()) {
          pendingRealtimeAddsRef.current = [...newPosts, ...pendingRealtimeAddsRef.current].slice(0, 50);
          return;
        }
        setAllItems((prevItems: FeedItem[]) => {
          const existingIds = new Set(prevItems.map((item: FeedItem) => item?.id).filter(Boolean));
          const newItems = newPosts.filter((item: FeedItem) => item?.id && !existingIds.has(item.id));
          // Add new posts at the beginning
          return [...newItems, ...prevItems];
        });
      }
    }, (error: Error) => {
      console.error("Real-time feed update error:", error);
    });

    unsubscribeRef.current = unsubscribe;
  }, [db, user]);

  const loadInitialFeed = useCallback(async () => {
    if (loadingRef.current || authLoading) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const result = await fetchFeed();
      const feedArray = normalizeFeed(result?.feed);
      // Filter out any items without valid string IDs
      let validFeed = feedArray.filter((item: FeedItem) => {
        return item && item.id && typeof item.id === 'string';
      });
      if (validFeed.length === 0) {
        validFeed = await fetchFirestoreFallback();
      }
      if (validFeed.length < pageSize) {
        setCanLoadMore(false);
      }
      setAllItems(validFeed);
      setLastCursor(result.cursor);
      
      // Enable real-time updates for new posts
      if (db && user && !realTimeEnabledRef.current) {
        enableRealTimeUpdates();
      }
    } catch (error) {
      console.error("Failed to load initial feed items:", error);
      const fallback = await fetchFirestoreFallback();
      setAllItems(fallback);
      setCanLoadMore(fallback.length >= pageSize);
      setLastCursor(fallback.length ? fallback[fallback.length - 1]?.id : undefined);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFeed, pageSize, db, user, fetchFirestoreFallback, authLoading, enableRealTimeUpdates]);

  // Refresh feed function - can be called after creating posts
  const refreshFeed = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const result = await fetchFeed();
      const feedArray = normalizeFeed(result?.feed);
      // Filter out any items without valid string IDs
      let validFeed = feedArray.filter((item: FeedItem) => {
        return item && item.id && typeof item.id === 'string';
      });
      if (validFeed.length === 0) {
        validFeed = await fetchFirestoreFallback();
      }
      if (validFeed.length < pageSize) {
        setCanLoadMore(false);
      }
      // IMPORTANT: Do not replace the feed list while media is actively playing.
      // Replacing the list can remount/re-layout the active card and stop video at arbitrary times (40-60s).
      if (shouldDeferFeedMutations()) {
        pendingRefreshRef.current = validFeed;
      } else {
        setAllItems(validFeed);
      }
      setLastCursor(result.cursor);
    } catch (error) {
      console.error("Failed to refresh feed items:", error);
      const fallback = await fetchFirestoreFallback();
      if (shouldDeferFeedMutations()) {
        pendingRefreshRef.current = fallback;
      } else {
        setAllItems(fallback);
      }
      setCanLoadMore(fallback.length >= pageSize);
      setLastCursor(fallback.length ? fallback[fallback.length - 1]?.id : undefined);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFeed, pageSize, fetchFirestoreFallback]);

  // Initialize feed - use a separate effect that only runs once when ready
  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) return;
    
    // Ensure db is available
    if (!db) return;
    
    // Ensure all required callbacks are functions (they should be, but guard against edge cases)
    if (typeof fetchFeed !== 'function' || typeof fetchFirestoreFallback !== 'function' || typeof enableRealTimeUpdates !== 'function') {
      return;
    }
    
    // Prevent multiple initializations
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Define initialization function inline to avoid dependency issues
    const initialize = async () => {
      if (loadingRef.current) return;
      
      loadingRef.current = true;
      setLoading(true);
      
      try {
        const result = await fetchFeed();
        const feedArray = normalizeFeed(result?.feed);
        let validFeed = feedArray.filter((item: FeedItem) => {
          return item && item.id && typeof item.id === 'string';
        });
        if (validFeed.length === 0) {
          validFeed = await fetchFirestoreFallback();
        }
        if (validFeed.length < pageSize) {
          setCanLoadMore(false);
        }
        setAllItems(validFeed);
        setLastCursor(result.cursor);
        
        // Enable real-time updates
        if (db && user && !realTimeEnabledRef.current) {
          enableRealTimeUpdates();
        }
      } catch (error) {
        console.error("Failed to load initial feed items:", error);
        const fallback = await fetchFirestoreFallback();
        setAllItems(fallback);
        setCanLoadMore(fallback.length >= pageSize);
        setLastCursor(fallback.length ? fallback[fallback.length - 1]?.id : undefined);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    
    initialize();
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        realTimeEnabledRef.current = false;
      }
      initializedRef.current = false;
    };
  }, [authLoading, db, user, fetchFeed, fetchFirestoreFallback, enableRealTimeUpdates, pageSize]);

  // Infinite scroll - load more when scrolling
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !canLoadMore || !lastCursor) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const result = await fetchFeed(lastCursor);
      const feedArray = normalizeFeed(result?.feed);
      
      // Filter out any items without valid string IDs
      let validFeed = feedArray.filter((item: FeedItem) => {
        return item && item.id && typeof item.id === 'string';
      });
      if (validFeed.length === 0) {
        validFeed = await fetchFirestoreFallback();
      }
      
      if (validFeed.length < pageSize) {
        setCanLoadMore(false);
      }
      
      setAllItems((prevItems: FeedItem[]) => {
        const existingIds = new Set(prevItems.map((item: FeedItem) => item?.id).filter(Boolean));
        const newItems = validFeed.filter((newItem: FeedItem) => newItem?.id && !existingIds.has(newItem.id));
        return [...prevItems, ...newItems];
      });

      setLastCursor(result.cursor);

    } catch (error) {
      console.error("Failed to load more feed items:", error);
      const fallback = await fetchFirestoreFallback();
      if (fallback.length === 0) {
        setCanLoadMore(false);
      } else {
        setAllItems((prevItems: FeedItem[]) => {
          const existingIds = new Set(prevItems.map((item: FeedItem) => item?.id).filter(Boolean));
          const newItems = fallback.filter((newItem: FeedItem) => newItem?.id && !existingIds.has(newItem.id));
          return [...prevItems, ...newItems];
        });
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [canLoadMore, fetchFeed, pageSize, lastCursor, fetchFirestoreFallback]);
  
  return { allItems, loading, loadMore, canLoadMore, refreshFeed };
};
