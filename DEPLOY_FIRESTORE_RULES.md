# How to Deploy Firestore Rules

## Option 1: Using Firebase Console (Web UI) - RECOMMENDED

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste it into the rules editor
6. Click **Publish**

## Option 2: Using Firebase CLI (Command Line)

### Install Firebase CLI:
```bash
npm install -g firebase-tools
```

### Login to Firebase:
```bash
firebase login
```

### Deploy Firestore Rules:
```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules:
```bash
firebase deploy --only storage
```

### Deploy Both:
```bash
firebase deploy --only firestore:rules,storage
```

## Option 3: Using npx (without installing globally)

If you have npm installed but don't want to install Firebase CLI globally:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only storage
```

## Current Rules Status

The rules in `firestore.rules` allow:
- ✅ Users to create `temple_renovation_requests` with `status: "pending"`
- ✅ Users to create `temple_maintenance_funds` 
- ✅ Users to create content (deities, stories, etc.) with `status: "pending"` for admin approval
- ✅ Admins to approve/reject content

**IMPORTANT**: Rules must be deployed to Firebase for them to take effect!

