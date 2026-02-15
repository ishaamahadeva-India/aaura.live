
'use server';

/**
 * @fileOverview A personalized feed generation flow for the Aaura app.
 * 
 * This flow acts as a server-side function to create a "For You" feed for a given user.
 * It combines user history, content popularity, and recency to generate a scored list of content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase/admin'; 
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import type { FeedItem } from '@/types/feed';

// ---------------------------------------------------
// 1. Input/Output Schema Definition
// ---------------------------------------------------

const PersonalizedFeedInputSchema = z.object({
  userId: z.string().optional().describe('The UID of the user for whom to generate the feed. If not provided, a generic trending feed is returned.'),
  pageSize: z.number().optional().default(20).describe('The number of items to return.'),
  lastCursor: z.string().optional().describe('The cursor for pagination.'),
  filter: z.enum(['posts', 'videos', 'temples', 'stories', 'deities']).optional().describe('Filter by content type.'),
  trending: z.boolean().optional().default(false).describe('Return trending content sorted by engagement.'),
});
export type PersonalizedFeedInput = z.infer<typeof PersonalizedFeedInputSchema>;

const FeedItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['video', 'temple', 'story', 'deity', 'post', 'media']),
  title: z.record(z.string()).optional(),
  description: z.record(z.string()).optional(),
  thumbnail: z.string().optional(),
  mediaUrl: z.string().optional(),
  meta: z.record(z.any()).optional(),
  createdAt: z.string().optional(), // Using ISO string for serialization
});

const PersonalizedFeedOutputSchema = z.object({
  feed: z.array(FeedItemSchema).describe('The curated list of content items for the user\'s feed.'),
  cursor: z.string().optional().describe('Cursor for pagination.'),
});
export type PersonalizedFeedOutput = z.infer<typeof PersonalizedFeedOutputSchema>;


// ---------------------------------------------------
// 2. Exported "Callable" Function
// ---------------------------------------------------

/**
 * Generates a personalized "For You" feed for a user.
 * 
 * This is the main function the frontend will call. It triggers the Genkit flow.
 *
 * @param input The user ID and pagination options.
 * @returns A promise that resolves to the personalized feed.
 */
export async function getPersonalizedFeed(input: PersonalizedFeedInput): Promise<PersonalizedFeedOutput> {
  return personalizedFeedFlow(input);
}


// ---------------------------------------------------
// 3. The Genkit Flow Implementation
// ---------------------------------------------------

const personalizedFeedFlow = ai.defineFlow(
  {
    name: 'personalizedFeedFlow',
    inputSchema: PersonalizedFeedInputSchema,
    outputSchema: PersonalizedFeedOutputSchema,
  },
  async (input) => {
    const { userId, pageSize = 20, filter, trending = false } = input;
    
    // Step 1: Fetch user preferences and following list if userId is provided
    let userPreferences: any = null;
    let favoriteDeities: string[] = [];
    let userInterests: string[] = [];
    let followingUserIds: string[] = [];
    
    if (userId) {
      try {
        // Fetch preferences
        const userPrefsRef = db.collection('users').doc(userId).collection('preferences').doc('default');
        const userPrefsDoc = await userPrefsRef.get();
        if (userPrefsDoc.exists) {
          userPreferences = userPrefsDoc.data();
          favoriteDeities = userPreferences?.favoriteDeities || [];
          userInterests = userPreferences?.interests || [];
        }
        
        // Fetch following list for prioritization
        const followingSnapshot = await db.collection('users').doc(userId).collection('following').get();
        followingUserIds = followingSnapshot.docs.map(doc => doc.id);
      } catch (e) {
        console.warn('Failed to fetch user data:', e);
      }
    }
    
    // Step 2: Fetch content based on filter
    const collectionsToFetch = filter 
      ? [filter === 'videos' ? 'media' : filter === 'posts' ? 'posts' : `${filter}s`]
      : ['media', 'posts', 'stories', 'temples', 'deities'];
    
    const fetchPromises = collectionsToFetch.map(collectionName => {
      if (collectionName === 'media') {
        return fetchContent(db, 'media', 'uploadDate', pageSize * 2);
      } else if (collectionName === 'posts') {
        return fetchContent(db, 'posts', 'createdAt', pageSize * 2);
      } else if (collectionName === 'stories') {
        return fetchContent(db, 'stories', 'createdAt', pageSize);
      } else if (collectionName === 'temples') {
        return fetchContent(db, 'temples', 'createdAt', pageSize);
      } else if (collectionName === 'deities') {
        return fetchContent(db, 'deities', 'createdAt', pageSize);
      }
      return Promise.resolve([]);
    });
    
    const allContentArrays = await Promise.all(fetchPromises);
    const allItems = allContentArrays.flat().filter((item): item is FeedItem => {
      // Filter out any items without valid string IDs
      return item !== null && item.id && typeof item.id === 'string';
    });

    // Step 3: Score and rank items based on user preferences
    // Filter out any items without valid IDs before scoring
    const validItems = allItems.filter((item): item is FeedItem => {
      return item !== null && item.id && typeof item.id === 'string';
    });
    
    const scoredItems = validItems.map(item => {
      let score = 0;
      
      // Strong boost for content from followed users
      if (followingUserIds.length > 0 && item.meta?.authorId) {
        if (followingUserIds.includes(item.meta.authorId) || followingUserIds.includes(item.meta.userId)) {
          score += 200; // Very strong boost for followed users
        }
      }
      
      // Base score from recency (newer items get higher base score)
      const createdAt = new Date(item.createdAt || new Date());
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 100 - daysSinceCreation); // Decay over time
      
      // Boost items with high engagement (especially for trending mode)
      const likes = item.meta?.likes || 0;
      const views = item.meta?.views || 0;
      const commentsCount = item.meta?.commentsCount || 0;
      const engagementMultiplier = trending ? 3 : 1; // Higher weight for trending
      score += Math.log10(likes + 1) * 10 * engagementMultiplier;
      score += Math.log10(views + 1) * 5 * engagementMultiplier;
      score += Math.log10(commentsCount + 1) * 3 * engagementMultiplier;
      
      // Boost items related to favorite deities
      if (favoriteDeities.length > 0 && item.meta) {
        const itemDeities = item.meta.associatedDeities || [];
        const matchingDeities = itemDeities.filter((deity: string) => 
          favoriteDeities.some(fav => fav.toLowerCase().includes(deity.toLowerCase()) || deity.toLowerCase().includes(fav.toLowerCase()))
        );
        if (matchingDeities.length > 0) {
          score += 50 * matchingDeities.length; // Strong boost for favorite deities
        }
      }
      
      // Boost items by type (user might prefer certain content types)
      if (item.kind === 'video' || item.kind === 'media') {
        score += 10; // Slight preference for videos
      }
      
      return { ...item, _score: score };
    });
    
    // Step 4: Sort by score (highest first)
    const sortedByScore = scoredItems.sort((a, b) => b._score - a._score);
    
    // Step 5: For trending mode, return top items by engagement only
    // For normal feed, prioritize followed users then add variety
    let finalFeed: FeedItem[];
    
    if (trending) {
      // Trending: Just return top items by score (engagement)
      finalFeed = sortedByScore.slice(0, pageSize);
    } else {
      // Normal feed: Prioritize followed users, then add variety
      const followedUserItems = sortedByScore.filter(item => 
        followingUserIds.length > 0 && 
        (item.meta?.authorId && followingUserIds.includes(item.meta.authorId)) ||
        (item.meta?.userId && followingUserIds.includes(item.meta.userId))
      );
      
      const otherItems = sortedByScore.filter(item => 
        !followedUserItems.some(followed => followed.id === item.id)
      );
      
      // Interleave: 1 followed user item, then 2-3 other items
      finalFeed = [];
      let followedIndex = 0;
      let otherIndex = 0;
      
      while (finalFeed.length < pageSize && (followedIndex < followedUserItems.length || otherIndex < otherItems.length)) {
        // Add followed user item if available
        if (followedIndex < followedUserItems.length && finalFeed.length < pageSize) {
          finalFeed.push(followedUserItems[followedIndex]);
          followedIndex++;
        }
        
        // Add 2-3 other items
        for (let i = 0; i < 3 && otherIndex < otherItems.length && finalFeed.length < pageSize; i++) {
          finalFeed.push(otherItems[otherIndex]);
          otherIndex++;
        }
      }
    }
    
    // Generate cursor for pagination (using last item's ID)
    // Ensure the last item has a valid ID before using it as cursor
    const lastItem = finalFeed.length > 0 ? finalFeed[finalFeed.length - 1] : null;
    const cursor = lastItem?.id && typeof lastItem.id === 'string' ? lastItem.id : undefined;
    
    // Remove score property before returning
    return { 
      feed: finalFeed.map(({ _score, ...item }) => item),
      cursor 
    };
  }
);


// ---------------------------------------------------
// 4. Helper & Data Transformation Functions
// ---------------------------------------------------
const mapToFeedItem = (doc: DocumentData, kind: FeedItem['kind']): FeedItem | null => {
    const data = doc.data();
    if (!data || !doc.id) return null; // Ensure doc has an id

    let createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.uploadDate?.toDate ? data.uploadDate.toDate() : new Date());

    switch(kind) {
        case 'video':
        case 'media':
             return {
                id: `media-${doc.id}`,
                kind: "video",
                title: data.title_en ? { en: data.title_en, hi: data.title_hi, te: data.title_te } : data.title,
                description: data.description_en ? { en: data.description_en, hi: data.description_hi, te: data.description_te } : data.description,
                thumbnail: data.thumbnailUrl || "",
                mediaUrl: data.mediaUrl || "",
                meta: { duration: data.duration, views: data.views, userId: data.userId, channelName: data.channelName, likes: data.likes },
                createdAt: createdAt.toISOString(),
            };
        case 'temple':
             return {
                id: `temple-${doc.id}`,
                kind: "temple",
                title: data.name,
                description: data.importance?.mythological,
                thumbnail: data.media?.images?.[0]?.url,
                meta: { location: data.location, slug: data.slug, imageHint: data.media?.images?.[0]?.hint },
                createdAt: createdAt.toISOString(),
            };
        case 'story':
            return {
                id: `story-${doc.id}`,
                kind: "story",
                title: data.title,
                description: data.summary,
                thumbnail: data.image?.url,
                meta: { slug: data.slug, imageHint: data.image?.hint },
                createdAt: createdAt.toISOString(),
            };
        case 'deity':
             return {
                id: `deity-${doc.id}`,
                kind: "deity",
                title: data.name,
                description: data.description,
                thumbnail: data.images?.[0].url,
                meta: { slug: data.slug, imageHint: data.images?.[0]?.hint },
                createdAt: createdAt.toISOString(),
            };
        case 'post':
            return {
                id: `post-${doc.id}`,
                kind: 'post',
                title: undefined,
                description: { en: data.content },
                // CRITICAL: Never use videoUrl for thumbnail - next/image doesn't support videos
                thumbnail: data.imageUrl || undefined,
                mediaUrl: data.videoUrl || undefined,
                createdAt: createdAt.toISOString(),
                meta: { 
                    authorId: data.authorId, 
                    likes: data.likes || 0, 
                    commentsCount: data.commentsCount || 0, 
                    contextId: data.contextId, 
                    contextType: data.contextType,
                    postType: data.postType || 'general',
                    imageUrl: data.imageUrl,
                    videoUrl: data.videoUrl,
                    // Survey data
                    surveyOptions: data.surveyOptions || undefined,
                    surveyResponses: data.surveyResponses || undefined,
                    // Question data
                    questionOptions: data.questionOptions || undefined,
                    correctAnswer: data.correctAnswer !== undefined ? data.correctAnswer : undefined,
                    questionResponses: data.questionResponses || undefined,
                },
            }
        default:
            return null;
    }
}

async function fetchContent(db: Firestore, collectionName: string, dateField: string, limit: number): Promise<FeedItem[]> {
    try {
        let q;
        // Optimize posts query - use a more efficient approach
        // Instead of fetching 3x and filtering, we'll use a reasonable multiplier
        // and add a query optimization
        if (collectionName === 'posts') {
            // Fetch 2x limit to account for filtered posts (more efficient than 3x)
            // Most posts are general feed posts, so 2x should be sufficient
            q = db.collection(collectionName)
                .orderBy('createdAt', 'desc')
                .limit(Math.min(limit * 2, 100)); // Cap at 100 to prevent excessive reads
        } else {
            q = db.collection(collectionName)
                .orderBy(dateField, 'desc')
                .limit(limit);
        }
        
        const snapshot = await q.get();
        
        let docs = snapshot.docs;
        // Filter posts without contextId/contextType (general feed posts)
        if (collectionName === 'posts') {
            docs = docs.filter(doc => {
                const data = doc.data();
                return !data.contextId && !data.contextType;
            }).slice(0, limit);
        }
        
        return docs
            .map(doc => mapToFeedItem(doc, collectionName as any))
            .filter((item): item is FeedItem => {
              // Ensure item is not null and has a valid string ID
              return item !== null && item.id && typeof item.id === 'string';
            });
    } catch (e) {
        console.error(`Failed to fetch content from ${collectionName}:`, e);
        return [];
    }
}
