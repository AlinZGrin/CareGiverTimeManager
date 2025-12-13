'use client';

import { useState, useEffect } from 'react';
import { registerNotificationToken, onForegroundMessage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { MockService } from '../../services/mockData';
import { Shift, ScheduledShift } from '../../types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  formatShiftTime, 
  formatShiftDate,
  sortShiftsByDate,
  canDropShift,
  getHoursUntilShift,
  calculateShiftPay
} from '../../utils/shiftUtils';

export default function CaregiverDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'clock' | 'schedule' | 'settings'>('clock');
  const [activeShift, setActiveShift] = useState<Shift | undefined>(undefined);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [lastShiftSummary, setLastShiftSummary] = useState<{ duration: string; pay: string } | null>(null);
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
  const [myShifts, setMyShifts] = useState<ScheduledShift[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [concurrentShiftWarning, setConcurrentShiftWarning] = useState<{ caregiverName: string; shiftId: string } | null>(null);
  const [totalOwed, setTotalOwed] = useState<number>(0);

  const calculateTotalOwed = async () => {
    if (!user) return;
    const shifts = await MockService.getShiftsAsync();
    const unpaidShifts = shifts.filter(s => 
      s.caregiverId === user.id && 
      s.status === 'completed' && 
      !s.isPaid && 
      s.endTime
    );
    
    const total = unpaidShifts.reduce((sum, shift) => sum + calculateShiftPay(shift), 0);
    
    setTotalOwed(total);
  };

  const loadScheduledShifts = async () => {
    if (!user) return;
    const available = await MockService.getScheduledShiftsAsync();
    const filtered = available.filter(s => {
      if (!user) return false;
      return s.status === 'open' || s.caregiverId === user.id;
    });
    setScheduledShifts(filtered.filter(s => s.status === 'open'));
    setMyShifts(filtered.filter(s => s.caregiverId === user.id));
  };

  useEffect(() => {
    if (!user || user.role !== 'caregiver') {
      router.push('/');
      return;
    }
    
    const refreshActiveShift = async () => {
      // Always fetch fresh active shift data from Firebase
      const shift = await MockService.getActiveShiftAsync(user.id);
      setActiveShift(shift);
    };
    
    // Initial load
    refreshActiveShift();
    
    // Load scheduled shifts
    loadScheduledShifts();
    
    // Calculate total owed
    calculateTotalOwed();
    
    // Set up interval to sync active shift and scheduled shifts every 2 seconds
    const interval = setInterval(() => {
      refreshActiveShift();
      loadScheduledShifts();
      calculateTotalOwed();
    }, 2000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  // Register for FCM notifications when caregiver is known
  useEffect(() => {
    if (!user || user.role !== 'caregiver' || !notificationsEnabled) return;
    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        await registerNotificationToken(user.id);
        onForegroundMessage((payload) => {
          console.log('FCM foreground message:', payload);
        });
      } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // ignore
      }
    })();
  }, [user, notificationsEnabled]);

  // Monitor scheduled shifts and send reminder when start time arrives
  useEffect(() => {
    if (!user || user.role !== 'caregiver' || !notificationsEnabled || !myShifts.length) return;
    
    const sentReminders = new Set<string>();
    const interval = setInterval(async () => {
      const now = Date.now();
      
      for (const shift of myShifts) {
        const shiftStartTime = new Date(shift.scheduledStartTime).getTime();
        const timeUntilStart = shiftStartTime - now;
        
        // If shift start time has arrived and caregiver hasn't clocked in yet
        if (timeUntilStart <= 0 && timeUntilStart > -60000 && !sentReminders.has(shift.id) && !activeShift) {
          sentReminders.add(shift.id);
          
          // Send notification
          if (Notification.permission === 'granted') {
            try {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('Shift Reminder', {
                body: `Your shift "${shift.shiftName}" is starting now. Please clock in.`,
                icon: '/icons/icon-192.png',
                tag: `shift-reminder-${shift.id}`,
                requireInteraction: true,
              });
            } catch (e) {
              console.error('Failed to show shift reminder notification:', e);
            }
          }
        }
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [user, myShifts, notificationsEnabled, activeShift]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeShift) {
      interval = setInterval(() => {
        const start = new Date(activeShift.startTime).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleClockIn = async () => {
    if (!user) return;
    
    // Check for concurrent shifts (Smart Handoff) - use async to get real-time Firebase data
    const activeShiftInfo = await MockService.getAnyActiveShiftAsync();
    
    if (activeShiftInfo && activeShiftInfo.shift.caregiverId !== user.id) {
      // Another caregiver is clocked in - show warning
      setConcurrentShiftWarning({
        caregiverName: activeShiftInfo.caregiverName,
        shiftId: activeShiftInfo.shift.id
      });
      return;
    }
    
    // No concurrent shift - proceed with clock in
    proceedWithClockIn();
  };

  const proceedWithClockIn = async () => {
    if (!user) return;
    const newShift: Shift = {
      id: Date.now().toString(),
      caregiverId: user.id,
      startTime: new Date().toISOString(),
      payType: user.payType || 'hourly',
      hourlyRate: user.hourlyRate || 0,
      shiftRate: user.shiftRate || 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(newShift);
    setActiveShift(newShift);
    setLastShiftSummary(null);
  };

  const handleConfirmHandoff = async () => {
    if (!concurrentShiftWarning || !user) return;
    
    // Store caregiver name before clearing state
    const previousCaregiverName = concurrentShiftWarning.caregiverName;
    
    // Close warning modal first to prevent double-clicks
    setConcurrentShiftWarning(null);
    
    // Step 1: Get fresh shift data and clock out the other caregiver
    const shifts = await MockService.getShiftsAsync();
    const shiftToEnd = shifts.find(s => s.id === concurrentShiftWarning.shiftId);
    
    if (shiftToEnd && shiftToEnd.status === 'in-progress') {
      const endTime = new Date().toISOString();
      const updatedShift = { ...shiftToEnd, endTime, status: 'completed' as const };
      await MockService.saveShift(updatedShift);
    }
    
    // Step 2: Small delay to ensure Firebase sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Clock in current user
    const newShift: Shift = {
      id: Date.now().toString(),
      caregiverId: user.id,
      startTime: new Date().toISOString(),
      payType: user.payType || 'hourly',
      hourlyRate: user.hourlyRate || 0,
      shiftRate: user.shiftRate || 0,
      isPaid: false,
      status: 'in-progress',
    };
    await MockService.saveShift(newShift);
    setActiveShift(newShift);
    setLastShiftSummary(null);
    
    // Show success message
    setFeedbackMessage({ 
      type: 'success', 
      text: `${previousCaregiverName} has been clocked out. Your shift has started.` 
    });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleCancelHandoff = () => {
    setConcurrentShiftWarning(null);
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    const endTime = new Date().toISOString();
    const updatedShift = { ...activeShift, endTime, status: 'completed' as const };
    await MockService.saveShift(updatedShift);
    
    // Calculate summary
    const start = new Date(activeShift.startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffHours = (end - start) / (1000 * 60 * 60);
    const payType = activeShift.payType || 'hourly';
    const pay = payType === 'perShift'
      ? (activeShift.shiftRate || 0)
      : diffHours * (activeShift.hourlyRate || 0);
    
    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);
    
    setLastShiftSummary({
      duration: `${hours} hours ${minutes} minutes`,
      pay: `$${pay.toFixed(2)}`,
    });
    
    setActiveShift(undefined);
  };

  const handleClaimShift = (shiftId: string) => {
    if (!user) return;
    const result = MockService.claimShift(shiftId, user.id);
    
    if (result.success) {
      setFeedbackMessage({ type: 'success', text: result.message });
      loadScheduledShifts();
    } else {
      setFeedbackMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleDropShift = (shiftId: string) => {
    if (!user) return;
    const result = MockService.dropShift(shiftId, user.id);
    
    if (result.success) {
      setFeedbackMessage({ type: 'success', text: result.message });
      loadScheduledShifts();
    } else {
      setFeedbackMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleUpdateCredentials = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const phone = formData.get('phone') as string;
    const currentPin = formData.get('currentPin') as string;
    const newPin = formData.get('newPin') as string;
    const confirmPin = formData.get('confirmPin') as string;
    
    // Verify current PIN
    if (currentPin !== user.pin) {
      setFeedbackMessage({ type: 'error', text: 'Current PIN is incorrect' });
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }
    
    // Validate new PIN if provided
    if (newPin) {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        setFeedbackMessage({ type: 'error', text: 'New PIN must be exactly 4 digits' });
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }
      
      if (newPin !== confirmPin) {
        setFeedbackMessage({ type: 'error', text: 'New PIN and confirmation do not match' });
        setTimeout(() => setFeedbackMessage(null), 3000);
        return;
      }
    }
    
    const updates: { phone?: string; pin?: string } = { phone };
    if (newPin) updates.pin = newPin;
    
    MockService.updateUser(user.id, updates);
    setFeedbackMessage({ type: 'success', text: 'Credentials updated successfully!' });
    setIsEditingCredentials(false);
    setShowPin(false);
    
    // Update local user context
    if (newPin) {
      // Force re-login after PIN change
      setTimeout(() => {
        alert('Your PIN has been changed. Please log in again with your new PIN.');
        logout();
      }, 2000);
    } else {
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Image src="/icon.png" alt="Logo" width={40} height={40} />
          <div>
            <h1 className="text-lg font-bold text-gray-800">Hi, {user.name}</h1>
            <p className="text-sm text-green-600 font-semibold">
              Owed: ${totalOwed.toFixed(2)}
            </p>
          </div>
        </div>
        <button onClick={logout} className="text-sm text-red-600 font-medium">Logout</button>
      </header>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex space-x-2 md:space-x-4 whitespace-nowrap">
          <button
            onClick={() => setActiveView('clock')}
            className={`py-3 px-3 md:px-4 font-medium text-sm md:text-base ${
              activeView === 'clock' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500'
            }`}
          >
            Time Clock
          </button>
          <button
            onClick={() => setActiveView('schedule')}
            className={`py-3 px-3 md:px-4 font-medium text-sm md:text-base ${
              activeView === 'schedule' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`py-3 px-3 md:px-4 font-medium text-sm md:text-base ${
              activeView === 'settings' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`mx-4 mt-4 p-3 rounded-lg ${
          feedbackMessage.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {feedbackMessage.text}
        </div>
      )}

      <main className="flex-1 p-4 flex flex-col items-center">
        {activeView === 'clock' && (
          // Time Clock View
          <div className="w-full max-w-md flex flex-col items-center justify-center flex-1 space-y-6">{activeShift ? (
            <div className="w-full flex flex-col items-center space-y-6">
              <div className="text-center">
                <p className="text-gray-500 text-lg">Shift in Progress</p>
                <div className="text-5xl font-mono font-bold text-blue-600 animate-pulse">
                  {elapsedTime}
                </div>
              </div>
              
              <button
                onClick={handleClockOut}
                className="w-full h-48 bg-red-500 hover:bg-red-600 text-white text-3xl font-bold rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center"
              >
                End Shift
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-6">
              {lastShiftSummary && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full text-center mb-4">
                  <h3 className="text-green-800 font-bold text-lg">Shift Complete!</h3>
                  <p className="text-green-700">You worked {lastShiftSummary.duration}</p>
                  <p className="text-green-600 text-sm mt-1">Estimated pay: {lastShiftSummary.pay}</p>
                </div>
              )}
              
              <button
                onClick={handleClockIn}
                className="w-full h-64 bg-green-500 hover:bg-green-600 text-white text-3xl font-bold rounded-2xl shadow-lg transform transition active:scale-95 flex items-center justify-center"
              >
                Start Shift
              </button>
            </div>
          )}</div>
        )}
        
        {activeView === 'schedule' && (
          // Schedule View
          <div className="w-full max-w-2xl space-y-6">
            {/* My Shifts */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4 text-blue-600">My Scheduled Shifts</h2>
              
              {myShifts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">You have no scheduled shifts yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortShiftsByDate(myShifts).map(shift => {
                    const canDrop = canDropShift(shift);
                    const hoursUntil = getHoursUntilShift(shift);
                    
                    return (
                      <div 
                        key={shift.id} 
                        className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {shift.shiftName && (
                              <h3 className="font-bold text-lg text-blue-800">{shift.shiftName}</h3>
                            )}
                            <p className="text-sm mt-1 text-gray-900 font-medium">
                              <span className="font-bold">Date:</span> {formatShiftDate(shift.scheduledStartTime)}
                            </p>
                            <p className="text-sm text-gray-900 font-medium">
                              <span className="font-bold">Time:</span> {formatShiftTime(shift.scheduledStartTime)} - {formatShiftTime(shift.scheduledEndTime)}
                            </p>
                            {hoursUntil > 0 && (
                              <p className="text-xs text-gray-700 mt-1">
                                Starts in {Math.round(hoursUntil)} hours
                              </p>
                            )}
                          </div>
                          
                          {canDrop ? (
                            <button
                              onClick={() => handleDropShift(shift.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Drop
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 italic">
                              Contact Admin to cancel
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Open Shifts */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4 text-green-600">Available Shifts</h2>
              
              {scheduledShifts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No open shifts available at this time.</p>
              ) : (
                <div className="space-y-3">
                  {sortShiftsByDate(scheduledShifts).map(shift => (
                    <div 
                      key={shift.id} 
                      className="border-2 border-green-300 bg-green-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {shift.shiftName && (
                            <h3 className="font-bold text-lg text-green-800">{shift.shiftName}</h3>
                          )}
                          <p className="text-sm mt-1">
                            <span className="font-medium text-gray-900">Date:</span> <span className="text-gray-900 font-medium">{formatShiftDate(shift.scheduledStartTime)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-gray-900">Time:</span> <span className="text-gray-900 font-medium">{formatShiftTime(shift.scheduledStartTime)} - {formatShiftTime(shift.scheduledEndTime)}</span>
                          </p>
                        </div>
                        
                        <button
                          onClick={() => handleClaimShift(shift.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-bold text-sm"
                        >
                          Claim Shift
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeView === 'settings' && (
          // Settings View
          <div className="w-full max-w-2xl space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-600">My Account Settings</h2>
              
              {!isEditingCredentials ? (
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Personal Information</h3>
                    <p className="text-sm text-gray-900 font-medium"><span className="font-medium">Name:</span> {user.name}</p>
                    <p className="text-sm text-gray-900 font-medium">
                      <span className="font-medium">Pay:</span>{' '}
                      {user.payType === 'perShift'
                        ? `$${(user.shiftRate ?? 0).toFixed(2)}/shift`
                        : `$${(user.hourlyRate ?? 0).toFixed(2)}/hr`}
                    </p>
                  </div>
                  
                  <div className="border-b pb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Login Credentials</h3>
                    <p className="text-sm text-gray-900 font-medium">
                      <span className="font-medium">Phone Number:</span> {user.phone}
                    </p>
                    <p className="text-sm text-gray-900 font-medium">
                      <span className="font-medium">PIN:</span> {showPin ? user.pin : '••••'}
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="ml-2 text-blue-600 text-xs hover:underline"
                      >
                        {showPin ? 'Hide' : 'Show'}
                      </button>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        id="notificationsEnabled"
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => {
                          setNotificationsEnabled(e.target.checked);
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor="notificationsEnabled" className="text-sm text-gray-700">
                        Enable shift reminders (notifications)
                      </label>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsEditingCredentials(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Update My Credentials
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdateCredentials} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={user.phone}
                      required
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is your login username</p>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-700 mb-3">Change PIN (Optional)</h3>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current PIN
                      </label>
                      <input
                        type="password"
                        name="currentPin"
                        maxLength={4}
                        required
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter current PIN"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New PIN (leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        name="newPin"
                        maxLength={4}
                        pattern="\d{4}"
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter new 4-digit PIN"
                      />
                      <p className="text-xs text-gray-500 mt-1">Must be exactly 4 digits</p>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        name="confirmPin"
                        maxLength={4}
                        pattern="\d{4}"
                        className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Re-enter new PIN"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCredentials(false);
                        setShowPin(false);
                      }}
                      className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-medium hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> If you change your PIN, you will be logged out and need to log in again with your new PIN.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Smart Handoff Warning Modal */}
      {concurrentShiftWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-100 rounded-full p-3 mr-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Concurrent Shift Detected</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong className="text-gray-900">{concurrentShiftWarning.caregiverName}</strong> is currently clocked in.
              </p>
              <p className="text-gray-700">
                Starting your shift will automatically clock them out immediately. Do you want to proceed?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleConfirmHandoff}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Yes, Clock Me In
              </button>
              <button
                onClick={handleCancelHandoff}
                className="flex-1 bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
