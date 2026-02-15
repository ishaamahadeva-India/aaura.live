import { NextRequest, NextResponse } from 'next/server';

const TRACK_LIMIT = 5000;
const WINDOW_MS = 60_000;

const memoryTracker = new Map<string, { count: number; expiresAt: number }>();

function shouldAllow(ip: string) {
  const now = Date.now();
  const entry = memoryTracker.get(ip);

  if (!entry || entry.expiresAt < now) {
    memoryTracker.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= TRACK_LIMIT) {
    return false;
  }

  entry.count += 1;
  memoryTracker.set(ip, entry);
  return true;
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/api/ads/track') {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
    if (!shouldAllow(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/ads/track'],
};
