import { initializeApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

// TODO: Replace with your Firebase config from https://console.firebase.google.com
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let app;
let database: Database | null = null;
let initError: string | null = null;

export const getFirebaseDatabase = (): Database | null => {
  if (typeof window === 'undefined') return null;
  
  if (!database && !initError) {
    try {
      if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
        initError = 'Firebase config missing required keys';
        console.error(initError, firebaseConfig);
        return null;
      }
      
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      console.log('Firebase initialized successfully');
    } catch (error) {
      initError = String(error);
      console.error('Firebase initialization error:', error);
      return null;
    }
  }
  return database;
};

export const isFirebaseConfigured = (): boolean => {
  const configured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  );
  if (!configured) {
    console.warn('Firebase not configured - missing environment variables');
  }
  return configured;
};

