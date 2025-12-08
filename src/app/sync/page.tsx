'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INITIAL_ADMIN = {
  id: 'admin-1',
  name: 'Family Admin',
  role: 'admin',
  email: 'admin@example.com',
  password: 'password123',
  isActive: true,
};

export default function SyncPage() {
  const [status, setStatus] = useState('Initializing sync...');
  const router = useRouter();

  useEffect(() => {
    const performSync = async () => {
      try {
        // Clear LocalStorage cache but preserve admin user
        localStorage.removeItem('cgtm_shifts');
        localStorage.removeItem('cgtm_scheduled_shifts');
        localStorage.removeItem('cgtm_initialized');
        
        // Set just the admin user
        localStorage.setItem('cgtm_users', JSON.stringify([INITIAL_ADMIN]));
        
        setStatus('✅ Cache cleared! Redirecting to login...');
        
        // Wait 2 seconds then redirect to login
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        setStatus(`❌ Error: ${error}`);
      }
    };

    performSync();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Syncing with Firebase...</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}
