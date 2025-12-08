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
    const users = await MockService.getUsersAsync();
    const admin = users.find(
      (u) => u.role === 'admin' && u.email === email && u.password === password
    );
    if (admin) {
      setUser(admin);
      router.push('/admin');
      return true;
    }
    return false;
  };

  const loginCaregiver = async (phone: string, pin: string): Promise<boolean> => {
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
