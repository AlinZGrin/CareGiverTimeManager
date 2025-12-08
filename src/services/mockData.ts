import { User, Shift, ScheduledShift } from '../types';
import { getFirebaseDatabase, isFirebaseConfigured } from './firebase';
import { ref, get, set, update, remove, onValue, off } from 'firebase/database';

const STORAGE_KEYS = {
  USERS: 'cgtm_users',
  SHIFTS: 'cgtm_shifts',
  SCHEDULED_SHIFTS: 'cgtm_scheduled_shifts',
  INITIALIZED: 'cgtm_initialized',
};

const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Family Admin',
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
    hourlyRate: 25.0,
    isActive: true,
  },
  {
    id: 'caregiver-2',
    name: 'John Smith',
    role: 'caregiver',
    phone: '5555678',
    pin: '5678',
    hourlyRate: 28.0,
    isActive: true,
  },
];

// Helper functions for Firebase operations
const getFirebaseUsersAsync = async (): Promise<User[]> => {
  const db = getFirebaseDatabase();
  if (!db) return [];
  
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Array.isArray(data) ? data : Object.values(data);
    }
    return [];
  } catch (error) {
    console.error('Error fetching users from Firebase:', error);
    return [];
  }
};

const saveUserToFirebase = async (user: User) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const userRef = ref(db, `users/${user.id}`);
    await set(userRef, user);
  } catch (error) {
    console.error('Error saving user to Firebase:', error);
  }
};

const deleteUserFromFirebase = async (userId: string) => {
  const db = getFirebaseDatabase();
  if (!db) return;
  
  try {
    const userRef = ref(db, `users/${userId}`);
    await remove(userRef);
  } catch (error) {
    console.error('Error deleting user from Firebase:', error);
  }
};

export const MockService = {
  getUsers: (): User[] => {
    if (typeof window === 'undefined') return INITIAL_USERS;
    
    // Use Firebase if configured - it takes priority
    if (isFirebaseConfigured()) {
      // For sync calls, return from localStorage as fallback
      // But Firebase is the source of truth when configured
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      return stored ? JSON.parse(stored) : [];
    }
    
    // Only use LocalStorage if Firebase is not configured
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!stored) {
      // Only initialize with mock data on first app load
      const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!isInitialized) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return INITIAL_USERS;
      }
      // Return empty array if already initialized but no users (user deleted them all)
      return [];
    }
    return JSON.parse(stored);
  },

  // Async version that fetches from Firebase if available
  getUsersAsync: async (): Promise<User[]> => {
    if (isFirebaseConfigured()) {
      const fbUsers = await getFirebaseUsersAsync();
      
      // If Firebase has users, return them and update cache
      if (fbUsers.length > 0) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(fbUsers));
        return fbUsers;
      }
      
      // If Firebase is empty, initialize it with default users (first time setup)
      const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!isInitialized) {
        // First time: initialize Firebase with default users
        for (const user of INITIAL_USERS) {
          await saveUserToFirebase(user);
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return INITIAL_USERS;
      }
      
      // Firebase is empty and already initialized - return cached or empty
      const cached = localStorage.getItem(STORAGE_KEYS.USERS);
      return cached ? JSON.parse(cached) : [];
    }
    return MockService.getUsers();
  },

  saveUser: (user: User) => {
    // Update Firebase if available
    if (isFirebaseConfigured()) {
      saveUserToFirebase(user);
    }
    
    // Always update localStorage as fallback
    const users = MockService.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  updateUser: (userId: string, updates: Partial<User>) => {
    const users = MockService.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index >= 0) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // Update Firebase if available
      if (isFirebaseConfigured()) {
        saveUserToFirebase(users[index]);
      }
      
      return users[index];
    }
    return null;
  },

  deleteUser: (userId: string) => {
    const users = MockService.getUsers().filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Delete from Firebase if available
    if (isFirebaseConfigured()) {
      deleteUserFromFirebase(userId);
    }
  },

  getShifts: (): Shift[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    return stored ? JSON.parse(stored) : [];
  },

  saveShift: (shift: Shift) => {
    const shifts = MockService.getShifts();
    const index = shifts.findIndex((s) => s.id === shift.id);
    if (index >= 0) {
      shifts[index] = shift;
    } else {
      shifts.push(shift);
    }
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  },

  deleteShift: (shiftId: string) => {
    const shifts = MockService.getShifts().filter((s) => s.id !== shiftId);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  },

  getActiveShift: (caregiverId: string): Shift | undefined => {
    const shifts = MockService.getShifts();
    return shifts.find((s) => s.caregiverId === caregiverId && !s.endTime && s.status === 'in-progress');
  },

  // Scheduled Shifts Management
  getScheduledShifts: (): ScheduledShift[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULED_SHIFTS);
    return stored ? JSON.parse(stored) : [];
  },

  saveScheduledShift: (shift: ScheduledShift) => {
    const shifts = MockService.getScheduledShifts();
    const index = shifts.findIndex((s) => s.id === shift.id);
    if (index >= 0) {
      shifts[index] = shift;
    } else {
      shifts.push(shift);
    }
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
  },

  updateScheduledShift: (shiftId: string, updates: Partial<ScheduledShift>) => {
    const shifts = MockService.getScheduledShifts();
    const index = shifts.findIndex((s) => s.id === shiftId);
    if (index >= 0) {
      shifts[index] = { ...shifts[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
      return shifts[index];
    }
    return null;
  },

  deleteScheduledShift: (shiftId: string) => {
    const shifts = MockService.getScheduledShifts().filter((s) => s.id !== shiftId);
    localStorage.setItem(STORAGE_KEYS.SCHEDULED_SHIFTS, JSON.stringify(shifts));
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
};
