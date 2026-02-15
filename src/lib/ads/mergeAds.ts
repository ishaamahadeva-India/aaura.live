import type { FeedItem } from '@/types/feed';
import type { Ad } from '@/types/ads';

const createFeedAdItem = (ad: Ad): FeedItem => ({
  id: `ad-${ad.id}`,
  kind: 'ad' as FeedItem['kind'],
  title: { en: ad.title },
  description: { en: ad.description },
  thumbnail: ad.imageUrl,
  mediaUrl: ad.videoUrl,
  meta: { ad },
  createdAt: ad.createdAt || new Date().toISOString(),
});

const createReelAdItem = (ad: Ad): FeedItem => ({
  id: `reel-ad-${ad.id}`,
  kind: 'reel-ad' as FeedItem['kind'],
  title: { en: ad.title },
  description: { en: ad.description },
  thumbnail: ad.imageUrl,
  mediaUrl: ad.videoUrl || ad.imageUrl,
  meta: { ad },
  createdAt: ad.createdAt || new Date().toISOString(),
});

const matchesTargeting = (ad: Ad, section?: string) => {
  const targets = ad.targeting?.sections;
  if (!targets || targets.length === 0) {
    return true;
  }
  if (!section) {
    return targets.includes('all');
  }
  return targets.includes(section) || targets.includes('all');
};

export function injectFeedAds(feedItems: FeedItem[], ads: Ad[], interval = 8, context?: { section?: string }): FeedItem[] {
  if (!feedItems?.length || !ads?.length) return feedItems;
  const sortedAds = [...ads].sort((a, b) => b.priority - a.priority).filter((ad) => matchesTargeting(ad, context?.section));
  const result: FeedItem[] = [];
  let adIndex = 0;

  feedItems.forEach((item, index) => {
    result.push(item);
    if ((index + 1) % interval === 0 && adIndex < sortedAds.length) {
      result.push(createFeedAdItem(sortedAds[adIndex]));
      adIndex = (adIndex + 1) % sortedAds.length;
    }
  });

  return result;
}

export function injectReelAds(reels: FeedItem[], ads: Ad[], interval = 12, context?: { section?: string }): FeedItem[] {
  if (!reels?.length || !ads?.length) return reels;
  const sortedAds = [...ads].sort((a, b) => b.priority - a.priority).filter((ad) => matchesTargeting(ad, context?.section));
  const result: FeedItem[] = [];
  let adIndex = 0;

  reels.forEach((item, index) => {
    result.push(item);
    if ((index + 1) % interval === 0 && adIndex < sortedAds.length) {
      result.push(createReelAdItem(sortedAds[adIndex]));
      adIndex = (adIndex + 1) % sortedAds.length;
    }
  });

  return result;
}
