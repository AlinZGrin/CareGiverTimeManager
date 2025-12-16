'use client';

import { useState, useEffect, useCallback } from 'react';
import { ref, get } from 'firebase/database';
import { getFirebaseDatabase } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { MockService } from '../../services/mockData';
import { User, Shift, ScheduledShift, PayType } from '../../types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  formatShiftTime, 
  formatShiftDate, 
  getShiftStatusColor, 
  getShiftStatusLabel,
  sortShiftsByDate,
  calculateShiftPay
} from '../../utils/shiftUtils';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'caregivers' | 'shifts' | 'schedule' | 'settings'>('dashboard');
  
  // Data State
  const [caregivers, setCaregivers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [scheduledShifts, setScheduledShifts] = useState<ScheduledShift[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  
  // Edit States
  const [editingShift, setEditingShift] = useState<ScheduledShift | null>(null);
  const [editingCaregiver, setEditingCaregiver] = useState<User | null>(null);
  const [editingCredentials, setEditingCredentials] = useState<User | null>(null);
  const [editingManualShift, setEditingManualShift] = useState<Shift | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const refreshData = useCallback(async () => {
    const allUsers = await MockService.getUsersAsync();
    setCaregivers(allUsers.filter(u => u.role === 'caregiver'));
    
    const allShifts = await MockService.getShiftsAsync();
    setShifts(allShifts);
    
    const allScheduledShifts = await MockService.getScheduledShiftsAsync();
    setScheduledShifts(allScheduledShifts);
    
    const owed = allShifts
      .filter(s => !s.isPaid && s.endTime)
      .reduce((acc, s) => acc + calculateShiftPay(s), 0);
    setTotalOwed(owed);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    const run = async () => {
      await refreshData();
    };
    void run();
    
    // Set up interval to sync with Firebase every 2 seconds
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [user, router, refreshData]);

  const handleMarkPaid = async (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) {
      await MockService.saveShift({ ...shift, isPaid: true });
      refreshData();
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      await MockService.deleteShift(shiftId);
      refreshData();
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingManualShift(shift);
  };

  const handleUpdateShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingManualShift) return;
    const formData = new FormData(e.currentTarget);
    const caregiverId = formData.get('caregiverId') as string;
    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const endDate = formData.get('endDate') as string;
    const endTime = formData.get('endTime') as string;
    const totalCost = parseFloat(formData.get('totalCost') as string) || 0;

    const shiftStartTime = new Date(`${startDate}T${startTime}`).toISOString();
    const shiftEndTime = new Date(`${endDate}T${endTime}`).toISOString();

    await MockService.saveShift({
      ...editingManualShift,
      caregiverId,
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      payType: 'perShift',
      hourlyRate: editingManualShift.hourlyRate,
      shiftRate: totalCost,
    });
    setEditingManualShift(null);
    refreshData();
  };

  const handleAddCaregiver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payType = (formData.get('payType') as PayType) || 'hourly';
    const hourlyRate = parseFloat((formData.get('hourlyRate') as string) || '0');
    const shiftRate = parseFloat((formData.get('shiftRate') as string) || '0');
    const newUser: User = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      role: 'caregiver',
      phone: formData.get('phone') as string,
      pin: formData.get('pin') as string,
      payType,
      hourlyRate: payType === 'hourly' ? hourlyRate : hourlyRate || 0,
      shiftRate: payType === 'perShift' ? shiftRate : shiftRate || 0,
      isActive: true,
    };
    MockService.saveUser(newUser);
    refreshData();
    (e.target as HTMLFormElement).reset();
  };

  const handleCreateScheduledShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const endDate = formData.get('endDate') as string;
    const endTime = formData.get('endTime') as string;
    const shiftName = formData.get('shiftName') as string;
    
    const scheduledStart = new Date(`${startDate}T${startTime}`).toISOString();
    const scheduledEnd = new Date(`${endDate}T${endTime}`).toISOString();
    
    const newScheduledShift: ScheduledShift = {
      id: Date.now().toString(),
      date: startDate,
      scheduledStartTime: scheduledStart,
      scheduledEndTime: scheduledEnd,
      caregiverId: null,
      status: 'open',
      shiftName: shiftName || undefined,
    };
    
    MockService.saveScheduledShift(newScheduledShift);
    refreshData();
    (e.target as HTMLFormElement).reset();
  };

  const handleDeleteScheduledShift = (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      MockService.deleteScheduledShift(shiftId);
      refreshData();
    }
  };

  const handleUpdateScheduledShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingShift) return;
    
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const startTime = formData.get('startTime') as string;
    const endDate = formData.get('endDate') as string;
    const endTime = formData.get('endTime') as string;
    const shiftName = formData.get('shiftName') as string;
    
    const scheduledStart = new Date(`${startDate}T${startTime}`).toISOString();
    const scheduledEnd = new Date(`${endDate}T${endTime}`).toISOString();
    
    MockService.updateScheduledShift(editingShift.id, {
      date: startDate,
      scheduledStartTime: scheduledStart,
      scheduledEndTime: scheduledEnd,
      shiftName: shiftName || undefined,
    });
    
    setEditingShift(null);
    refreshData();
  };

  const handleUpdateCaregiverPay = (caregiverId: string, payType: PayType, hourlyRate: number, shiftRate: number) => {
    MockService.updateUser(caregiverId, { payType, hourlyRate, shiftRate });
    setEditingCaregiver(null);
    refreshData();
  };

  const handleToggleCaregiverStatus = (caregiverId: string, isActive: boolean) => {
    MockService.updateUser(caregiverId, { isActive });
    refreshData();
  };

  const handleDeleteCaregiver = (caregiverId: string) => {
    if (confirm('Are you sure you want to delete this caregiver? This action cannot be undone.')) {
      MockService.deleteUser(caregiverId);
      refreshData();
    }
  };

  const handleUpdateCredentials = (userId: string, updates: { email?: string; password?: string; phone?: string; pin?: string }) => {
    MockService.updateUser(userId, updates);
    setEditingCredentials(null);
    setShowPassword({});
    refreshData();
    alert('Credentials updated successfully!');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Image src="/icon.png" alt="Logo" width={40} height={40} />
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">Welcome, {user.name}</span>
          <button onClick={logout} className="text-sm text-red-600 font-medium">Logout</button>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Tabs - Scrollable on mobile */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-2 md:space-x-4 whitespace-nowrap">
            <button
              className={`pb-2 px-2 md:px-4 text-sm md:text-base ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Overview
            </button>
            <button
              className={`pb-2 px-2 md:px-4 text-sm md:text-base ${activeTab === 'schedule' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('schedule')}
            >
              Schedule
            </button>
            <button
              className={`pb-2 px-2 md:px-4 text-sm md:text-base ${activeTab === 'caregivers' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('caregivers')}
            >
              Caregivers
            </button>
            <button
              className={`pb-2 px-2 md:px-4 text-sm md:text-base ${activeTab === 'shifts' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('shifts')}
            >
              Shifts & Payroll
            </button>
            <button
              className={`pb-2 px-2 md:px-4 text-sm md:text-base ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Total Unpaid Liability</h3>
                <p className="text-4xl font-bold text-red-600 mt-2">${totalOwed.toFixed(2)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Active Caregivers</h3>
                <p className="text-4xl font-bold text-blue-600 mt-2">{caregivers.filter(c => c.isActive).length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Pending Shifts</h3>
                <p className="text-4xl font-bold text-orange-600 mt-2">
                  {shifts.filter(s => !s.isPaid && s.endTime).length}
                </p>
              </div>
            </div>

            {/* Total Owed Per Caregiver */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Total Owed Per Caregiver</h3>
              <div className="space-y-3">
                {caregivers.map(caregiver => {
                  const caregiverUnpaidShifts = shifts.filter(
                    s => s.caregiverId === caregiver.id && !s.isPaid && s.endTime
                  );
                  const caregiverOwed = caregiverUnpaidShifts.reduce((acc, s) => acc + calculateShiftPay(s), 0);

                  return (
                    <div key={caregiver.id} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{caregiver.name}</p>
                        <p className="text-xs text-gray-500">{caregiverUnpaidShifts.length} unpaid shift(s)</p>
                      </div>
                      <p className={`text-lg font-bold ${caregiverOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${caregiverOwed.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
                {caregivers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No caregivers found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Create/Edit Scheduled Shift Form */}
              <div className="md:col-span-1 bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {editingShift ? 'Edit Shift' : 'Publish Open Shift'}
                </h3>
                <form onSubmit={editingShift ? handleUpdateScheduledShift : handleCreateScheduledShift} className="space-y-4">
                {/* Row 1: Start Date and Start Time */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">Start Date</label>
                    <input 
                      name="startDate" 
                      type="date" 
                      required 
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={editingShift ? editingShift.date : ''}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">Start Time</label>
                    <input 
                      name="startTime" 
                      type="time" 
                      required 
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      placeholder="Start Time"
                      defaultValue={editingShift ? new Date(editingShift.scheduledStartTime).toTimeString().slice(0, 5) : ''}
                    />
                  </div>
                </div>
                
                {/* Row 2: End Date and End Time */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">End Date</label>
                    <input 
                      name="endDate" 
                      type="date" 
                      required 
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      defaultValue={editingShift ? new Date(editingShift.scheduledEndTime).toISOString().split('T')[0] : ''}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">End Time</label>
                    <input 
                      name="endTime" 
                      type="time" 
                      required 
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                      placeholder="End Time"
                      defaultValue={editingShift ? new Date(editingShift.scheduledEndTime).toTimeString().slice(0, 5) : ''}
                    />
                  </div>
                </div>
                
                {/* Row 3: Shift Name */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
                  <div className="col-span-2 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">Shift Name (optional)</label>
                    <input 
                      name="shiftName" 
                      type="text" 
                      placeholder="Shift Name (optional)" 
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      defaultValue={editingShift ? editingShift.shiftName || '' : ''}
                    />
                  </div>
                </div>
                
                {/* Row 3: Buttons */}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white font-semibold p-3 rounded hover:bg-green-700 text-sm md:text-base">
                    {editingShift ? 'Update' : 'Publish'}
                  </button>
                  {editingShift && (
                    <button 
                      type="button"
                      onClick={() => setEditingShift(null)}
                      className="flex-1 bg-gray-400 text-white font-semibold p-3 rounded hover:bg-gray-500 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                </form>
              </div>

              {/* Right: Weekly Calendar */}
              <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
                <WeeklyCalendar
                  scheduledShifts={scheduledShifts}
                  caregivers={caregivers}
                  onEdit={(s) => setEditingShift(s)}
                />
              </div>
            </div>

            {/* Scheduled Shifts List (full width below) */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Scheduled Shifts</h3>
              
              {scheduledShifts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No scheduled shifts yet. Create one above!</p>
              ) : (
                <div className="space-y-4">
                  {sortShiftsByDate(scheduledShifts).map(shift => {
                    const caregiver = shift.caregiverId ? caregivers.find(c => c.id === shift.caregiverId) : null;
                    
                    return (
                      <div 
                        key={shift.id} 
                        className={`border rounded-lg p-4 ${getShiftStatusColor(shift.status)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {shift.shiftName && (
                                <h4 className="font-bold text-lg">{shift.shiftName}</h4>
                              )}
                              <span className="text-sm font-semibold px-2 py-1 rounded bg-white bg-opacity-50">
                                {getShiftStatusLabel(shift.status)}
                              </span>
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="font-medium">Date:</span> {formatShiftDate(shift.scheduledStartTime)}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Time:</span> {formatShiftTime(shift.scheduledStartTime)} - {formatShiftTime(shift.scheduledEndTime)}
                              </p>
                              {caregiver && (
                                <p className="text-sm">
                                  <span className="font-medium">Assigned to:</span> {caregiver.name}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingShift(shift)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteScheduledShift(shift.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  console.log('Sending reminder for shift:', {
                                    caregiverId: shift.caregiverId,
                                    shiftName: shift.shiftName,
                                    scheduledStartTime: shift.scheduledStartTime,
                                  });
                                  
                                  const response = await fetch('/api/send-shift-reminders', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      caregiverId: shift.caregiverId,
                                      shiftName: shift.shiftName,
                                      scheduledStartTime: shift.scheduledStartTime,
                                    }),
                                  });
                                  
                                  const result = await response.json();
                                  console.log('Reminder API response:', response.status, result);
                                  
                                  if (response.ok && result.success) {
                                    window.alert('Reminder sent successfully! ✅');
                                  } else {
                                    window.alert(`Error sending reminder:\nStatus: ${response.status}\nDetails: ${JSON.stringify(result, null, 2)}`);
                                  }
                                } catch (e: unknown) {
                                  const message = e instanceof Error ? e.message : 'Unknown error';
                                  console.error('Failed to send reminder:', e);
                                  window.alert(`Failed to send reminder:\n${message}`);
                                }
                              }}
                              className={`text-sm font-medium px-2 py-1 rounded ${shift.caregiverId ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
                              disabled={!shift.caregiverId}
                              title={!shift.caregiverId ? 'Assign caregiver to enable reminders' : 'Send reminder'}
                            >
                              Send Reminder
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'caregivers' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Caregiver</h3>
              <form onSubmit={handleAddCaregiver} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input name="name" placeholder="Name" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="phone" placeholder="Phone" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="pin" placeholder="PIN (4 digits)" maxLength={4} required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <select name="payType" defaultValue="hourly" className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="hourly">Hourly</option>
                  <option value="perShift">Per Shift</option>
                </select>
                <input name="hourlyRate" type="number" step="0.01" placeholder="Hourly Rate ($)" className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="shiftRate" type="number" step="0.01" placeholder="Per-Shift Rate ($)" className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:col-span-2" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded md:col-span-5">Add Caregiver</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Caregivers</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-gray-900 font-semibold border-b">
                    <th className="pb-2 text-xs md:text-sm">Name</th>
                    <th className="pb-2 text-xs md:text-sm">Phone</th>
                    <th className="pb-2 text-xs md:text-sm">Notifications</th>
                    <th className="pb-2 text-xs md:text-sm">Pay</th>
                    <th className="pb-2 text-xs md:text-sm">Status</th>
                    <th className="pb-2 text-xs md:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {caregivers.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{c.name}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{c.phone}</td>
                      <td className="py-3 text-xs md:text-sm">
                        {/* Token status indicator */}
                        <TokenStatus caregiverId={c.id} />
                      </td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">
                        {editingCaregiver?.id === c.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              id={`paytype-${c.id}`}
                              defaultValue={c.payType || 'hourly'}
                              className="border p-1 rounded"
                            >
                              <option value="hourly">Hourly</option>
                              <option value="perShift">Per Shift</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={c.hourlyRate}
                              className="border p-1 rounded w-24"
                              id={`rate-${c.id}`}
                              placeholder="Hourly"
                            />
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={c.shiftRate}
                              className="border p-1 rounded w-24"
                              id={`shift-${c.id}`}
                              placeholder="Per shift"
                            />
                            <button
                              onClick={() => {
                                const payType = (document.getElementById(`paytype-${c.id}`) as HTMLSelectElement).value as PayType;
                                const hourlyInput = document.getElementById(`rate-${c.id}`) as HTMLInputElement;
                                const shiftInput = document.getElementById(`shift-${c.id}`) as HTMLInputElement;
                                handleUpdateCaregiverPay(
                                  c.id,
                                  payType,
                                  parseFloat(hourlyInput.value || '0'),
                                  parseFloat(shiftInput.value || '0')
                                );
                              }}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCaregiver(null)}
                              className="bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-semibold text-gray-900">
                              {c.payType === 'perShift' 
                                ? `$${(c.shiftRate ?? 0).toFixed(2)}/shift`
                                : `$${(c.hourlyRate ?? 0).toFixed(2)}/hr`}
                            </span>
                            <span className="text-[11px] text-gray-600">{c.payType === 'perShift' ? 'Per Shift' : 'Hourly'}</span>
                            <button
                              onClick={() => setEditingCaregiver(c)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">
                        <button
                          onClick={() => handleToggleCaregiverStatus(c.id, !c.isActive)}
                          className={`px-2 py-1 rounded text-xs cursor-pointer ${c.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 text-xs md:text-sm">
                        <button
                          onClick={() => handleDeleteCaregiver(c.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shifts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Manual Shift Entry</h3>
              <form
                key={editingManualShift?.id || 'new-shift'}
                onSubmit={editingManualShift ? handleUpdateShift : async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const caregiverId = formData.get('caregiverId') as string;
                const startDate = formData.get('startDate') as string;
                const startTime = formData.get('startTime') as string;
                const endDate = formData.get('endDate') as string;
                const endTime = formData.get('endTime') as string;
                const totalCost = parseFloat(formData.get('totalCost') as string) || 0;
                
                const caregiver = caregivers.find(c => c.id === caregiverId);
                if (!caregiver) return;

                const shiftStartTime = new Date(`${startDate}T${startTime}`).toISOString();
                const shiftEndTime = new Date(`${endDate}T${endTime}`).toISOString();

                const newShift: Shift = {
                  id: Date.now().toString(),
                  caregiverId,
                  startTime: shiftStartTime,
                  endTime: shiftEndTime,
                  payType: 'perShift',
                  hourlyRate: caregiver.hourlyRate || 0,
                  shiftRate: totalCost,
                  isPaid: false,
                  status: 'completed',
                };
                await MockService.saveShift(newShift);
                refreshData();
                (e.target as HTMLFormElement).reset();
              }} className="space-y-4">
                {/* Row 1: Caregiver */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Caregiver</label>
                    <select name="caregiverId" required className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" defaultValue={editingManualShift?.caregiverId || ''}>
                      <option value="">Select Caregiver</option>
                      {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Start Date and Start Time */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                    <input name="startDate" type="date" required className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" defaultValue={editingManualShift ? editingManualShift.startTime.split('T')[0] : ''} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                    <input name="startTime" type="time" required className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" defaultValue={editingManualShift ? new Date(editingManualShift.startTime).toTimeString().slice(0, 5) : ''} />
                  </div>
                </div>

                {/* Row 3: End Date and End Time */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                    <input name="endDate" type="date" required className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" defaultValue={editingManualShift && editingManualShift.endTime ? editingManualShift.endTime.split('T')[0] : ''} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                    <input name="endTime" type="time" required className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" defaultValue={editingManualShift && editingManualShift.endTime ? new Date(editingManualShift.endTime).toTimeString().slice(0, 5) : ''} />
                  </div>
                </div>

                {/* Row 4: Total Cost */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Cost ($)</label>
                    <input
                      name="totalCost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      defaultValue={editingManualShift ? (
                        editingManualShift.payType === 'perShift'
                          ? editingManualShift.shiftRate ?? 0
                          : calculateShiftPay(editingManualShift)
                      ) : ''}
                    />
                  </div>
                </div>

                {/* Row 5: Submit Button */}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 md:flex-initial bg-blue-600 text-white font-semibold p-3 rounded hover:bg-blue-700 text-sm md:text-base">
                    {editingManualShift ? 'Update Shift' : 'Add Shift'}
                  </button>
                  {editingManualShift && (
                    <button 
                      type="button"
                      onClick={() => setEditingManualShift(null)}
                      className="flex-1 md:flex-initial bg-gray-400 text-white font-semibold p-3 rounded hover:bg-gray-500 text-sm md:text-base"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shift History</h3>
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-gray-900 font-semibold border-b">
                  <th className="pb-2 text-xs md:text-sm">Caregiver</th>
                  <th className="pb-2 text-xs md:text-sm">Start Date</th>
                  <th className="pb-2 text-xs md:text-sm">Start Time</th>
                  <th className="pb-2 text-xs md:text-sm">End Date</th>
                  <th className="pb-2 text-xs md:text-sm">End Time</th>
                  <th className="pb-2 text-xs md:text-sm">Duration</th>
                  <th className="pb-2 text-xs md:text-sm">Cost</th>
                  <th className="pb-2 text-xs md:text-sm">Status</th>
                  <th className="pb-2 text-xs md:text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {shifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(s => {
                  const caregiver = caregivers.find(c => c.id === s.caregiverId);
                  const start = new Date(s.startTime);
                  const end = s.endTime ? new Date(s.endTime) : null;
                  const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0;
                  const cost = end ? calculateShiftPay(s) : 0;

                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{caregiver?.name || 'Unknown'}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{start.toLocaleDateString()}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{end ? end.toLocaleDateString() : '-'}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">
                        {end ? `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m` : 'In Progress'}
                      </td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">${cost.toFixed(2)}</td>
                      <td className="py-3 text-xs md:text-sm">
                        {s.isPaid ? (
                          <span className="text-green-600 font-bold">Paid</span>
                        ) : (
                          <span className="text-red-600 font-bold">Unpaid</span>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        <div className="flex gap-1 flex-wrap">
                          {!s.isPaid && s.endTime && (
                            <button
                              onClick={() => handleMarkPaid(s.id)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleEditShift(s)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteShift(s.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Admin Credentials */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Admin Credentials</h3>
              <div className="space-y-4">
                {MockService.getUsers().filter(u => u.role === 'admin').map(admin => (
                  <div key={admin.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{admin.name}</h4>
                        <p className="text-sm text-gray-600">{admin.email}</p>
                      </div>
                      {editingCredentials?.id !== admin.id && (
                        <button
                          onClick={() => setEditingCredentials(admin)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit Credentials
                        </button>
                      )}
                    </div>

                    {editingCredentials?.id === admin.id && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get('email') as string;
                        const password = formData.get('password') as string;
                        
                        if (password && password.length < 6) {
                          alert('Password must be at least 6 characters');
                          return;
                        }
                        
                        const updates: { email?: string; password?: string } = { email };
                        if (password) updates.password = password;
                        
                        handleUpdateCredentials(admin.id, updates);
                      }} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            defaultValue={admin.email}
                            required
                            className="w-full border p-2 rounded text-gray-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password (leave blank to keep current)
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword[admin.id] ? 'text' : 'password'}
                              name="password"
                              placeholder="Enter new password"
                              className="w-full border p-2 rounded pr-10 text-gray-900 font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                              className="absolute right-2 top-2 text-gray-500 text-sm"
                            >
                              {showPassword[admin.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCredentials(null);
                              setShowPassword({});
                            }}
                            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Caregiver Credentials */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Caregiver Credentials</h3>
              <div className="space-y-4">
                {caregivers.map(caregiver => (
                  <div key={caregiver.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{caregiver.name}</h4>
                        <p className="text-sm text-gray-600">Phone: {caregiver.phone}</p>
                        <p className="text-sm text-gray-600">PIN: {showPassword[caregiver.id] ? caregiver.pin : '••••'}</p>
                      </div>
                      {editingCredentials?.id !== caregiver.id && (
                        <button
                          onClick={() => setEditingCredentials(caregiver)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit Credentials
                        </button>
                      )}
                    </div>

                    {editingCredentials?.id === caregiver.id && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const phone = formData.get('phone') as string;
                        const pin = formData.get('pin') as string;
                        
                        if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) {
                          alert('PIN must be exactly 4 digits');
                          return;
                        }
                        
                        const updates: { phone?: string; pin?: string } = { phone };
                        if (pin) updates.pin = pin;
                        
                        handleUpdateCredentials(caregiver.id, updates);
                      }} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input
                            type="text"
                            name="phone"
                            defaultValue={caregiver.phone}
                            required
                            className="w-full border p-2 rounded text-gray-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            4-Digit PIN (leave blank to keep current)
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword[caregiver.id] ? 'text' : 'password'}
                              name="pin"
                              placeholder="Enter new 4-digit PIN"
                              maxLength={4}
                              pattern="\d{4}"
                              className="w-full border p-2 rounded pr-10 text-gray-900 font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => ({ ...prev, [caregiver.id]: !prev[caregiver.id] }))}
                              className="absolute right-2 top-2 text-gray-500 text-sm"
                            >
                              {showPassword[caregiver.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Must be exactly 4 digits</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCredentials(null);
                              setShowPassword({});
                            }}
                            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TokenStatus({ caregiverId }: { caregiverId: string }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const db = getFirebaseDatabase();
        if (!db) {
          setHasToken(null);
          return;
        }
        const snap = await get(ref(db, `notificationTokens/${caregiverId}`));
        setHasToken(snap.exists());
      } catch {
        setHasToken(null);
      }
    })();
  }, [caregiverId]);
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${hasToken ? 'text-green-700' : 'text-gray-500'}`}>
      {hasToken ? 'Token Active' : 'No Token'}
    </span>
  );
}

function WeeklyCalendar({
  scheduledShifts,
  caregivers,
  onEdit,
}: {
  scheduledShifts: ScheduledShift[];
  caregivers: User[];
  onEdit: (s: ScheduledShift) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // Monday start
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const days = Array.from({ length: 7 }).map((_, i) => {
    const dt = new Date(weekStart);
    dt.setDate(dt.getDate() + i);
    return dt;
  });

  const shiftsByDay = days.map(day => {
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // include any shift that overlaps this day
    const list = scheduledShifts
      .map(s => {
        const sStart = s.scheduledStartTime ? new Date(s.scheduledStartTime).getTime() : NaN;
        const sEnd = s.scheduledEndTime ? new Date(s.scheduledEndTime).getTime() : sStart;
        const overlaps = !isNaN(sStart) && sStart < dayEnd && sEnd > dayStart;
        return { s, sStart, sEnd, overlaps };
      })
      .filter(x => x.overlaps)
      .sort((a, b) => a.sStart - b.sStart)
      .map(x => x.s);

    return list;
  });

  const prevWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart(ws => { const d = new Date(ws); d.setDate(d.getDate() + 7); return d; });

  const formatHeader = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="px-3 py-1 bg-gray-100 rounded font-semibold text-gray-800">Prev</button>
          <button onClick={nextWeek} className="px-3 py-1 bg-gray-100 rounded font-semibold text-gray-800">Next</button>
        </div>
        <div className="text-sm text-gray-800 font-semibold">
          {days[0].toLocaleDateString()} - {new Date(days[6].getTime() + (24*60*60*1000 -1)).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => (
          <div key={day.toISOString()} className="border rounded p-2 bg-gray-50">
            <div className="text-xs font-semibold text-gray-900 mb-2">{formatHeader(day)}</div>
            <div className="space-y-2">
              {shiftsByDay[i].length === 0 && (
                <div className="text-xs text-gray-400">No shifts</div>
              )}
              {shiftsByDay[i].map(s => {
                const caregiver = s.caregiverId ? caregivers.find(c => c.id === s.caregiverId) : null;
                const sStartMs = s.scheduledStartTime ? new Date(s.scheduledStartTime).getTime() : NaN;
                const sEndMs = s.scheduledEndTime ? new Date(s.scheduledEndTime).getTime() : NaN;
                const dayStartMs = day.getTime();
                const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
                const continuedFromPrev = !isNaN(sStartMs) && sStartMs < dayStartMs;
                const continuesNextDay = !isNaN(sEndMs) && sEndMs > dayEndMs;

                const visibleStartIso = !isNaN(sStartMs) ? new Date(Math.max(sStartMs, dayStartMs)).toISOString() : '';
                const visibleEndIso = !isNaN(sEndMs) ? new Date(Math.min(sEndMs, dayEndMs)).toISOString() : '';
                const startLabel = visibleStartIso ? formatShiftTime(visibleStartIso) : '';
                const endLabel = visibleEndIso ? formatShiftTime(visibleEndIso) : '';

                return (
                  <button
                    key={s.id}
                    onClick={() => onEdit(s)}
                    className="w-full text-left p-2 bg-white rounded shadow-sm hover:shadow-md text-sm"
                    title={`${s.shiftName || 'Shift'} • ${startLabel}${endLabel ? ' - ' + endLabel : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{s.shiftName || 'Open Shift'}</div>
                      <div className="flex items-center gap-2">
                        {continuedFromPrev && (
                          <span className="text-[11px] text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded">Continued</span>
                        )}
                        {continuesNextDay && (
                          <span className="text-[11px] text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded">Continues</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[12px] text-gray-700">{startLabel}{endLabel ? ` - ${endLabel}` : ''} • {caregiver ? caregiver.name : 'Unassigned'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
