/**
 * Demo Backend Service
 * Provides mock data and in-memory storage for client demonstrations
 * Simulates Supabase API responses without requiring actual backend connectivity
 */

import { User, Truck, Shift, Task, DamageReport, Availability, Trailer, WorkerAssignment, CustomerPlan, MaintenanceLog, PayrollEntry, AttendanceRecord, VehicleDocument, IncidentPhoto, CustomerRequest, Role } from '../types';

// ============================================================================
// MOCK DATA STORAGE (In-Memory)
// ============================================================================

interface Session {
  user: {
    id: string;
    email: string;
  };
}

let currentSession: Session | null = null;

// Mock users database with all roles
const mockUsers: Record<string, any> = {
  // ADMIN role
  'admin-001': {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'ADMIN',
    avatar: '👨‍💼',
  },
  
  // SUPER_ADMIN role
  'superadmin-001': {
    id: 'superadmin-001',
    name: 'Super Admin',
    email: 'superadmin@demo.com',
    role: 'SUPER_ADMIN',
    avatar: '👑',
  },
  
  // TEAM_LEADER role
  'teamlead-001': {
    id: 'teamlead-001',
    name: 'Team Lead - Operations',
    email: 'teamlead@demo.com',
    role: 'TEAM_LEADER',
    avatar: '👨‍💼',
  },
  
  // WORKER roles
  'worker-001': {
    id: 'worker-001',
    name: 'John Driver',
    email: 'john@demo.com',
    role: 'WORKER',
    hourly_rate: 25,
    avatar: '👨‍🔧',
  },
  'worker-002': {
    id: 'worker-002',
    name: 'Jane Driver',
    email: 'jane@demo.com',
    role: 'WORKER',
    hourly_rate: 27,
    avatar: '👩‍🔧',
  },
  'worker-003': {
    id: 'worker-003',
    name: 'Mike Worker',
    email: 'mike@demo.com',
    role: 'WORKER',
    hourly_rate: 26,
    avatar: '👨‍🔧',
  },
  
  // CUSTOMER roles
  'customer-001': {
    id: 'customer-001',
    name: 'ABC Logistics',
    email: 'customer@demo.com',
    role: 'CUSTOMER',
    title: 'Operations Manager',
    avatar: '🏢',
  },
  'customer-002': {
    id: 'customer-002',
    name: 'XYZ Transport',
    email: 'customer2@demo.com',
    role: 'CUSTOMER',
    title: 'Fleet Coordinator',
    avatar: '🏢',
  },
};

const mockTrucks: Record<string, any> = {
  'truck-001': {
    id: 'truck-001',
    plate_number: 'LG-2024-001',
    status: 'AVAILABLE',
    current_driver_id: null,
    last_service: '2024-01-15',
  },
  'truck-002': {
    id: 'truck-002',
    plate_number: 'LG-2024-002',
    status: 'AVAILABLE',
    current_driver_id: null,
    last_service: '2024-02-10',
  },
};

const mockTrailers: Record<string, any> = {
  'trailer-001': {
    id: 'trailer-001',
    plate_number: 'TR-2024-001',
    status: 'AVAILABLE',
    current_driver_id: null,
  },
  'trailer-002': {
    id: 'trailer-002',
    plate_number: 'TR-2024-002',
    status: 'AVAILABLE',
    current_driver_id: null,
  },
};

const mockShifts: Record<string, any> = {};
const mockTasks: Record<string, any> = {};
const mockDamageReports: Record<string, any> = {};
const mockAvailabilities: Record<string, any> = {};
const mockWorkerAssignments: Record<string, any> = {};
const mockCustomerPlans: Record<string, any> = {};
const mockMaintenanceLogs: Record<string, any> = {};
const mockPayrollEntries: Record<string, any> = {};
const mockAttendanceRecords: Record<string, any> = {};
const mockVehicleDocuments: Record<string, any> = {};
const mockIncidentPhotos: Record<string, any> = {};
const mockCustomerRequests: Record<string, any> = {};

// ============================================================================
// DEMO BACKEND API
// ============================================================================

export const demoBackend = {
  // ========================================================================
  // AUTHENTICATION
  // ========================================================================
  
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Demo mode: Accept predefined demo accounts OR create new CUSTOMER on first login
      const emailStr = String(email || '').trim().toLowerCase();
      
      if (!emailStr) {
        return {
          data: { session: null, user: null },
          error: { message: 'Email is required', code: 'INVALID_CREDENTIALS' },
        };
      }
      
      // Check if user exists
      let user = Object.values(mockUsers).find((u: any) => u.email?.toLowerCase() === emailStr);
      
      // If not found, create new CUSTOMER user on first login
      if (!user) {
        const newUserId = `customer-${Date.now()}`;
        user = {
          id: newUserId,
          email: emailStr,
          name: emailStr.split('@')[0] || 'User',
          role: 'CUSTOMER',
          avatar: '👤',
        };
        mockUsers[newUserId] = user;
        console.log('✨ [DEMO AUTH] New customer created:', emailStr);
      } else {
        console.log('✅ [DEMO AUTH] Demo user found:', emailStr, `(${user.role})`);
      }
      
      // Ensure user is in the users table with correct role
      if (!mockUsers[user.id]) {
        mockUsers[user.id] = user;
      }
      
      const session: Session = {
        user: { id: user.id, email: user.email },
      };
      currentSession = session;
      
      console.log('✅ [DEMO AUTH] Login successful:', emailStr, `Role: ${user.role}`);
      return { 
        data: { 
          session, 
          user: { ...session.user, role: user.role } // Include role in response
        }, 
        error: null 
      };
    },

    signUp: async ({ email, password }: { email: string; password: string }) => {
      const existingUser = Object.values(mockUsers).find(u => u.email === email);
      if (existingUser) {
        return {
          data: { user: null },
          error: { message: 'User already exists', code: 'USER_EXISTS' },
        };
      }
      const newUserId = `customer-${Date.now()}`;
      mockUsers[newUserId] = {
        id: newUserId,
        email,
        name: email.split('@')[0],
        role: 'CUSTOMER',
      };
      const session: Session = {
        user: { id: newUserId, email },
      };
      currentSession = session;
      return { data: { user: session.user }, error: null };
    },

    signOut: async () => {
      currentSession = null;
      return { error: null };
    },

    getSession: async () => {
      if (currentSession) {
        // Get the user's role from mockUsers
        const userId = currentSession.user.id;
        const user = Object.values(mockUsers).find(u => u.id === userId) || mockUsers[userId];
        const role = user?.role;
        return { 
          data: { 
            session: {
              ...currentSession,
              user: { ...currentSession.user, role }
            }
          }, 
          error: null 
        };
      }
      return { 
        data: { 
          session: null 
        }, 
        error: null 
      };
    },

    onAuthStateChange: () => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },

  // ========================================================================
  // DATABASE OPERATIONS
  // ========================================================================

  from: (table: string) => {
    const getTableData = () => {
      const tableMap: Record<string, Record<string, any>> = {
        users: mockUsers,
        trucks: mockTrucks,
        trailers: mockTrailers,
        shifts: mockShifts,
        tasks: mockTasks,
        damage_reports: mockDamageReports,
        availabilities: mockAvailabilities,
        worker_assignments: mockWorkerAssignments,
        customer_plans: mockCustomerPlans,
        maintenancelogs: mockMaintenanceLogs,
        payroll_entries: mockPayrollEntries,
        attendance_records: mockAttendanceRecords,
        vehicle_documents: mockVehicleDocuments,
        incident_photos: mockIncidentPhotos,
        customer_requests: mockCustomerRequests,
      };
      return tableMap[table] || {};
    };

    // Create a proxy object that acts as both a thenable and has methods
    class QueryBuilder {
      filters: Array<{ field: string; value: any }> = [];

      select(fields: string = '*') {
        return this;
      }

      eq(field: string, value: any) {
        this.filters.push({ field, value });
        return this;
      }

      async maybeSingle() {
        const tableData = getTableData();
        let results = Object.values(tableData);
        
        for (const filter of this.filters) {
          results = results.filter(r => r[filter.field] === filter.value);
        }
        
        return { data: results[0] || null, error: null };
      }

      then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
        // This makes it thenable - when awaited, it returns the data
        const tableData = getTableData();
        let results = Object.values(tableData);
        
        for (const filter of this.filters) {
          results = results.filter(r => r[filter.field] === filter.value);
        }
        
        const result = { data: results, error: null };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      }

      delete() {
        return {
          eq: (field: string, value: any) => ({
            then: (callback: (result: any) => void) => {
              const tableData = getTableData();
              Object.keys(tableData).forEach(key => {
                if (tableData[key][field] === value) {
                  delete tableData[key];
                }
              });
              return Promise.resolve(callback({ error: null }));
            },
          }),
        };
      }

      update(updates: Record<string, any>) {
        return {
          eq: (field: string, value: any) => ({
            then: (callback: (result: any) => void) => {
              const tableData = getTableData();
              Object.keys(tableData).forEach(key => {
                if (tableData[key][field] === value) {
                  tableData[key] = { ...tableData[key], ...updates };
                }
              });
              return Promise.resolve(callback({ error: null }));
            },
          }),
        };
      }

      upsert(payload: Record<string, any>, options?: { onConflict?: string }) {
        return {
          then: (callback: (result: any) => void) => {
            const tableData = getTableData();
            if (options?.onConflict) {
              const conflictFields = options.onConflict.split(',');
              const existingKey = Object.keys(tableData).find(key => {
                return conflictFields.every(field => tableData[key][field.trim()] === payload[field.trim()]);
              });
              if (existingKey) {
                tableData[existingKey] = { ...tableData[existingKey], ...payload };
              } else {
                tableData[payload.id] = payload;
              }
            } else {
              tableData[payload.id] = payload;
            }
            return Promise.resolve(callback({ error: null }));
          },
        };
      }
    }

    return new QueryBuilder();
  },
};

// ============================================================================
// EXPORT DEFAULT FOR COMPATIBILITY
// ============================================================================

export const supabase = demoBackend;
