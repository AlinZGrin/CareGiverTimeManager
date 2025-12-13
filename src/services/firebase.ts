import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getDatabase, Database, ref, set } from 'firebase/database';
import { getAuth, Auth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getMessaging, getToken, isSupported, onMessage, MessagePayload, Messaging } from 'firebase/messaging';

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

// Initialize Firebase Auth eagerly when module loads
if (typeof window !== 'undefined') {
  // Defer to avoid blocking
  setTimeout(() => {
    try {
      getFirebaseAuth();
    } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Silent - will retry on actual use
    }
  }, 500);
}

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
  } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
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
    } catch (_error) {
      initError = String(_error);
      return null;
    }
  }
  return database;
};

export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === 'undefined') return null;
  
  if (!auth) {
    try {
      const app = getFirebaseApp();
      if (!app) {
        return null;
      }
      
      auth = getAuth(app);
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return null;
    }
  }
  
  return auth;
};

export const sendPasswordResetEmailToAdmin = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if Firebase config is loaded
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
      return { success: false, message: 'Firebase configuration is missing. Please check environment variables.' };
    }
    
    const auth = getFirebaseAuth();
    if (!auth) {
      return { success: false, message: 'Firebase Auth failed to initialize. Please refresh the page and try again.' };
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: 'Password reset email has been sent. Please check your inbox and spam folder.' 
    };
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    if (code === 'auth/user-not-found') {
      return { success: false, message: 'No account found with that email address.' };
    } else if (code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address format.' };
    } else if (code === 'auth/too-many-requests') {
      return { success: false, message: 'Too many password reset attempts. Please wait a few minutes and try again.' };
    }
    return { success: false, message: `${code || 'Error'}: ${message}` };
  }
};

export const isFirebaseConfigured = (): boolean => {
  const configured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  );
  return configured;
};

// Firebase Cloud Messaging helpers
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  try {
    return getMessaging();
  } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
}

export async function registerNotificationToken(userId: string): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;
  // Service worker must be available at /firebase-messaging-sw.js
  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const token = await getToken(messaging, { serviceWorkerRegistration: swReg, vapidKey }).catch(() => null);
  if (!token) return null;
  const db = getFirebaseDatabase();
  if (!db) return token; // Guard for server-side
  await set(ref(db, `notificationTokens/${userId}`), { token, updatedAt: Date.now() });
  return token;
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => callback(payload));
  });
}
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
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: string }).code) : '';
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      return { success: false, message: 'Invalid email or password.' };
    } else if (code === 'auth/invalid-email') {
      return { success: false, message: 'Invalid email address.' };
    } else if (code === 'auth/too-many-requests') {
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
