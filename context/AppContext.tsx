import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient.ts';
import { User, Truck, Shift, Task, DamageReport, Availability, Trailer, WorkerAssignment, CustomerPlan, MaintenanceLog, PayrollEntry, AttendanceRecord, VehicleDocument, IncidentPhoto, CustomerRequest, AvailabilityStatus, NoPauseAlert, Role } from '../types';

type View = 'DASHBOARD' | 'SCHEDULE' | 'DOCUMENTS' | 'SETTINGS';
type AdminSection = 'OVERVIEW' | 'ASSIGNMENTS' | 'ANALYTICS' | 'FLEET' | 'SCHEDULE' | 'ATTENDANCE' | 'WORKERS' | 'TASKS' | 'REPORTS' | 'PAYROLL' | 'CUSTOMER PLANS' | 'DOCUMENTS' | 'USERS';

interface AppContextType {
  currentUser: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpCustomer: (opts: { email: string; password: string; name: string; title?: string }) => Promise<void>;
  logout: () => Promise<void>;
  authLoading: boolean;
  authError: string | null;
  
  // Navigation
  currentView: View;
  navigateTo: (view: View) => void;

  users: User[];
  trucks: Truck[];
  trailers: Trailer[];
  shifts: Shift[];
  tasks: Task[];
  damageReports: DamageReport[];
  availabilities: Availability[];
  workerAssignments: WorkerAssignment[];
  customerPlans: CustomerPlan[];
  maintenanceLogs: MaintenanceLog[];
  payrollEntries: PayrollEntry[];
  updateHourlyRate: (workerId: string, rate: number) => void;
  addPayrollEntry: (entry: Omit<PayrollEntry, 'id' | 'status'> & { status?: PayrollEntry['status'] }) => void;
  addCustomerPlan: (plan: Omit<CustomerPlan, 'id'>) => void;
  updateCustomerPlan: (planId: string, updates: Partial<CustomerPlan>) => void;
  deleteCustomerPlan: (planId: string) => void;
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (rec: Omit<AttendanceRecord, 'id'>) => void;
  customerRequests: CustomerRequest[];
  addCustomerRequest: (req: Omit<CustomerRequest, 'id' | 'status'> & { status?: CustomerRequest['status'] }) => void;
  deleteCustomerRequest: (requestId: string) => void;
  verifyCustomerRequest: (requestId: string, status: 'VERIFIED' | 'REQUESTED') => void;
  noPauseAlerts: NoPauseAlert[];
  clearNoPauseAlert: (alertId: string) => void;
  updateUserRole: (userId: string, role: Role) => void;

  addTruck: (truck: Truck) => void;
  updateTruckStatus: (truckId: string, status: Truck['status'], driverId?: string) => void;
  
  addTrailer: (trailer: Trailer) => void;
  updateTrailerStatus: (trailerId: string, status: Trailer['status'], driverId?: string) => void;

  clockIn: (workerId: string, truckId: string, trailerId: string) => void;
  clockOut: (shiftId: string, feedback: string, options?: { noPause?: boolean }) => void;
  updateShift: (shiftId: string, updates: Partial<Shift>) => void;
  
  addTask: (task: Task) => void;
  completeTask: (taskId: string) => void;

  addDamageReport: (report: DamageReport) => void;
  resolveDamageReport: (reportId: string) => void;
  forwardDamageReport: (reportId: string) => void;
  toggleAvailability: (workerId: string, date: string) => void;

  assignEquipment: (assignment: Omit<WorkerAssignment, 'id'>) => void;
  getAssignmentForWorker: (workerId: string, date: string) => WorkerAssignment | undefined;

  addMaintenanceLog: (log: Omit<MaintenanceLog, 'id' | 'status'>) => void;
  resolveMaintenanceLog: (logId: string) => void;
  markPayrollStatus: (entryId: string, status: PayrollEntry['status']) => void;

  vehicleDocuments: VehicleDocument[];
  addVehicleDocument: (doc: Omit<VehicleDocument, 'id'>) => void;

  incidentPhotos: IncidentPhoto[];
  addIncidentPhotos: (reportId: string, urls: string[]) => void;

  adminSection: AdminSection;
  setAdminSection: (section: AdminSection) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Surface Supabase errors instead of silently logging; the UI was otherwise optimistic-only.
const handleDbError = (action: string, table: string, error: any, extra?: Record<string, any>) => {
  const message = `[Data] ${action} ${table} failed: ${error?.message || 'Unknown error'}`;
  console.error(message, { error, ...extra });
  if (typeof window !== 'undefined') {
    alert(message);
  }
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // fallback for environments without crypto.randomUUID
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
};

// Map camelCase fields used in the UI to the snake_case columns used in Supabase tables.
const FIELD_MAP: Record<string, Record<string, string>> = {
  users: { customerId: 'customer_id', hourlyRate: 'hourly_rate' },
  trucks: { plateNumber: 'plate_number', currentDriverId: 'current_driver_id', lastService: 'last_service' },
  trailers: { currentDriverId: 'current_driver_id' },
  shifts: {
    workerId: 'worker_id', startTime: 'start_time', endTime: 'end_time', truckId: 'truck_id', trailerId: 'trailer_id',
    trailerType: 'trailer_type', totalHours: 'total_hours', noPause: 'no_pause', pauseMinutes: 'pause_minutes', customerId: 'customer_id'
  },
  tasks: { workerId: 'worker_id', dueDate: 'due_date', loggedAt: 'logged_at' },
  damage_reports: { workerId: 'worker_id', aiAnalysis: 'ai_analysis', imageUrl: 'primary_image_url' },
  incident_photos: { reportId: 'report_id', uploadedAt: 'uploaded_at' },
  availabilities: { workerId: 'worker_id' },
  worker_assignments: { workerId: 'worker_id', truckId: 'truck_id', trailerId: 'trailer_id', assignedByUserId: 'assigned_by' },
  customer_plans: { customerId: 'customer_id', deductPause: 'deduct_pause', window: 'time_window' },
  maintenancelogs: { vehicleType: 'vehicle_type', vehicleId: 'vehicle_id' },
  payroll_entries: { workerId: 'worker_id', customerId: 'customer_id' },
  attendance_records: { workerId: 'worker_id' },
  vehicle_documents: { vehicleType: 'vehicle_type', vehicleId: 'vehicle_id', uploadedAt: 'uploaded_at', uploadedBy: 'uploaded_by' },
  customer_requests: { customerId: 'customer_id', workerId: 'worker_id' },
};

const toDbRow = (table: string, row: any) => {
  const map = FIELD_MAP[table] || {};
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [map[key] || key, value]));
};

const fromDbRow = (table: string, row: any) => {
  const map = FIELD_MAP[table] || {};
  const inverse = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [inverse[key] || key, value]));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [adminSection, setAdminSection] = useState<AdminSection>('OVERVIEW');
  
  const [users, setUsers] = useState<User[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [workerAssignments, setWorkerAssignments] = useState<WorkerAssignment[]>([]);
  const [customerPlans, setCustomerPlans] = useState<CustomerPlan[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);
  const [incidentPhotos, setIncidentPhotos] = useState<IncidentPhoto[]>([]);
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);
  const [noPauseAlerts, setNoPauseAlerts] = useState<NoPauseAlert[]>([]);

  const resetLocalState = () => {
    setUsers([]);
    setTrucks([]);
    setTrailers([]);
    setShifts([]);
    setTasks([]);
    setDamageReports([]);
    setAvailabilities([]);
    setWorkerAssignments([]);
    setCustomerPlans([]);
    setMaintenanceLogs([]);
    setPayrollEntries([]);
    setAttendanceRecords([]);
    setVehicleDocuments([]);
    setIncidentPhotos([]);
    setCustomerRequests([]);
    setNoPauseAlerts([]);
  };

  // Load data from Supabase once authenticated; fall back to in-memory mocks if tables are empty or errors occur.
  const loadAllData = async () => {
    const fetchTable = async <T,>(table: string, setter: (rows: T[]) => void) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`[Data] fetch ${table} failed`, error.message);
        return;
      }
      if (data) setter(data.map(row => fromDbRow(table, row)) as T[]);
    };

    await Promise.all([
      fetchTable<User>('users', setUsers),
      fetchTable<Truck>('trucks', setTrucks),
      fetchTable<Trailer>('trailers', setTrailers),
      fetchTable<Shift>('shifts', setShifts),
      fetchTable<Task>('tasks', setTasks),
      fetchTable<DamageReport>('damage_reports', setDamageReports),
      fetchTable<Availability>('availabilities', setAvailabilities),
      fetchTable<WorkerAssignment>('worker_assignments', setWorkerAssignments),
      fetchTable<CustomerPlan>('customer_plans', setCustomerPlans),
      fetchTable<MaintenanceLog>('maintenancelogs', setMaintenanceLogs),
      fetchTable<PayrollEntry>('payroll_entries', setPayrollEntries),
      fetchTable<AttendanceRecord>('attendance_records', setAttendanceRecords),
      fetchTable<VehicleDocument>('vehicle_documents', setVehicleDocuments),
      fetchTable<IncidentPhoto>('incident_photos', setIncidentPhotos),
      fetchTable<CustomerRequest>('customer_requests', setCustomerRequests),
    ]);
  };

  const refreshAfterWrite = () => {
    if (currentUser) void loadAllData();
  };

  const upsert = async (table: string, payload: any) => {
    const { error } = await supabase.from(table).upsert(toDbRow(table, payload));
    if (error) {
      handleDbError('upsert', table, error, { payload });
      return false;
    }
    refreshAfterWrite();
    return true;
  };

  const upsertWithConflict = async (table: string, payload: any, onConflict: string) => {
    const { error } = await supabase.from(table).upsert(toDbRow(table, payload), { onConflict });
    if (error) {
      handleDbError('upsert', table, error, { payload });
      return false;
    }
    refreshAfterWrite();
    return true;
  };

  const patch = (table: string, id: string, values: any) => {
    void supabase.from(table).update(toDbRow(table, values)).eq('id', id).then(({ error }) => {
      if (error) {
        handleDbError('update', table, error, { id, values });
        return;
      }
      refreshAfterWrite();
    });
  };

  const remove = (table: string, id: string) => {
    void supabase.from(table).delete().eq('id', id).then(({ error }) => {
      if (error) {
        handleDbError('delete', table, error, { id });
        return;
      }
      refreshAfterWrite();
    });
  };

  // Supabase profile mapper
  const mapProfileToUser = (profile: any, email?: string): User => {
    const normalized = fromDbRow('users', profile) as Partial<User>;
    return {
      id: normalized.id || '',
      name: normalized.name || 'User',
      role: (normalized.role as Role) || 'CUSTOMER',
      title: normalized.title,
      hourlyRate: normalized.hourlyRate,
      avatar: normalized.avatar,
      customerId: normalized.customerId,
      email,
    };
  };

  const fetchAndSetProfile = async (userId: string, email?: string, initialRole?: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    
    if (!data) {
      // Use initial role if provided (from auth response), otherwise default to CUSTOMER
      const roleToUse = initialRole || 'CUSTOMER';
      await supabase.from('users').upsert(toDbRow('users', { id: userId, role: roleToUse, name: email || 'User', email }));
    }
    if (error && error.code !== 'PGRST116') {
      setAuthError(error.message);
      return;
    }
    const userDataToMap = data || { id: userId, role: initialRole || 'CUSTOMER', name: email || 'User' };
    const mapped = mapProfileToUser(userDataToMap, email);
    setCurrentUser(mapped);
    setCurrentView('DASHBOARD');
    if (mapped.role !== 'WORKER') setAdminSection('OVERVIEW');
  };

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    if (data.session?.user) {
      // Pass the role from auth response if available - it's in data.user, not data.session.user
      const userRole = (data.user as any).role;
      await fetchAndSetProfile(data.session.user.id, data.session.user.email || email, userRole);
    }
    setAuthLoading(false);
  };

  const signUpCustomer = async ({ email, password, name, title }: { email: string; password: string; name: string; title?: string }) => {
    setAuthError(null);
    setAuthLoading(true);
    console.debug('[Auth] signUp start', { email, name });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] signUp error', { email, message: error.message, code: error.code, details: error });
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from('users').upsert(toDbRow('users', { id: userId, role: 'CUSTOMER', name, title: title || 'Customer', email }));
      await fetchAndSetProfile(userId, email, 'CUSTOMER');
    }
    console.debug('[Auth] signUp success', { email, userId });
    setAuthLoading(false);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      handleDbError('auth.signOut', 'auth', error);
    }
    resetLocalState();
    setCurrentUser(null);
    setCurrentView('DASHBOARD');
    setAdminSection('OVERVIEW');
  };

  useEffect(() => {
    const syncSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (session?.user) {
          const userRole = (session.user as any).role;
          await fetchAndSetProfile(session.user.id, session.user.email || undefined, userRole);
        }
      } catch (error) {
        console.error('[Auth] Session sync error:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    
    try {
      syncSession();
    } catch (error) {
      console.error('[Auth] useEffect error:', error);
      setAuthLoading(false);
    }
    
    try {
      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const userRole = (session.user as any).role;
          await fetchAndSetProfile(session.user.id, session.user.email || undefined, userRole);
        } else {
          setCurrentUser(null);
        }
      });
      return () => sub?.subscription?.unsubscribe?.();
    } catch (error) {
      console.error('[Auth] onAuthStateChange setup error:', error);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadAllData();
    const id = setInterval(loadAllData, 10000);
    return () => clearInterval(id);
  }, [currentUser?.id]);

  const navigateTo = (view: View) => setCurrentView(view);

  const addTruck = (truck: Truck) => {
    setTrucks([...trucks, truck]);
    void upsert('trucks', truck);
  };

  const updateTruckStatus = (truckId: string, status: Truck['status'], driverId?: string) => {
    setTrucks(prev => prev.map(t => t.id === truckId ? { ...t, status, currentDriverId: driverId } : t));
    patch('trucks', truckId, { status, currentDriverId: driverId });
  };

  const addTrailer = (trailer: Trailer) => {
    setTrailers([...trailers, trailer]);
    void upsert('trailers', trailer);
  };

  const updateTrailerStatus = (trailerId: string, status: Trailer['status'], driverId?: string) => {
    setTrailers(prev => prev.map(t => t.id === trailerId ? { ...t, status, currentDriverId: driverId } : t));
    patch('trailers', trailerId, { status, currentDriverId: driverId });
  };

  const getAssignmentForWorker = (workerId: string, date: string) => workerAssignments.find(a => a.workerId === workerId && a.date === date);

  const assignEquipment = (assignment: Omit<WorkerAssignment, 'id'>) => {
    const newId = createId();
    const assignedByUserId = currentUser?.id;
    // release any existing assignment resources for that worker and date
    setWorkerAssignments(prev => {
      const existing = prev.find(a => a.workerId === assignment.workerId && a.date === assignment.date);
      if (existing) {
        if (existing.truckId) updateTruckStatus(existing.truckId, 'AVAILABLE');
        if (existing.trailerId) updateTrailerStatus(existing.trailerId, 'AVAILABLE');
      }
      const nextAssignment = { ...assignment, id: newId, assignedByUserId } as WorkerAssignment;
      return [...prev.filter(a => !(a.workerId === assignment.workerId && a.date === assignment.date)), nextAssignment];
    });
    const dbPayload = {
      id: newId,
      workerId: assignment.workerId,
      date: assignment.date,
      truckId: assignment.truckId,
      trailerId: assignment.trailerId,
      assignedByUserId,
    };
    void upsert('worker_assignments', dbPayload);
    if (assignment.truckId) updateTruckStatus(assignment.truckId, 'IN_USE', assignment.workerId);
    if (assignment.trailerId) updateTrailerStatus(assignment.trailerId, 'IN_USE', assignment.workerId);
  };

  const roundToQuarterHour = (date: Date, direction: 'up' | 'down') => {
    const ms = 15 * 60 * 1000;
    const time = date.getTime();
    const rounded = direction === 'up' ? Math.ceil(time / ms) * ms : Math.floor(time / ms) * ms;
    return new Date(rounded);
  };

  const clockIn = (workerId: string, truckId: string, trailerId: string) => {
    const roundedStart = roundToQuarterHour(new Date(), 'up');
    const newShift: Shift = {
      id: createId(),
      workerId,
      startTime: roundedStart.toISOString(),
      truckId,
      trailerId,
      date: new Date().toISOString().split('T')[0],
      noPause: false,
      pauseMinutes: 30,
    };
    setShifts([...shifts, newShift]);
    void upsert('shifts', newShift);
    if (truckId) updateTruckStatus(truckId, 'IN_USE', workerId);
    if (trailerId) updateTrailerStatus(trailerId, 'IN_USE', workerId);
  };

  const clockOut = (shiftId: string, feedback: string, options?: { noPause?: boolean }) => {
    setShifts(prev => prev.map(s => {
      if (s.id === shiftId) {
        const roundedEnd = roundToQuarterHour(new Date(), 'down');
        const start = new Date(s.startTime).getTime();
        const end = roundedEnd.getTime();
        const rawHours = (end - start) / (1000 * 60 * 60);
        const plan = customerPlans.find(p => p.customerId === s.customerId && p.date === s.date);
        const noPause = options?.noPause ?? s.noPause;
        const pauseMinutes = noPause ? 0 : plan?.deductPause === false ? 0 : 30;
        const hours = rawHours - (pauseMinutes / 60);
        
        const assignment = getAssignmentForWorker(s.workerId, s.date);
        // Keep equipment marked in use if still assigned for the day
        if (s.truckId) updateTruckStatus(s.truckId, assignment ? 'IN_USE' : 'AVAILABLE');
        if (s.trailerId) updateTrailerStatus(s.trailerId, assignment ? 'IN_USE' : 'AVAILABLE');

                const updated = { ...s, endTime: roundedEnd.toISOString(), totalHours: parseFloat(Math.max(hours, 0).toFixed(2)), feedback, pauseMinutes, noPause };
                patch('shifts', shiftId, updated);
                return updated;
      }
      return s;
    }));
    const shift = shifts.find(sh => sh.id === shiftId);
    if (options?.noPause && shift) {
      setNoPauseAlerts(prev => [...prev, {
        id: `${shiftId}-nopause`,
        workerId: shift.workerId,
        shiftId,
        date: shift.date,
        createdAt: new Date().toISOString(),
      }]);
    }
  };

  const updateShift = (shiftId: string, updates: Partial<Shift>) => {
    setShifts(prev => prev.map(s => {
      if (s.id !== shiftId) return s;
      const merged = { ...s, ...updates };
      if (merged.startTime && merged.endTime) {
        const start = new Date(merged.startTime).getTime();
        const end = new Date(merged.endTime).getTime();
        if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
          const rawHours = (end - start) / (1000 * 60 * 60);
          const plan = customerPlans.find(p => p.customerId === merged.customerId && p.date === merged.date);
          const pauseMinutes = merged.noPause ? 0 : plan?.deductPause === false ? 0 : merged.pauseMinutes ?? 30;
          merged.totalHours = parseFloat(Math.max(rawHours - pauseMinutes / 60, 0).toFixed(2));
        }
      }
      patch('shifts', shiftId, merged);
      return merged;
    }));
  };

  const addMaintenanceLog = (log: Omit<MaintenanceLog, 'id' | 'status'>) => {
    const record = { ...log, id: createId(), status: 'OPEN' } as MaintenanceLog;
    setMaintenanceLogs(prev => [...prev, record]);
    void upsert('maintenancelogs', record);
  };

  const resolveMaintenanceLog = (logId: string) => {
    setMaintenanceLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'RESOLVED' } : l));
    patch('maintenancelogs', logId, { status: 'RESOLVED' });
    const log = maintenanceLogs.find(l => l.id === logId);
    if (log) {
      if (log.vehicleType === 'TRUCK') {
        updateTruckStatus(log.vehicleId, 'AVAILABLE');
      } else {
        updateTrailerStatus(log.vehicleId, 'AVAILABLE');
      }
    }
  };

  const markPayrollStatus = (entryId: string, status: PayrollEntry['status']) => {
    setPayrollEntries(prev => prev.map(p => p.id === entryId ? { ...p, status } : p));
    patch('payroll_entries', entryId, { status });
  };

  const addCustomerPlan = (plan: Omit<CustomerPlan, 'id'>) => {
    const record = { ...plan, id: createId() } as CustomerPlan;
    setCustomerPlans(prev => [...prev, record]);
    void upsert('customer_plans', record);
  };

  const updateHourlyRate = (workerId: string, rate: number) => {
    setUsers(prev => prev.map(u => u.id === workerId ? { ...u, hourlyRate: rate } : u));
    patch('users', workerId, { hourlyRate: rate });
  };

  const addPayrollEntry = (entry: Omit<PayrollEntry, 'id' | 'status'> & { status?: PayrollEntry['status'] }) => {
    const record = { ...entry, id: createId(), status: entry.status || 'PENDING' } as PayrollEntry;
    setPayrollEntries(prev => [...prev, record]);
    void upsert('payroll_entries', record);
  };

  const updateCustomerPlan = (planId: string, updates: Partial<CustomerPlan>) => {
    // Find the existing plan
    const existingPlan = customerPlans.find(p => p.id === planId);
    if (!existingPlan) {
      console.error('No existing plan found for update', planId);
      return;
    }
    // Merge updates with the existing plan to ensure all fields are present
    const mergedPlan = { ...existingPlan, ...updates };
    const dbUpdates = toDbRow('customer_plans', mergedPlan);
    supabase.from('customer_plans').update(dbUpdates).eq('id', planId).then(({ error }) => {
      if (error) {
        console.error(`[Data] update customer_plans failed`, error.message, { planId, updates });
        return;
      }
      // Refresh from backend after successful update
      supabase.from('customer_plans').select('*').then(({ data, error }) => {
        if (error) {
          console.error(`[Data] fetch customer_plans failed`, error.message);
          return;
        }
        if (data) setCustomerPlans(data.map(row => fromDbRow('customer_plans', row)));
      });
    });
  };

  const deleteCustomerPlan = (planId: string) => {
    supabase.from('customer_plans').delete().eq('id', planId).then(({ error }) => {
      if (error) {
        console.error(`[Data] delete customer_plans failed`, error.message, { planId });
        return;
      }
      // Refresh from backend after successful delete
      supabase.from('customer_plans').select('*').then(({ data, error }) => {
        if (error) {
          console.error(`[Data] fetch customer_plans failed`, error.message);
          return;
        }
        if (data) setCustomerPlans(data.map(row => fromDbRow('customer_plans', row)));
      });
    });
  };

  const addAttendanceRecord = (rec: Omit<AttendanceRecord, 'id'>) => {
    const record = { ...rec, id: createId() } as AttendanceRecord;
    setAttendanceRecords(prev => [...prev, record]);
    void upsert('attendance_records', record);
  };

  const addTask = (task: Task) => {
    const record = { ...task, id: createId(), status: 'PENDING', dueDate: task.dueDate || new Date().toISOString().split('T')[0] } as Task;
    setTasks([...tasks, record]);
    void upsert('tasks', record);
  };
  
  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t));
    patch('tasks', taskId, { status: 'COMPLETED' });
  };

  const addDamageReport = (report: DamageReport, photoUrls?: string[]) => {
    const record = { ...report, id: report.id || createId() } as DamageReport;
    const { photos: _omitPhotos, ...rest } = record as any;
    setDamageReports([...damageReports, record]);
    void upsert('damage_reports', rest);
    if (photoUrls && photoUrls.length) {
      addIncidentPhotos(record.id, photoUrls);
    }
  };

  const resolveDamageReport = (reportId: string) => {
    setDamageReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true } : r));
    patch('damage_reports', reportId, { resolved: true });
  };

  const forwardDamageReport = (reportId: string) => {
    setDamageReports(prev => prev.map(r => r.id === reportId ? { ...r, forwarded: true } : r));
    patch('damage_reports', reportId, { forwarded: true });
  };

  const toggleAvailability = (workerId: string, date: string) => {
    setAvailabilities(prev => {
      const exists = prev.find(a => a.workerId === workerId && a.date === date);
      if (exists) {
        const order: AvailabilityStatus[] = ['DAY', 'NIGHT', 'BOTH', 'UNAVAILABLE'];
        const currentIndex = order.indexOf(exists.status);
        const nextStatus = order[(currentIndex + 1) % order.length];
        const updated = prev.map(a => a.workerId === workerId && a.date === date ? { ...a, status: nextStatus } : a);
        void upsertWithConflict('availabilities', { ...exists, status: nextStatus }, 'worker_id,date');
        return updated;
      }
      const record = { workerId, date, status: 'DAY' } as Availability;
      void upsertWithConflict('availabilities', record, 'worker_id,date');
      return [...prev, record];
    });
  };

  const addVehicleDocument = (doc: Omit<VehicleDocument, 'id'>) => {
    const record = { ...doc, id: createId() } as VehicleDocument;
    setVehicleDocuments(prev => [...prev, record]);
    void upsert('vehicle_documents', record);
  };

  const addIncidentPhotos = (reportId: string, urls: string[]) => {
    const now = new Date().toISOString();
    const newPhotos = urls.map(url => ({ id: createId(), reportId, url, uploadedAt: now }));
    setIncidentPhotos(prev => [...prev, ...newPhotos]);
    setDamageReports(prev => prev.map(r => r.id === reportId ? { ...r, photos: [...(r.photos || []), ...newPhotos] } : r));
    newPhotos.forEach(photo => { void upsert('incident_photos', photo); });
  };

  const addCustomerRequest = (req: Omit<CustomerRequest, 'id' | 'status'> & { status?: CustomerRequest['status'] }) => {
    // Check if request already exists for this customer/worker/date combination
    const existing = customerRequests.find(r => r.customerId === req.customerId && r.workerId === req.workerId && r.date === req.date);
    if (existing) {
      return; // Don't create duplicate
    }
    const record = { ...req, id: createId(), status: req.status || 'REQUESTED' } as CustomerRequest;
    setCustomerRequests(prev => [...prev, record]);
    void upsert('customer_requests', record);
  };

  const deleteCustomerRequest = (requestId: string) => {
    setCustomerRequests(prev => prev.filter(r => r.id !== requestId));
    void remove('customer_requests', requestId);
  };

  const verifyCustomerRequest = (requestId: string, status: 'VERIFIED' | 'REQUESTED') => {
    setCustomerRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
    const toUpdate = customerRequests.find(r => r.id === requestId);
    if (toUpdate) {
      void patch('customer_requests', requestId, { status });
    }
  };

  const clearNoPauseAlert = (alertId: string) => {
    setNoPauseAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const updateUserRole = async (userId: string, role: Role) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, role });
    }
    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) {
      console.error('[Role] update failed', error);
      // revert on failure
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: u.role } : u));
      if (currentUser?.id === userId) {
        await fetchAndSetProfile(userId, currentUser.email);
      }
      alert('Role update failed (check RLS/policies).');
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, signIn, signUpCustomer, logout, authLoading, authError, currentView, navigateTo, adminSection, setAdminSection,
      users, trucks, trailers, shifts, tasks, damageReports, availabilities, workerAssignments, customerPlans, maintenanceLogs, payrollEntries, customerRequests,
      addTruck, updateTruckStatus, addTrailer, updateTrailerStatus, vehicleDocuments, addVehicleDocument,
      clockIn, clockOut, updateShift, addTask, completeTask,
      addDamageReport, resolveDamageReport, forwardDamageReport, toggleAvailability, assignEquipment, getAssignmentForWorker,
      addMaintenanceLog, resolveMaintenanceLog, markPayrollStatus, addCustomerPlan, updateCustomerPlan, deleteCustomerPlan, addIncidentPhotos,
      updateHourlyRate, addPayrollEntry, attendanceRecords, addAttendanceRecord, addCustomerRequest, deleteCustomerRequest, verifyCustomerRequest, incidentPhotos, noPauseAlerts, clearNoPauseAlert, updateUserRole
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
