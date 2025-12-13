'use client';

import { useState } from 'react';
import { registerNotificationToken } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

export default function FCMTest() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testNotificationPermission = async () => {
    addLog('Checking notification permission...');
    const permission = Notification.permission;
    addLog(`Current permission: ${permission}`);
    
    if (permission === 'default') {
      addLog('Requesting permission...');
      const result = await Notification.requestPermission();
      addLog(`Permission result: ${result}`);
    }
  };

  const testServiceWorker = async () => {
    addLog('Checking service worker...');
    if (!('serviceWorker' in navigator)) {
      addLog('ERROR: Service Worker not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration) {
        addLog(`Service Worker registered: ${registration.scope}`);
        addLog(`Active: ${registration.active ? 'YES' : 'NO'}`);
      } else {
        addLog('No service worker registration found');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addLog(`ERROR: ${message}`);
    }
  };

  const testFCMToken = async () => {
    if (!user) {
      addLog('ERROR: No user logged in');
      return;
    }
    
    addLog('Registering FCM token...');
    try {
      const fcmToken = await registerNotificationToken(user.id);
      if (fcmToken) {
        addLog(`Success! Token: ${fcmToken.substring(0, 20)}...`);
        setToken(fcmToken);
      } else {
        addLog('ERROR: No token returned');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addLog(`ERROR: ${message}`);
    }
  };

  const testLocalNotification = async () => {
    addLog('Testing local notification...');
    if (Notification.permission !== 'granted') {
      addLog('ERROR: Permission not granted');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification from the service worker',
        icon: '/icons/icon-192.png',
        tag: 'test',
        requireInteraction: true,
      });
      addLog('Local notification sent!');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addLog(`ERROR: ${message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">FCM Notification Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <p>User ID: {user?.id || 'Not logged in'}</p>
          <p>Role: {user?.role || 'N/A'}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-2">
            <button
              onClick={testNotificationPermission}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              1. Check/Request Permission
            </button>
            <button
              onClick={testServiceWorker}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              2. Check Service Worker
            </button>
            <button
              onClick={testFCMToken}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              3. Register FCM Token
            </button>
            <button
              onClick={testLocalNotification}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            >
              4. Test Local Notification
            </button>
          </div>
        </div>

        {token && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">FCM Token</h2>
            <textarea
              value={token}
              readOnly
              className="w-full h-32 p-2 border rounded font-mono text-sm"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm h-96 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Click buttons above to test.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
