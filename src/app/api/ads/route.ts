import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveAds } from '@/lib/ads/server';
import type { AdType, AdCategory } from '@/types/ads';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'feed') as AdType;
  const category = searchParams.get('category') as AdCategory | null;
  const limit = Number(searchParams.get('limit') || '12');

  try {
    const ads = await fetchActiveAds({
      type,
      category: category ?? undefined,
      limit: Number.isNaN(limit) ? 12 : limit,
    });
    return NextResponse.json({ ads });
  } catch (error) {
    console.error('Failed to fetch ads', error);
    return NextResponse.json({ ads: [], error: 'Failed to fetch ads' }, { status: 500 });
  }
}
