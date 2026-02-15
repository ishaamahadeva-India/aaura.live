# Fix for Different Layouts Between Domains

## Problem
The feed page layout looks different between:
- `aaura-india.vercel.app` (Vercel default domain)
- `aaura.live` (custom domain)

## Root Cause
1. **Service Worker Caching**: CSS files are cached per domain, so different cached versions are served
2. **CDN Cache**: Vercel CDN might cache differently per domain
3. **Browser Cache**: Different browser cache per domain

## Solution
1. Update service worker to never cache CSS files (always fetch fresh)
2. Add cache-busting headers for CSS
3. Ensure consistent layout rendering across domains

## Quick Fix (Temporary)
Clear service worker cache on both domains:
1. Open browser DevTools (F12)
2. Go to Application → Service Workers
3. Unregister all service workers
4. Go to Application → Cache Storage
5. Delete all caches
6. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

## Permanent Fix
The code changes below will prevent CSS caching issues.

