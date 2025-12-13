import { ScheduledShift, Shift } from '../types';

export const formatShiftTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const formatShiftDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatShiftDateShort = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

export const calculateShiftDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return (end - start) / (1000 * 60 * 60); // hours
};

export const calculateShiftPay = (shift: Shift): number => {
  if (!shift.endTime) return 0;
  const duration = calculateShiftDuration(shift.startTime, shift.endTime);
  const payType = shift.payType || 'hourly';
  if (payType === 'perShift') {
    return shift.shiftRate ?? 0;
  }
  return duration * (shift.hourlyRate ?? 0);
};

export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const getShiftStatusColor = (status: string): string => {
  switch (status) {
    case 'open':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'assigned':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getShiftStatusLabel = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'assigned':
      return 'My Shift';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
};

export const isShiftUpcoming = (shift: ScheduledShift): boolean => {
  return new Date(shift.scheduledStartTime).getTime() > new Date().getTime();
};

export const getHoursUntilShift = (shift: ScheduledShift): number => {
  const now = new Date().getTime();
  const start = new Date(shift.scheduledStartTime).getTime();
  return (start - now) / (1000 * 60 * 60);
};

export const canDropShift = (shift: ScheduledShift): boolean => {
  return getHoursUntilShift(shift) >= 24;
};

export const groupShiftsByDate = (shifts: ScheduledShift[]): Record<string, ScheduledShift[]> => {
  return shifts.reduce((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, ScheduledShift[]>);
};

export const sortShiftsByDate = (shifts: ScheduledShift[]): ScheduledShift[] => {
  return [...shifts].sort((a, b) => 
    new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
  );
};
