import { User, Shift, ScheduledShift, PayType } from '../types';
import { getFirebaseDatabase, isFirebaseConfigured, sendPasswordResetEmailToAdmin } from './firebase';
import { ref, get, set, remove } from 'firebase/database';

const STORAGE_KEYS = {
  USERS: 'cgtm_users',
  SHIFTS: 'cgtm_shifts',
  SCHEDULED_SHIFTS: 'cgtm_scheduled_shifts',
  INITIALIZED: 'cgtm_initialized',
  RESET_TOKENS: 'cgtm_reset_tokens',
};

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Family Admin',
    role: 'admin',
    email: 'lauraweinfeld70@gmail.com',
    password: 'password123',
    isActive: true,
  },
  {
    id: 'admin-2',
    name: 'Example Admin',
    role: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    isActive: true,
  },
  {
    id: 'caregiver-1',
    name: 'Jane Doe',
    role: 'caregiver',
    phone: '5551234',
    pin: '1234',
    payType: 'hourly',
    hourlyRate: 25.0,
    shiftRate: 0,
    isActive: true,
  },
  {
    id: 'caregiver-2',
    name: 'John Smith',
    role: 'caregiver',
    phone: '5555678',
    pin: '5678',
    payType: 'perShift',
    hourlyRate: 28.0,
    shiftRate: 200,
    isActive: true,
  },
];

const ensureCaregiverPayDefaults = (user: User): User => {
  if (user.role !== 'caregiver') return user;
  const payType: PayType = user.payType || 'hourly';
  const hourlyRate = user.hourlyRate ?? 0;
  const shiftRate = user.shiftRate ?? 0;
  return { ...user, payType, hourlyRate, shiftRate };
};

const ensureShiftPayDefaults = (shift: Shift): Shift => {
  const payType: PayType = shift.payType || 'hourly';
  const shiftRate = shift.shiftRate ?? 0;
  return { ...shift, payType, shiftRate };
};

const ensureScheduledShiftPayDefaults = (shift: ScheduledShift): ScheduledShift => {
  const payType: PayType = shift.payType || 'hourly';
  const shiftRate = shift.shiftRate ?? 0;
  return { ...shift, payType, shiftRate };
};

// Helper functions for Firebase operations
const getFirebaseUsersAsync = async (): Promise<User[]> => {
  const db = getFirebaseDatabase();
  if (!db) {
    return [];
  }
  
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const users = Array.isArray(data) ? data : Object.values(data);
      return users;
    }
    return [];
  } catch {
    return [];
  }
};

const saveUserToFirebase = async (user: User) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const userRef = ref(db, `users/${user.id}`);
    await set(userRef, user);
  } catch {
    // Log failure to help debugging (don't expose secrets)
    // eslint-disable-next-line no-console
    console.error('[Firebase] saveUserToFirebase failed for', user.id);
  }
};

const deleteUserFromFirebase = async (userId: string) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const userRef = ref(db, `users/${userId}`);
    await remove(userRef);
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Firebase] deleteUserFromFirebase failed for', userId);
  }
};

const saveShiftToFirebase = async (shift: Shift) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const shiftRef = ref(db, `shifts/${shift.id}`);
    await set(shiftRef, shift);
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Firebase] saveShiftToFirebase failed for', shift.id);
  }
};

const deleteShiftFromFirebase = async (shiftId: string) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const shiftRef = ref(db, `shifts/${shiftId}`);
    await remove(shiftRef);
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Firebase] deleteShiftFromFirebase failed for', shiftId);
  }
};

const getFirebaseShiftsAsync = async (): Promise<Shift[]> => {
  const db = getFirebaseDatabase();
  if (!db) {
    return [];
  }
  
  try {
    const shiftsRef = ref(db, 'shifts');
    const snapshot = await get(shiftsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const shifts = Array.isArray(data) ? data : Object.values(data);
      return shifts;
    }
    return [];
  } catch {
    return [];
  }
};

const saveScheduledShiftToFirebase = async (shift: ScheduledShift) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const shiftRef = ref(db, `scheduled_shifts/${shift.id}`);
    await set(shiftRef, shift);
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Firebase] saveScheduledShiftToFirebase failed for', shift.id);
  }
};

const deleteScheduledShiftFromFirebase = async (shiftId: string) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const shiftRef = ref(db, `scheduled_shifts/${shiftId}`);
    await remove(shiftRef);
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Firebase] deleteScheduledShiftFromFirebase failed for', shiftId);
  }
};

const getFirebaseScheduledShiftsAsync = async (): Promise<ScheduledShift[]> => {
  const db = getFirebaseDatabase();
  if (!db) {
    return [];
  }
  
  try {
    const shiftsRef = ref(db, 'scheduled_shifts');
    const snapshot = await get(shiftsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const shifts = Array.isArray(data) ? data : Object.values(data);
      return shifts;
    }
    return [];
  } catch {
    return [];
  }
};

// Password reset token management
interface ResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}

const generateResetToken = (email: string, userId: string): string => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const resetTokens: ResetToken[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESET_TOKENS) || '[]');
  
  // Remove any existing tokens for this email
  const filtered = resetTokens.filter(t => t.email !== email);
  
  // Add new token with 1 hour expiration
  const newToken: ResetToken = {
    token,
    userId,
    email,
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
  };
  
  filtered.push(newToken);
  localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(filtered));
  
  return token;
};

const validateResetToken = (token: string): { userId: string; email: string } | null => {
  const resetTokens: ResetToken[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESET_TOKENS) || '[]');
  const resetToken = resetTokens.find(t => t.token === token && t.expiresAt > Date.now());
  
  if (!resetToken) {
    return null;
  }
  
  return { userId: resetToken.userId, email: resetToken.email };
};

const clearResetToken = (token: string) => {
  const resetTokens: ResetToken[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESET_TOKENS) || '[]');
  const filtered = resetTokens.filter(t => t.token !== token);
  localStorage.setItem(STORAGE_KEYS.RESET_TOKENS, JSON.stringify(filtered));
};

export const MockService = {
  getUsers: (): User[] => {
    if (typeof window === 'undefined') return INITIAL_USERS.map(ensureCaregiverPayDefaults);
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      
      // If data exists and is valid, return it
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure admin user is always present
          const hasAdmin = parsed.some(u => u.role === 'admin');
          if (!hasAdmin) {
            const normalizedDefaults = INITIAL_USERS.map(ensureCaregiverPayDefaults);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalizedDefaults));
            return normalizedDefaults;
          }
          return parsed.map(ensureCaregiverPayDefaults);
        }
      }
      
      // If no valid data exists, initialize with defaults
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return INITIAL_USERS.map(ensureCaregiverPayDefaults);
    } catch {
      // On any error, restore defaults
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      return INITIAL_USERS.map(ensureCaregiverPayDefaults);
    }
  },

  // Async version that fetches from Firebase if available
  getUsersAsync: async (): Promise<User[]> => {
    if (isFirebaseConfigured()) {
      let fbUsers = await getFirebaseUsersAsync();
      
      // Normalize emails to lowercase for consistent comparison
      fbUsers = fbUsers.map(u => ({
        ...u,
        email: u.email ? u.email.toLowerCase() : u.email
      }));
      
      // If Firebase has users, merge with defaults to ensure admin is always present
      if (fbUsers.length > 0) {
        // CRITICAL: Always ensure admin user exists
        const hasAdmin = fbUsers.some(u => u.role === 'admin');
        let finalUsers = fbUsers;
        
        if (!hasAdmin) {
          const defaultAdmin = INITIAL_USERS.find(u => u.role === 'admin');
          if (defaultAdmin) {
            finalUsers = [defaultAdmin, ...fbUsers];
            // Save admin to Firebase so it's there next time
            await saveUserToFirebase(defaultAdmin);
          }
        }
        
        const normalized = finalUsers.map(ensureCaregiverPayDefaults);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
        return normalized;
      }
      
      // If Firebase is empty, initialize it with default users (first time setup)
      const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      
      if (!isInitialized) {
        // First time: initialize Firebase with default users
        for (const user of INITIAL_USERS) {
          await saveUserToFirebase(user);
        }
        const normalized = INITIAL_USERS.map(ensureCaregiverPayDefaults);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return normalized;
      }
      
      // Firebase is empty and already initialized - return cached or defaults
      const cached = localStorage.getItem(STORAGE_KEYS.USERS);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Array.isArray(parsedCache) && parsedCache.length > 0) {
          return parsedCache.map(ensureCaregiverPayDefaults);
        }
      }
      
      // If cache is also empty/invalid, restore defaults
      const normalized = INITIAL_USERS.map(ensureCaregiverPayDefaults);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
      return normalized;
    }
    return MockService.getUsers();
  },

  saveUser: (user: User) => {
    try {
      const normalizedUser = ensureCaregiverPayDefaults(user);
      // Update Firebase if available
      if (isFirebaseConfigured()) {
        saveUserToFirebase(normalizedUser);
      }
      
      // Always update localStorage as fallback
      const users = MockService.getUsers();
      const index = users.findIndex((u) => u.id === normalizedUser.id);
      if (index >= 0) {
        users[index] = normalizedUser;
      } else {
        users.push(normalizedUser);
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // Don't fail silently - ensure at least the user is sent to Firebase
      if (isFirebaseConfigured()) {
        const normalizedUser = ensureCaregiverPayDefaults(user);
        saveUserToFirebase(normalizedUser);
      }
    }
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    try {
      const users = MockService.getUsers();
      const index = users.findIndex((u) => u.id === userId);
      if (index >= 0) {
        users[index] = ensureCaregiverPayDefaults({ ...users[index], ...updates });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        // Update Firebase if available
        if (isFirebaseConfigured()) {
          saveUserToFirebase(users[index]);
          try {
            const db = getFirebaseDatabase();
            if (db) {
              set(ref(db, `users/${userId}`), users[index]);
            }
          } catch {}
        }
        
        return users[index];
      }
      return null;
    } catch {
      return null;
    }
  },

  deleteUser: (userId: string) => {
    try {
      const users = MockService.getUsers().filter((u) => u.id !== userId);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // Delete from Firebase if available
      if (isFirebaseConfigured()) {
        deleteUserFromFirebase(userId);
      }
    } catch {
      // Still try to delete from Firebase if localStorage fails
      if (isFirebaseConfigured()) {
        deleteUserFromFirebase(userId);
      }
    }
  },

  getShifts: (): Shift[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map(ensureShiftPayDefaults) : [];
  },

  getShiftsAsync: async (): Promise<Shift[]> => {
    if (typeof window === 'undefined') return [];
    
    if (isFirebaseConfigured()) {
      const fbShifts = await getFirebaseShiftsAsync();
      if (fbShifts.length > 0) {
        const normalized = fbShifts.map(ensureShiftPayDefaults);
        localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(normalized));
        return normalized;
      }
    }
    
    return MockService.getShifts();
  },

  saveShift: async (shift: Shift) => {
    const normalizedShift = ensureShiftPayDefaults(shift);
    const shifts = MockService.getShifts();
    const index = shifts.findIndex((s) => s.id === normalizedShift.id);
    if (index >= 0) {
      shifts[index] = normalizedShift;
    } else {
      shifts.push(normalizedShift);
    }
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    
    // Save to Firebase if available and wait for completion
    if (isFirebaseConfigured()) {
      await saveShiftToFirebase(normalizedShift);
    }
  },

  deleteShift: async (shiftId: string) => {
    const shifts = MockService.getShifts().filter((s) => s.id !== shiftId);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
    
    // Delete from Firebase if available and wait for completion
    if (isFirebaseConfigured()) {
      await deleteShiftFromFirebase(shiftId);
    }
  },

  getActiveShift: (caregiverId: string): Shift | undefined => {
    const shifts = MockService.getShifts();
    return shifts.find((s) => s.caregiverId === caregiverId && !s.endTime && s.status === 'in-progress');
  },

  // Async version that fetches from Firebase
  getActiveShiftAsync: async (caregiverId: string): Promise<Shift | undefined> => {
    const shifts = await MockService.getShiftsAsync();
    return shifts.find((s) => s.caregiverId === caregiverId && !s.endTime && s.status === 'in-progress');
  },

  // Get any active shift in the system (for concurrent shift prevention)
  getAnyActiveShift: (): { shift: Shift; caregiverName: string } | null => {
    const shifts = MockService.getShifts();
    const activeShift = shifts.find((s) => !s.endTime && s.status === 'in-progress');
    
    if (!activeShift) return null;
    
    const users = MockService.getUsers();
    const caregiver = users.find(u => u.id === activeShift.caregiverId);
    
    return {
      shift: activeShift,
      caregiverName: caregiver?.name || 'Unknown Caregiver'
    };
  },

  // Async version that checks Firebase for real-time data
  getAnyActiveShiftAsync: async (): Promise<{ shift: Shift; caregiverName: string } | null> => {
    const shifts = await MockService.getShiftsAsync();
    const activeShift = shifts.find((s) => !s.endTime && s.status === 'in-progress');
    
    if (!activeShift) return null;
    
    const users = await MockService.getUsersAsync();
    const caregiver = users.find(u => u.id === activeShift.caregiverId);
    
    return {
      shift: activeShift,
      caregiverName: caregiver?.name || 'Unknown Caregiver'
    };
  },

  // Clock out a specific shift (for smart handoff)
  clockOutShift: (shiftId: string): void => {
    const shifts = MockService.getShifts();
    const shift = shifts.find(s => s.id === shiftId);
    
    if (shift && shift.status === 'in-progress') {
      const endTime = new Date().toISOString();
      const updatedShift = { ...shift, endTime, status: 'completed' as const };
      MockService.saveShift(updatedShift);
    }
  },

  // Scheduled Shifts Management
  getScheduledShifts: (): ScheduledShift[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULED_SHIFTS);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map(ensureScheduledShiftPayDefaults) : [];
  },

  getScheduledShiftsAsync: async (): Promise<ScheduledShift[]> => {
    if (typeof window === 'undefined') return [];
    
    if (isFirebaseConfigured()) {
      const fbShifts = await getFirebaseScheduledShiftsAsync();
      // Always overwrite local cache with server state, even when empty
      const normalized = fbShifts.map(ensureScheduledShiftPayDefaults);
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(normalized));
      return normalized;
    }
    
    return MockService.getScheduledShifts();
  },

  saveScheduledShift: (shift: ScheduledShift) => {
    const normalizedShift = ensureScheduledShiftPayDefaults(shift);
    const shifts = MockService.getScheduledShifts();
    const index = shifts.findIndex((s) => s.id === normalizedShift.id);
    if (index >= 0) {
      shifts[index] = normalizedShift;
    } else {
      shifts.push(normalizedShift);
    }
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
    
    // Save to Firebase if available
    if (isFirebaseConfigured()) {
      saveScheduledShiftToFirebase(normalizedShift);
    }
  },

  updateScheduledShift: (shiftId: string, updates: Partial<ScheduledShift>) => {
    const shifts = MockService.getScheduledShifts();
    const index = shifts.findIndex((s) => s.id === shiftId);
    if (index >= 0) {
      shifts[index] = ensureScheduledShiftPayDefaults({ ...shifts[index], ...updates });
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
      
      // Save to Firebase if available
      if (isFirebaseConfigured()) {
        saveScheduledShiftToFirebase(shifts[index]);
      }
      
      return shifts[index];
    }
    return null;
  },

  deleteScheduledShift: (shiftId: string) => {
    const shifts = MockService.getScheduledShifts().filter((s) => s.id !== shiftId);
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
    
    // Delete from Firebase if available
    if (isFirebaseConfigured()) {
      deleteScheduledShiftFromFirebase(shiftId);
    }
  },

  // Get available (open) shifts for a caregiver
  getAvailableShifts: (caregiverId?: string): ScheduledShift[] => {
    const shifts = MockService.getScheduledShifts();
    if (caregiverId) {
      // Return open shifts and shifts assigned to this caregiver
      return shifts.filter((s) => s.status === 'open' || s.caregiverId === caregiverId);
    }
    return shifts.filter((s) => s.status === 'open');
  },

  // Get shifts assigned to a specific caregiver
  getMyCaregiverShifts: (caregiverId: string): ScheduledShift[] => {
    const shifts = MockService.getScheduledShifts();
    return shifts.filter((s) => s.caregiverId === caregiverId && s.status !== 'open');
  },

  // Claim a shift (caregiver self-assignment)
  claimShift: (shiftId: string, caregiverId: string): { success: boolean; message: string } => {
    const shifts = MockService.getScheduledShifts();
    const shift = shifts.find((s) => s.id === shiftId);
    
    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }
    
    if (shift.status !== 'open') {
      return { success: false, message: 'Shift is no longer available' };
    }
    
    // Check for conflicts
    const conflict = MockService.checkShiftConflict(caregiverId, shift.scheduledStartTime, shift.scheduledEndTime);
    if (conflict) {
      return { success: false, message: 'You have an overlapping shift at this time' };
    }
    
    // Assign shift
    const users = MockService.getUsers();
    const caregiver = users.find(u => u.id === caregiverId && u.role === 'caregiver');
    if (caregiver) {
      shift.payType = caregiver.payType || 'hourly';
      shift.hourlyRate = caregiver.hourlyRate ?? 0;
      shift.shiftRate = caregiver.shiftRate ?? 0;
    }
    shift.caregiverId = caregiverId;
    shift.status = 'assigned';
    MockService.saveScheduledShift(shift);
    
    return { success: true, message: 'Shift claimed successfully' };
  },

  // Drop a shift (caregiver cancellation)
  dropShift: (shiftId: string, caregiverId: string): { success: boolean; message: string } => {
    const shifts = MockService.getScheduledShifts();
    const shift = shifts.find((s) => s.id === shiftId);
    
    if (!shift) {
      return { success: false, message: 'Shift not found' };
    }
    
    if (shift.caregiverId !== caregiverId) {
      return { success: false, message: 'This is not your shift' };
    }
    
    // Check if shift is more than 24 hours away
    const now = new Date().getTime();
    const shiftStart = new Date(shift.scheduledStartTime).getTime();
    const hoursUntilShift = (shiftStart - now) / (1000 * 60 * 60);
    
    if (hoursUntilShift < 24) {
      return { success: false, message: 'Cannot drop shift less than 24 hours before start. Contact Admin.' };
    }
    
    // Revert to open
    shift.caregiverId = null;
    shift.status = 'open';
    MockService.saveScheduledShift(shift);
    
    return { success: true, message: 'Shift dropped successfully' };
  },

  // Check if a caregiver has conflicting shifts
  checkShiftConflict: (caregiverId: string, newStartTime: string, newEndTime: string): boolean => {
    const caregiverShifts = MockService.getMyCaregiverShifts(caregiverId);
    const newStart = new Date(newStartTime).getTime();
    const newEnd = new Date(newEndTime).getTime();
    
    return caregiverShifts.some((shift) => {
      const existingStart = new Date(shift.scheduledStartTime).getTime();
      const existingEnd = new Date(shift.scheduledEndTime).getTime();
      
      // Check for overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });
  },

  // Reset all data to initial state (for debugging/testing)
  resetAllData: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  // Clear initialization flag to allow reset on next load
  clearInitialization: () => {
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  },

  // Password reset functions
  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string; resetToken?: string }> => {
    const users = MockService.getUsers();
    const user = users.find(u => u.role === 'admin' && u.email === email);
    
    if (!user) {
      // For security, don't reveal if email exists
      return { success: true, message: 'If an admin account exists with that email, a reset link has been sent.' };
    }
    
    // If Firebase is not configured, fall back to local token generation
    if (!isFirebaseConfigured()) {
      const resetToken = generateResetToken(email, user.id);
      return {
        success: true,
        message: 'Password reset token generated locally (Firebase not configured).',
        resetToken,
      };
    }

    // Try Firebase email first - this is the preferred method
    try {
      const firebaseResult = await sendPasswordResetEmailToAdmin(email);
      
      if (firebaseResult.success) {
        return { 
          success: true, 
          message: 'Password reset email has been sent. Please check your inbox and spam folder.'
        };
      }
      
      // If Firebase fails, generate a local token as a fallback
      const resetToken = generateResetToken(email, user.id);
      return { 
        success: true, 
        message: 'Firebase email failed; generated local reset token instead.',
        resetToken,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const resetToken = generateResetToken(email, user.id);
      return { 
        success: true, 
        message: `Error sending reset email (${message}); generated local reset token instead.`,
        resetToken,
      };
    }
  },

  validatePasswordResetToken: (token: string): boolean => {
    return validateResetToken(token) !== null;
  },

  resetPasswordWithToken: (token: string, newPassword: string): { success: boolean; message: string } => {
    const resetInfo = validateResetToken(token);
    
    if (!resetInfo) {
      return { success: false, message: 'Invalid or expired reset token.' };
    }
    
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
    
    const users = MockService.getUsers();
    const userIndex = users.findIndex(u => u.id === resetInfo.userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }
    
    users[userIndex].password = newPassword;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    clearResetToken(token);
    
    // Save to Firebase if available
    if (isFirebaseConfigured()) {
      const db = getFirebaseDatabase();
      if (db) {
        const userRef = ref(db, `users/${resetInfo.userId}`);
        set(userRef, users[userIndex]);
      }
    }
    
    return { success: true, message: 'Password has been reset successfully.' };
  },

  // Async version that properly waits for Firebase to complete
  resetPasswordWithTokenAsync: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const resetInfo = validateResetToken(token);
    
    if (!resetInfo) {
      return { success: false, message: 'Invalid or expired reset token.' };
    }
    
    if (newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }
    
    const users = MockService.getUsers();
    const userIndex = users.findIndex(u => u.id === resetInfo.userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found.' };
    }
    
    users[userIndex].password = newPassword;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    clearResetToken(token);
    
    // Save to Firebase if available - WAIT for it to complete
    if (isFirebaseConfigured()) {
      const db = getFirebaseDatabase();
      if (db) {
        try {
          const userRef = ref(db, `users/${resetInfo.userId}`);
          await set(userRef, users[userIndex]);
        } catch {
          // Firebase save failed, but local password is updated
        }
      }
    }
    
    return { success: true, message: 'Password has been reset successfully.' };
  },
};
