# Feed Recommendation Logic Documentation

## Overview

The Aaura application uses a sophisticated **personalized feed recommendation system** that combines multiple signals to curate content for each user. The system is designed to balance relevance with variety, ensuring users see both content they're interested in and fresh discoveries.

## Architecture

### Components

1. **Server-Side Flow** (`src/ai/flows/personalized-feed.ts`)
   - Genkit-powered AI flow that generates personalized feeds
   - Runs on the server for optimal performance and security
   - Fetches content from multiple Firestore collections in parallel

2. **Client-Side Hook** (`src/hooks/use-feed.ts`)
   - React hook that manages feed state and pagination
   - Handles loading, refreshing, and infinite scroll
   - Provides real-time updates

3. **UI Components**
   - `FeedPage` (`src/app/feed/page.tsx`): Main feed page with search and refresh
   - `FeedCard` (`src/components/FeedCard.tsx`): Individual content cards
   - `Feed` (`src/app/components/feed.tsx`): Feed list container

## Recommendation Algorithm

### Step 1: User Preferences Fetching

```typescript
// Fetch user preferences from Firestore
const userPrefsRef = db.collection('users').doc(userId)
  .collection('preferences').doc('default');
```

**User Preferences Stored:**
- `favoriteDeities`: Array of deity slugs the user follows
- `interests`: Array of user interests (e.g., ["meditation", "bhajans"])
- `language`: Preferred language for content

### Step 2: Content Aggregation

The system fetches content from **5 collections** in parallel:

1. **Media** (`media` collection)
   - Videos, bhajans, podcasts, pravachans
   - Ordered by `uploadDate` (descending)

2. **Posts** (`posts` collection)
   - User-generated posts with text, images, videos
   - Filtered to show only general posts (no `contextId`/`contextType`)
   - Ordered by `createdAt` (descending)

3. **Stories** (`stories` collection)
   - Epic sagas and mythological stories
   - Ordered by `createdAt` (descending)

4. **Temples** (`temples` collection)
   - Temple information and pilgrimage guides
   - Ordered by `createdAt` (descending)

5. **Deities** (`deities` collection)
   - Deity information and worship guides
   - Ordered by `createdAt` (descending)

### Step 3: Scoring Algorithm

Each content item receives a **relevance score** based on multiple factors:

#### Base Score (Recency)
```typescript
const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
score += Math.max(0, 100 - daysSinceCreation); // Decay over time
```
- **Newer content** gets higher base scores
- Score decays linearly over days
- Maximum base score: 100 points

#### Engagement Boost
```typescript
score += Math.log10(likes + 1) * 10;  // Logarithmic boost for likes
score += Math.log10(views + 1) * 5;    // Logarithmic boost for views
```
- **Likes**: Logarithmic boost (10x multiplier)
- **Views**: Logarithmic boost (5x multiplier)
- Uses logarithmic scale to prevent viral content from dominating

#### Personalization Boost
```typescript
// Boost items related to favorite deities
if (favoriteDeities.length > 0 && item.meta) {
  const matchingDeities = itemDeities.filter(deity => 
    favoriteDeities.includes(deity)
  );
  if (matchingDeities.length > 0) {
    score += 50 * matchingDeities.length; // Strong boost
  }
}
```
- **Favorite Deities**: +50 points per matching deity
- Strong personalization signal

#### Content Type Preference
```typescript
if (item.kind === 'video' || item.kind === 'media') {
  score += 10; // Slight preference for videos
}
```
- Slight boost for video content (+10 points)

### Step 4: Ranking and Variety

#### Primary Sorting
```typescript
const sortedByScore = scoredItems.sort((a, b) => b._score - a._score);
```
- Items sorted by relevance score (highest first)

#### Variety Injection
```typescript
// Top 60% by score
const topItems = sortedByScore.slice(0, Math.floor(sortedByScore.length * 0.6));

// Remaining 40% shuffled for variety
const remainingItems = sortedByScore.slice(Math.floor(sortedByScore.length * 0.6));
const shuffledRemaining = remainingItems.sort(() => 0.5 - Math.random());
```

**Strategy:**
- **Top 60%**: Highest-scored items (most relevant)
- **Remaining 40%**: Shuffled for discovery and variety
- Prevents filter bubbles and promotes content diversity

#### Final Interleaving
```typescript
// Interleave top items with variety items
for (let i = 0; i < maxLength; i++) {
  if (i < topItems.length) {
    finalFeed.push(topItems[i]);
  }
  if (i < shuffledRemaining.length && finalFeed.length < pageSize) {
    finalFeed.push(shuffledRemaining[i]);
  }
}
```

## Scoring Formula Summary

```
Final Score = 
  Base Score (Recency) +
  Engagement Boost (Likes × 10 + Views × 5) +
  Personalization Boost (Favorite Deities × 50) +
  Content Type Boost (Videos +10)
```

## Example Scoring

### Example 1: New Video with Favorite Deity
```
Base Score: 95 (1 day old)
Likes: 100 → log10(101) × 10 = 20
Views: 1000 → log10(1001) × 5 = 15
Favorite Deity Match: 50
Content Type: 10
─────────────────────────────
Total Score: 190
```

### Example 2: Old Post without Personalization
```
Base Score: 20 (80 days old)
Likes: 5 → log10(6) × 10 = 7.8
Views: 50 → log10(51) × 5 = 8.5
Favorite Deity Match: 0
Content Type: 0
─────────────────────────────
Total Score: 36.3
```

## Feed Refresh Strategy

### Auto-Refresh
- **Interval**: 30 seconds
- **Purpose**: Show new content without manual refresh
- **Implementation**: `useEffect` with `setInterval`

### Manual Refresh
- **Trigger**: User clicks "Refresh" button
- **Behavior**: Immediately fetches new feed
- **Loading State**: Shows spinner during refresh

### Pagination
- **Initial Load**: 20 items
- **Load More**: Fetches next 20 items
- **Deduplication**: Filters out items already in feed

## Performance Optimizations

1. **Parallel Fetching**: All collections fetched simultaneously
2. **Client-Side Filtering**: Post filtering happens client-side (Firestore limitation)
3. **Caching**: Feed items cached in React state
4. **Lazy Loading**: Images loaded on demand
5. **Optimistic Updates**: UI updates immediately, syncs with server

## Future Enhancements

### Planned Features

1. **Machine Learning Integration**
   - Train models on user behavior
   - Learn from likes, views, and time spent
   - Predict content preferences

2. **Collaborative Filtering**
   - "Users who liked X also liked Y"
   - Similar user recommendations

3. **Content-Based Filtering**
   - Analyze content tags and descriptions
   - Match with user interests

4. **Time-Based Personalization**
   - Show morning content in morning
   - Festival content during festivals
   - Seasonal relevance

5. **A/B Testing Framework**
   - Test different scoring algorithms
   - Measure engagement metrics
   - Optimize for user satisfaction

## Data Structure

### Feed Item Schema
```typescript
type FeedItem = {
  id: string;                    // Unique ID (e.g., "media-abc123")
  kind: 'video' | 'temple' | 'story' | 'deity' | 'post' | 'media';
  title?: { [lang: string]: string };
  description?: { [lang: string]: string };
  thumbnail?: string;
  mediaUrl?: string;
  meta?: {
    likes?: number;
    views?: number;
    authorId?: string;
    associatedDeities?: string[];
    // ... other metadata
  };
  createdAt?: string;            // ISO date string
};
```

### User Preferences Schema
```typescript
type UserPreferences = {
  favoriteDeities: string[];      // Array of deity slugs
  interests: string[];             // Array of interest tags
  language: string;                // Preferred language code
};
```

## Monitoring and Analytics

### Key Metrics to Track

1. **Engagement Metrics**
   - Average time spent on feed
   - Click-through rate
   - Like/comment rates

2. **Relevance Metrics**
   - User satisfaction scores
   - Content diversity index
   - Personalization effectiveness

3. **Performance Metrics**
   - Feed load time
   - API response time
   - Cache hit rate

## Troubleshooting

### Common Issues

1. **Feed Not Loading**
   - Check Firestore indexes are built
   - Verify user authentication
   - Check network connectivity

2. **Low Relevance Scores**
   - Ensure user preferences are set
   - Check content has proper metadata
   - Verify scoring algorithm parameters

3. **Performance Issues**
   - Reduce page size
   - Optimize Firestore queries
   - Implement caching

## Conclusion

The feed recommendation system is designed to be **transparent, personalized, and performant**. It balances relevance with variety, ensuring users discover new content while seeing content aligned with their interests. The algorithm is continuously improved based on user feedback and engagement metrics.

