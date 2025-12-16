'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../../services/firebase';
import { MockService } from '../../services/mockData';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const getDebugInfo = async () => {
      let info = '';
      
      // Check Firebase config
      info += `Firebase Configured: ${isFirebaseConfigured()}\n\n`;
      
      // Check environment variables
      info += `Firebase Config:\n`;
      info += `API Key: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing'}\n`;
      info += `Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing'}\n`;
      info += `Database URL: ${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? '✅ Set' : '❌ Missing'}\n`;
      info += `Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing'}\n\n`;
      
      // Check LocalStorage
      info += `LocalStorage Data:\n`;
      const users = localStorage.getItem('cgtm_users');
      info += `Users: ${users ? JSON.parse(users).length + ' found' : 'None'}\n`;
      info += users ? JSON.stringify(JSON.parse(users), null, 2) : '';
      
      setDebugInfo(info);
    };

    getDebugInfo();
    // Expose MockService to the window for interactive debugging in the console
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      window.MockService = MockService;
    } catch (_) {}
  }, []);

  const pushLocalUsersToFirebase = () => {
    try {
      const users = MockService.getUsers();
      users.forEach((u) => MockService.saveUser(u));
      // eslint-disable-next-line no-console
      console.log('[Debug] Requested save of local users to Firebase');
      alert('Requested save of local users to Firebase. Check console for any errors.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Debug] pushLocalUsersToFirebase failed', err);
      alert('Failed to request save. See console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {debugInfo}
        </pre>
        <div className="mt-4">
          <button onClick={pushLocalUsersToFirebase} className="px-4 py-2 bg-blue-600 text-white rounded">Push Local Users to Firebase</button>
        </div>
        <div className="mt-6">
          <Link href="/" className="text-blue-600 hover:underline">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
