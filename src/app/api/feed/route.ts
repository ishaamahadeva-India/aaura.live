import { NextRequest, NextResponse } from 'next/server'
import { getPersonalizedFeed } from '@/ai/flows/personalized-feed'

import { db } from '@/lib/firebase/admin'

// Simple in-memory cache with TTL (for high-traffic periods like Samuhikaa)
const cache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 15 * 1000 // 15 seconds cache for feed data

function getCacheKey(userId: string | undefined, pageSize: number, lastCursor: string | undefined, filter: string, trending: boolean): string {
  return `feed:${userId || 'anonymous'}:${pageSize}:${lastCursor || 'initial'}:${filter}:${trending}`
}

function getCached(key: string): any | null {
  const cached = cache.get(key)
  if (!cached) return null
  if (Date.now() > cached.expires) {
    cache.delete(key)
    return null
  }
  return cached.data
}

function setCache(key: string, data: any): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL,
  })
  // Clean up expired entries periodically
  if (cache.size > 1000) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (now > v.expires) {
        cache.delete(k)
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || undefined
  const pageSizeParam = searchParams.get('pageSize') || '20'
  const lastCursor = searchParams.get('lastCursor') || undefined
  const filter = searchParams.get('filter') || 'all'
  const trending = searchParams.get('trending') === 'true'

  const pageSize = Number.isNaN(Number(pageSizeParam))
    ? 20
    : Math.max(1, Math.min(50, Number(pageSizeParam)))

  // Check cache first (only for initial loads, not pagination)
  if (!lastCursor) {
    const cacheKey = getCacheKey(userId, pageSize, lastCursor, filter, trending)
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          'X-Cache': 'HIT',
        },
      })
    }
  }

  try {
    const feed = await getPersonalizedFeed({
      userId,
      pageSize,
      lastCursor,
      filter: filter !== 'all' ? filter : undefined,
      trending,
    })

    // Cache the result (only for initial loads)
    if (!lastCursor) {
      const cacheKey = getCacheKey(userId, pageSize, lastCursor, filter, trending)
      setCache(cacheKey, feed)
    }

    return NextResponse.json(feed, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Failed to generate personalized feed:', error)
    try {
      const snapshot = await db
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .get()
      const fallbackFeed = snapshot.docs.map((doc) => ({
        id: doc.id,
        kind: 'post',
        title: undefined,
        description: { en: doc.data().content || '' },
        // CRITICAL: Never use videoUrl for thumbnail - next/image doesn't support videos
        thumbnail: doc.data().imageUrl || undefined,
        mediaUrl: doc.data().videoUrl || undefined,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        meta: {
          authorId: doc.data().authorId,
          likes: doc.data().likes || 0,
          commentsCount: doc.data().commentsCount || 0,
          contextId: doc.data().contextId,
          contextType: doc.data().contextType,
          postType: doc.data().postType || 'general',
          imageUrl: doc.data().imageUrl,
          videoUrl: doc.data().videoUrl,
        },
      }))
      return NextResponse.json(
        {
          feed: fallbackFeed,
          cursor: fallbackFeed.length ? fallbackFeed[fallbackFeed.length - 1].id : undefined,
          error: 'Personalized feed unavailable; showing latest posts instead.',
        },
        { status: 200 }
      )
    } catch (fallbackError) {
      console.error('Fallback feed fetch failed:', fallbackError)
      return NextResponse.json(
        {
          feed: [],
          error: 'Unable to load feed at the moment. Please try again shortly.',
        },
        { status: 500 }
      )
    }
  }
}
