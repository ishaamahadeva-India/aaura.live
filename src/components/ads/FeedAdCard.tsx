"use client";

import Image from 'next/image';
import { Sparkles, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Ad } from '@/types/ads';
import { CTA_LABEL_MAP } from '@/types/ads';
import { cn } from '@/lib/utils';

interface FeedAdCardProps {
  ad: Ad;
  className?: string;
}

export function FeedAdCard({ ad, className }: FeedAdCardProps) {
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-amber-950/30 shadow-lg',
        className,
      )}
    >
      <div className="absolute inset-0 opacity-5 bg-[url('/temple-texture.png')] pointer-events-none" />

      <div className="flex flex-col md:flex-row">
        <div className="relative md:w-2/5 aspect-video md:aspect-square overflow-hidden">
          <Image
            src={ad.imageUrl}
            alt={ad.title}
            fill
            className="object-cover transition-transform duration-700 hover:scale-105"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 text-white px-3 py-1 rounded-full text-xs uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Sponsored
          </div>
        </div>

        <div className="flex-1 p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
            <Shield className="w-4 h-4" />
            {ad.sponsoredBy}
          </div>

          <div>
            <h3 className="text-2xl md:text-3xl font-headline text-slate-900 dark:text-white">{ad.title}</h3>
            <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">{ad.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={() => window.open(ad.link, '_blank', 'noopener')}
            >
              {CTA_LABEL_MAP[ad.ctaLabel]}
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
