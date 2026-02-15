"use client";

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface GoogleBannerAdProps {
  slot: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export function GoogleBannerAd({ slot, className }: GoogleBannerAdProps) {
  const adRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('Failed to load Google AdSense banner', error);
    }
  }, [slot]);

  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="google-adsense-init"
        strategy="afterInteractive"
      >{`(adsbygoogle = window.adsbygoogle || []).push({});`}</Script>
      <ins
        className={`adsbygoogle block ${className || ''}`}
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef as any}
      />
    </>
  );
}
