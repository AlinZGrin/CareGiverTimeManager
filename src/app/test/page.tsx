'use client';

import { useEffect, useState } from 'react';
import { MockService } from '../../services/mockData';
import { isFirebaseConfigured, getFirebaseDatabase } from '../../services/firebase';

export default function TestPage() {
  const [firebaseConfig, setFirebaseConfig] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const test = async () => {
      try {
        // Show Firebase config
        const configured = isFirebaseConfigured();
        setFirebaseConfig(`Firebase Configured: ${configured}`);

        // Try to get database
        const db = getFirebaseDatabase();
        if (db) {
          console.log('Firebase database connected');
        } else {
          console.log('Firebase database NOT connected');
        }

        // Try to fetch users
        const fetchedUsers = await MockService.getUsersAsync();
        console.log('Fetched users:', fetchedUsers);
        setUsers(fetchedUsers);
      } catch (err) {
        setError(String(err));
        console.error('Error:', err);
      }
    };

    test();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Debug Test</h1>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-bold text-blue-900 mb-2">Firebase Status</h2>
          <p className="text-blue-800">{firebaseConfig}</p>
        </div>

        <div className="mb-6">
          <h2 className="font-bold mb-3">Users from Firebase:</h2>
          {users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  {user.email && <p><strong>Email:</strong> {user.email}</p>}
                  {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
                  {user.pin && <p><strong>PIN:</strong> {user.pin}</p>}
                  <p><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No users found</p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="font-bold text-red-900 mb-2">Error</h2>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="mt-8">
          <a href="/" className="text-blue-600 hover:text-blue-800 underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
