
'use client';

import { FeedSidebar } from "@/components/feed-sidebar";
import { VideoPlayer } from "@/components/video-player";
import { useFeed } from '@/hooks/use-feed';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useMemo } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ListMusic } from "lucide-react";

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();
  const { allItems, loading } = useFeed(20);

  const challengeId = searchParams.get('challengeId');
  const day = searchParams.get('day');

  const upNextItems = useMemo(() => {
    // Exclude the current video from the "Up Next" list
    return allItems.filter(item => {
      if (!item?.id || typeof item.id !== 'string') return false;
      return item.id.replace('media-', '') !== id;
    });
  }, [allItems, id]);

  const handleVideoEnd = () => {
    // If user came from a challenge, redirect them back with a completion flag
    if (challengeId && day) {
        router.push(`/challenges/${challengeId}?completedDay=${day}`);
        return;
    }
    
    if (loading) return; // Don't navigate if the next items are still loading

    // Otherwise, play the next video in the feed
    if (upNextItems.length > 0) {
      const nextItem = upNextItems[0];
      if (!nextItem?.id) return;
      const nextHref = nextItem.kind === 'video' 
          ? `/watch/${typeof nextItem.id === 'string' ? nextItem.id.replace('media-', '') : nextItem.id}`
          : `/${nextItem.kind}s/${nextItem.meta?.slug}`;
      router.push(nextHref);
    }
  };

  if (loading && allItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-background text-foreground">
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <VideoPlayer contentId={id} onVideoEnd={handleVideoEnd} />
      </div>
      <aside className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-border overflow-y-auto hidden lg:block">
        <FeedSidebar items={upNextItems} />
      </aside>
       <div className="fixed bottom-4 right-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon"><ListMusic /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
               <FeedSidebar items={upNextItems} />
            </SheetContent>
          </Sheet>
        </div>
    </div>
  );
}
