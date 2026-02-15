
"use client";
import React, { useMemo, useState } from "react";
import { Loader2, FileQuestion } from "lucide-react";
import { FeedCard } from "@/components/FeedCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FeedItem } from "@/types/feed";
import { FeedAdCard } from "@/components/ads/FeedAdCard";

export function Feed({ items, isLoading }: { items: FeedItem[], isLoading: boolean }) {
  // ✅ SINGLE SOURCE OF TRUTH - Feed controls activePostId
  const [activePostId, setActivePostId] = useState<string | null>(null);

  if (isLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-96 space-y-4 animate-in fade-in duration-500">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your personalized feed...</p>
        </div>
    );
  }

  // Pre-filter items to ensure all have valid IDs before processing
  const validItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter((item: FeedItem) => {
      // Comprehensive validation: item exists, has id, and id is a string
      return item != null && item.id != null && typeof item.id === 'string';
    });
  }, [items]);

  // ✅ Convert FeedItem to post format expected by FeedCard
  const posts = useMemo(() => {
    return validItems
      .filter((item: FeedItem) => {
        // Filter out ads - they're handled separately
        return item.kind !== 'ad' || !item.meta?.ad;
      })
      .map((item: FeedItem) => {
        const itemId = item.id as string;
        
        // Determine type and URL
        const isVideo = !!(item.mediaUrl || item.meta?.videoUrl);
        const isImage = !!(item.meta?.imageUrl || item.thumbnail);
        
        return {
          id: itemId,
          type: isVideo ? 'video' : 'image',
          videoUrl: item.mediaUrl || item.meta?.videoUrl || '',
          imageUrl: item.meta?.imageUrl || item.thumbnail || '',
        };
      });
  }, [validItems]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 animate-in fade-in duration-500">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your personalized feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {validItems.length > 0 ? (
        <>
          {validItems.map((item: FeedItem, index: number) => {
            const itemId = item.id as string;
            if (!itemId || typeof itemId !== 'string') return null;
            
            // Handle ads separately
            if (item.kind === 'ad' && item.meta?.ad) {
              return (
                <div
                  key={itemId}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <FeedAdCard ad={item.meta.ad} />
                </div>
              );
            }
            
            return null; // Regular items handled in posts map below
          })}
          
          {/* Render FeedCards for posts */}
          <div style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
            {posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                activePostId={activePostId}
                setActivePostId={setActivePostId}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-96 animate-in fade-in duration-500">
          <Alert className="max-w-md text-center">
            <FileQuestion className="h-4 w-4" />
            <AlertTitle>No Content Found</AlertTitle>
            <AlertDescription>
              We couldn't find any content for your feed right now. Why not create a post?
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
