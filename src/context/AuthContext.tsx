'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { MockService } from '../services/mockData';
import { loginWithFirebaseAuth, logoutFromFirebaseAuth } from '../services/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  loginCaregiver: (phone: string, pin: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for persisted session (optional, skipping for simplicity/security in prototype)
  }, []);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    const emailLower = email.toLowerCase();
    try {
      // Try Firebase Auth first
      const authResult = await loginWithFirebaseAuth(email, password);
      console.log('[LOGIN DEBUG] Firebase Auth result:', authResult);
      
      if (authResult.success) {
        // Firebase Auth successful - now get the user data from database
        const users = await MockService.getUsersAsync();
        const admin = users.find((u) => u.role === 'admin' && u.email?.toLowerCase() === emailLower);
        
        if (admin) {
          setUser(admin);
          router.push('/admin');
          return true;
        }
        
        // Logged into Firebase Auth but no admin user in database
        await logoutFromFirebaseAuth();
        return false;
      }

      // Firebase rejected the credential; fall back to the stored admin record (firebase DB/local) to avoid stale cached password
      const users = await MockService.getUsersAsync();
      const adminFromDb = users.find((u) => u.role === 'admin' && u.email?.toLowerCase() === emailLower && u.password === password);
      if (adminFromDb) {
        setUser(adminFromDb);
        router.push('/admin');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[LOGIN DEBUG] Login error:', error);
      // Last-resort fallback if Firebase throws unexpectedly but DB has matching credentials
      try {
        const users = await MockService.getUsersAsync();
        const adminFromDb = users.find((u) => u.role === 'admin' && u.email?.toLowerCase() === emailLower && u.password === password);
        if (adminFromDb) {
          setUser(adminFromDb);
          router.push('/admin');
          return true;
        }
      } catch (_err) {}
      return false;
    }
  };

  const loginCaregiver = async (phone: string, pin: string): Promise<boolean> => {
    try {
      // Use Firebase for login to ensure cross-browser authentication
      const users = await MockService.getUsersAsync();
      
      const caregiver = users.find(
        (u) => u.role === 'caregiver' && u.phone === phone && u.pin === pin && u.isActive
      );
      
      if (caregiver) {
        setUser(caregiver);
        router.push('/caregiver');
        return true;
      }
      return false;
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return false;
    }
  };

  const logout = async () => {
    await logoutFromFirebaseAuth();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loginAdmin, loginCaregiver, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
