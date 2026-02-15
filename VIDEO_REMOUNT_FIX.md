# Video Element Remount Fix

## Critical Bug
Video element was being **remounted** (not paused), causing "Video metadata loaded" log to appear multiple times and interrupting playback.

## Root Cause

### 1. Key Prop on `<video>` Element (PRIMARY CULPRIT)
**Location:** `src/components/FeedCard.tsx:801` (REMOVED)

**Problem:**
```typescript
// BEFORE (REMOVED):
<video
  ref={videoRef}
  key={`video-${postId || item?.id || 'unknown'}`} // ❌ This caused remounts
  ...
/>
```

**Issue:**
- React treats elements with changing keys as different elements
- When `postId` or `item?.id` changed (even slightly), React would:
  1. Unmount the old `<video>` element
  2. Mount a new `<video>` element
  3. Trigger `onLoadedMetadata` again → "Video metadata loaded" log
  4. Restart video playback from beginning

**Fix:**
```typescript
// AFTER:
<video
  ref={videoRef}
  // ✅ No key prop - React reuses the same element
  ...
/>
```

### 2. Video URL State Changes
**Location:** `src/components/FeedCard.tsx:439`

**Problem:**
- `setSrc(url)` was called in useEffect
- If useEffect re-ran (due to dependency changes), it could reset `src`
- This would cause video to reload

**Fix:**
- Added `videoUrlRef` to store URL in ref (prevents unnecessary state changes)
- Added `postIdRef` to track postId changes (only reset for new posts)
- Use cached URL from ref if available instead of re-fetching

## Changes Made

### 1. Removed Key Prop from `<video>`
**Line 801 (REMOVED):**
```typescript
key={`video-${postId || item?.id || 'unknown'}`} // ❌ REMOVED
```

### 2. Added videoUrlRef
**Line 46:**
```typescript
const videoUrlRef = useRef<string | null>(null); // Store video URL in ref to prevent remounts
```

### 3. Added postIdRef to Track Post Changes
**Lines 422-437:**
```typescript
const postIdRef = useRef<string | null>(postId);

useEffect(() => {
  // Update postId ref only if it actually changed
  if (postId !== postIdRef.current) {
    console.log('FeedCard: postId changed, resetting srcSetRef', {
      oldPostId: postIdRef.current,
      newPostId: postId
    });
    postIdRef.current = postId;
    // Reset srcSetRef when postId changes (new post)
    srcSetRef.current = false;
    videoUrlRef.current = null;
    setSrc(null);
  }
}, [postId]);
```

### 4. Use Cached URL from Ref
**Lines 449-460:**
```typescript
// CRITICAL: If we already have the URL in ref, use it instead of fetching again
if (videoUrlRef.current) {
  console.log('FeedCard: Using cached video URL from ref', {
    postId,
    urlLength: videoUrlRef.current.length
  });
  setSrc(videoUrlRef.current);
  srcSetRef.current = true;
  setLoading(false);
  onVideoLoaded?.();
  return;
}
```

### 5. Store URL in Ref
**Lines 471-472:**
```typescript
// CRITICAL: Store URL in ref to prevent remounts
videoUrlRef.current = url;
```

## Verification

### FeedCard Key Prop
**Location:** `src/app/components/feed.tsx:50`

**Status:** ✅ CORRECT
```typescript
<div key={itemId}>  // ✅ Uses item.id as key - stable
  <FeedCard item={item} />
</div>
```

### Video URL Loading
**Status:** ✅ FIXED
- URL is fetched only once per post
- Stored in `videoUrlRef` to prevent re-fetching
- Only reset when `postId` actually changes (new post)

### Video Element
**Status:** ✅ FIXED
- No key prop - React reuses same element
- `src` is set once and stored in ref
- No remounts unless postId changes (new post)

## Testing

Check browser console for:
1. `FeedCard: Setting video src (first time)` - Should appear ONCE per post
2. `FeedCard: Using cached video URL from ref` - Should appear if useEffect re-runs
3. `FeedCard: postId changed, resetting srcSetRef` - Should appear only when switching to different post
4. `FeedCard: Video metadata loaded` - Should appear ONCE per post (not multiple times)

## Expected Behavior

- **Same post:** Video element should NOT remount, "Video metadata loaded" should appear ONCE
- **Different post:** Video element can remount (expected), but only when postId changes
- **Network:** Should see continuous 206 range requests without interruption

## Files Changed

1. `src/components/FeedCard.tsx` - Main fixes
   - Removed key prop from `<video>` (line 801)
   - Added `videoUrlRef` (line 46)
   - Added `postIdRef` tracking (lines 422-437)
   - Added cached URL logic (lines 449-460)







