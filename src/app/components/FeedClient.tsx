'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuth } from "@/lib/firebase/provider";
import { useFeed, type FeedFilter } from "@/hooks/use-feed";
import { FeedList } from "./FeedList";
import { CreateContent } from "./CreateContent";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { useAds } from "@/hooks/use-ads";
import { injectFeedAds } from "@/lib/ads/mergeAds";
import { GoogleBannerAd } from "@/components/ads/GoogleBannerAd";
import dynamic from 'next/dynamic';
import { CollapsibleSpecialFeatures } from '@/components/special-events/CollapsibleSpecialFeatures';
import { FloatingCreateButton } from '@/components/FloatingCreateButton';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { hapticFeedback } from '@/utils/haptic-feedback';

// Lazy load merged events section
const MergedEventsSection = dynamic(
  () => import("@/components/special-events/MergedEventsSection").then(mod => ({ default: mod.MergedEventsSection })),
  { ssr: false }
);

const categoryOptions = [
  { id: 'deities', label: 'Deities', icon: '🕉️' },
  { id: 'temples', label: 'Temples', icon: '🛕' },
  { id: 'festivals', label: 'Festivals', icon: '🎉' },
  { id: 'stories', label: 'Stories', icon: '📖' },
  { id: 'rituals', label: 'Rituals', icon: '🪔' },
];

export function FeedClient() {
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showTrending, setShowTrending] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [adShown, setAdShown] = useState(false);
  const sectionFilter = showTrending ? 'all' : activeFilter;
  const { allItems, loading, loadMore, canLoadMore, refreshFeed } = useFeed(20, sectionFilter, showTrending);
  const { ads: feedAds } = useAds({ type: 'feed' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMediaPlayingRef = useRef(false);
  const targetingSection = selectedCategories[0] || sectionFilter;
  const displayItems = useMemo(
    () => injectFeedAds(allItems, feedAds, 8, { section: targetingSection }),
    [allItems, feedAds, targetingSection]
  );

  // Show events section after initial feed load
  useEffect(() => {
    if (allItems.length > 0 && !showEvents) {
      const timer = setTimeout(() => setShowEvents(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [allItems.length, showEvents]);

  // Show ad after 3 posts
  useEffect(() => {
    if (allItems.length >= 3 && !adShown) {
      setAdShown(true);
    }
  }, [allItems.length, adShown]);

  // Auto-refresh every 60 seconds (reduced frequency for better performance during high-traffic events)
  useEffect(() => {
    if (!user) return;

    // Track whether any media is actively playing on the page.
    // Root cause: refreshing the feed every 60s can re-render/unmount the active video card,
    // which looks exactly like "video stops at ~59s" with no console error.
    const updatePlayingState = () => {
      try {
        const media = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
        isMediaPlayingRef.current = media.some((m) => !m.paused && !m.ended);
      } catch {
        isMediaPlayingRef.current = false;
      }
    };

    updatePlayingState();
    const onPlay = () => updatePlayingState();
    const onPause = () => updatePlayingState();
    const onEnded = () => updatePlayingState();
    document.addEventListener('play', onPlay, true);
    document.addEventListener('pause', onPause, true);
    document.addEventListener('ended', onEnded, true);

    const interval = setInterval(() => {
      // Only refresh if user is actively viewing (page is visible)
      if (document.visibilityState === 'visible') {
        // DO NOT refresh while media is playing; this can stop videos mid-play.
        updatePlayingState();
        if (!isMediaPlayingRef.current) {
          refreshFeed();
        }
      }
    }, 60000); // 60 seconds - reduced from 30s to handle high concurrent load

    return () => {
      clearInterval(interval);
      document.removeEventListener('play', onPlay, true);
      document.removeEventListener('pause', onPause, true);
      document.removeEventListener('ended', onEnded, true);
    };
  }, [user, refreshFeed]);

  const handleRefresh = useCallback(async () => {
    hapticFeedback('medium');
    setIsRefreshing(true);
    await refreshFeed();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refreshFeed]);

  const handlePostCreated = useCallback(() => {
    // Refresh feed after post is created
    setTimeout(() => {
      refreshFeed();
    }, 1000);
  }, [refreshFeed]);

  const toggleCategory = (categoryId: string) => {
    hapticFeedback('light');
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Swipe gestures for filter navigation
  const filterTabsRef = useRef<HTMLDivElement>(null);
  const filterOrder: FeedFilter[] = ['all', 'posts', 'videos', 'temples', 'stories'];
  
  useSwipeGestures(filterTabsRef, {
    onSwipeLeft: () => {
      hapticFeedback('light');
      const currentIndex = showTrending ? -1 : filterOrder.indexOf(activeFilter);
      if (currentIndex < filterOrder.length - 1) {
        setShowTrending(false);
        setActiveFilter(filterOrder[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      hapticFeedback('light');
      const currentIndex = showTrending ? -1 : filterOrder.indexOf(activeFilter);
      if (currentIndex > 0) {
        setShowTrending(false);
        setActiveFilter(filterOrder[currentIndex - 1]);
      } else if (currentIndex === 0) {
        setShowTrending(true);
      }
    },
  });

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        if (canLoadMore && !loading) {
          loadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [canLoadMore, loading, loadMore]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Section with integrated carousel on mobile */}
      <div className="sticky top-[60px] md:top-0 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm md:border-t">
        {/* Collapsible Special Features Carousel - Mobile only */}
        <div className="md:hidden -mt-2">
          <CollapsibleSpecialFeatures />
        </div>

        <div className="container mx-auto px-4 py-1.5 sm:py-3 space-y-1.5 sm:space-y-3">
          {/* Personalized Feed Description with Refresh Button */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-1 min-w-0">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="truncate">Personalized feed based on your interests and preferences...</span>
            </p>
            {/* Refresh Button - Top Right */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="h-8 w-8 md:h-9 md:w-9 shrink-0"
              title="Refresh feed"
            >
              <RefreshCw className={cn("h-4 w-4", (isRefreshing || loading) && "animate-spin")} />
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3" ref={filterTabsRef}>
            <Tabs value={showTrending ? 'trending' : activeFilter} className="flex-1 w-full">
              <TabsList className={cn(
                "w-full h-auto gap-2 shadow-sm",
                "md:grid md:grid-cols-6",
                "flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              )}>
                <TabsTrigger 
                  value="all" 
                  onClick={() => { 
                    hapticFeedback('light');
                    setShowTrending(false); 
                    setActiveFilter('all'); 
                  }}
                  className="text-xs sm:text-sm shrink-0 md:shrink"
                >
                  For You
                </TabsTrigger>
                <TabsTrigger 
                  value="trending" 
                  onClick={() => {
                    hapticFeedback('light');
                    setShowTrending(true);
                  }}
                  className="text-xs sm:text-sm flex items-center justify-center gap-1 shrink-0 md:shrink"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span className="hidden sm:inline">Trending</span>
                  <span className="sm:hidden">Trend</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="posts" 
                  onClick={() => { 
                    hapticFeedback('light');
                    setShowTrending(false); 
                    setActiveFilter('posts'); 
                  }}
                  className="text-xs sm:text-sm shrink-0 md:shrink"
                >
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="videos" 
                  onClick={() => { 
                    hapticFeedback('light');
                    setShowTrending(false); 
                    setActiveFilter('videos'); 
                  }}
                  className="text-xs sm:text-sm shrink-0 md:shrink"
                >
                  Videos
                </TabsTrigger>
                <TabsTrigger 
                  value="temples" 
                  onClick={() => { 
                    hapticFeedback('light');
                    setShowTrending(false); 
                    setActiveFilter('temples'); 
                  }}
                  className="text-xs sm:text-sm shrink-0 md:shrink"
                >
                  Temples
                </TabsTrigger>
                <TabsTrigger 
                  value="stories" 
                  onClick={() => { 
                    hapticFeedback('light');
                    setShowTrending(false); 
                    setActiveFilter('stories'); 
                  }}
                  className="text-xs sm:text-sm shrink-0 md:shrink"
                >
                  Stories
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Category Pills - Hidden on mobile */}
          <ScrollArea className="w-full hidden md:block">
            <div className="flex gap-2 pb-2 min-w-full">
              {categoryOptions.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/10",
                    selectedCategories.includes(category.id) && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => toggleCategory(category.id)}
                >
                  <span className="mr-1.5">{category.icon}</span>
                  {category.label}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("flex-1 w-full pb-20 md:pb-6", compactMode && "pb-16")}>
        <div className="max-w-3xl mx-auto px-4">
          {/* Create Post Section - Desktop only, mobile uses floating button */}
          {user && <div className="hidden md:block"><CreateContent onPostCreated={handlePostCreated} /></div>}

          {/* Merged Events Section - Lazy loaded, mobile only */}
          {showEvents && (
            <div className="md:hidden">
              <MergedEventsSection />
            </div>
          )}

          {/* Feed Items */}
          <div className={cn("mt-4", compactMode ? "space-y-3" : "space-y-6")}>
            <FeedList items={displayItems} isLoading={loading} />
          </div>

          {/* Banner ad - Show after 3 posts */}
          {adShown && (
            <div className={cn("my-6", compactMode && "my-4")}>
              <GoogleBannerAd slot="1234567890" />
            </div>
          )}

        {/* Load More Indicator */}
        {loading && allItems.length > 0 && (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

          {/* End of Feed Message */}
          {!loading && !canLoadMore && allItems.length > 0 && (
            <div className={cn("text-center text-muted-foreground text-sm", compactMode ? "py-4" : "py-8")}>
              You've reached the end of your feed
            </div>
          )}
        </div>
      </div>

      {/* Floating Create Button - Mobile only */}
      <FloatingCreateButton onPostCreated={handlePostCreated} />

      {/* Compact Mode Toggle - Mobile only, bottom left */}
      <div className="fixed bottom-24 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur-sm"
          onClick={() => {
            hapticFeedback('medium');
            setCompactMode(!compactMode);
          }}
          title={compactMode ? 'Switch to normal view' : 'Switch to compact view'}
        >
          <span className="text-xs">{compactMode ? '⛶' : '⛶'}</span>
        </Button>
      </div>
    </div>
  );
}


