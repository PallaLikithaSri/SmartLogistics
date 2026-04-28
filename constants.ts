
import { Truck, User, Task, Trailer, CustomerPlan, MaintenanceLog, PayrollEntry, VehicleDocument, IncidentPhoto, CustomerRequest } from './types';

export const MOCK_USERS: User[] = [
  { 
    id: 'admin1', 
    name: 'Alice Admin', 
    role: 'ADMIN', 
    title: 'Fleet Manager',
    email: 'admin1@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: 'worker1', 
    name: 'John Driver', 
    role: 'WORKER', 
    title: 'Senior Logistics Operator',
    email: 'john@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', 
    hourlyRate: 28.50,
    documents: [
      { id: 'd1', name: 'Commercial Driver License', type: 'IMAGE', uploadDate: '2023-01-15', status: 'VALID' },
      { id: 'd2', name: 'Safety Certification', type: 'PDF', uploadDate: '2023-03-20', status: 'VALID' },
      { id: 'd3', name: 'Insurance Policy', type: 'PDF', uploadDate: '2022-11-05', status: 'EXPIRED' },
    ]
  },
  { 
    id: 'worker2', 
    name: 'Jane Operator', 
    role: 'WORKER', 
    title: 'Heavy Transport Specialist',
    email: 'jane@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    hourlyRate: 32.00,
    documents: [
      { id: 'd4', name: 'CDL Class A', type: 'IMAGE', uploadDate: '2023-06-10', status: 'VALID' },
    ]
  },
  { 
    id: 'cust1', 
    name: 'Global Corp', 
    role: 'CUSTOMER', 
    title: 'Enterprise Partner',
    email: 'customer@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: 'tl1', 
    name: 'Taylor Lead', 
    role: 'TEAM_LEADER', 
    title: 'Team Leader',
    email: 'lead@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
  { 
    id: 'super1', 
    name: 'Sam Root', 
    role: 'SUPER_ADMIN', 
    title: 'Super Admin',
    email: 'super@demo.com',
    password: 'demo123',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' 
  },
];

export const INITIAL_TRUCKS: Truck[] = [
  { id: 't1', plateNumber: 'TRK-001', model: 'Volvo VNL 860', status: 'AVAILABLE', mileage: 125000, lastService: '2023-08-15' },
  { id: 't2', plateNumber: 'TRK-002', model: 'Freightliner Cascadia', status: 'IN_USE', currentDriverId: 'worker2', mileage: 89000, lastService: '2023-09-01' },
  { id: 't3', plateNumber: 'TRK-003', model: 'Kenworth T680', status: 'OUT_OF_USE', mileage: 210000, lastService: '2023-07-20' },
  { id: 't4', plateNumber: 'TRK-004', model: 'Peterbilt 579', status: 'AVAILABLE', mileage: 45000, lastService: '2023-09-10' },
  { id: 't5', plateNumber: 'TRK-005', model: 'Mack Anthem', status: 'AVAILABLE', mileage: 15000, lastService: '2023-09-12' },
];

export const INITIAL_TRAILERS: Trailer[] = [
    { id: 'tr1', identifier: 'TRL-101', type: 'Dry Van (53\')', status: 'AVAILABLE' },
    { id: 'tr2', identifier: 'TRL-102', type: 'Reefer Unit', status: 'AVAILABLE' },
    { id: 'tr3', identifier: 'TRL-103', type: 'Flatbed', status: 'OUT_OF_USE' },
    { id: 'tr4', identifier: 'TRL-104', type: 'Tanker', status: 'AVAILABLE' },
    { id: 'tr5', identifier: 'TRL-105', type: 'Lowboy', status: 'AVAILABLE' },
];

export const INITIAL_TASKS: Task[] = [
  { id: 'tsk1', workerId: 'worker1', title: 'Route 66 Delivery', description: 'Deliver cargo to Warehouse A. Check tire pressure before departure.', status: 'PENDING', dueDate: new Date().toISOString().split('T')[0], priority: 'HIGH' },
  { id: 'tsk2', workerId: 'worker1', title: 'Safety Inspection', description: 'Complete monthly vehicle safety checklist.', status: 'COMPLETED', dueDate: '2023-10-01', priority: 'MEDIUM' },
];

export const TRAILER_TYPES = ['Dry Van (53\')', 'Reefer Unit', 'Flatbed', 'Tanker', 'Lowboy'];

export const CUSTOMER_PLANS: CustomerPlan[] = [
  { id: 'cp1', customerId: 'cust1', date: new Date().toISOString().split('T')[0], description: 'Dedicated route – 2 trucks allocated, morning delivery window.', deductPause: true },
  { id: 'cp2', customerId: 'cust1', date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })(), description: 'Evening pickup slot with reefer trailer requirement.', deductPause: false },
];

export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [
  { id: 'm1', vehicleType: 'TRUCK', vehicleId: 't3', date: '2023-09-20', notes: 'Brake inspection required', status: 'OPEN', tag: 'MECHANICAL' },
  { id: 'm2', vehicleType: 'TRAILER', vehicleId: 'tr3', date: '2023-09-18', notes: 'Floor repair scheduled', status: 'RESOLVED', tag: 'STRUCTURAL' },
];

export const INITIAL_PAYROLL_ENTRIES: PayrollEntry[] = [
  { id: 'p1', workerId: 'worker1', date: new Date().toISOString().split('T')[0], hours: 42, amount: 42 * 28.5, status: 'PENDING', type: 'PAYROLL' },
  { id: 'p2', workerId: 'worker2', date: new Date().toISOString().split('T')[0], hours: 40, amount: 40 * 32, status: 'PAID', type: 'PAYROLL' },
  { id: 'inv1', workerId: 'worker2', date: '2023-09-15', hours: 10, amount: 1200, status: 'PENDING', type: 'INDEPENDENT_INVOICE' },
];

export const INITIAL_VEHICLE_DOCUMENTS: VehicleDocument[] = [
  { id: 'vd1', vehicleId: 't1', vehicleType: 'TRUCK', category: 'DOCUMENT', label: 'Registration', url: 'https://via.placeholder.com/150', uploadedAt: '2023-09-01', uploadedBy: 'admin1' },
  { id: 'vd2', vehicleId: 'tr2', vehicleType: 'TRAILER', category: 'PHOTO', label: 'Reefer Inspection Photo', url: 'https://via.placeholder.com/150', uploadedAt: '2023-09-04', uploadedBy: 'admin1' },
];

export const INITIAL_INCIDENT_PHOTOS: IncidentPhoto[] = [
  { id: 'ip1', reportId: 'r1', url: 'https://via.placeholder.com/100', uploadedAt: '2023-09-12' },
];

export const INITIAL_CUSTOMER_REQUESTS: CustomerRequest[] = [
  { id: 'cr1', customerId: 'cust1', workerId: 'worker1', date: new Date().toISOString().split('T')[0], status: 'REQUESTED', note: 'Requested for Monday shift' },
];
