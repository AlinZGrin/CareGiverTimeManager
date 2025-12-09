import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
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

let database: Database | null = null;
let auth: Auth | null = null;
let initError: string | null = null;

const getFirebaseApp = (): FirebaseApp | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if app is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      return existingApps[0];
    }
    
    // Initialize new app
    if (!firebaseConfig.apiKey) {
      console.error('Firebase config missing API key');
      return null;
    }
    
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Error getting Firebase app:', error);
    return null;
  }
};

export const getFirebaseDatabase = (): Database | null => {
  if (typeof window === 'undefined') return null;
  
  if (!database && !initError) {
    try {
      const app = getFirebaseApp();
      if (!app) {
        initError = 'Firebase app not initialized';
        return null;
      }
      
      database = getDatabase(app);
      console.log('Firebase Database initialized successfully');
    } catch (error) {
      initError = String(error);
      console.error('Firebase Database initialization error:', error);
      return null;
    }
  }
  return database;
};

export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === 'undefined') return null;
  
  if (!auth && !initError) {
    try {
      const app = getFirebaseApp();
      if (!app) {
        initError = 'Firebase app not initialized';
        console.error('Cannot initialize Firebase Auth - app not available');
        return null;
      }
      
      auth = getAuth(app);
      console.log('Firebase Auth initialized successfully');
      console.log('Auth domain:', firebaseConfig.authDomain);
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
      console.log('Firebase Auth not configured, will use local token fallback');
      return { success: false, message: 'Firebase Auth is not configured.' };
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent successfully via Firebase');
    return { 
      success: true, 
      message: 'Password reset email has been sent. Please check your inbox and spam folder.' 
    };
  } catch (error: any) {
    console.error('Firebase Auth error:', error.code, error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      console.log('Email not found in Firebase Auth. Admin account must be created in Firebase Console first.');
      return { success: false, message: 'Email not found in Firebase Authentication. Please contact your administrator.' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many reset requests. Please try again later.' };
    }
    
    console.log('Firebase Auth not available, will use local token fallback');
    return { success: false, message: `Firebase email service unavailable: ${error.message}` };
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

