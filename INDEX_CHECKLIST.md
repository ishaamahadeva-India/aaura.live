# Quick Index Creation Checklist

## 🔴 CRITICAL - Create These First (Required for app to work)

### 1. Notifications Index
- Go to: Firestore → Indexes → Create Index
- Collection ID: `notifications`
- Query scope: **Collection**
- Fields:
  - Field 1: `userId` → Ascending
  - Field 2: `createdAt` → Descending
- Click **Create**

### 2. Comments Collection Group Index
- Collection ID: `comments`
- Query scope: **Collection group** ⚠️ (Important!)
- Fields:
  - Field 1: `createdAt` → Descending
- Click **Create**

### 3. Replies Collection Group Indexes (Create 2 indexes)
- **Index 3a**: Collection ID: `replies`, Scope: **Collection group**, Field: `createdAt` → Ascending
- **Index 3b**: Collection ID: `replies`, Scope: **Collection group**, Field: `createdAt` → Descending

---

## 📋 Step-by-Step Instructions

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**
3. **Navigate**: Firestore Database → Indexes tab
4. **Click**: "Create Index" button
5. **Fill in the details** from the checklist above
6. **Click**: "Create"
7. **Wait**: Indexes will build in the background (5-30 minutes)
8. **Check status**: Refresh the page to see "Enabled" when ready

---

## ✅ Quick Reference - All Indexes

### Simple Indexes (1 field):
- `temples`: rating (Desc)
- `deities`: createdAt (Desc)
- `stories`: createdAt (Desc)
- `festivals`: date (Asc)
- `media`: uploadDate (Desc)
- `posts`: createdAt (Desc)
- `channels`: followerCount (Desc)
- `chants`: createdAt (Desc)

### Composite Indexes (2+ fields):
- `products`: inventory (Asc) + popularity (Desc)
- `temples`: location.state (Asc) + deity.name (Asc)
- `media`: category (Asc) + uploadDate (Desc)
- `media`: language (Asc) + uploadDate (Desc)
- `comments`: contentId (Asc) + createdAt (Asc)
- `likes`: userId (Asc) + createdAt (Desc)
- `bookmarks`: userId (Asc) + createdAt (Desc)
- `playlists`: isPublic (Asc) + category (Asc) + createdAt (Desc)
- `virtualOfferings`: userId (Asc) + timestamp (Desc)
- `posts`: authorId (Asc) + createdAt (Desc)
- `media`: userId (Asc) + status (Asc)
- `posts`: contextType (Asc) + contextId (Asc) + createdAt (Desc)
- `media`: mediaType (Asc) + status (Asc) + uploadDate (Desc)
- `contests`: status (Asc) + createdAt (Desc)
- `likes`: contentId (Asc) + createdAt (Desc)

### Collection Group Indexes:
- `comments`: createdAt (Desc) - **Collection group scope**
- `replies`: createdAt (Asc) - **Collection group scope**
- `replies`: createdAt (Desc) - **Collection group scope**

---

**Note**: Start with the 3 CRITICAL indexes first. The app will work with just those. Other indexes are for performance optimization and can be added later.

