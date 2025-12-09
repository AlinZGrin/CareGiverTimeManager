import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';

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
      return null;
    }
    
    return initializeApp(firebaseConfig);
  } catch (error) {
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
    } catch (error) {
      initError = String(error);
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
        return null;
      }
      
      auth = getAuth(app);
    } catch (error) {
      initError = String(error);
      return null;
    }
  }
  
  // If there was an error before, try one more time
  if (!auth && initError) {
    initError = null;
    return getFirebaseAuth();
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
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      return { success: false, message: 'Email not found in Firebase Authentication. Please contact your administrator.' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many reset requests. Please try again later.' };
    }
    return { success: false, message: `${error.message}` };
  }
};

export const isFirebaseConfigured = (): boolean => {
  const configured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  );
  return configured;
};

// Login with Firebase Auth
export const loginWithFirebaseAuth = async (email: string, password: string): Promise<{ success: boolean; message: string; userId?: string }> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, message: 'Firebase Auth is not configured.' };
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      message: 'Login successful',
      userId: userCredential.user.uid
    };
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return { success: false, message: 'Invalid email or password.' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many failed attempts. Please try again later.' };
    }
    return { success: false, message: 'Login failed. Please try again.' };
  }
};

// Logout from Firebase Auth
export const logoutFromFirebaseAuth = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
};
