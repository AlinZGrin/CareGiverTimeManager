# Firebase Database Setup Guide

This guide will help you set up Firebase Realtime Database for cross-browser data syncing.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter project name: `CaregiverTimeManager`
4. Continue through setup (disable Google Analytics is fine)
5. Click "Create Project" and wait for it to complete

## Step 2: Enable Realtime Database

1. In Firebase Console, click on "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose location (closest to you, e.g., us-central1)
4. Start in **Test Mode** (we'll add security rules later)
5. Click "Enable"

## Step 3: Get Your Firebase Config

1. In Firebase Console, click the gear icon → "Project Settings"
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Name it `CaregiverTimeManager`
5. Copy the entire `firebaseConfig` object

Your config should look like:
```javascript
{
  apiKey: "AIz...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
}
```

## Step 4: Add Environment Variables

1. Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL=YOUR_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

2. Replace each `YOUR_*` value with the values from Step 3

## Step 5: Set Firebase Security Rules (Important!)

1. In Firebase Console → Realtime Database → Rules tab
2. Replace the rules with:

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "shifts": {
      ".read": true,
      ".write": true
    },
    "scheduledShifts": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Click "Publish"

**Note**: This allows anyone with the database URL to read/write. For production, implement proper authentication.

## Step 6: Restart Development Server

```bash
npm run dev
```

## Testing

1. Add a caregiver in one browser
2. Open the app in a different browser
3. The new caregiver should appear immediately

## Troubleshooting

**Data not syncing?**
- Check browser console for Firebase errors
- Ensure `.env.local` has all values filled
- Verify Firebase Realtime Database is enabled
- Check Firebase security rules

**Changes not appearing in Firebase Console?**
- Refresh the Firebase Console
- Data syncs in real-time but console may need refresh

**Still using LocalStorage?**
- Delete browser cookies/cache for the app domain
- Check that all Firebase config values are set in `.env.local`
