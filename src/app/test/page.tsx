'use client';

import { useEffect, useState } from 'react';
import { MockService } from '../../services/mockData';
import { isFirebaseConfigured, getFirebaseDatabase } from '../../services/firebase';

export default function TestPage() {
  const [firebaseConfig, setFirebaseConfig] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [localStorageData, setLocalStorageData] = useState<any>({});
  const [error, setError] = useState('');

  const loadData = async () => {
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

      // Show localStorage data
      const lsUsers = localStorage.getItem('cgtm_users');
      const lsInitialized = localStorage.getItem('cgtm_initialized');
      setLocalStorageData({
        users: lsUsers ? JSON.parse(lsUsers) : null,
        initialized: lsInitialized,
        userCount: lsUsers ? JSON.parse(lsUsers).length : 0
      });

      // Try to fetch users
      const fetchedUsers = await MockService.getUsersAsync();
      console.log('Fetched users:', fetchedUsers);
      setUsers(fetchedUsers);
    } catch (err) {
      setError(String(err));
      console.error('Error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearCache = () => {
    localStorage.removeItem('cgtm_users');
    localStorage.removeItem('cgtm_initialized');
    alert('Cache cleared! Reload the page to reinitialize.');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Debug Test</h1>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-bold text-blue-900 mb-2">Firebase Status</h2>
          <p className="text-blue-800">{firebaseConfig}</p>
        </div>

        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h2 className="font-bold text-green-900 mb-2">LocalStorage Data</h2>
          <p className="text-green-800">Initialized: {localStorageData.initialized || 'false'}</p>
          <p className="text-green-800">User Count: {localStorageData.userCount}</p>
          <button 
            onClick={clearCache}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear Cache
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">Users from MockService:</h2>
            <button 
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Data
            </button>
          </div>
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
                  {user.password && <p><strong>Password:</strong> {user.password}</p>}
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
