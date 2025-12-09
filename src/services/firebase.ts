import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, sendPasswordResetEmail } from 'firebase/auth';

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

let app: FirebaseApp | null = null;
let database: Database | null = null;
let auth: Auth | null = null;
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

export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === 'undefined') return null;
  
  if (!auth && !initError) {
    try {
      if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
        initError = 'Firebase config missing required keys for Auth';
        console.error(initError, firebaseConfig);
        return null;
      }
      
      if (!app) {
        app = initializeApp(firebaseConfig);
      }
      auth = getAuth(app);
      console.log('Firebase Auth initialized successfully');
    } catch (error) {
      initError = String(error);
      console.error('Firebase Auth initialization error:', error);
      return null;
    }
  }
  return auth;
};

export const sendPasswordResetEmailToAdmin = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, message: 'Firebase Auth is not configured.' };
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: 'Password reset email has been sent. Please check your inbox and spam folder.' 
    };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return { success: true, message: 'If an account exists with that email, a reset link has been sent.' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many reset requests. Please try again later.' };
    }
    
    return { success: false, message: `Error sending reset email: ${error.message}` };
  }
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

