'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import { User } from '../types';
import { MockService } from '../services/mockData';

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
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetSent, setShowResetSent] = useState(false);
  const [forgotInfo, setForgotInfo] = useState<{ name?: string; phone?: string; email?: string } | null>(null);

  // Reset form state when component mounts
  useEffect(() => {
    console.log('Login page mounted - resetting state');
    setError('');
    setLoading(false);
    setPhone('');
    setPin('');
    setEmail('');
    setPassword('');
    
    // Force a fresh check of users to ensure cache is valid
    const validateCache = () => {
      try {
        const users = MockService.getUsers();
        console.log('Users available on login page:', users.length);
        if (users.length === 0) {
          console.warn('No users found, forcing re-initialization');
          localStorage.removeItem('cgtm_initialized');
          // Next getUsers() call will reinitialize
        }
      } catch (error) {
        console.error('Error validating cache:', error);
        localStorage.removeItem('cgtm_initialized');
      }
    };
    
    validateCache();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isCaregiver) {
        const success = await loginCaregiver(phone, pin);
        if (!success) setError('Invalid Phone or PIN');
      } else {
        const success = await loginAdmin(email, password);
        if (!success) setError('Invalid Email or Password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotCredentials = async () => {
    setError('');
    setForgotInfo(null);
    
    if (isCaregiver) {
      // For caregivers, we need their name to look up credentials
      const name = prompt('Enter your full name (e.g., Jane Doe):');
      if (!name) return;
      
      // Get all users and find matching caregiver
      const users = JSON.parse(localStorage.getItem('cgtm_users') || '[]');
      const caregiver = users.find((u: User) => 
        u.role === 'caregiver' && u.name.toLowerCase() === name.toLowerCase()
      );
      
      if (caregiver) {
        setForgotInfo({
          name: caregiver.name,
          phone: caregiver.phone,
        });
        setShowForgotModal(true);
      } else {
        setError('No caregiver found with that name. Please contact your administrator.');
      }
    } else {
      // For admins, prompt for email and send reset link
      const adminEmail = prompt('Enter your admin email address:');
      if (!adminEmail) return;
      
      setLoading(true);
      const result = await MockService.requestPasswordReset(adminEmail);
      setLoading(false);
      
      if (result.success) {
        setShowResetSent(true);
        setForgotInfo({ email: adminEmail });
        // Clear message after 5 seconds
        setTimeout(() => setShowResetSent(false), 5000);
      } else {
        setError(result.message);
      }
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
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : (isCaregiver ? 'Login' : 'Admin Login')}
          </button>

          <button
            type="button"
            onClick={handleForgotCredentials}
            className="w-full text-sm text-blue-600 hover:text-blue-800 underline mt-2"
          >
            {isCaregiver ? 'Forgot Phone/PIN?' : 'Forgot Password?'}
          </button>
        </form>
      </div>

      {/* Forgot Credentials Modal */}
      {showForgotModal && forgotInfo && !showResetSent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {isCaregiver ? 'Your Caregiver Credentials' : 'Admin Credentials'}
            </h2>
            
            <div className="space-y-3 mb-6">
              {isCaregiver ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Name:</p>
                    <p className="font-semibold text-gray-900">{forgotInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number:</p>
                    <p className="font-semibold text-gray-900">{forgotInfo.phone}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Your PIN cannot be displayed for security reasons. 
                      Please contact your administrator to reset it if needed.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Email:</p>
                    <p className="font-semibold text-gray-900">{forgotInfo.email}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Your password cannot be displayed for security reasons. 
                      You can change it in the Settings tab after logging in.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotInfo(null);
              }}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset Email Sent Message */}
      {showResetSent && forgotInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-green-600 mb-4">Reset Link Sent</h2>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-sm text-green-800 mb-2">
                  A password reset link has been sent to:
                </p>
                <p className="font-semibold text-gray-900">{forgotInfo.email}</p>
              </div>
              <p className="text-sm text-gray-600">
                Please check your email for a link to reset your password. The link will expire in 1 hour.
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowResetSent(false);
                setForgotInfo(null);
              }}
              className="w-full mt-4 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
