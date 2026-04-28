
export type Role = 'ADMIN' | 'TEAM_LEADER' | 'SUPER_ADMIN' | 'WORKER' | 'CUSTOMER';

export type AvailabilityStatus = 'DAY' | 'NIGHT' | 'BOTH' | 'UNAVAILABLE';

export interface UserDocument {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  uploadDate: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING';
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  hourlyRate?: number; // Admin only, set at account creation
  documents?: UserDocument[];
  title?: string;
  customerId?: string; // assigned customer for reporting
  email?: string;
  password?: string; // demo only, replace with real auth in backend
}

export interface Truck {
  id: string;
  plateNumber: string;
  model: string;
  status: 'AVAILABLE' | 'IN_USE' | 'OUT_OF_USE';
  currentDriverId?: string;
  mileage?: number;
  lastService?: string;
}

export interface Trailer {
  id: string;
  identifier: string;
  type: string;
  status: 'AVAILABLE' | 'IN_USE' | 'OUT_OF_USE';
  currentDriverId?: string;
}

export interface Shift {
  id: string;
  workerId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  truckId?: string;
  trailerId?: string;
  trailerType?: string;
  totalHours?: number;
  feedback?: string;
  date: string; // YYYY-MM-DD
  noPause?: boolean;
  pauseMinutes?: number;
  customerId?: string;
}

export interface Task {
  id: string;
  workerId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'ARCHIVED';
  dueDate: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  loggedAt?: string;
}

export interface DamageReport {
  id: string;
  workerId: string;
  imageUrl: string; // Base64 or URL
  description: string;
  aiAnalysis?: string;
  timestamp: string;
  resolved: boolean;
  photos?: IncidentPhoto[];
  forwarded?: boolean;
}

export interface Availability {
  workerId: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
}

export interface WorkerAssignment {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  truckId?: string;
  trailerId?: string;
  assignedBy?: Role; // legacy UI role label
  assignedByUserId?: string; // Supabase FK to users.assigned_by
}

export interface CustomerPlan {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  description: string;
  window?: string; // e.g., AM/PM
  deductPause?: boolean;
}

export interface MaintenanceLog {
  id: string;
  vehicleType: 'TRUCK' | 'TRAILER';
  vehicleId: string;
  date: string; // YYYY-MM-DD
  notes: string;
  status: 'OPEN' | 'RESOLVED';
  tag?: string;
}

export interface PayrollEntry {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  amount: number;
  status: 'PENDING' | 'PAID';
  type: 'PAYROLL' | 'INDEPENDENT_INVOICE';
  customerId?: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT';
  notes?: string;
}

export interface NoPauseAlert {
  id: string;
  workerId: string;
  shiftId: string;
  date: string;
  createdAt: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  vehicleType: 'TRUCK' | 'TRAILER';
  category: 'PHOTO' | 'DOCUMENT';
  label: string;
   url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface IncidentPhoto {
  id: string;
  reportId: string;
  url: string;
  uploadedAt: string;
}

export interface CustomerRequest {
  id: string;
  customerId: string;
  workerId: string;
  date: string;
  status: 'REQUESTED' | 'VERIFIED' | 'REJECTED';
  note?: string;
}
