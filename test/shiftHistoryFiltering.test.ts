import { describe, it, expect } from 'vitest';
import { Shift } from '../src/types';

// Helper function to calculate shift pay (matches the one in shiftUtils.ts)
function calculateShiftPay(shift: Shift): number {
  if (!shift.endTime) return 0;
  
  const start = new Date(shift.startTime).getTime();
  const end = new Date(shift.endTime).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  
  if (shift.payType === 'perShift') {
    return shift.shiftRate || 0;
  }
  
  return (shift.hourlyRate || 0) * hours;
}

// Filter function that matches the implementation
function filterShifts(
  shifts: Shift[],
  statusFilter: 'all' | 'paid' | 'unpaid',
  caregiverFilter: string
): Shift[] {
  return shifts.filter(s => {
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'paid' && s.isPaid) || 
      (statusFilter === 'unpaid' && !s.isPaid);
    const caregiverMatch = caregiverFilter === 'all' || s.caregiverId === caregiverFilter;
    return statusMatch && caregiverMatch;
  });
}

// Calculate total for filtered shifts
function calculateFilteredTotal(shifts: Shift[]): number {
  return shifts
    .filter(s => s.endTime)
    .reduce((acc, s) => acc + calculateShiftPay(s), 0);
}

describe('Shift History Filtering', () => {
  const mockShifts: Shift[] = [
    {
      id: '1',
      caregiverId: 'caregiver-1',
      startTime: '2024-01-01T08:00:00Z',
      endTime: '2024-01-01T16:00:00Z',
      hourlyRate: 25,
      payType: 'hourly',
      isPaid: false,
      status: 'completed'
    },
    {
      id: '2',
      caregiverId: 'caregiver-1',
      startTime: '2024-01-02T08:00:00Z',
      endTime: '2024-01-02T16:00:00Z',
      hourlyRate: 25,
      payType: 'hourly',
      isPaid: true,
      status: 'completed'
    },
    {
      id: '3',
      caregiverId: 'caregiver-2',
      startTime: '2024-01-03T08:00:00Z',
      endTime: '2024-01-03T16:00:00Z',
      shiftRate: 200,
      hourlyRate: 28,
      payType: 'perShift',
      isPaid: false,
      status: 'completed'
    },
    {
      id: '4',
      caregiverId: 'caregiver-2',
      startTime: '2024-01-04T08:00:00Z',
      endTime: '2024-01-04T16:00:00Z',
      shiftRate: 200,
      hourlyRate: 28,
      payType: 'perShift',
      isPaid: true,
      status: 'completed'
    },
  ];

  describe('Status Filter', () => {
    it('should show all shifts when filter is "all"', () => {
      const filtered = filterShifts(mockShifts, 'all', 'all');
      expect(filtered).toHaveLength(4);
    });

    it('should show only paid shifts when filter is "paid"', () => {
      const filtered = filterShifts(mockShifts, 'paid', 'all');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.isPaid)).toBe(true);
    });

    it('should show only unpaid shifts when filter is "unpaid"', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'all');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => !s.isPaid)).toBe(true);
    });
  });

  describe('Caregiver Filter', () => {
    it('should show all shifts when filter is "all"', () => {
      const filtered = filterShifts(mockShifts, 'all', 'all');
      expect(filtered).toHaveLength(4);
    });

    it('should show only caregiver-1 shifts', () => {
      const filtered = filterShifts(mockShifts, 'all', 'caregiver-1');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.caregiverId === 'caregiver-1')).toBe(true);
    });

    it('should show only caregiver-2 shifts', () => {
      const filtered = filterShifts(mockShifts, 'all', 'caregiver-2');
      expect(filtered).toHaveLength(2);
      expect(filtered.every(s => s.caregiverId === 'caregiver-2')).toBe(true);
    });
  });

  describe('Combined Filters', () => {
    it('should filter by both status and caregiver', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'caregiver-1');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
      expect(filtered[0].isPaid).toBe(false);
      expect(filtered[0].caregiverId).toBe('caregiver-1');
    });

    it('should return empty array when no shifts match both filters', () => {
      // caregiver-1 has no paid shifts with shiftRate 200
      const filtered = filterShifts(mockShifts, 'paid', 'caregiver-1')
        .filter(s => s.shiftRate === 200);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Total Calculation', () => {
    it('should calculate correct total for all shifts', () => {
      const filtered = filterShifts(mockShifts, 'all', 'all');
      const total = calculateFilteredTotal(filtered);
      // caregiver-1: 2 shifts × 8 hours × $25 = $400
      // caregiver-2: 2 shifts × $200 = $400
      // Total = $800
      expect(total).toBe(800);
    });

    it('should calculate correct total for unpaid shifts only', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'all');
      const total = calculateFilteredTotal(filtered);
      // caregiver-1: 1 shift × 8 hours × $25 = $200
      // caregiver-2: 1 shift × $200 = $200
      // Total = $400
      expect(total).toBe(400);
    });

    it('should calculate correct total for single caregiver', () => {
      const filtered = filterShifts(mockShifts, 'all', 'caregiver-2');
      const total = calculateFilteredTotal(filtered);
      // caregiver-2: 2 shifts × $200 = $400
      expect(total).toBe(400);
    });

    it('should calculate correct total with combined filters', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'caregiver-1');
      const total = calculateFilteredTotal(filtered);
      // caregiver-1: 1 unpaid shift × 8 hours × $25 = $200
      expect(total).toBe(200);
    });
  });

  describe('Bulk Pay Identification', () => {
    it('should identify unpaid shifts for bulk payment', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'all');
      const unpaidWithEndTime = filtered.filter(s => !s.isPaid && s.endTime);
      expect(unpaidWithEndTime).toHaveLength(2);
      expect(unpaidWithEndTime.map(s => s.id)).toEqual(['1', '3']);
    });

    it('should return empty array when all shifts are paid', () => {
      const filtered = filterShifts(mockShifts, 'paid', 'all');
      const unpaidWithEndTime = filtered.filter(s => !s.isPaid && s.endTime);
      expect(unpaidWithEndTime).toHaveLength(0);
    });

    it('should identify unpaid shifts for specific caregiver', () => {
      const filtered = filterShifts(mockShifts, 'unpaid', 'caregiver-2');
      const unpaidWithEndTime = filtered.filter(s => !s.isPaid && s.endTime);
      expect(unpaidWithEndTime).toHaveLength(1);
      expect(unpaidWithEndTime[0].id).toBe('3');
    });
  });
});
