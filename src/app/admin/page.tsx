'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MockService } from '../../services/mockData';
import { User, Shift, ScheduledShift } from '../../types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  formatShiftTime, 
  formatShiftDate, 
  formatShiftDateShort,
  getShiftStatusColor, 
  getShiftStatusLabel,
  sortShiftsByDate 
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
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    refreshData();
    
    // Set up interval to sync with Firebase every 2 seconds
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [user, router]);

  const refreshData = async () => {
    const allUsers = await MockService.getUsersAsync();
    setCaregivers(allUsers.filter(u => u.role === 'caregiver'));
    
    const allShifts = MockService.getShifts();
    setShifts(allShifts);
    
    const allScheduledShifts = MockService.getScheduledShifts();
    setScheduledShifts(allScheduledShifts);
    
    const owed = allShifts
      .filter(s => !s.isPaid && s.endTime)
      .reduce((acc, s) => {
        const duration = (new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
        return acc + (duration * s.hourlyRate);
      }, 0);
    setTotalOwed(owed);
  };

  const handleMarkPaid = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift) {
      MockService.saveShift({ ...shift, isPaid: true });
      refreshData();
    }
  };

  const handleAddCaregiver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser: User = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      role: 'caregiver',
      phone: formData.get('phone') as string,
      pin: formData.get('pin') as string,
      hourlyRate: parseFloat(formData.get('rate') as string),
      isActive: true,
    };
    MockService.saveUser(newUser);
    refreshData();
    (e.target as HTMLFormElement).reset();
  };

  const handleCreateScheduledShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const shiftName = formData.get('shiftName') as string;
    
    const scheduledStart = new Date(`${date}T${startTime}`).toISOString();
    const scheduledEnd = new Date(`${date}T${endTime}`).toISOString();
    
    const newScheduledShift: ScheduledShift = {
      id: Date.now().toString(),
      date: date,
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
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const shiftName = formData.get('shiftName') as string;
    
    const scheduledStart = new Date(`${date}T${startTime}`).toISOString();
    const scheduledEnd = new Date(`${date}T${endTime}`).toISOString();
    
    MockService.updateScheduledShift(editingShift.id, {
      date: date,
      scheduledStartTime: scheduledStart,
      scheduledEndTime: scheduledEnd,
      shiftName: shiftName || undefined,
    });
    
    setEditingShift(null);
    refreshData();
  };

  const handleUpdateCaregiverRate = (caregiverId: string, newRate: number) => {
    MockService.updateUser(caregiverId, { hourlyRate: newRate });
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
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Create/Edit Scheduled Shift Form */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingShift ? 'Edit Shift' : 'Publish Open Shift'}
              </h3>
              <form onSubmit={editingShift ? handleUpdateScheduledShift : handleCreateScheduledShift} className="space-y-4">
                {/* Row 1: Date and Start Time */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 md:hidden mb-1">Date</label>
                    <input 
                      name="date" 
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
                
                {/* Row 2: End Time and Shift Name */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-3">
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

            {/* Scheduled Shifts List */}
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
              <form onSubmit={handleAddCaregiver} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input name="name" placeholder="Name" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="phone" placeholder="Phone" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="pin" placeholder="PIN (4 digits)" maxLength={4} required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="rate" type="number" step="0.01" placeholder="Hourly Rate ($)" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded md:col-span-4">Add Caregiver</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Caregivers</h3>
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-gray-900 font-semibold border-b">
                    <th className="pb-2 text-xs md:text-sm">Name</th>
                    <th className="pb-2 text-xs md:text-sm">Phone</th>
                    <th className="pb-2 text-xs md:text-sm">Rate</th>
                    <th className="pb-2 text-xs md:text-sm">Status</th>
                    <th className="pb-2 text-xs md:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {caregivers.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{c.name}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">{c.phone}</td>
                      <td className="py-3 text-gray-900 font-medium text-xs md:text-sm">
                        {editingCaregiver?.id === c.id ? (
                          <div className="flex items-center gap-2">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={c.hourlyRate}
                              className="border p-1 rounded w-20"
                              id={`rate-${c.id}`}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`rate-${c.id}`) as HTMLInputElement;
                                handleUpdateCaregiverRate(c.id, parseFloat(input.value));
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
                          <div className="flex items-center gap-2">
                            <span>${c.hourlyRate?.toFixed(2)}/hr</span>
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
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const caregiverId = formData.get('caregiverId') as string;
                const date = formData.get('date') as string;
                const start = formData.get('start') as string;
                const end = formData.get('end') as string;
                
                const caregiver = caregivers.find(c => c.id === caregiverId);
                if (!caregiver) return;

                const startTime = new Date(`${date}T${start}`).toISOString();
                const endTime = new Date(`${date}T${end}`).toISOString();

                const newShift: Shift = {
                  id: Date.now().toString(),
                  caregiverId,
                  startTime,
                  endTime,
                  hourlyRate: caregiver.hourlyRate || 0,
                  isPaid: false,
                  status: 'completed',
                };
                MockService.saveShift(newShift);
                refreshData();
                (e.target as HTMLFormElement).reset();
              }} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select name="caregiverId" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="">Select Caregiver</option>
                  {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input name="date" type="date" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="start" type="time" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <input name="end" type="time" required className="border-2 border-gray-300 bg-white text-gray-900 p-3 rounded text-sm md:text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Shift</button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Shift History</h3>
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Caregiver</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Cost</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {shifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(s => {
                  const caregiver = caregivers.find(c => c.id === s.caregiverId);
                  const start = new Date(s.startTime);
                  const end = s.endTime ? new Date(s.endTime) : null;
                  const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60) : 0;
                  const cost = duration * s.hourlyRate;

                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3">{caregiver?.name || 'Unknown'}</td>
                      <td className="py-3">{start.toLocaleDateString()}</td>
                      <td className="py-3">
                        {end ? `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m` : 'In Progress'}
                      </td>
                      <td className="py-3">${cost.toFixed(2)}</td>
                      <td className="py-3">
                        {s.isPaid ? (
                          <span className="text-green-600 font-bold">Paid</span>
                        ) : (
                          <span className="text-red-600 font-bold">Unpaid</span>
                        )}
                      </td>
                      <td className="py-3">
                        {!s.isPaid && s.endTime && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            Mark Paid
                          </button>
                        )}
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
              <h3 className="text-lg font-bold mb-4">Admin Credentials</h3>
              <div className="space-y-4">
                {MockService.getUsers().filter(u => u.role === 'admin').map(admin => (
                  <div key={admin.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{admin.name}</h4>
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
                            className="w-full border p-2 rounded"
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
                              className="w-full border p-2 rounded pr-10"
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
              <h3 className="text-lg font-bold mb-4">Caregiver Credentials</h3>
              <div className="space-y-4">
                {caregivers.map(caregiver => (
                  <div key={caregiver.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{caregiver.name}</h4>
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
                            className="w-full border p-2 rounded"
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
                              className="w-full border p-2 rounded pr-10"
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
