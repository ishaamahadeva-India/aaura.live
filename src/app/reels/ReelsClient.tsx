
'use client';

import { useFeed } from '@/hooks/use-feed';
import ReelsFeed from '@/components/ReelsFeed';
import { Loader2, VideoOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { FeedItem } from '@/types/feed';
import { useAds } from '@/hooks/use-ads';
import { injectReelAds } from '@/lib/ads/mergeAds';
import { ReelsAdCard } from '@/components/ads/ReelsAdCard';
import { useActiveVideo } from '@/contexts/ActiveVideoContext';

const VIRTUALIZATION_BUFFER = 5;

export default function ReelsClient() {
  const { allItems, loading, loadMore, canLoadMore } = useFeed(5);
  const { ads: reelAds } = useAds({ type: 'reel' });
  const [visibleItemIndex, setVisibleItemIndex] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreObserver = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeVideoId } = useActiveVideo();

  const videoItems = useMemo(
    () => allItems.filter(item => (item.kind === 'video' || item.kind === 'media') && item.mediaUrl),
    [allItems]
  );
  const timelineItems = useMemo(
    () => injectReelAds(videoItems, reelAds, 12, { section: 'reels' }),
    [videoItems, reelAds]
  );

  // Find active video index
  const activeIndex = useMemo(() => {
    if (!activeVideoId) return -1;
    return timelineItems.findIndex(item => item.id === activeVideoId);
  }, [timelineItems, activeVideoId]);

  // Infinite scroll
  const lastVideoElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (loadMoreObserver.current) loadMoreObserver.current.disconnect();
    loadMoreObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && canLoadMore) {
        loadMore();
      }
    });
    if (node) loadMoreObserver.current.observe(node);
  }, [loading, canLoadMore, loadMore]);

  // Track visible reel
  useEffect(() => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
          setVisibleItemIndex(index);
        }
      });
    }, { threshold: 0.5 });

    const elements = document.querySelectorAll('.reel-item');
    elements.forEach(el => observer.current?.observe(el));
    return () => observer.current?.disconnect();
  }, [timelineItems]);

  // Calculate pinned position for active video
  const [pinnedTop, setPinnedTop] = useState(0);
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) {
      setPinnedTop(0);
      return;
    }

    const updatePosition = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const itemHeight = window.innerHeight; // Each reel is full screen
      const calculatedTop = activeIndex * itemHeight - scrollTop;
      setPinnedTop(calculatedTop);
    };

    updatePosition();
    containerRef.current.addEventListener('scroll', updatePosition);
    return () => {
      containerRef.current?.removeEventListener('scroll', updatePosition);
    };
  }, [activeIndex]);

  if (videoItems.length === 0 && loading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-center p-4">
             <Loader2 className="h-16 w-16 animate-spin text-white" />
        </div>
    );
  }

  if (videoItems.length === 0 && !loading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-center p-4">
            <VideoOff className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">No Reels Found</h2>
            <p className="mt-2 text-muted-foreground">There's no video content available to display right now.</p>
        </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen w-full snap-y snap-mandatory overflow-y-scroll bg-black relative"
    >
      {(() => {
        let videoCursor = -1;
        return timelineItems.map((item, index) => {
          const isVideoCard = item.kind !== 'reel-ad';
          if (isVideoCard) {
            videoCursor += 1;
          }
          const ref = isVideoCard && videoCursor === videoItems.length - 1 ? lastVideoElementRef : null;
          const isActiveVideo = activeVideoId && item.id === activeVideoId;
          
          // If this is the active video, render placeholder in list, actual video will be pinned
          if (isActiveVideo && activeIndex === index) {
            return (
              <div
                key={`${item.kind}-${item.id}-placeholder`}
                ref={ref}
                data-index={index}
                data-video-id={item.kind !== 'reel-ad' ? item.id : undefined}
                className="reel-item h-screen w-full snap-start"
                style={{ visibility: 'hidden' }}
              />
            );
          }
          
          return (
            <div
              key={`${item.kind}-${item.id}`}
              ref={ref}
              data-index={index}
              data-video-id={item.kind !== 'reel-ad' ? item.id : undefined}
              className="reel-item h-screen w-full snap-start flex items-center justify-center"
            >
              {item.kind === 'reel-ad' && item.meta && item.meta.ad ? (
                <ReelsAdCard ad={item.meta.ad} isActive={index === visibleItemIndex} />
              ) : (() => {
                const shouldRender = isActiveVideo || 
                  Math.abs(index - visibleItemIndex) <= VIRTUALIZATION_BUFFER;
                
                return shouldRender && item ? (
                  <ReelsFeed items={[item]} isVisible={index === visibleItemIndex} />
                ) : (
                  <div className="h-full w-full bg-black flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  </div>
                );
              })()}
            </div>
          );
        });
      })()}

      {/* PINNED ACTIVE VIDEO - Never unmounts */}
      {activeIndex >= 0 && timelineItems[activeIndex] && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${pinnedTop}px`,
            height: '100vh',
            pointerEvents: 'auto',
            zIndex: 10,
          }}
        >
          <ReelsFeed 
            items={[timelineItems[activeIndex]]} 
            isVisible={activeIndex === visibleItemIndex}
            isPinned={true}
          />
        </div>
      )}

      {loading && videoItems.length > 0 && (
        <div className="h-screen w-full snap-start flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
