import { test, expect } from 'vitest';
import { sortShiftsByDate } from '../src/utils/shiftUtils';
import { ScheduledShift } from '../src/types';

test('sortShiftsByDate should sort shifts from newest to oldest', () => {
  const shifts: ScheduledShift[] = [
    {
      id: '1',
      date: '2024-01-01',
      scheduledStartTime: '2024-01-01T10:00:00Z',
      scheduledEndTime: '2024-01-01T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
    {
      id: '2',
      date: '2024-01-03',
      scheduledStartTime: '2024-01-03T10:00:00Z',
      scheduledEndTime: '2024-01-03T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
    {
      id: '3',
      date: '2024-01-02',
      scheduledStartTime: '2024-01-02T10:00:00Z',
      scheduledEndTime: '2024-01-02T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
  ];

  const sorted = sortShiftsByDate(shifts);

  // Most recent (newest) should be first
  expect(sorted[0].id).toBe('2'); // 2024-01-03
  expect(sorted[1].id).toBe('3'); // 2024-01-02
  expect(sorted[2].id).toBe('1'); // 2024-01-01
});

test('sortShiftsByDate should maintain stable order for shifts with identical timestamps', () => {
  const shifts: ScheduledShift[] = [
    {
      id: '1',
      date: '2024-01-01',
      scheduledStartTime: '2024-01-01T10:00:00Z',
      scheduledEndTime: '2024-01-01T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
    {
      id: '2',
      date: '2024-01-01',
      scheduledStartTime: '2024-01-01T10:00:00Z',
      scheduledEndTime: '2024-01-01T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
  ];

  const sorted = sortShiftsByDate(shifts);

  // For identical timestamps, order should be maintained (stable sort)
  expect(sorted[0].id).toBe('1');
  expect(sorted[1].id).toBe('2');
});

test('sortShiftsByDate should not mutate the original array', () => {
  const shifts: ScheduledShift[] = [
    {
      id: '1',
      date: '2024-01-01',
      scheduledStartTime: '2024-01-01T10:00:00Z',
      scheduledEndTime: '2024-01-01T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
    {
      id: '2',
      date: '2024-01-02',
      scheduledStartTime: '2024-01-02T10:00:00Z',
      scheduledEndTime: '2024-01-02T18:00:00Z',
      caregiverId: null,
      status: 'open',
    },
  ];

  const original = [...shifts];
  sortShiftsByDate(shifts);

  // Original array should not be modified
  expect(shifts[0].id).toBe(original[0].id);
  expect(shifts[1].id).toBe(original[1].id);
});
