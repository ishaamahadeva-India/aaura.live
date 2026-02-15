# Manual Firestore Index Deployment Guide

This guide will help you manually create Firestore indexes in the Firebase Console.

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **studio-9632556640-bd58d** (or your project name)
3. In the left sidebar, click on **Firestore Database**
4. Click on the **Indexes** tab at the top

## Step 2: Understanding Index Types

### Simple Index (Single Field)
- Used when querying by a single field with `orderBy`
- Example: `orderBy('createdAt', 'desc')`

### Composite Index (Multiple Fields)
- Used when querying with `where` + `orderBy` on different fields
- Example: `where('userId', '==', 'xxx').orderBy('createdAt', 'desc')`

### Collection Group Index
- Used when querying across all subcollections with the same name
- Example: Querying all `comments` subcollections across different parent documents

## Step 3: Creating Indexes

### How to Create an Index:

1. Click the **"Create Index"** button
2. **Collection ID**: Enter the collection name (e.g., `notifications`, `posts`, `comments`)
3. **Query scope**: 
   - Select **Collection** for regular collections
   - Select **Collection group** for subcollections that appear in multiple places
4. **Fields to index**: Add fields one by one
   - Click **"Add field"**
   - Enter field path (e.g., `userId`, `createdAt`, `contentId`)
   - Select sort order: **Ascending** or **Descending**
5. Click **"Create"**

---

## Indexes to Create

### 1. Notifications Index (REQUIRED - for notifications feature)
- **Collection ID**: `notifications`
- **Query scope**: Collection
- **Fields**:
  1. `userId` - Ascending
  2. `createdAt` - Descending

### 2. Comments Collection Group Index (for comments subcollections)
- **Collection ID**: `comments`
- **Query scope**: **Collection group** (important!)
- **Fields**:
  1. `createdAt` - Descending

### 3. Replies Collection Group Indexes (for replies subcollections)
- **Index 1**:
  - **Collection ID**: `replies`
  - **Query scope**: **Collection group** (important!)
  - **Fields**:
    1. `createdAt` - Ascending

- **Index 2**:
  - **Collection ID**: `replies`
  - **Query scope**: **Collection group** (important!)
  - **Fields**:
    1. `createdAt` - Descending

---

## All Other Indexes (Optional - for performance)

### Simple Indexes (Single Field):

1. **temples** - `rating` (Descending)
2. **deities** - `createdAt` (Descending)
3. **stories** - `createdAt` (Descending)
4. **festivals** - `date` (Ascending)
5. **media** - `uploadDate` (Descending)
6. **posts** - `createdAt` (Descending)
7. **channels** - `followerCount` (Descending)
8. **chants** - `createdAt` (Descending)

### Composite Indexes (Multiple Fields):

1. **products**:
   - `inventory` (Ascending)
   - `popularity` (Descending)

2. **temples**:
   - `location.state` (Ascending)
   - `deity.name` (Ascending)

3. **media**:
   - `category` (Ascending)
   - `uploadDate` (Descending)

4. **media**:
   - `language` (Ascending)
   - `uploadDate` (Descending)

5. **comments**:
   - `contentId` (Ascending)
   - `createdAt` (Ascending)

6. **likes**:
   - `userId` (Ascending)
   - `createdAt` (Descending)

7. **bookmarks**:
   - `userId` (Ascending)
   - `createdAt` (Descending)

8. **playlists**:
   - `isPublic` (Ascending)
   - `category` (Ascending)
   - `createdAt` (Descending)

9. **virtualOfferings**:
   - `userId` (Ascending)
   - `timestamp` (Descending)

10. **posts**:
    - `authorId` (Ascending)
    - `createdAt` (Descending)

11. **media**:
    - `userId` (Ascending)
    - `status` (Ascending)

12. **posts**:
    - `contextType` (Ascending)
    - `contextId` (Ascending)
    - `createdAt` (Descending)

13. **media**:
    - `mediaType` (Ascending)
    - `status` (Ascending)
    - `uploadDate` (Descending)

14. **contests**:
    - `status` (Ascending)
    - `createdAt` (Descending)

15. **likes**:
    - `contentId` (Ascending)
    - `createdAt` (Descending)

---

## Priority Order

### Critical (Create First):
1. ✅ **notifications** - Required for notifications feature
2. ✅ **comments** (Collection Group) - Required for comments queries
3. ✅ **replies** (Collection Group) - Required for replies queries

### Important (Create Next):
4. **posts** indexes - For feed and post queries
5. **media** indexes - For video/media queries
6. **likes** indexes - For like queries

### Optional (Can create later):
- All other indexes for performance optimization

---

## Notes

- **Index creation takes time**: Simple indexes take a few minutes, composite indexes can take 10-30 minutes
- **You can continue using the app**: Indexes are built in the background
- **Collection Group vs Collection**: 
  - Use **Collection** for top-level collections (posts, media, etc.)
  - Use **Collection group** for subcollections that appear in multiple places (comments, replies, likes as subcollections)
- **Field paths**: Use dot notation for nested fields (e.g., `location.state`, `deity.name`)

---

## Verification

After creating indexes:
1. Go to the **Indexes** tab
2. Check the status - it should show "Enabled" when ready
3. If it shows "Building", wait for it to complete
4. You can use the app while indexes are building, but queries might be slower until they're ready

---

## Troubleshooting

- **Index already exists**: If you see an error that the index already exists, it means it's already created - you can skip it
- **Invalid field path**: Make sure field names match exactly what's in your Firestore documents
- **Collection group not found**: Make sure you're using "Collection group" scope for subcollections like comments and replies

