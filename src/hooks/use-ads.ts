"use client";

import { useEffect, useState } from 'react';
import type { Ad, AdCategory, AdType } from '@/types/ads';

interface UseAdsOptions {
  type: AdType;
  category?: AdCategory;
  intervalMinutes?: number;
}

export function useAds({ type, category, intervalMinutes = 10 }: UseAdsOptions) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchAds = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ type });
        if (category) params.set('category', category);
        const response = await fetch(`/api/ads?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load ads');
        }
        const data = await response.json();
        if (isMounted) {
          setAds(data.ads || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load ads');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAds();

    timer = setInterval(fetchAds, intervalMinutes * 60 * 1000);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [type, category, intervalMinutes]);

  return { ads, loading, error };
}
