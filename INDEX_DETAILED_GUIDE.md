# Detailed Firestore Index Guide - Collection vs Collection Group

## Understanding Query Scope

### **Collection Scope** (Most Common)
- Use for: **Top-level collections** in Firestore
- Examples: `posts`, `media`, `users`, `notifications`
- When to use: When querying a specific collection directly
- Example query: `collection(db, 'posts').orderBy('createdAt', 'desc')`

### **Collection Group Scope** (For Subcollections)
- Use for: **Subcollections** that appear under multiple parent documents
- Examples: `comments`, `replies`, `likes` (when they're subcollections)
- When to use: When querying across all instances of a subcollection regardless of parent
- Example query: Querying all `comments` across `posts/{id}/comments`, `media/{id}/comments`, etc.

---

## 📋 ALL INDEXES - DETAILED BREAKDOWN

---

## 🔵 SIMPLE INDEXES (Single Field) - Collection Scope

### 1. Temples - Rating Index
- **Collection ID**: `temples`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `rating` → Descending
- **Purpose**: Sort temples by rating

### 2. Deities - CreatedAt Index
- **Collection ID**: `deities`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Sort deities by creation date (newest first)

### 3. Stories - CreatedAt Index
- **Collection ID**: `stories`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Sort stories by creation date (newest first)

### 4. Festivals - Date Index
- **Collection ID**: `festivals`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `date` → Ascending
- **Purpose**: Sort festivals by date (chronological order)

### 5. Media - UploadDate Index
- **Collection ID**: `media`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `uploadDate` → Descending
- **Purpose**: Sort media by upload date (newest first)

### 6. Posts - CreatedAt Index
- **Collection ID**: `posts`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Sort posts by creation date (newest first)

### 7. Channels - FollowerCount Index
- **Collection ID**: `channels`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `followerCount` → Descending
- **Purpose**: Sort channels by popularity (most followers first)

### 8. Chants - CreatedAt Index
- **Collection ID**: `chants`
- **Query Scope**: **Collection** ✅
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Sort chants by creation date (newest first)

---

## 🟢 COMPOSITE INDEXES (Multiple Fields) - Collection Scope

### 9. Products - Inventory & Popularity Index
- **Collection ID**: `products`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `inventory` → Ascending
  2. `popularity` → Descending
- **Purpose**: Query products by inventory level and sort by popularity
- **Example Query**: `where('inventory', '>', 0).orderBy('popularity', 'desc')`

### 10. Temples - Location & Deity Index
- **Collection ID**: `temples`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `location.state` → Ascending
  2. `deity.name` → Ascending
- **Purpose**: Filter temples by state and deity
- **Example Query**: `where('location.state', '==', 'Karnataka').orderBy('deity.name')`

### 11. Media - Category & UploadDate Index
- **Collection ID**: `media`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `category` → Ascending
  2. `uploadDate` → Descending
- **Purpose**: Filter media by category, sort by upload date
- **Example Query**: `where('category', '==', 'Bhajan').orderBy('uploadDate', 'desc')`

### 12. Media - Language & UploadDate Index
- **Collection ID**: `media`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `language` → Ascending
  2. `uploadDate` → Descending
- **Purpose**: Filter media by language, sort by upload date
- **Example Query**: `where('language', '==', 'Hindi').orderBy('uploadDate', 'desc')`

### 13. Comments - ContentId & CreatedAt Index
- **Collection ID**: `comments`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `contentId` → Ascending
  2. `createdAt` → Ascending
- **Purpose**: Get comments for specific content, sorted chronologically
- **Example Query**: `where('contentId', '==', 'post123').orderBy('createdAt')`
- **Note**: This is for top-level comments collection (if you have one)

### 14. Likes - UserId & CreatedAt Index
- **Collection ID**: `likes`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `userId` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Get all likes by a user, sorted by date
- **Example Query**: `where('userId', '==', 'user123').orderBy('createdAt', 'desc')`

### 15. Bookmarks - UserId & CreatedAt Index
- **Collection ID**: `bookmarks`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `userId` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Get user's bookmarks, sorted by date
- **Example Query**: `where('userId', '==', 'user123').orderBy('createdAt', 'desc')`

### 16. Playlists - IsPublic, Category & CreatedAt Index
- **Collection ID**: `playlists`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `isPublic` → Ascending
  2. `category` → Ascending
  3. `createdAt` → Descending
- **Purpose**: Filter playlists by public/private and category, sort by date
- **Example Query**: `where('isPublic', '==', true).where('category', '==', 'Spiritual').orderBy('createdAt', 'desc')`

### 17. VirtualOfferings - UserId & Timestamp Index
- **Collection ID**: `virtualOfferings`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `userId` → Ascending
  2. `timestamp` → Descending
- **Purpose**: Get user's virtual offerings, sorted by timestamp
- **Example Query**: `where('userId', '==', 'user123').orderBy('timestamp', 'desc')`

### 18. Posts - AuthorId & CreatedAt Index
- **Collection ID**: `posts`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `authorId` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Get posts by a specific author, sorted by date
- **Example Query**: `where('authorId', '==', 'user123').orderBy('createdAt', 'desc')`

### 19. Media - UserId & Status Index
- **Collection ID**: `media`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `userId` → Ascending
  2. `status` → Ascending
- **Purpose**: Get user's media filtered by status
- **Example Query**: `where('userId', '==', 'user123').where('status', '==', 'approved')`

### 20. Posts - ContextType, ContextId & CreatedAt Index
- **Collection ID**: `posts`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `contextType` → Ascending
  2. `contextId` → Ascending
  3. `createdAt` → Descending
- **Purpose**: Get posts for a specific context (temple/group), sorted by date
- **Example Query**: `where('contextType', '==', 'temple').where('contextId', '==', 'temple123').orderBy('createdAt', 'desc')`

### 21. Media - MediaType, Status & UploadDate Index
- **Collection ID**: `media`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `mediaType` → Ascending
  2. `status` → Ascending
  3. `uploadDate` → Descending
- **Purpose**: Filter media by type and status, sort by upload date
- **Example Query**: `where('mediaType', '==', 'video').where('status', '==', 'approved').orderBy('uploadDate', 'desc')`

### 22. Contests - Status & CreatedAt Index
- **Collection ID**: `contests`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `status` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Filter contests by status, sort by date
- **Example Query**: `where('status', '==', 'active').orderBy('createdAt', 'desc')`

### 23. Likes - ContentId & CreatedAt Index
- **Collection ID**: `likes`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `contentId` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Get likes for specific content, sorted by date
- **Example Query**: `where('contentId', '==', 'post123').orderBy('createdAt', 'desc')`

### 24. Notifications - UserId & CreatedAt Index ⚠️ **CRITICAL**
- **Collection ID**: `notifications`
- **Query Scope**: **Collection** ✅
- **Fields**:
  1. `userId` → Ascending
  2. `createdAt` → Descending
- **Purpose**: Get user's notifications, sorted by date (newest first)
- **Example Query**: `where('userId', '==', 'user123').orderBy('createdAt', 'desc')`
- **Status**: 🔴 **REQUIRED** - App won't work without this!

---

## 🟡 COLLECTION GROUP INDEXES (For Subcollections)

### 25. Comments - CreatedAt Index (Collection Group) ⚠️ **CRITICAL**
- **Collection ID**: `comments`
- **Query Scope**: **Collection group** ⚠️ (Important!)
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Query all comments across all parent documents (posts, media, manifestations, etc.)
- **Example Query**: Querying `posts/{id}/comments`, `media/{id}/comments`, `manifestations/{id}/comments` all together
- **Status**: 🔴 **REQUIRED** - Comments feature needs this!

### 26. Replies - CreatedAt Index (Collection Group - Ascending) ⚠️ **CRITICAL**
- **Collection ID**: `replies`
- **Query Scope**: **Collection group** ⚠️ (Important!)
- **Fields**:
  - `createdAt` → Ascending
- **Purpose**: Query all replies across all comment subcollections, sorted ascending (oldest first)
- **Example Query**: Querying `posts/{id}/comments/{id}/replies` across all posts
- **Status**: 🔴 **REQUIRED** - Replies feature needs this!

### 27. Replies - CreatedAt Index (Collection Group - Descending) ⚠️ **CRITICAL**
- **Collection ID**: `replies`
- **Query Scope**: **Collection group** ⚠️ (Important!)
- **Fields**:
  - `createdAt` → Descending
- **Purpose**: Query all replies across all comment subcollections, sorted descending (newest first)
- **Example Query**: Same as above but newest replies first
- **Status**: 🔴 **REQUIRED** - Replies feature needs this!

---

## 📊 SUMMARY TABLE

| Index # | Collection | Scope | Type | Fields | Priority |
|---------|-----------|-------|------|--------|----------|
| 1 | temples | Collection | Simple | rating (Desc) | Optional |
| 2 | deities | Collection | Simple | createdAt (Desc) | Optional |
| 3 | stories | Collection | Simple | createdAt (Desc) | Optional |
| 4 | festivals | Collection | Simple | date (Asc) | Optional |
| 5 | media | Collection | Simple | uploadDate (Desc) | Optional |
| 6 | posts | Collection | Simple | createdAt (Desc) | Optional |
| 7 | channels | Collection | Simple | followerCount (Desc) | Optional |
| 8 | chants | Collection | Simple | createdAt (Desc) | Optional |
| 9 | products | Collection | Composite | inventory (Asc) + popularity (Desc) | Optional |
| 10 | temples | Collection | Composite | location.state (Asc) + deity.name (Asc) | Optional |
| 11 | media | Collection | Composite | category (Asc) + uploadDate (Desc) | Optional |
| 12 | media | Collection | Composite | language (Asc) + uploadDate (Desc) | Optional |
| 13 | comments | Collection | Composite | contentId (Asc) + createdAt (Asc) | Optional |
| 14 | likes | Collection | Composite | userId (Asc) + createdAt (Desc) | Optional |
| 15 | bookmarks | Collection | Composite | userId (Asc) + createdAt (Desc) | Optional |
| 16 | playlists | Collection | Composite | isPublic (Asc) + category (Asc) + createdAt (Desc) | Optional |
| 17 | virtualOfferings | Collection | Composite | userId (Asc) + timestamp (Desc) | Optional |
| 18 | posts | Collection | Composite | authorId (Asc) + createdAt (Desc) | Optional |
| 19 | media | Collection | Composite | userId (Asc) + status (Asc) | Optional |
| 20 | posts | Collection | Composite | contextType (Asc) + contextId (Asc) + createdAt (Desc) | Optional |
| 21 | media | Collection | Composite | mediaType (Asc) + status (Asc) + uploadDate (Desc) | Optional |
| 22 | contests | Collection | Composite | status (Asc) + createdAt (Desc) | Optional |
| 23 | likes | Collection | Composite | contentId (Asc) + createdAt (Desc) | Optional |
| 24 | **notifications** | **Collection** | **Composite** | **userId (Asc) + createdAt (Desc)** | **🔴 CRITICAL** |
| 25 | **comments** | **Collection Group** | **Simple** | **createdAt (Desc)** | **🔴 CRITICAL** |
| 26 | **replies** | **Collection Group** | **Simple** | **createdAt (Asc)** | **🔴 CRITICAL** |
| 27 | **replies** | **Collection Group** | **Simple** | **createdAt (Desc)** | **🔴 CRITICAL** |

---

## 🎯 CREATION ORDER (Recommended)

### Phase 1: Critical Indexes (Create First - App Won't Work Without These)
1. ✅ **Index #24**: notifications (Collection, Composite)
2. ✅ **Index #25**: comments (Collection Group, Simple)
3. ✅ **Index #26**: replies (Collection Group, Simple - Ascending)
4. ✅ **Index #27**: replies (Collection Group, Simple - Descending)

### Phase 2: Important Indexes (For Core Features)
5. Index #6: posts - createdAt (for feed)
6. Index #5: media - uploadDate (for media library)
7. Index #18: posts - authorId + createdAt (for user profiles)
8. Index #20: posts - contextType + contextId + createdAt (for forum/temple posts)

### Phase 3: Performance Indexes (Can Add Later)
- All remaining indexes for better query performance

---

## ⚠️ KEY DIFFERENCES

### Collection vs Collection Group - When to Use Which?

**Use COLLECTION scope when:**
- Querying a top-level collection directly
- Example: `collection(db, 'posts')`
- Example: `collection(db, 'notifications')`
- Example: `collection(db, 'media')`

**Use COLLECTION GROUP scope when:**
- Querying a subcollection that appears in multiple places
- Example: `posts/{id}/comments` AND `media/{id}/comments` AND `manifestations/{id}/comments`
- Example: `posts/{id}/comments/{id}/replies`
- The subcollection name is the same but parent documents differ

**Why Collection Group for comments/replies?**
- Comments exist as subcollections: `posts/{id}/comments`, `media/{id}/comments`, etc.
- Replies exist as: `posts/{id}/comments/{id}/replies`, `media/{id}/comments/{id}/replies`, etc.
- To query ALL comments or ALL replies across ALL parent documents, you need Collection Group scope

---

## 📝 Step-by-Step Creation in Firebase Console

For each index:

1. Go to: Firebase Console → Your Project → Firestore Database → **Indexes** tab
2. Click: **"Create Index"** button
3. Fill in:
   - **Collection ID**: Enter the collection name (e.g., `notifications`, `comments`, `replies`)
   - **Query scope**: 
     - Select **"Collection"** for most indexes
     - Select **"Collection group"** ONLY for indexes #25, #26, #27 (comments and replies)
4. **Add Fields**:
   - Click **"Add field"** for each field
   - Enter field path (e.g., `userId`, `createdAt`, `contentId`)
   - Select sort order: **Ascending** or **Descending**
   - Click **"Add field"** again for composite indexes
5. Click: **"Create"**
6. Wait: Index builds in background (5-30 minutes)
7. Check: Status changes from "Building" to "Enabled"

---

## ✅ Verification Checklist

After creating indexes, verify:
- [ ] Index #24 (notifications) - Status: Enabled
- [ ] Index #25 (comments - Collection Group) - Status: Enabled
- [ ] Index #26 (replies - Collection Group - Asc) - Status: Enabled
- [ ] Index #27 (replies - Collection Group - Desc) - Status: Enabled

Once these 4 are enabled, your app's core features (notifications, comments, replies) will work!

