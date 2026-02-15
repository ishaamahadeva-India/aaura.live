# Feed Implementation Guide

## Where Posts and Videos Appear

### 1. **Posts Created from "For You" Page**
- **Location**: Posts appear on the **"For You" feed page** (`/feed`)
- **How it works**:
  - When you create a post from the "For You" page using the "Create Post" button
  - The post is saved to Firestore **without** `contextId` or `contextType` (making it a general feed post)
  - These posts are fetched by the personalized feed algorithm
  - They appear in the feed alongside other content (videos, temples, stories, deities)

### 2. **Videos Uploaded**
- **Location**: Videos appear on the **"For You" feed page** (`/feed`) AND the **Media Library** (`/media`)
- **How it works**:
  - When you upload a video through the "Upload Video" button
  - The video is saved to the `media` collection in Firestore with `status: 'approved'`
  - The personalized feed algorithm automatically includes videos from the `media` collection
  - Videos appear in:
    - The "For You" feed (personalized feed)
    - The Media Library page (organized by category)
    - Your channel page (if you have a channel)

### 3. **Landing Page**
- **Purpose**: The landing page (`/landing`) is a **marketing/onboarding page** for non-logged-in users
- **Content**: It does NOT show posts or videos - it's a showcase page with:
  - Feature highlights
  - Call-to-action buttons
  - Information about the platform
- **Flow**: When logged in, users are redirected to `/feed` (For You page)

## Feed Refresh Mechanism

### Automatic Refresh
- **Auto-refresh**: The feed automatically refreshes every **30 seconds** to show new content
- **When it happens**: While you're on the "For You" page, new posts and videos will appear automatically

### Manual Refresh
- **Refresh Button**: There's a "Refresh" button at the top of the "For You" page
- **When to use**: Click it to manually refresh the feed and see the latest content immediately

### After Creating Posts
- **Immediate feedback**: After creating a post, the feed automatically refreshes after 1 second
- **Toast notification**: You'll see a success message: "Your post has been shared with the community and will appear in the feed shortly."
- **Delay**: There's a 1-second delay to ensure Firestore has updated before refreshing

### After Uploading Videos
- **Redirect**: After uploading, you're redirected to the feed page
- **Toast notification**: You'll see: "Your video has been published and will appear in the 'For You' feed shortly!"
- **Auto-appears**: Videos appear in the feed automatically (via the personalized feed algorithm)

## Content Types in Feed

The "For You" feed includes:
1. **General Posts** (from "Create Post" button)
   - Text posts
   - Image posts
   - Video posts
   - Posts with no `contextId`/`contextType`

2. **Videos/Media** (from "Upload Video" button)
   - Spiritual videos
   - Bhajans
   - Podcasts
   - Pravachans
   - Shorts
   - Audiobooks

3. **Other Content**
   - Temples
   - Stories
   - Deities
   - (Personalized based on user preferences)

## How to Use

### Creating Posts
1. Go to the "For You" page (`/feed`)
2. Click "Create Post" or click on "What's on your mind?"
3. Write your content, optionally add image/video
4. Select post type (Update, Question, Experience, General)
5. Click "Post"
6. Your post will appear in the feed shortly (auto-refreshes after 1 second)

### Uploading Videos
1. Go to the "For You" page (`/feed`)
2. Click "Upload Video"
3. Fill in video details (title, description, select media type)
4. Upload your video file
5. After upload completes, you'll be redirected to the feed
6. Your video will appear in the feed automatically

### Viewing Your Content
- **Your Posts**: Appear in the "For You" feed alongside other community posts
- **Your Videos**: Appear in:
  - The "For You" feed
  - The Media Library page (organized by category)
  - Your channel page (if you have a channel)

## Suggestions for Improvement

### Current Implementation
✅ Posts and videos appear in the "For You" feed
✅ Auto-refresh every 30 seconds
✅ Manual refresh button
✅ Automatic refresh after creating posts
✅ Videos redirect to feed after upload

### Potential Enhancements
1. **Real-time Updates**: Use Firestore real-time listeners instead of polling
2. **Optimistic UI**: Show posts immediately before server confirmation
3. **Infinite Scroll**: Load more content as user scrolls
4. **Filtering**: Allow users to filter feed by content type
5. **Notifications**: Notify users when their content is liked/commented
6. **Trending**: Show trending posts/videos section
7. **Following**: Show content from users you follow first
8. **Personalization**: Better AI-based content recommendations

## Technical Details

### Data Flow
1. **Post Creation**:
   - User creates post → Saved to `posts` collection (no `contextId`/`contextType`)
   - Personalized feed algorithm fetches general posts
   - Feed refreshes automatically

2. **Video Upload**:
   - User uploads video → Saved to `media` collection with `status: 'approved'`
   - Personalized feed algorithm fetches approved media
   - Feed includes videos automatically

3. **Feed Generation**:
   - Server-side function (`getPersonalizedFeed`) combines content from multiple collections
   - Shuffles content for variety
   - Returns mixed feed of posts, videos, temples, stories, deities

### Files Involved
- `src/app/feed/page.tsx` - The "For You" page
- `src/components/CreatePostDialog.tsx` - Post creation dialog
- `src/app/components/CreateContent.tsx` - Create post/video buttons
- `src/hooks/use-feed.ts` - Feed data fetching hook
- `src/ai/flows/personalized-feed.ts` - Feed generation algorithm
- `src/components/FeedCard.tsx` - Feed item display component
- `src/app/upload/page.tsx` - Video upload page

