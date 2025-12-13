// Firebase Authentication Setup Script
// This script creates an admin user in Firebase Authentication for password reset emails

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { createInterface } from 'node:readline';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupFirebaseAuth() {
  console.log('\n🔧 Firebase Authentication Setup\n');
  console.log('This will create an admin user in Firebase Authentication.');
  console.log('After setup, password reset emails will be sent to this address.\n');

  try {
    // Get admin email and password
    const email = await question('Enter admin email (default: admin@example.com): ') || 'admin@example.com';
    const password = await question('Enter admin password (default: password123): ') || 'password123';

    console.log('\n🔄 Initializing Firebase...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    console.log('🔄 Creating user in Firebase Authentication...');

    // Create user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    console.log('\n✅ SUCCESS! Firebase Auth user created:');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${userCredential.user.uid}`);
    console.log('\n📧 Password reset emails will now be sent to:', email);
    console.log('\n💡 Next steps:');
    console.log('   1. Test password reset from your app');
    console.log('   2. Check your email inbox (and spam folder)');
    console.log('   3. Update the admin email in mockData.ts if different\n');

  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/email-already-in-use') {
      console.log('\n✅ User already exists in Firebase Authentication');
      console.log('   Password reset emails are ready to be sent!');
    } else {
      console.error('\n❌ Error creating Firebase Auth user:');
      console.error(`   ${err.code || 'unknown'}: ${err.message || 'Unknown error'}`);
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check your .env.local file has correct Firebase credentials');
      console.log('   - Verify Email/Password is enabled in Firebase Console → Authentication → Sign-in method');
    }
  } finally {
    rl.close();
  }
}

setupFirebaseAuth();
