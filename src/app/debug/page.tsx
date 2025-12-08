'use client';

import { useEffect, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebase';

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
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {debugInfo}
        </pre>
        <div className="mt-6">
          <a href="/" className="text-blue-600 hover:underline">← Back to Login</a>
        </div>
      </div>
    </div>
  );
}
