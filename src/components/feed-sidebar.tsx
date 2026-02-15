
'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/hooks/use-language';
import type { FeedItem } from '@/types/feed';

export function FeedSidebar({ items }: { items: FeedItem[] }) {
  const { language } = useLanguage();

  if (!items) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const getText = (field?: Record<string,string> | string) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return (field[language] || field["en"] || Object.values(field)[0] || "");
  };

  const getHref = (item: FeedItem) => {
    // Validate item and id before processing
    if (!item || !item.id || typeof item.id !== 'string') return '#';
    if (item.kind === 'video') {
        return `/watch/${item.id.replace('video-', '')}`;
    }
    if (item.kind === 'temple' && item.meta?.slug) {
        return `/temples/${item.meta.slug}`;
    }
    if (item.kind === 'story' && item.meta?.slug) {
        return `/stories/${item.meta.slug}`;
    }
     if (item.kind === 'deity' && item.meta?.slug) {
        return `/deities/${item.meta.slug}`;
    }
    return "#";
  }

  return (
    <div className="flex flex-col gap-3 p-4">
        <h2 className="text-xl font-bold px-2">Up Next</h2>
        {items
          .filter((item: FeedItem) => item && item.id && typeof item.id === 'string') // Only render items with valid string IDs
          .map((item: FeedItem) => {
            // Double-check id is valid before using as key
            if (!item.id || typeof item.id !== 'string') return null;
            return (
            <Link key={item.id} href={getHref(item)} className="group">
              <div className="flex gap-3 hover:bg-secondary p-2 rounded-lg cursor-pointer transition-colors">
                <div className="relative w-40 h-24 shrink-0 rounded-md overflow-hidden">
                    <Image
                      src={item.thumbnail || 'https://picsum.photos/seed/video-placeholder/400/225'}
                      alt={getText(item.title)}
                      fill
                      className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary line-clamp-2">
                    {getText(item.title)}
                  </h3>
                   <p className="text-xs text-muted-foreground mt-1">{getText(item.meta?.channelName) || 'Aaura'}</p>
                </div>
              </div>
            </Link>
            );
          })
          .filter(Boolean) // Remove any null entries
        }
    </div>
  );
}
