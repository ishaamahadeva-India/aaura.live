"use client";

import { useEffect, useRef } from 'react';
import type { Ad } from '@/types/ads';
import { CTA_LABEL_MAP } from '@/types/ads';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import Image from 'next/image';

interface ReelsAdCardProps {
  ad: Ad;
  isActive?: boolean;
}

export function ReelsAdCard({ ad, isActive }: ReelsAdCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  const handleClick = () => {
    window.open(ad.link, '_blank', 'noopener');
  };

  return (
    <div className="relative h-screen w-full bg-black text-white">
      {ad.videoUrl ? (
        <video
          ref={videoRef}
          src={ad.videoUrl}
          poster={ad.imageUrl}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      ) : (
        <div className="relative w-full h-full">
          <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
        </div>
      )}

      <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full flex items-center gap-2 text-xs uppercase tracking-widest">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        Sponsored
      </div>

      <div className="absolute bottom-20 left-4 right-4 space-y-3">
        <p className="text-xs text-amber-200 font-semibold">{ad.sponsoredBy}</p>
        <h3 className="text-2xl font-bold drop-shadow-lg">{ad.title}</h3>
        <p className="text-sm text-slate-100 drop-shadow">{ad.description}</p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full px-6">
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          size="lg"
          onClick={handleClick}
        >
          {CTA_LABEL_MAP[ad.ctaLabel]}
        </Button>
      </div>
    </div>
  );
}
