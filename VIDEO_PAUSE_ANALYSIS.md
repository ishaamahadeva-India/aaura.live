# Video Pause Analysis - Code Paths That Were Stopping Playback

## Summary
Videos were stopping consistently at ~15 seconds due to multiple pause logic paths interfering with playback.

## Code Paths That Were Pausing Videos

### 1. IntersectionObserver (PRIMARY CULPRIT)
**Location:** `src/components/FeedCard.tsx:235-308`

**Problem:**
- Used `!entry.isIntersecting` which triggers even when video is slightly out of viewport
- Threshold was too low (0.001) causing premature pauses
- Even with active video checks, IntersectionObserver was still running and could pause

**Fix:**
- **DISABLED IntersectionObserver completely for active videos** (line 164-168)
- Changed from `isIntersecting` to `intersectionRatio >= 0.6` for non-active videos
- Added multiple thresholds `[0, 0.1, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]` to track ratio accurately
- Added `console.trace()` to identify when pause is called

**Code:**
```typescript
// BEFORE: IntersectionObserver ran for ALL videos, including active ones
if (isActiveVideo) {
  // Complex logic that still allowed pauses...
}

// AFTER: IntersectionObserver completely disabled for active videos
if (isActiveVideo) {
  console.log('FeedCard: Active video detected - IntersectionObserver DISABLED to prevent pauses');
  return; // Exit early - no observer for active videos
}
```

### 2. onTimeUpdate Pause/Resume Logic (SECONDARY ISSUE)
**Location:** `src/components/FeedCard.tsx:752-771` (HLS) and `src/components/FeedCard.tsx:928-933` (MP4)

**Problem:**
- onTimeUpdate was checking if video is paused and trying to resume
- This created a pause/resume loop that could interfere with playback
- Especially problematic during buffering or network hiccups

**Fix:**
- **REMOVED onTimeUpdate pause/resume logic completely**
- onTimeUpdate now only saves state, never modifies playback

**Code:**
```typescript
// BEFORE: onTimeUpdate tried to resume paused videos
onTimeUpdate={(currentTime) => {
  if (video && isActiveVideo && video.paused && !video.ended && currentTime > 0) {
    video.play().catch(() => {});
  }
}}

// AFTER: onTimeUpdate only saves state
onTimeUpdate={(e) => {
  const video = e.currentTarget;
  if (postId && isActiveVideo && !video.ended) {
    saveVideoState(postId, video.currentTime, !video.paused);
  }
}}
```

### 3. ActiveVideoContext Pause Logic
**Location:** `src/contexts/ActiveVideoContext.tsx:64-66`

**Problem:**
- Pauses other videos when one becomes active
- Could potentially pause the active video if timing is off

**Fix:**
- Added `console.trace()` to identify when this pauses videos
- Logic already checks `!isActiveVideo` but trace helps debug

### 4. HLSVideoPlayer Pause Logic
**Location:** `src/components/HLSVideoPlayer.tsx:260`

**Problem:**
- Pauses video when it becomes inactive
- Could interfere if active state changes unexpectedly

**Fix:**
- Added `console.trace()` to identify when this pauses videos

### 5. handleDoubleTap Single Tap Pause
**Location:** `src/components/FeedCard.tsx:467`

**Problem:**
- User single tap pauses video (intended behavior)
- Not a bug, but added trace for debugging

**Fix:**
- Added `console.trace()` to identify user-initiated pauses

### 6. handlePlay Pause Other Videos
**Location:** `src/components/FeedCard.tsx:131`

**Problem:**
- Pauses other videos when one starts playing
- Should only pause non-active videos

**Fix:**
- Added `console.trace()` to identify when this pauses videos
- Logic already checks `!isOtherActiveVideo`

## Changes Made

### 1. IntersectionObserver Fix
- **Disabled completely for active videos** - no observer created at all
- Changed threshold logic from `isIntersecting` to `intersectionRatio >= 0.6`
- Added multiple thresholds for accurate ratio tracking

### 2. Removed onTimeUpdate Interference
- Removed all pause/resume logic from onTimeUpdate handlers
- onTimeUpdate now only saves state

### 3. Added Debugging
- Added `console.trace()` to all `video.pause()` calls
- This will show the exact call stack when a pause occurs

### 4. Verified video.src
- Confirmed `video.src` is set exactly ONCE (line 439)
- Never reassigned after initial load

## Testing

When testing, check browser console for:
1. `console.trace()` output showing pause call stacks
2. `FeedCard: Active video detected - IntersectionObserver DISABLED` message
3. Any pause traces that shouldn't be happening

## Expected Behavior

- **Active videos:** Should play continuously without any pauses
- **Non-active videos:** Can be paused by IntersectionObserver if `intersectionRatio < 0.6`
- **User-initiated pauses:** Still work via single tap (intended)

## Files Changed

1. `src/components/FeedCard.tsx` - Main fixes
2. `src/contexts/ActiveVideoContext.tsx` - Added trace
3. `src/components/HLSVideoPlayer.tsx` - Added trace







