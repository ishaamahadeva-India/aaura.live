# How to Deploy Firestore and Storage Rules

## ⚠️ IMPORTANT: Rules Must Be Deployed!

The rules in your code are correct, but they **must be deployed to Firebase** for them to work. Currently, the rules are only in your local files and not active in Firebase.

## Option 1: Deploy via Firebase Console (Easiest - No Installation Required)

### For Firestore Rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (aaura-india or similar)
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy the **entire contents** of the file `firestore.rules` from your project
6. Paste it into the rules editor
7. Click **Publish** button

### For Storage Rules:

1. In Firebase Console, click on **Storage** in the left sidebar
2. Click on the **Rules** tab
3. Copy the **entire contents** of the file `storage.rules` from your project
4. Paste it into the rules editor
5. Click **Publish** button

## Option 2: Install Firebase CLI and Deploy

### Step 1: Install Node.js (if not installed)
```bash
# On Ubuntu/Debian:
sudo apt update
sudo apt install nodejs npm

# Verify installation:
node --version
npm --version
```

### Step 2: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 3: Login to Firebase
```bash
firebase login
```
This will open a browser window for authentication.

### Step 4: Initialize Firebase (if not already done)
```bash
firebase init
```
Select:
- Firestore
- Storage
- Use existing project (select your project)

### Step 5: Deploy Rules
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Or deploy both at once
firebase deploy --only firestore:rules,storage
```

## Option 3: Use npx (No Global Installation)

If you have npm but don't want to install globally:

```bash
# Login
npx firebase-tools login

# Deploy rules
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only storage
```

## Verify Deployment

After deploying, you can verify in Firebase Console:
1. Go to Firestore Database → Rules tab
2. Check that your rules are displayed
3. Look for "Last published" timestamp

## Current Rules Summary

Your rules allow:
- ✅ **temple_renovation_requests**: Any signed-in user can create
- ✅ **temple_maintenance_funds**: Any signed-in user can create
- ✅ **deities, stories, temples, etc.**: Users can create with `status: "pending"` for admin approval

## Troubleshooting

If you still get permission errors after deploying:
1. Make sure you're logged in (check browser console)
2. Verify the rules were published (check Firebase Console)
3. Try logging out and back in to refresh your auth token
4. Check browser console for detailed error messages

