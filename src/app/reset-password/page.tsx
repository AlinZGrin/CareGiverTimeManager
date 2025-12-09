'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MockService } from '../../services/mockData';
import Image from 'next/image';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Validate token on page load
    if (token) {
      const isValid = MockService.validatePasswordResetToken(token);
      setTokenValid(isValid);
    }
    setChecking(false);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError('Invalid reset link.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    setLoading(true);
    
    // Use the async version to ensure Firebase is updated
    const result = await MockService.resetPasswordWithTokenAsync(token, newPassword);
    
    if (result.success) {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Checking reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Image src="/icon.png" alt="Logo" width={60} height={60} className="mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">
              Caregiver Time Manager
            </h1>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">Invalid or Expired Link</h2>
            <p className="text-gray-700 mb-6">
              The password reset link you provided is invalid or has expired. Please request a new reset link from the login page.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Image src="/icon.png" alt="Logo" width={60} height={60} className="mr-3" />
            <h1 className="text-2xl font-bold text-gray-800">
              Caregiver Time Manager
            </h1>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-600 mb-4">Password Reset Successful</h2>
            <p className="text-gray-700 mb-4">
              Your password has been reset successfully. You will be redirected to the login page in a moment.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Image src="/icon.png" alt="Logo" width={60} height={60} className="mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">
            Caregiver Time Manager
          </h1>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Reset Your Password</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
