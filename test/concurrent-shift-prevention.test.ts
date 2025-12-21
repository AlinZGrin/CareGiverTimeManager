import { describe, test, expect, beforeEach } from 'vitest';
import { MockService } from '../src/services/mockData';
import { Shift } from '../src/types';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Setup global mocks with proper typing
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: { localStorage: localStorageMock },
  writable: true
});

describe('Concurrent Shift Prevention', () => {
  beforeEach(() => {
    // Clear all data before each test
    localStorageMock.clear();
    MockService.resetAllData();
  });

  test('should automatically end existing in-progress shift when starting a new one', async () => {
    // Setup: Create a caregiver
    const caregiverId = 'test-caregiver-1';
    
    // Start first shift
    const shift1: Shift = {
      id: 'shift-1',
      caregiverId,
      startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift1);

    // Verify first shift is in-progress
    let shifts = await MockService.getShiftsAsync();
    let activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);
    expect(activeShifts[0].id).toBe('shift-1');

    // Now use the autoEndActiveShiftAsync method (simulating clock-in logic)
    const endResult = await MockService.autoEndActiveShiftAsync();
    
    // Verify the shift was automatically ended
    expect(endResult.ended).toBe(true);
    expect(endResult.shiftId).toBe('shift-1');

    // Verify no in-progress shifts remain
    shifts = await MockService.getShiftsAsync();
    activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(0);

    // Verify the shift was marked as completed
    const completedShift = shifts.find(s => s.id === 'shift-1');
    expect(completedShift?.status).toBe('completed');
    expect(completedShift?.endTime).toBeDefined();
  });

  test('should only allow one in-progress shift at a time', async () => {
    const caregiver1Id = 'test-caregiver-1';
    const caregiver2Id = 'test-caregiver-2';
    
    // Caregiver 1 starts a shift
    const shift1: Shift = {
      id: 'shift-1',
      caregiverId: caregiver1Id,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift1);

    // Verify one in-progress shift
    let shifts = await MockService.getShiftsAsync();
    let activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);

    // Caregiver 2 tries to start a shift - first end any existing shift
    await MockService.autoEndActiveShiftAsync();
    
    const shift2: Shift = {
      id: 'shift-2',
      caregiverId: caregiver2Id,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 28,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift2);

    // Verify only one in-progress shift exists (shift2)
    shifts = await MockService.getShiftsAsync();
    activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);
    expect(activeShifts[0].id).toBe('shift-2');
    expect(activeShifts[0].caregiverId).toBe(caregiver2Id);

    // Verify shift1 was completed
    const completedShift1 = shifts.find(s => s.id === 'shift-1');
    expect(completedShift1?.status).toBe('completed');
    expect(completedShift1?.endTime).toBeDefined();
  });

  test('should handle multiple clock-in attempts correctly', async () => {
    const caregiverId = 'test-caregiver-1';
    
    // First clock-in
    const shift1: Shift = {
      id: 'shift-1',
      caregiverId,
      startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift1);

    // Second clock-in attempt - should end first shift
    await MockService.autoEndActiveShiftAsync();
    
    const shift2: Shift = {
      id: 'shift-2',
      caregiverId,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift2);

    // Verify only shift2 is in-progress
    let shifts = await MockService.getShiftsAsync();
    let activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);
    expect(activeShifts[0].id).toBe('shift-2');

    // Third clock-in attempt - should end shift2
    await MockService.autoEndActiveShiftAsync();
    
    const shift3: Shift = {
      id: 'shift-3',
      caregiverId,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift3);

    // Verify only shift3 is in-progress
    shifts = await MockService.getShiftsAsync();
    activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);
    expect(activeShifts[0].id).toBe('shift-3');

    // Verify all previous shifts are completed
    const completedShifts = shifts.filter(s => s.status === 'completed');
    expect(completedShifts.length).toBe(2);
    expect(completedShifts.some(s => s.id === 'shift-1')).toBe(true);
    expect(completedShifts.some(s => s.id === 'shift-2')).toBe(true);
  });

  test('should return correct caregiver information when ending shift', async () => {
    // Setup test user
    const testUser = {
      id: 'test-caregiver-1',
      name: 'John Test',
      role: 'caregiver' as const,
      phone: '1234567890',
      pin: '1234',
      payType: 'hourly' as const,
      hourlyRate: 25,
      shiftRate: 0,
      isActive: true,
    };
    MockService.saveUser(testUser);

    // Start a shift for this user
    const shift: Shift = {
      id: 'shift-1',
      caregiverId: testUser.id,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift);

    // End the shift and check caregiver info
    const result = await MockService.autoEndActiveShiftAsync();
    
    expect(result.ended).toBe(true);
    expect(result.caregiverName).toBe('John Test');
    expect(result.shiftId).toBe('shift-1');
  });

  test('should return ended:false when no in-progress shift exists', async () => {
    // No shifts in the system
    const result = await MockService.autoEndActiveShiftAsync();
    
    expect(result.ended).toBe(false);
    expect(result.caregiverName).toBeUndefined();
    expect(result.shiftId).toBeUndefined();
  });

  test('should handle smart handoff between different caregivers', async () => {
    const caregiver1Id = 'caregiver-1';
    const caregiver2Id = 'caregiver-2';
    
    // Caregiver 1 starts shift
    const shift1: Shift = {
      id: 'shift-1',
      caregiverId: caregiver1Id,
      startTime: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
      payType: 'hourly',
      hourlyRate: 25,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift1);

    // Check for active shift
    const activeShiftInfo = await MockService.getAnyActiveShiftAsync();
    expect(activeShiftInfo).not.toBeNull();
    expect(activeShiftInfo?.shift.caregiverId).toBe(caregiver1Id);

    // Caregiver 2 starts shift - should end caregiver 1's shift first
    await MockService.autoEndActiveShiftAsync();
    
    const shift2: Shift = {
      id: 'shift-2',
      caregiverId: caregiver2Id,
      startTime: new Date().toISOString(),
      payType: 'hourly',
      hourlyRate: 28,
      shiftRate: 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(shift2);

    // Verify only caregiver 2's shift is active
    const shifts = await MockService.getShiftsAsync();
    const activeShifts = shifts.filter(s => s.status === 'in-progress');
    expect(activeShifts.length).toBe(1);
    expect(activeShifts[0].caregiverId).toBe(caregiver2Id);

    // Verify caregiver 1's shift is completed
    const caregiver1Shifts = shifts.filter(s => s.caregiverId === caregiver1Id);
    expect(caregiver1Shifts.length).toBe(1);
    expect(caregiver1Shifts[0].status).toBe('completed');
  });
});
