"use server";

import { db } from '@/lib/firebase/admin';
import { Ad, AdCategory, AdType } from '@/types/ads';

const COLLECTION_MAP: Record<AdCategory, string> = {
  temple: 'templeAds',
  pooja: 'poojaAds',
  mandapa: 'mandapaAds',
};

export async function fetchActiveAds(params: { type: AdType; category?: AdCategory; limit?: number } ): Promise<Ad[]> {
  const { type, category, limit = 12 } = params;
  const collections = category ? [COLLECTION_MAP[category]] : Object.values(COLLECTION_MAP);
  const ads: Ad[] = [];

  // Check if db is properly initialized
  if (!db) {
    console.warn('Firebase Admin DB not initialized, skipping ads loading');
    return [];
  }

  await Promise.all(
    collections.map(async (collectionName) => {
      try {
        // Use Firebase Admin SDK collection method (not client SDK)
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef
          .where('active', '==', true)
          .where('type', '==', type)
          .orderBy('priority', 'desc')
          .limit(limit)
          .get();
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          ads.push({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            link: data.link,
            sponsoredBy: data.sponsoredBy,
            active: data.active,
            type: data.type,
            category: data.category,
            ctaLabel: data.ctaLabel,
            priority: data.priority ?? 0,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            status: data.status,
          });
        });
      } catch (error: any) {
        // Silently handle credential errors in development
        // These are expected if FIREBASE_SERVICE_ACCOUNT_KEY is not set
        if (error?.message?.includes('Could not load the default credentials')) {
          // This is expected in local dev without service account
          // Don't log as error, just skip ads loading
          return;
        }
        console.error(`Failed to load ads from ${collectionName}`, error);
      }
    })
  );

  return ads
    .filter((ad) => ad.type === type && ad.status !== 'pending_review')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
