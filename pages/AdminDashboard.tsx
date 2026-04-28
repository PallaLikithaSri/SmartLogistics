import React, { useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import { Truck, Task, User, Shift, Trailer, WorkerAssignment, Role } from '../types';

interface AdminDashboardProps {
  mode: Role;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ mode }) => {
  const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
  };
  const {
    users, trucks, addTruck, trailers, addTrailer, shifts, updateShift,
    tasks, addTask, completeTask, damageReports, updateTruckStatus, updateTrailerStatus,
    availabilities, resolveDamageReport, workerAssignments, assignEquipment,
    maintenanceLogs, addMaintenanceLog, resolveMaintenanceLog, payrollEntries, markPayrollStatus,
    addCustomerPlan, updateCustomerPlan, deleteCustomerPlan, customerPlans, addPayrollEntry,
    attendanceRecords, addAttendanceRecord, adminSection, vehicleDocuments, addVehicleDocument, customerRequests, verifyCustomerRequest, noPauseAlerts, clearNoPauseAlert, forwardDamageReport,
    updateUserRole
  } = useApp();

  const [newTruck, setNewTruck] = useState<Partial<Truck>>({ plateNumber: '', model: '', status: 'AVAILABLE' });
  const [newTrailer, setNewTrailer] = useState<Partial<Trailer>>({ identifier: '', type: '', status: 'AVAILABLE' });
  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', description: '' });
  const [selectedWorkerForDocs, setSelectedWorkerForDocs] = useState<User | null>(null);
  const [newAssignment, setNewAssignment] = useState<Omit<WorkerAssignment, 'id' | 'assignedBy'>>({
    workerId: '',
    truckId: '',
    trailerId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [newMaintenanceLog, setNewMaintenanceLog] = useState<{ vehicleType: 'TRUCK' | 'TRAILER'; vehicleId: string; notes: string; date: string; tag?: string }>({
    vehicleType: 'TRUCK',
    vehicleId: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    tag: 'MECHANICAL',
  });
  const [newCustomerPlan, setNewCustomerPlan] = useState<{ customerId: string; date: string; description: string; window?: string; deductPause?: boolean }>({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    window: 'AM',
    deductPause: true,
  });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [payrollRange, setPayrollRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [payrollFilters, setPayrollFilters] = useState<{ workerId: string; date: string }>({ workerId: '', date: '' });
  const [availabilityDate, setAvailabilityDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAttendance, setNewAttendance] = useState<{ workerId: string; date: string; status: 'PRESENT' | 'ABSENT'; notes?: string }>({
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    notes: '',
  });
  const [maintenanceTagFilter, setMaintenanceTagFilter] = useState<string>('ALL');
  const [newVehicleDoc, setNewVehicleDoc] = useState<{ vehicleType: 'TRUCK' | 'TRAILER'; vehicleId: string; category: 'PHOTO' | 'DOCUMENT'; label: string; url: string }>({
    vehicleType: 'TRUCK',
    vehicleId: '',
    category: 'DOCUMENT',
    label: '',
    url: '',
  });
  const [monthlyWorkerFilter, setMonthlyWorkerFilter] = useState<string>('');
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const fleetLocked = mode !== 'SUPER_ADMIN';
  const roleOptions: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'WORKER', 'CUSTOMER'];
  const displayUser = (userId?: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || userId || 'Unknown';
  };
  const generatePayrollFromShifts = () => {
    const start = new Date(payrollRange.start);
    const end = new Date(payrollRange.end);
    users.filter(u => u.role === 'WORKER').forEach(worker => {
      const hours = shifts
        .filter(s => s.workerId === worker.id && s.endTime)
        .filter(s => {
          const d = new Date(s.date);
          return d >= start && d <= end;
        })
        .reduce((acc, s) => acc + (s.totalHours || 0), 0);
      if (hours > 0) {
        const duplicate = payrollEntries.find(p => p.workerId === worker.id && p.date === payrollRange.end && p.type === 'PAYROLL');
        if (duplicate) return;
        addPayrollEntry({
          workerId: worker.id,
          date: payrollRange.end,
          hours,
          amount: hours * (worker.hourlyRate || 0),
          type: 'PAYROLL',
          status: 'PENDING',
        });
      }
    });
    alert('Generated payroll entries from shifts.');
  };

  const totalHoursMonth = shifts.reduce((acc, s) => acc + (s.totalHours || 0), 0);
  const activeDrivers = trucks.filter(t => t.status === 'IN_USE').length;
  const maintenanceVehicles = trucks.filter(t => t.status === 'OUT_OF_USE').length + trailers.filter(t => t.status === 'OUT_OF_USE').length;
  const availableTrucks = trucks.filter(t => t.status === 'AVAILABLE').length;
  const availableTrailers = trailers.filter(t => t.status === 'AVAILABLE').length;
  const showWages = mode !== 'TEAM_LEADER';
  const canAssign = mode === 'ADMIN' || mode === 'TEAM_LEADER' || mode === 'SUPER_ADMIN';
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const availabilityStatus = (workerId: string, date: string) => {
    const found = availabilities.find(a => a.workerId === workerId && a.date === date);
    return found?.status || 'UNAVAILABLE';
  };

  const availabilityPill = (status: string) => {
    const map: Record<string, string> = {
      DAY: 'bg-green-50 text-green-700 border-green-100',
      NIGHT: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      BOTH: 'bg-amber-50 text-amber-700 border-amber-100',
      UNAVAILABLE: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[status] || map.UNAVAILABLE;
  };
  const toDateTimeIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
  const getPauseMinutes = (shift: Shift) => {
    const plan = customerPlans.find(p => p.customerId === shift.customerId && p.date === shift.date);
    return shift.noPause ? 0 : plan?.deductPause === false ? 0 : shift.pauseMinutes ?? 30;
  };

  const handleAddTruck = () => {
    if (fleetLocked) {
      alert('Fleet editing is restricted to Super Admin.');
      return;
    }
    if (newTruck.plateNumber && newTruck.model) {
      addTruck({ ...newTruck, id: createId() } as Truck);
      setNewTruck({ plateNumber: '', model: '', status: 'AVAILABLE' });
    }
  };

  const handleAddTrailer = () => {
    if (fleetLocked) {
      alert('Fleet editing is restricted to Super Admin.');
      return;
    }
    if (newTrailer.identifier && newTrailer.type) {
      addTrailer({ ...newTrailer, id: createId() } as Trailer);
      setNewTrailer({ identifier: '', type: '', status: 'AVAILABLE' });
    }
  };

  const handleAddTask = () => {
    if (newTask.title && newTask.workerId) {
      addTask({
        ...newTask,
        id: createId(),
        status: 'PENDING',
        dueDate: new Date().toISOString().split('T')[0]
      } as Task);
      setNewTask({ title: '', description: '', workerId: '' });
      alert('Task assigned.');
    }
  };

  const handleAddMaintenanceLog = () => {
    if (!newMaintenanceLog.vehicleId || !newMaintenanceLog.notes) return alert('Provide vehicle and notes');
    addMaintenanceLog(newMaintenanceLog);
    setNewMaintenanceLog({ vehicleType: 'TRUCK', vehicleId: '', notes: '', date: new Date().toISOString().split('T')[0], tag: 'MECHANICAL' });
  };

  const handleAddCustomerPlan = () => {
    if (!newCustomerPlan.customerId || !newCustomerPlan.description) return alert('Select customer and add description');
    // Ensure all fields are present and not undefined
    const planToSave = {
      customerId: newCustomerPlan.customerId,
      date: newCustomerPlan.date || new Date().toISOString().split('T')[0],
      description: newCustomerPlan.description,
      window: newCustomerPlan.window || 'AM',
      deductPause: typeof newCustomerPlan.deductPause === 'boolean' ? newCustomerPlan.deductPause : true
    };
    if (editingPlanId) {
      // Only send non-undefined fields for update
      updateCustomerPlan(editingPlanId, planToSave);
      setEditingPlanId(null);
    } else {
      addCustomerPlan(planToSave);
    }
    setNewCustomerPlan({ customerId: '', date: new Date().toISOString().split('T')[0], description: '', window: 'AM', deductPause: true });
  };

  const handleAssign = () => {
    if (!canAssign) return;
    if (!newAssignment.workerId) return alert('Select a worker');
    if (!newAssignment.truckId && !newAssignment.trailerId) return alert('Assign at least a truck or trailer');
    const truck = trucks.find(t => t.id === newAssignment.truckId);
    const trailer = trailers.find(t => t.id === newAssignment.trailerId);
    if (truck?.status === 'OUT_OF_USE' || trailer?.status === 'OUT_OF_USE') {
      return alert('Cannot assign equipment marked Out of Use');
    }
    assignEquipment({ ...newAssignment, assignedBy: mode });
    alert('Assignment saved.');
  };

  const getNext7Days = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday start
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div className="flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            {mode === 'SUPER_ADMIN' ? 'Super Admin Console' : mode === 'TEAM_LEADER' ? 'Team Leader Console' : 'Admin Console'}
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage fleet, personnel, and operations.</p>
        </div>
        <div className="px-4 py-2 bg-white/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 shadow-sm">
          {adminSection}
        </div>
      </div>

      {adminSection === 'USERS' && (
        mode === 'SUPER_ADMIN' ? (
          <div className="glass-card p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Access</p>
                <h3 className="text-xl font-bold text-slate-900">User Roles</h3>
                <p className="text-sm text-slate-500">Update user roles directly; changes take effect on next navigation.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 uppercase text-[11px] tracking-[0.08em]">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-800">{user.name}</td>
                      <td className="py-2 text-slate-600">{user.email || '—'}</td>
                      <td className="py-2">
                        <select
                          className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 text-sm"
                          value={user.role}
                          onChange={e => updateUserRole(user.id, e.target.value as Role)}
                        >
                          {roleOptions.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-3xl border border-amber-100 bg-amber-50 text-amber-800 font-semibold">
            Only Super Admin can view and edit user roles.
          </div>
        )
      )}

      {/* OVERVIEW TAB */}
      {adminSection === 'OVERVIEW' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <svg className="w-32 h-32 transform rotate-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" /></svg>
              </div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Hours (Month)</span>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">{totalHoursMonth.toFixed(1)}</span>
                <span className="text-lg text-slate-400 font-normal">hrs</span>
              </div>
              <div className="mt-4 text-xs font-bold text-green-700 bg-green-100/50 border border-green-100 w-max px-3 py-1.5 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                +12% vs last month
              </div>
            </div>
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Shifts</span>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-4xl lg:text-5xl font-bold text-brand-600 tracking-tight">{activeDrivers}</span>
                <span className="text-lg text-slate-400 font-normal">/ {users.filter(u => u.role === 'WORKER').length}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
                <div className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(activeDrivers / Math.max(users.filter(u => u.role === 'WORKER').length, 1)) * 100}%` }}></div>
              </div>
            </div>
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Maintenance</span>
              <span className="text-4xl lg:text-5xl font-bold text-orange-500 mt-4 block tracking-tight">{maintenanceVehicles}</span>
              <p className="text-xs text-slate-400 mt-4 font-medium">Trucks & Trailers out of service.</p>
            </div>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200/50 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Shift Logs & Time Editing</h3>
              <button className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-xl transition-colors">
                Export Logs
              </button>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Start Time</th>
                    <th className="px-6 py-4">End Time</th>
                    <th className="px-6 py-4 text-center">Pause</th>
                    <th className="px-6 py-4 text-center">Total Hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {shifts.slice().reverse().map((shift) => {
                    return (
                      <tr key={shift.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-700 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                            {(displayUser(shift.workerId) || '?').slice(0, 1).toUpperCase()}
                          </div>
                          {displayUser(shift.workerId)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{shift.date}</td>
                        <td className="px-6 py-4">
                          <input
                            type="time"
                            step={900}
                            className="bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white rounded-lg px-2 py-1 outline-none text-slate-700 w-32 transition-all text-xs font-medium"
                            defaultValue={shift.startTime.slice(11, 16)}
                            onBlur={(e) => updateShift(shift.id, { startTime: toDateTimeIso(shift.date, e.target.value) })}
                          />
                        </td>
                        <td className="px-6 py-4">
                          {shift.endTime ? (
                            <input
                              type="time"
                              step={900}
                              className="bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white rounded-lg px-2 py-1 outline-none text-slate-700 w-32 transition-all text-xs font-medium"
                              defaultValue={shift.endTime.slice(11, 16)}
                              onBlur={(e) => updateShift(shift.id, { endTime: toDateTimeIso(shift.date, e.target.value) })}
                            />
                          ) : <span className="text-brand-600 bg-brand-50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide animate-pulse">Active Now</span>}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs font-bold">{getPauseMinutes(shift)}m</span>
                            <button
                              onClick={() => {
                                updateShift(shift.id, { noPause: true });
                                alert('No-pause flagged to super admin (prototype).');
                              }}
                              className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg"
                            >
                              No pause
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            step={0.25}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand-500 outline-none text-center font-bold text-slate-900"
                            defaultValue={shift.totalHours || 0}
                            onBlur={(e) => updateShift(shift.id, { totalHours: parseFloat(e.target.value) })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNMENTS TAB */}
      {adminSection === 'ASSIGNMENTS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Available Trucks</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{availableTrucks}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Available Trailers</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{availableTrailers}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Assignments Today</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {workerAssignments.filter(a => a.date === today).length}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daily Assignment</h3>
                <p className="text-slate-500 text-sm">Admin and Team Leader can reserve equipment for the day.</p>
              </div>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                value={newAssignment.date}
                onChange={e => setNewAssignment(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newAssignment.workerId}
                onChange={e => setNewAssignment(prev => ({ ...prev, workerId: e.target.value }))}
              >
                <option value="">Select Worker</option>
                {users.filter(u => u.role === 'WORKER').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newAssignment.truckId}
                onChange={e => setNewAssignment(prev => ({ ...prev, truckId: e.target.value }))}
              >
                <option value="">Assign Truck</option>
                {trucks
                  .filter(t => t.status !== 'OUT_OF_USE')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.plateNumber} — {t.model} ({t.status.toLowerCase()})</option>
                  ))
                }
              </select>
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newAssignment.trailerId}
                onChange={e => setNewAssignment(prev => ({ ...prev, trailerId: e.target.value }))}
              >
                <option value="">Assign Trailer</option>
                {trailers
                  .filter(t => t.status !== 'OUT_OF_USE')
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.identifier} — {t.type} ({t.status.toLowerCase()})</option>
                  ))
                }
              </select>
              <button
                onClick={handleAssign}
                className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/10"
              >
                Save Assignment
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Truck</th>
                    <th className="px-6 py-4">Trailer</th>
                    <th className="px-6 py-4">Assigned By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workerAssignments.length === 0 && (
                    <tr>
                      <td className="px-6 py-4 text-slate-400 text-sm" colSpan={5}>No assignments yet.</td>
                    </tr>
                  )}
                  {workerAssignments.map(assign => {
                    const truck = trucks.find(t => t.id === assign.truckId);
                    const trailer = trailers.find(t => t.id === assign.trailerId);
                    const assignedByLabel = assign.assignedBy
                      ? assign.assignedBy.replace('_', ' ')
                      : assign.assignedByUserId
                        ? (users.find(u => u.id === assign.assignedByUserId)?.role || '—')
                        : '—';
                    return (
                      <tr key={assign.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">{displayUser(assign.workerId)}</td>
                        <td className="px-6 py-4 text-slate-500">{assign.date}</td>
                        <td className="px-6 py-4 text-slate-600">{truck ? `${truck.plateNumber} (${truck.status})` : '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{trailer ? `${trailer.identifier} (${trailer.status})` : '-'}</td>
                        <td className="px-6 py-4 text-slate-500 uppercase text-[10px] font-bold">{assignedByLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Daily Availability (Read Only)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  value={availabilityDate}
                  onChange={e => setAvailabilityDate(e.target.value)}
                />
                <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">Read Only</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold uppercase text-slate-500">Trucks</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {trucks.map(t => {
                      const assigned = workerAssignments.find(a => a.truckId === t.id && a.date === availabilityDate);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{t.plateNumber}</td>
                          <td className="px-4 py-3 text-slate-500">{t.model}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{t.status.toLowerCase()}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {assigned ? users.find(u => u.id === assigned.workerId)?.name : (t.currentDriverId ? users.find(u => u.id === t.currentDriverId)?.name : 'Unassigned')}
                          </td>
                        </tr>);
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 text-xs font-bold uppercase text-slate-500">Trailers</div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {trailers.map(t => {
                      const assigned = workerAssignments.find(a => a.trailerId === t.id && a.date === availabilityDate);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{t.identifier}</td>
                          <td className="px-4 py-3 text-slate-500">{t.type}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{t.status.toLowerCase()}</td>
                          <td className="px-4 py-3 text-slate-500">
                            {assigned ? users.find(u => u.id === assigned.workerId)?.name : (t.currentDriverId ? users.find(u => u.id === t.currentDriverId)?.name : 'Unassigned')}
                          </td>
                        </tr>);
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden md:col-span-2">
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-slate-500">Worker availability (Day / Night / Both / Unavailable)</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">Read only</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {users.filter(u => u.role === 'WORKER').map(u => {
                      const status = availabilityStatus(u.id, availabilityDate);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-700 flex items-center gap-2">
                            <img src={u.avatar} className="w-6 h-6 rounded-full" /> {u.name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${availabilityPill(status)}`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {adminSection === 'ANALYTICS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Fleet Utilization</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {Math.round((trucks.filter(t => t.status === 'IN_USE').length / Math.max(trucks.length, 1)) * 100)}%
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Open Maintenance</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {maintenanceLogs.filter(m => m.status === 'OPEN').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Active Tasks</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {tasks.filter(t => t.status === 'PENDING').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-white shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">Avg Hours / Worker</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                {(totalHoursMonth / Math.max(users.filter(u => u.role === 'WORKER').length, 1)).toFixed(1)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Workforce & Fleet Snapshot</h3>
                <p className="text-slate-500 text-sm">Who is active, assigned, and available.</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-brand-50 text-brand-700 px-3 py-1 rounded-full">Read Only</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Assignment</th>
                    <th className="px-6 py-4">Tasks</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.filter(u => u.role === 'WORKER').map(u => {
                    const assignment = workerAssignments.find(a => a.workerId === u.id && a.date === today);
                    const openTasks = tasks.filter(t => t.workerId === u.id && t.status === 'PENDING').length;
                    const activeShift = shifts.find(s => s.workerId === u.id && !s.endTime);
                    const assignedTruck = assignment?.truckId ? trucks.find(t => t.id === assignment.truckId) : undefined;
                    const assignedTrailer = assignment?.trailerId ? trailers.find(t => t.id === assignment.trailerId) : undefined;
                    const assignmentDisplay = assignment
                      ? `${assignedTruck?.plateNumber || '-'}${assignedTrailer ? ' + ' + assignedTrailer.identifier : ''}`
                      : 'Not assigned';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">{u.name}</td>
                        <td className="px-6 py-4 text-slate-500">
                          {assignmentDisplay}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{openTasks} open</td>
                        <td className="px-6 py-4 text-slate-500">{activeShift ? 'On Shift' : 'Off'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 text-xs text-slate-500 border-t border-slate-100">Prototype export only; backend not wired.</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Customer Requests / Verifications</h3>
              <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{customerRequests.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerRequests.map(req => {
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{displayUser(req.customerId)}</td>
                        <td className="px-4 py-3 text-slate-500">{displayUser(req.workerId)}</td>
                        <td className="px-4 py-3 text-slate-500">{req.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                            req.status === 'VERIFIED' ? 'bg-green-50 text-green-700' : 
                            req.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2 flex-wrap">
                          {req.status === 'REQUESTED' && (
                            <>
                              <button
                                onClick={() => verifyCustomerRequest(req.id, 'VERIFIED')}
                                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => verifyCustomerRequest(req.id, 'REJECTED')}
                                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === 'VERIFIED' && (
                            <button
                              onClick={() => verifyCustomerRequest(req.id, 'REQUESTED')}
                              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Undo Verify
                            </button>
                          )}
                          {req.status === 'REJECTED' && (
                            <button
                              onClick={() => verifyCustomerRequest(req.id, 'REQUESTED')}
                              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              Undo Rejection
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {customerRequests.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-3 text-slate-400 text-sm">No customer requests logged.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FLEET TAB (TRUCKS & TRAILERS) */}
      {adminSection === 'FLEET' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          {/* Trucks Section */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                <span className="p-2 bg-slate-100 rounded-lg"><svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2v0a2 2 0 012 2m0 0a2 2 0 012 2v0a2 2 0 01-2-2" /></svg></span>
                Add New Truck {fleetLocked && <span className="text-xs font-semibold text-red-500">(Super Admin only)</span>}
              </h3>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  placeholder="Plate Number (e.g., TRK-005)"
                  className="bg-white/50 border border-slate-200 p-3 rounded-xl flex-1 focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm transition-all focus:bg-white disabled:bg-slate-100"
                  value={newTruck.plateNumber}
                  disabled={fleetLocked}
                  onChange={e => setNewTruck({ ...newTruck, plateNumber: e.target.value })}
                />
                <input
                  placeholder="Model (e.g., Volvo VNL)"
                  className="bg-white/50 border border-slate-200 p-3 rounded-xl flex-1 focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm transition-all focus:bg-white disabled:bg-slate-100"
                  value={newTruck.model}
                  disabled={fleetLocked}
                  onChange={e => setNewTruck({ ...newTruck, model: e.target.value })}
                />
                <button
                  onClick={handleAddTruck}
                  disabled={fleetLocked}
                  className={`px-8 py-3 md:py-0 rounded-xl font-bold ${fleetLocked ? 'bg-slate-400 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'}`}
                >
                  {fleetLocked ? 'Add Truck (locked)' : 'Add Truck'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trucks.map(truck => (
                <div key={truck.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between group h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-slate-50 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2v0a2 2 0 012 2m0 0a2 2 0 012 2v0a2 2 0 01-2-2" /></svg>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${truck.status === 'AVAILABLE' ? 'bg-green-100/80 text-green-700 backdrop-blur-sm' :
                        truck.status === 'IN_USE' ? 'bg-brand-100/80 text-brand-700 backdrop-blur-sm' : 'bg-orange-100/80 text-orange-700 backdrop-blur-sm'
                        }`}>
                        {truck.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-2xl text-slate-800 tracking-tight">{truck.plateNumber}</h4>
                    <p className="text-slate-500 text-sm font-medium mt-1">{truck.model}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 w-max px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="uppercase tracking-wider">Odometer</span>
                      <span className="text-slate-700">{truck.mileage?.toLocaleString()} mi</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-end gap-2">
                    {fleetLocked ? (
                      <span className="text-[11px] font-bold text-slate-400">Fleet editing locked (Super Admin only).</span>
                    ) : (
                      <>
                        <button
                          onClick={() => updateTruckStatus(truck.id, 'AVAILABLE')}
                          className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg"
                        >
                          Set Available
                        </button>
                        <button
                          onClick={() => updateTruckStatus(truck.id, 'OUT_OF_USE')}
                          className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg"
                        >
                          Out of Use
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trailers Section */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl">
              <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
                <span className="p-2 bg-slate-100 rounded-lg"><svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 17l2 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 17a2 2 0 1 0 -4 0a2 2 0 0 0 4 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17l-2 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17a2 2 0 1 0 4 0a2 2 0 0 0 -4 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17l6 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6l8 0" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 6l2 11" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 6l0 11" /></svg></span>
                Add New Trailer {fleetLocked && <span className="text-xs font-semibold text-red-500">(Super Admin only)</span>}
              </h3>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  placeholder="ID (e.g., TRL-105)"
                  className="bg-white/50 border border-slate-200 p-3 rounded-xl flex-1 focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm transition-all focus:bg-white disabled:bg-slate-100"
                  value={newTrailer.identifier}
                  disabled={fleetLocked}
                  onChange={e => setNewTrailer({ ...newTrailer, identifier: e.target.value })}
                />
                <input
                  placeholder="Type (e.g., Dry Van)"
                  className="bg-white/50 border border-slate-200 p-3 rounded-xl flex-1 focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm transition-all focus:bg-white disabled:bg-slate-100"
                  value={newTrailer.type}
                  disabled={fleetLocked}
                  onChange={e => setNewTrailer({ ...newTrailer, type: e.target.value })}
                />
                <button
                  onClick={() => {
                    if (fleetLocked) return;
                    handleAddTrailer();
                  }}
                  disabled={fleetLocked}
                  className={`px-8 py-3 md:py-0 rounded-xl font-bold ${fleetLocked ? 'bg-slate-400 text-white' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20'}`}
                >
                  {fleetLocked ? 'Add Trailer (locked)' : 'Add Trailer'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trailers.map(trailer => (
                <div key={trailer.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between group h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-slate-50 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${trailer.status === 'AVAILABLE' ? 'bg-green-100/80 text-green-700 backdrop-blur-sm' :
                        trailer.status === 'IN_USE' ? 'bg-brand-100/80 text-brand-700 backdrop-blur-sm' : 'bg-orange-100/80 text-orange-700 backdrop-blur-sm'
                        }`}>
                        {trailer.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="font-bold text-2xl text-slate-800 tracking-tight">{trailer.identifier}</h4>
                    <p className="text-slate-500 text-sm font-medium mt-1">{trailer.type}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-end gap-2">
                    {fleetLocked ? (
                      <span className="text-[11px] font-bold text-slate-400">Fleet editing locked (Super Admin only).</span>
                    ) : (
                      <>
                        <button
                          onClick={() => updateTrailerStatus(trailer.id, 'AVAILABLE')}
                          className="text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg"
                        >
                          Set Available
                        </button>
                        <button
                          onClick={() => updateTrailerStatus(trailer.id, 'OUT_OF_USE')}
                          className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg"
                        >
                          Out of Use
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Logs */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Maintenance Logs</h3>
                <p className="text-slate-500 text-sm">Track service and downtime for trucks and trailers.</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{maintenanceLogs.length} records</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newMaintenanceLog.vehicleType}
                onChange={e => setNewMaintenanceLog(prev => ({ ...prev, vehicleType: e.target.value as 'TRUCK' | 'TRAILER', vehicleId: '' }))}
              >
                <option value="TRUCK">Truck</option>
                <option value="TRAILER">Trailer</option>
              </select>
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newMaintenanceLog.vehicleId}
                onChange={e => setNewMaintenanceLog(prev => ({ ...prev, vehicleId: e.target.value }))}
              >
                <option value="">Select Vehicle</option>
                {(newMaintenanceLog.vehicleType === 'TRUCK' ? trucks : trailers).map(v => (
                  <option key={v.id} value={v.id}>
                    {newMaintenanceLog.vehicleType === 'TRUCK' ? (v as any).plateNumber : (v as any).identifier}
                  </option>
                ))}
              </select>
              <input
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Notes"
                value={newMaintenanceLog.notes}
                onChange={e => setNewMaintenanceLog(prev => ({ ...prev, notes: e.target.value }))}
              />
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newMaintenanceLog.tag}
                onChange={e => setNewMaintenanceLog(prev => ({ ...prev, tag: e.target.value }))}
              >
                {['MECHANICAL', 'ELECTRICAL', 'TIRES', 'STRUCTURAL', 'OTHER'].map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex-1 focus:ring-2 focus:ring-brand-500 outline-none"
                  value={newMaintenanceLog.date}
                  onChange={e => setNewMaintenanceLog(prev => ({ ...prev, date: e.target.value }))}
                />
                <button
                  onClick={handleAddMaintenanceLog}
                  className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase text-slate-400">Filter by tag</label>
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  value={maintenanceTagFilter}
                  onChange={e => setMaintenanceTagFilter(e.target.value)}
                >
                  <option value="ALL">All</option>
                  {['MECHANICAL', 'ELECTRICAL', 'TIRES', 'STRUCTURAL', 'OTHER'].map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <button className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-2 rounded-lg border border-brand-100">Export to Excel</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Vehicle</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Tag</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenanceLogs
                    .filter(log => maintenanceTagFilter === 'ALL' || log.tag === maintenanceTagFilter)
                    .map(log => {
                    const vehicle = log.vehicleType === 'TRUCK' ? trucks.find(t => t.id === log.vehicleId) : trailers.find(t => t.id === log.vehicleId);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {log.vehicleType === 'TRUCK' ? vehicle?.plateNumber : vehicle?.identifier}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{log.vehicleType}</td>
                        <td className="px-6 py-4 text-slate-500">{log.date}</td>
                        <td className="px-6 py-4 text-slate-500">{log.notes}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200">{log.tag || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {log.status === 'OPEN' ? (
                            <button
                              onClick={() => resolveMaintenanceLog(log.id)}
                              className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {adminSection === 'SCHEDULE' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900">Worker Availability View</h3>
              <p className="text-slate-500 text-sm">Overview of workforce capacity for the upcoming week.</p>
            </div>
            <div className="overflow-x-auto pb-4">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="p-4 text-left bg-slate-50/50 rounded-l-xl text-xs font-bold text-slate-400 uppercase">Worker</th>
                    {getNext7Days().map(date => (
                      <th key={date} className="p-2 text-center bg-slate-50/50">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-sm font-bold text-slate-800">{new Date(date).getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-4"></tr>
                  {users.filter(u => u.role === 'WORKER').map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-semibold text-slate-700 text-sm flex items-center gap-2">
                        <img src={u.avatar} className="w-6 h-6 rounded-full" /> {u.name}
                      </td>
                      {getNext7Days().map(date => {
                        const status = availabilityStatus(u.id, date);
                        return (
                          <td key={date} className="p-2 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${availabilityPill(status)}`}>{status}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {adminSection === 'ATTENDANCE' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attendance</h3>
                <p className="text-slate-500 text-sm">Log presence for compliance.</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{attendanceRecords.length} records</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newAttendance.workerId}
                onChange={e => setNewAttendance(prev => ({ ...prev, workerId: e.target.value }))}
              >
                <option value="">Select Worker</option>
                {users.filter(u => u.role === 'WORKER').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={newAttendance.date}
                onChange={e => setNewAttendance(prev => ({ ...prev, date: e.target.value }))}
              />
              <select
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                value={newAttendance.status}
                onChange={e => setNewAttendance(prev => ({ ...prev, status: e.target.value as 'PRESENT' | 'ABSENT' }))}
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
              <button
                onClick={() => {
                  if (!newAttendance.workerId) return alert('Select worker');
                  addAttendanceRecord(newAttendance);
                  setNewAttendance({ workerId: '', date: new Date().toISOString().split('T')[0], status: 'PRESENT', notes: '' });
                }}
                className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-sm"
              >
                Add
              </button>
            </div>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Notes (optional)"
              value={newAttendance.notes}
              onChange={e => setNewAttendance(prev => ({ ...prev, notes: e.target.value }))}
            />

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Worker</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceRecords.map(rec => {
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-700">{displayUser(rec.workerId)}</td>
                        <td className="px-6 py-4 text-slate-500">{rec.date}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${rec.status === 'PRESENT' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{rec.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WORKERS TAB */}
      {adminSection === 'WORKERS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Personnel Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role / Title</th>
                    {showWages && <th className="px-6 py-4">Hourly Rate</th>}
                    <th className="px-6 py-4">Hours (Month)</th>
                    {showWages && <th className="px-6 py-4">Estimated Payout</th>}
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.filter(u => u.role === 'WORKER').map(u => {
                    const hours = shifts.filter(s => s.workerId === u.id).reduce((acc, s) => acc + (s.totalHours || 0), 0);
                    return (
                      <tr key={u.id}>
                        <td className="px-6 py-4 font-semibold text-slate-700 flex items-center gap-3">
                          <img src={u.avatar} className="w-8 h-8 rounded-full" />
                          {u.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{u.title || u.role}</td>
                        {showWages && <td className="px-6 py-4 text-slate-500">${u.hourlyRate}/hr</td>}
                        <td className="px-6 py-4 text-slate-500">{hours.toFixed(2)}</td>
                        {showWages && <td className="px-6 py-4 font-bold text-green-600">${(hours * (u.hourlyRate || 0)).toFixed(2)}</td>}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedWorkerForDocs(u)}
                            className="text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg font-bold text-xs"
                          >
                            View Docs
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {adminSection === 'TASKS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
              <span className="p-2 bg-slate-100 rounded-lg"><svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></span>
              Assign New Task
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <select
                  className="w-full bg-white/50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 backdrop-blur-sm transition-all focus:bg-white"
                  value={newTask.workerId || ''}
                  onChange={e => setNewTask({ ...newTask, workerId: e.target.value })}
                >
                  <option value="">Select Worker</option>
                  {users.filter(u => u.role === 'WORKER').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" /></svg>
                </div>
              </div>
              <input
                placeholder="Task Title"
                className="bg-white/50 border border-slate-200 p-3 rounded-xl md:col-span-2 focus:ring-2 focus:ring-brand-500 outline-none backdrop-blur-sm transition-all focus:bg-white"
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              />
              <button onClick={handleAddTask} className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02]">Assign Task</button>
            </div>
            <textarea
              placeholder="Detailed Description"
              className="bg-white/50 border border-slate-200 p-3 rounded-xl w-full mt-4 h-24 focus:ring-2 focus:ring-brand-500 outline-none resize-none backdrop-blur-sm transition-all focus:bg-white"
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg">Active Tasks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks
                  .slice()
                  .sort((a, b) => (a.status === 'PENDING' ? -1 : 1))
                  .map(task => {
                const assignee = users.find(u => u.id === task.workerId);
                return (
                  <div key={task.id} className="glass-card p-5 rounded-2xl flex items-start gap-4 group">
                    <div className={`mt-1.5 w-3 h-3 rounded-full shadow-sm ${task.status === 'COMPLETED' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wide">{assignee?.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{task.description}</p>
                      <div className="flex gap-2 mt-3">
                        {task.status !== 'COMPLETED' && (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="text-[11px] font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg"
                          >
                            Mark Done
                          </button>
                        )}
                        {mode === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => addTask({ ...task, status: 'ARCHIVED', loggedAt: new Date().toISOString(), id: `${task.id}-arch` })}
                            className="text-[11px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {mode === 'SUPER_ADMIN' && (
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Archived Tasks Log</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {tasks.filter(t => t.status === 'ARCHIVED').map(t => (
                    <div key={t.id} className="text-xs text-slate-500 flex items-center justify-between border-b border-slate-50 pb-1">
                      <span className="font-semibold text-slate-700">{t.title}</span>
                      <span className="text-[10px] uppercase font-bold">{t.loggedAt?.slice(0,10) || 'logged'}</span>
                    </div>
                  ))}
                  {tasks.filter(t => t.status === 'ARCHIVED').length === 0 && <p className="text-xs text-slate-400">No archived tasks yet.</p>}
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => alert('Exported archived tasks (stub).')}
                    className="text-[11px] font-bold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100"
                  >
                    Export Log
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAMAGE REPORTS TAB */}
      {adminSection === 'REPORTS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-2xl font-bold text-slate-900">Incident Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {damageReports.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                No damage reports submitted.
              </div>
            )}
                  {damageReports.map(report => (
              <div key={report.id} className={`bg-white rounded-3xl overflow-hidden shadow-xl border flex flex-col transition-colors ${report.resolved ? 'border-green-200 opacity-70' : 'border-white shadow-slate-200/50'}`}>
                <div className="h-48 bg-slate-100 relative">
                  <img src={report.imageUrl} alt="Damage" className="w-full h-full object-cover" />
                  <div className={`absolute top-4 right-4 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-lg ${report.resolved ? 'bg-green-500' : 'bg-red-500'}`}>
                    {report.resolved ? 'Resolved' : 'Unresolved'}
                  </div>
                  {report.forwarded && (
                    <div className="absolute top-4 left-4 text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700 shadow-sm uppercase">Forwarded</div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">{new Date(report.timestamp).toLocaleDateString()}</p>
                        <h4 className="font-bold text-lg text-slate-800">Damage Report</h4>
                      </div>
                    <div className="text-xs text-slate-500 font-medium">
                      By: {displayUser(report.workerId)}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">{report.description}</p>

                  {!report.resolved && (
                    <button
                      onClick={() => resolveDamageReport(report.id)}
                      className="w-full py-2 bg-green-50 text-green-600 font-bold text-sm rounded-xl hover:bg-green-100 transition-colors"
                    >
                      Mark as Resolved
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => {
                        const worker = users.find(u => u.id === report.workerId);
                        addTask({ id: `inc-${report.id}`, workerId: report.workerId, title: 'Follow up incident', description: report.description, status: 'PENDING', dueDate: report.timestamp.slice(0,10) });
                        alert('Incident assigned as task (stub).');
                      }}
                      className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-2 rounded-lg"
                    >
                      Assign as Task
                    </button>
                    <button
                      onClick={() => {
                        forwardDamageReport(report.id);
                        alert('Forwarded via email (prototype) – connect backend mailer.');
                      }}
                      className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg"
                    >
                      Forward via Email
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Monthly Overview (with pause deduction)</h4>
                <p className="text-slate-500 text-sm">Per worker Date / Start / Stop / Total (minus pause).</p>
              </div>
              <button className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-2 rounded-lg border border-brand-100" onClick={() => alert('Exported (stub)')}>
                Export Month
              </button>
            </div>
            <div className="mb-3">
              <select
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={monthlyWorkerFilter}
                onChange={e => setMonthlyWorkerFilter(e.target.value)}
              >
                <option value="">All workers</option>
                {users.filter(u => u.role === 'WORKER').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Worker</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">Stop</th>
                    <th className="px-4 py-3 text-center">Pause</th>
                    <th className="px-4 py-3 text-center">Total (hrs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts
                    .filter(shift => !monthlyWorkerFilter || shift.workerId === monthlyWorkerFilter)
                    .map(shift => {
                    const pause = getPauseMinutes(shift);
                    return (
                      <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-700">{displayUser(shift.workerId)}</td>
                        <td className="px-4 py-3 text-slate-500">{shift.date}</td>
                        <td className="px-4 py-3 text-slate-500">{shift.startTime ? shift.startTime.slice(11,16) : '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{shift.endTime ? shift.endTime.slice(11,16) : '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{pause}m</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{shift.totalHours?.toFixed(2) || '0.00'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">Default pause 30m unless customer says no-deduct or worker flagged no-pause (notifies super admin).</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">No-pause alerts</h4>
              <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{noPauseAlerts.length}</span>
            </div>
            <div className="space-y-2">
              {noPauseAlerts.length === 0 && <p className="text-sm text-slate-400">No alerts.</p>}
              {noPauseAlerts.map(alert => {
                return (
                  <div key={alert.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl text-sm text-slate-700">
                    <div>
                      <p className="font-semibold">{displayUser(alert.workerId)}</p>
                      <p className="text-xs text-slate-500">No pause taken • {alert.date}</p>
                    </div>
                    <button className="text-[11px] font-bold text-slate-500" onClick={() => clearNoPauseAlert(alert.id)}>Dismiss</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAYROLL TAB */}
      {adminSection === 'PAYROLL' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {mode === 'TEAM_LEADER' ? (
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h3>
              <p className="text-slate-500">Team Leaders cannot view hourly wages or payroll details.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">Payroll & Independent Invoices</h3>
                  <p className="text-slate-500 text-sm">Admin/Super Admin visibility only.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      value={payrollRange.start}
                      onChange={e => setPayrollRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      value={payrollRange.end}
                      onChange={e => setPayrollRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                    <button
                      onClick={generatePayrollFromShifts}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800"
                    >
                      Generate from shifts
                    </button>
                    <select
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      value={payrollFilters.workerId}
                      onChange={e => setPayrollFilters(prev => ({ ...prev, workerId: e.target.value }))}
                    >
                      <option value="">All workers</option>
                      {users.filter(u => u.role === 'WORKER').map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      value={payrollFilters.date}
                      onChange={e => setPayrollFilters(prev => ({ ...prev, date: e.target.value }))}
                      placeholder="Filter by date"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Worker</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Hours</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payrollEntries
                        .filter(entry => !payrollFilters.workerId || entry.workerId === payrollFilters.workerId)
                        .filter(entry => !payrollFilters.date || entry.date === payrollFilters.date)
                        .map(entry => {
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">{displayUser(entry.workerId)}</td>
                            <td className="px-6 py-4 text-slate-500">{entry.date}</td>
                            <td className="px-6 py-4 text-slate-500">{entry.hours}</td>
                            <td className="px-6 py-4 font-bold text-slate-800">${entry.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-500">{entry.type === 'PAYROLL' ? 'Payroll' : 'Independent'}</td>
                            <td className="px-6 py-4">
                              {entry.status === 'PAID' ? (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">Paid</span>
                              ) : (
                                <button
                                  onClick={() => markPayrollStatus(entry.id, 'PAID')}
                                  className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg"
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
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => alert('Export stub: would download payroll CSV.')}
                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-100"
                  >
                    Export Payroll
                  </button>
                  <button
                    onClick={() => alert('Export stub: would download invoices CSV.')}
                    className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold border border-slate-200 hover:bg-slate-100"
                  >
                    Export Invoices
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CUSTOMER PLANS TAB */}
      {adminSection === 'CUSTOMER PLANS' && (
        mode !== 'SUPER_ADMIN' ? (
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-slate-700">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h3>
            <p>Customer Plans can only be managed by Super Admin.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manage Customer Plans</h3>
                  <p className="text-slate-500 text-sm">Day-level customer scheduling (what/when the customer expects). Super Admin visibility only.</p>
                </div>
                <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{customerPlans.length} plans</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl appearance-none focus:ring-2 focus:ring-brand-500 outline-none text-slate-700"
                  value={newCustomerPlan.customerId}
                  onChange={e => setNewCustomerPlan(prev => ({ ...prev, customerId: e.target.value }))}
                >
                  <option value="">Select Customer</option>
                  {users.filter(u => u.role === 'CUSTOMER').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  value={newCustomerPlan.date}
                  onChange={e => setNewCustomerPlan(prev => ({ ...prev, date: e.target.value }))}
                />
                <input
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Window (e.g., AM / PM)"
                  value={newCustomerPlan.window}
                  onChange={e => setNewCustomerPlan(prev => ({ ...prev, window: e.target.value }))}
                />
                <button
                  onClick={handleAddCustomerPlan}
                  className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-sm"
                >
                  Add Plan
                </button>
              </div>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Description"
                value={newCustomerPlan.description}
                onChange={e => setNewCustomerPlan(prev => ({ ...prev, description: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 font-semibold">
                <input
                  type="checkbox"
                  checked={newCustomerPlan.deductPause}
                  onChange={e => setNewCustomerPlan(prev => ({ ...prev, deductPause: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Deduct 30 min pause for this customer’s shifts
              </label>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Window</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Pause Deducted</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerPlans.map(plan => {
                      const customer = users.find(u => u.id === plan.customerId);
                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-700">{displayUser(plan.customerId)}</td>
                          <td className="px-6 py-4 text-slate-500">{plan.date}</td>
                          <td className="px-6 py-4 text-slate-500">{plan.window || '-'}</td>
                          <td className="px-6 py-4 text-slate-500">{plan.description}</td>
                          <td className="px-6 py-4 text-slate-500">{plan.deductPause === false ? 'No' : 'Yes'}</td>
                          <td className="px-6 py-4 flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPlanId(plan.id);
                                setNewCustomerPlan({ customerId: plan.customerId, date: plan.date, description: plan.description, window: plan.window, deductPause: plan.deductPause });
                              }}
                              className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteCustomerPlan(plan.id)}
                              className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* DOCUMENTS TAB */}
      {adminSection === 'DOCUMENTS' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Fleet Documents & Photos</h3>
                <p className="text-slate-500 text-sm">Upload docs/photos per truck/trailer; hidden from assignment screens.</p>
              </div>
              <span className="text-[10px] font-bold uppercase bg-slate-50 text-slate-500 px-3 py-1 rounded-full">{vehicleDocuments.length} files</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={newVehicleDoc.vehicleType}
                onChange={e => setNewVehicleDoc(prev => ({ ...prev, vehicleType: e.target.value as 'TRUCK' | 'TRAILER', vehicleId: '' }))}
              >
                <option value="TRUCK">Truck</option>
                <option value="TRAILER">Trailer</option>
              </select>
              <select
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={newVehicleDoc.vehicleId}
                onChange={e => setNewVehicleDoc(prev => ({ ...prev, vehicleId: e.target.value }))}
              >
                <option value="">Select {newVehicleDoc.vehicleType}</option>
                {(newVehicleDoc.vehicleType === 'TRUCK' ? trucks : trailers).map(v => (
                  <option key={v.id} value={v.id}>{newVehicleDoc.vehicleType === 'TRUCK' ? (v as any).plateNumber : (v as any).identifier}</option>
                ))}
              </select>
              <select
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                value={newVehicleDoc.category}
                onChange={e => setNewVehicleDoc(prev => ({ ...prev, category: e.target.value as 'PHOTO' | 'DOCUMENT' }))}
              >
                <option value="DOCUMENT">Documentation</option>
                <option value="PHOTO">Photos</option>
              </select>
              <input
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Label (e.g., Insurance, Tires)"
                value={newVehicleDoc.label}
                onChange={e => setNewVehicleDoc(prev => ({ ...prev, label: e.target.value }))}
              />
              <input
                className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Document URL (required)"
                value={newVehicleDoc.url}
                onChange={e => setNewVehicleDoc(prev => ({ ...prev, url: e.target.value }))}
              />
              <button
                onClick={() => {
                  if (!newVehicleDoc.vehicleId || !newVehicleDoc.label || !newVehicleDoc.url) return alert('Select vehicle, label, and URL');
                  addVehicleDocument({ ...newVehicleDoc, uploadedAt: new Date().toISOString().split('T')[0], uploadedBy: 'admin1' });
                  setNewVehicleDoc({ vehicleType: 'TRUCK', vehicleId: '', category: 'DOCUMENT', label: '', url: '' });
                }}
                className="bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-sm"
              >
                Upload (stub)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vehicleDocuments
                .slice()
                .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
                .map(doc => {
                const vehicle = doc.vehicleType === 'TRUCK' ? trucks.find(t => t.id === doc.vehicleId) : trailers.find(t => t.id === doc.vehicleId);
                const pathIdx = doc.url?.indexOf('vehicle-docs/');
                const storagePath = pathIdx && pathIdx > -1 ? doc.url.slice(pathIdx + 'vehicle-docs/'.length) : null;
                const openDoc = async () => {
                  if (!doc.url) return;
                  // Open a blank tab immediately to avoid popup blockers; navigate it once we have a URL.
                  const tab = window.open('about:blank', '_blank');
                  if (!storagePath) {
                    if (tab) tab.location.href = doc.url;
                    return;
                  }
                  setSigningDocId(doc.id);
                  const { data, error } = await supabase.storage.from('vehicle-docs').createSignedUrl(storagePath, 3600);
                  setSigningDocId(null);
                  const urlToOpen = (!error && data?.signedUrl) ? data.signedUrl : doc.url;
                  if (error || !data?.signedUrl) {
                    console.warn('Signed URL failed, falling back to raw URL', { error, storagePath });
                  }
                  if (tab) tab.location.href = urlToOpen;
                };
                return (
                  <div key={doc.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">{doc.category}</span>
                      <span className="text-[11px] text-slate-400">Uploaded {doc.uploadedAt}</span>
                    </div>
                    <p className="font-bold text-slate-800">{doc.label}</p>
                    <p className="text-sm text-slate-500 mt-1">{doc.vehicleType}: {doc.vehicleType === 'TRUCK' ? vehicle?.plateNumber : vehicle?.identifier}</p>
                    <p className="text-[11px] text-slate-400 mt-2">By {doc.uploadedBy}</p>
                    {doc.category === 'PHOTO' && doc.url && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-white">
                        <img src={doc.url} alt={doc.label} className="w-full h-40 object-cover" />
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      {doc.url && (
                        <button onClick={openDoc} className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-100 disabled:opacity-50" disabled={signingDocId === doc.id}>
                          {signingDocId === doc.id ? 'Opening…' : 'View'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {selectedWorkerForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedWorkerForDocs.name}</h3>
                <p className="text-slate-500">Document Repository</p>
              </div>
              <button onClick={() => setSelectedWorkerForDocs(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!selectedWorkerForDocs.documents || selectedWorkerForDocs.documents.length === 0) && (
                <p className="col-span-full text-center text-slate-400 py-8">No documents uploaded.</p>
              )}
              {selectedWorkerForDocs.documents?.map(doc => (
                <div key={doc.id} className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-brand-200 hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    <span className="text-[10px] font-bold">{doc.type}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{doc.name}</h4>
                    <p className="text-xs text-slate-400">{doc.status} • {doc.uploadDate}</p>
                  </div>
                  <button className="text-brand-600 font-bold text-xs hover:bg-brand-50 px-3 py-1.5 rounded-lg">Open</button>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedWorkerForDocs(null)}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
