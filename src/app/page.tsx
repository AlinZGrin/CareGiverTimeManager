'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

export default function LoginPage() {
  const { loginCaregiver, loginAdmin } = useAuth();
  const [isCaregiver, setIsCaregiver] = useState(true);
  
  // Caregiver Form State
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  
  // Admin Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isCaregiver) {
      const success = loginCaregiver(phone, pin);
      if (!success) setError('Invalid Phone or PIN');
    } else {
      const success = loginAdmin(email, password);
      if (!success) setError('Invalid Email or Password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Image src="/icon.png" alt="Logo" width={60} height={60} className="mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">
            Caregiver Time Manager
          </h1>
        </div>
        
        <div className="flex mb-6 border-b">
          <button
            className={`flex-1 py-2 text-center ${isCaregiver ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsCaregiver(true)}
          >
            Caregiver
          </button>
          <button
            className={`flex-1 py-2 text-center ${!isCaregiver ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsCaregiver(false)}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCaregiver ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="5551234"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">4-Digit PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="1234"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="password123"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isCaregiver ? 'Login' : 'Admin Login'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Demo Credentials:</p>
          <p>Caregiver: 5551234 / 1234</p>
          <p>Admin: admin@example.com / password123</p>
        </div>
      </div>
    </div>
  );
}
