export type Role = 'admin' | 'caregiver';

export type PayType = 'hourly' | 'perShift';

export interface User {
  id: string;
  name: string;
  role: Role;
  phone?: string; // For caregivers
  pin?: string;   // For caregivers
  email?: string; // For admins
  password?: string; // For admins
  payType?: PayType; // How caregiver is paid
  hourlyRate?: number; // For caregivers
  shiftRate?: number; // Fixed amount per shift/day
  isActive: boolean;
}

export type ShiftStatus = 'open' | 'assigned' | 'in-progress' | 'completed';

export interface Shift {
  id: string;
  caregiverId: string | null; // null for open shifts
  startTime: string; // ISO string - scheduled or actual start
  endTime?: string;   // ISO string - scheduled or actual end
  scheduledStartTime?: string; // ISO string - for scheduled shifts
  scheduledEndTime?: string;   // ISO string - for scheduled shifts
  actualStartTime?: string; // ISO string - when caregiver clocked in
  actualEndTime?: string;   // ISO string - when caregiver clocked out
  hourlyRate: number;
  shiftRate?: number; // Fixed amount for per-shift pay
  payType?: PayType;
  isPaid: boolean;
  status: ShiftStatus; // 'open', 'assigned', 'in-progress', 'completed'
  shiftName?: string; // e.g., "Night Shift", "Morning Shift"
}

export interface ScheduledShift {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  scheduledStartTime: string; // ISO datetime string
  scheduledEndTime: string; // ISO datetime string
  caregiverId: string | null; // null if open/unassigned
  status: ShiftStatus;
  shiftName?: string;
  hourlyRate?: number; // Optional, can inherit from caregiver profile
  shiftRate?: number; // Optional fixed amount when payType is perShift
  payType?: PayType;
}
