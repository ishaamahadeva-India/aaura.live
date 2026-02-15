'use client';

import React, { useState } from 'react';
import FeedCard from './FeedCard';
import { ensureVideoUrl } from '@/lib/firebase/storage-urls';

interface Post {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  meta?: {
    videoStoragePath?: string;
  };
}

interface FeedListProps {
  posts: Post[];
}

const FeedList: React.FC<FeedListProps> = ({ posts }) => {
  const [preloaded, setPreloaded] = useState<Record<string, string>>({});

  // Preload next video when a video loads
  const handleVideoLoaded = async (currentIndex: number) => {
    const nextPost = posts[currentIndex + 1];
    if (nextPost && !preloaded[nextPost.id]) {
      try {
        // CRITICAL: Always use videoStoragePath from Firestore - NEVER extract from URLs!
        const videoStoragePath = nextPost.meta?.videoStoragePath;
        if (!videoStoragePath) {
          console.warn('FeedList: Cannot preload - no videoStoragePath for post:', nextPost.id);
          return;
        }
        
        const safeUrl = await ensureVideoUrl(null, undefined, videoStoragePath);
        if (safeUrl) {
          setPreloaded((prev) => ({ ...prev, [nextPost.id]: safeUrl }));
          console.log('Preloaded next video:', nextPost.id);
        }
      } catch (err) {
        console.warn('Failed to preload video:', nextPost.id, err);
      }
    }
  };

  return (
    <div className="feed-list flex flex-col">
      {posts.map((post, index) => (
        <FeedCard
          key={post.id}
          videoUrl={preloaded[post.id] || post.videoUrl}
          posterUrl={post.posterUrl}
          title={post.title}
          onVideoLoaded={() => handleVideoLoaded(index)}
        />
      ))}
    </div>
  );
};

export default FeedList;

