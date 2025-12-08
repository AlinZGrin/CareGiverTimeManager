'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { MockService } from '../services/mockData';
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
    console.log('loginAdmin called with email:', email);
    try {
      // First try localStorage (instant, reliable)
      let users = MockService.getUsers();
      console.log('Users from localStorage:', users.length);
      
      // If no users in localStorage, try async Firebase
      if (users.length === 0) {
        console.log('No users in localStorage, fetching from Firebase...');
        users = await MockService.getUsersAsync();
        console.log('Users from Firebase:', users.length);
      }
      
      console.log('Users available:', users.length, users.map(u => u.email || u.phone));
      const admin = users.find(
        (u) => u.role === 'admin' && u.email === email && u.password === password
      );
      if (admin) {
        console.log('Admin login successful');
        setUser(admin);
        router.push('/admin');
        return true;
      }
      console.log('Admin login failed - no match found');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginCaregiver = async (phone: string, pin: string): Promise<boolean> => {
    console.log('loginCaregiver called with phone:', phone);
    try {
      // First try localStorage (instant, reliable)
      let users = MockService.getUsers();
      console.log('Users from localStorage:', users.length);
      
      // If no users in localStorage, try async Firebase
      if (users.length === 0) {
        console.log('No users in localStorage, fetching from Firebase...');
        users = await MockService.getUsersAsync();
        console.log('Users from Firebase:', users.length);
      }
      
      console.log('Users available:', users.length, users.map(u => u.email || u.phone));
      const caregiver = users.find(
        (u) => u.role === 'caregiver' && u.phone === phone && u.pin === pin && u.isActive
      );
      if (caregiver) {
        console.log('Caregiver login successful');
        setUser(caregiver);
        router.push('/caregiver');
        return true;
      }
      console.log('Caregiver login failed - no match found');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
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
