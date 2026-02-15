# Aaura App: User Permissions and Feature Guide

This document provides a detailed breakdown of features available to anonymous (logged-out) users versus authenticated (logged-in) users across the Aaura application.

---

## 1. Global Actions

### Anonymous Users
- **View Content**: Can browse and view most public content (Deities, Stories, Temples, etc.).
- **Language Selection**: Can change the display language of the application.
- **Log In / Sign Up**: Can navigate to the login/signup page.

### Authenticated Users
- **All Anonymous Permissions**: Inherits all permissions of anonymous users.
- **Content Interaction**: Can like, comment on, and share content.
- **Content Creation**: Can create posts, upload media, and create playlists.
- **Follow/Subscribe**: Can follow other users and subscribe to channels.
- **Shopping Cart**: Can add items to a personal shopping cart.
- **Profile Access**: Can access their own profile and settings.
- **Notifications**: (If implemented) Can receive notifications.

---

## 2. Page-by-Page Breakdown

### `/` (Home / Feed)
- **Anonymous**: Can view the main content feed.
- **Authenticated**: Can view a personalized "For You" feed and interact with all content (like, comment).

### `/reels`
- **Anonymous**: Can view the Reels feed.
- **Authenticated**: Can view the Reels feed and interact with videos (like, comment, share).

### `/login` & `/profile/setup`
- **Anonymous**: Can access the page to log in, sign up with email/password, or sign in with Google. Can complete the multi-step profile setup after signing up.
- **Authenticated**: Redirected to the main feed if already logged in and profile is complete.

### `/deities`, `/stories`, `/characters`, `/temples`, `/rituals`, `/festivals`
- **Anonymous**: Can view all list pages and detail pages for these content types.
- **Authenticated**: Same as anonymous, but with the ability to interact (e.g., bookmark temples, comment where applicable).

### `/shop` & `/shop/[productId]`
- **Anonymous**: Can browse all products and view product detail pages.
- **Authenticated**: Same as anonymous, plus:
  - Can add products to their shopping cart.
  - Can proceed to checkout.

### `/cart`
- **Anonymous**: Cannot access; will be prompted to log in.
- **Authenticated**: Can view their shopping cart, update item quantities, remove items, and initiate the checkout process.

### `/forum` & `/forum/[groupId]`
- **Anonymous**: Can view all community groups and the posts within them.
- **Authenticated**: Same as anonymous, plus:
  - Can join or leave community groups.
  - Can create new posts within groups they have joined.
  - Can comment on and like posts.

### `/channels` & `/channels/[id]`
- **Anonymous**: Can view the list of all creator channels and view individual channel pages (including their videos and posts).
- **Authenticated**: Same as anonymous, plus:
  - Can subscribe/unsubscribe from channels.
  - If they own the channel (`userId` matches channel `id`), they can manage featured playlists and create posts.
  - Can navigate to the `/channels/create` page to create their own channel (if they haven't already).

### `/media` & `/watch/[id]`
- **Anonymous**: Can browse the media library and watch individual videos.
- **Authenticated**: Same as anonymous, plus:
  - Can like and comment on videos.
  - Can save videos to their playlists.

### `/upload`
- **Anonymous**: Cannot access; will be prompted to log in.
- **Authenticated**: Can access the form to upload new video or audio content to their personal channel.

### `/panchang` & `/horoscope`
- **Anonymous**: 
  - **Panchang**: Can view the generic daily Panchang.
  - **Horoscope**: Cannot view; will see a prompt to log in to get a personalized reading.
- **Authenticated**:
  - **Panchang**: Can view the Panchang with personalized AI-driven guidance based on their zodiac sign.
  - **Horoscope**: Can view their personalized daily horoscope based on their profile data.

### `/manifestation` & `/manifestation/create`
- **Anonymous**: Can view the list of manifestation stories but cannot create one.
- **Authenticated**: Can view all stories, create their own manifestation post, and interact with others (like, comment).

### `/playlists` & `/playlists/create`
- **Anonymous**: Can view public playlists but cannot create new ones or see user-specific playlists.
- **Authenticated**: Can view public playlists and their own private/public playlists. Can create new playlists.

### `/challenges` & `/challenges/[id]`
- **Anonymous**: Can view the list of available challenges.
- **Authenticated**: Same as anonymous, plus:
  - Can join a challenge.
  - Can mark tasks as complete and track their progress.
  - Can earn badges upon completion.

### `/contests`
- **Anonymous**: Can view active contests and their progress.
- **Authenticated**: Same as anonymous, plus can participate by submitting chants.

### `/virtual-pooja`
- **Anonymous**: Can "ring the bell" but will be prompted to log in for other interactions.
- **Authenticated**: Can perform all pooja interactions (offer flowers, light diya, offer aarti), and have their interactions recorded.

### `/profile/[userId]` & `/settings`
- **Anonymous**: Can view other users' public profiles but cannot access the settings page.
- **Authenticated**:
  - Can view other users' public profiles.
  - Can follow/unfollow other users.
  - Can access their own `/settings` page to update their profile information (name, birthdate, zodiac, etc.).

---

## 3. Admin Permissions (Super Admin)

A user with the designated "Super Admin" UID has access to all authenticated user features, plus a special `/admin` section.

- **`/admin`**: View a dashboard of application statistics.
- **`/admin/content`**: Access a multi-tabbed interface to create, edit, and delete core content types (Deities, Sagas, Heroes, Temples, Products, Contests, Challenges).
- **`/admin/review`**: (If content status is 'pending') Review and approve/reject user-submitted content.
- **`/admin/orders`**: View and manage all customer orders from the marketplace.
