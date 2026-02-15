'use client';

import React, { useMemo, useState } from "react";
import { Loader2, FileQuestion } from "lucide-react";
import { SimpleFeedCard } from "@/components/SimpleFeedCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { FeedItem } from "@/types/feed";
import { FeedAdCard } from "@/components/ads/FeedAdCard";

export function FeedList({ items, isLoading }: { items: FeedItem[], isLoading: boolean }) {
  // ✅ ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  // ✅ SINGLE SOURCE OF TRUTH - FeedList controls activePostId
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Pre-filter items to ensure all have valid IDs before processing
  const validItems = useMemo(() => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter((item: FeedItem) => {
      // Comprehensive validation: item exists, has id, and id is a string
      return item != null && item.id != null && typeof item.id === 'string';
    });
  }, [items]);

  // ✅ Convert FeedItem to post format expected by SimpleFeedCard
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
        const hasTextContent = !!(item.description?.en || item.description?.te || Object.values(item.description || {})[0] || item.meta?.description || item.meta?.content);
        
        // Determine post type - survey/question takes priority
        let postType: 'video' | 'image' | 'text' | 'survey' | 'question' = 'text';
        if (item.meta?.postType === 'survey' || item.meta?.postType === 'question') {
          postType = item.meta.postType;
        } else if (isVideo) {
          postType = 'video';
        } else if (isImage) {
          postType = 'image';
        } else if (hasTextContent) {
          postType = 'text';
        }
        
        // Extract title (multi-language support)
        const title = item.title?.en || item.title?.te || Object.values(item.title || {})[0] || item.meta?.title;
        
        // Extract description/content (multi-language support)
        const description = item.description?.en || item.description?.te || Object.values(item.description || {})[0] || item.meta?.description;
        const content = item.meta?.content || description; // Use content field if available
        
        // Extract author info
        const authorId = item.meta?.authorId || item.meta?.author?.id;
        const authorName = item.meta?.authorName || item.meta?.author?.displayName;
        const authorPhoto = item.meta?.authorPhoto || item.meta?.author?.photoURL;
        
        return {
          id: itemId,
          type: postType,
          videoUrl: item.mediaUrl || item.meta?.videoUrl || '',
          imageUrl: item.meta?.imageUrl || item.thumbnail || '',
          subtitleUrl: item.meta?.subtitleUrl || item.meta?.subtitle?.url || undefined,
          title,
          description,
          content,
          authorId,
          authorName,
          authorPhoto,
          createdAt: item.createdAt || item.meta?.createdAt,
          likes: item.meta?.likes || 0,
          commentsCount: item.meta?.commentsCount || item.meta?.comments?.length || 0,
          // Survey data
          surveyOptions: item.meta?.surveyOptions || undefined,
          surveyResponses: item.meta?.surveyResponses || {},
          // Question data
          questionOptions: item.meta?.questionOptions || undefined,
          correctAnswer: item.meta?.correctAnswer !== undefined ? item.meta.correctAnswer : undefined,
          questionResponses: item.meta?.questionResponses || {},
        };
      });
  }, [validItems]);

  // ✅ NOW we can do conditional returns AFTER all hooks
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
              <SimpleFeedCard
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

