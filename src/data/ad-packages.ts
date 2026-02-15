import type { AdType } from '@/types/ads';

export interface AdPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  type: AdType;
  durationLabel: string;
  reachEstimate: string;
  features: string[];
  maxImpressions: number;
  targetingSections: string[];
}

export const AD_PACKAGES: AdPackage[] = [
  {
    id: 'feed_spotlight_week',
    title: 'Feed Spotlight',
    description: 'Top-of-feed placement for spiritual seekers across India.',
    price: 4999,
    type: 'feed',
    durationLabel: '7 days live',
    reachEstimate: 'Est. 25k impressions',
    features: [
      'Appears every 8th card',
      'High-intent devotional audience',
      'Link out to your booking page',
    ],
    maxImpressions: 25000,
    targetingSections: ['all', 'temples', 'stories', 'posts'],
  },
  {
    id: 'reel_premium_burst',
    title: 'Reel Spotlight',
    description: 'Full-screen devotional reel for immersive storytelling.',
    price: 6999,
    type: 'reel',
    durationLabel: '10k guaranteed views',
    reachEstimate: 'Full-screen auto-play',
    features: [
      'Auto-play with sound off',
      'CTA overlay',
      'Ideal for temple tours & pooja teasers',
    ],
    maxImpressions: 10000,
    targetingSections: ['reels', 'videos'],
  },
  {
    id: 'feed_mandapa_deluxe',
    title: 'Mandapa Deluxe',
    description: 'Promote mandapa bookings & pooja services with premium visuals.',
    price: 5999,
    type: 'feed',
    durationLabel: '10 days live',
    reachEstimate: 'Est. 40k impressions',
    features: [
      'Lead-gen friendly CTA',
      'Priority placement on rituals feed',
      'Supports photo + optional video',
    ],
    maxImpressions: 40000,
    targetingSections: ['rituals', 'temples', 'all'],
  },
];

export const AD_PACKAGE_MAP = AD_PACKAGES.reduce<Record<string, AdPackage>>((acc, pkg) => {
  acc[pkg.id] = pkg;
  return acc;
}, {});
