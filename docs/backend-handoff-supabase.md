# Backend Handoff (Supabase)

## Core Tables
- **users**: id (uuid), role (enum: SUPER_ADMIN, ADMIN, TEAM_LEADER, WORKER, CUSTOMER), name, avatar, title, hourly_rate, customer_id (nullable for worker assigned customer), created_at.
  - Seed a default admin user; customer self-registration should create users with role=CUSTOMER.
  - Super Admin must be able to create users and change roles (e.g., promote a customer to worker/leader/admin). Admin/Team Leader/Worker/Customer cannot create users.
- **trucks**: id, plate_number, model, status (AVAILABLE/IN_USE/OUT_OF_USE), mileage, last_service, current_driver_id (fk users), created_at.
- **trailers**: id, identifier, type, status, current_driver_id, created_at.
- **vehicle_documents**: id, vehicle_type (TRUCK/TRAILER), vehicle_id fk, category (PHOTO/DOCUMENT), label, url, uploaded_by (fk users), uploaded_at.
- **maintenancelogs**: id, vehicle_type, vehicle_id, date, notes, status (OPEN/RESOLVED), tag (MECHANICAL/ELECTRICAL/TIRES/STRUCTURAL/OTHER), created_at.
- **availabilities**: id, worker_id fk users, date, status (DAY/NIGHT/BOTH/UNAVAILABLE), created_at.
- **worker_assignments**: id, worker_id fk users, date, truck_id fk, trailer_id fk, assigned_by (role), created_at.
- **shifts**: id, worker_id fk, date, start_time, end_time, truck_id, trailer_id, customer_id fk, no_pause (bool), pause_minutes (int default 30), total_hours (numeric), feedback, created_at.
- **tasks**: id, worker_id fk, title, description, status (PENDING/COMPLETED/ARCHIVED), due_date, priority, logged_at.
- **damage_reports**: id, worker_id fk, description, ai_analysis, timestamp, resolved (bool), primary_image_url, forwarded (bool).
- **incident_photos**: id, report_id fk damage_reports, url, uploaded_at.
- **customer_plans**: id, customer_id fk users, date, description, window, deduct_pause (bool), created_at.
- **customer_requests**: id, customer_id fk users, worker_id fk users, date, status (REQUESTED/VERIFIED), note.
- **payroll_entries**: id, worker_id fk, date, hours, amount, status (PENDING/PAID), type (PAYROLL/INDEPENDENT_INVOICE), customer_id fk nullable, created_at.
- **attendance_records**: id, worker_id fk, date, status (PRESENT/ABSENT), notes.

## Key Rules & Logic
- **Availability**: 4 states; cycle per worker/date. Weeks start Monday.
- **Assignments**: Admin/Team Leader assign truck/trailer per date. When assignment changes, mark vehicle IN_USE; release sets AVAILABLE.
- **Shifts**: Clock-in rounds start_time up to next 15m; clock-out rounds end_time down to previous 15m. Total hours = (end-start) - pause. Pause = 0 if no_pause=true or customer_plan.deduct_pause=false; else default 30m. Recalculate on shift edits when both start/end set.
- **Loadout**: Default empty unless assigned; worker can self-pick if unassigned.
- **Tasks**: Show active first; allow archive log (super admin). Incident can create a task entry.
- **Incident Reports**: Multiple photos per report; optional AI analysis on first photo. Email forward is stubbed—backend should send mail with attachments and set forwarded=true.
- **Customer Requests**: Customer can click availability to log REQUESTED/VERIFIED for a worker/date; visible to super/admin.
- **Maintenance**: Tags filterable; export stub; status OPEN/RESOLVED; resolving sets vehicle AVAILABLE. Only maintenance export explicitly requested.
- **Customer Plans**: Day-level plan per customer with optional pause deduction flag; super admin visibility/management.
- **Payroll**: Generate by date range from shifts (skip duplicates) plus filters by worker/date; include customer_id when applicable.

## APIs (suggested)
- REST or RPC via Supabase edge functions for: login-as (prototype), create/update for each table above, shift clock-in/out (enforce rounding/pause rules server-side), assignment updates (enforce vehicle status), incident upload (store files to Supabase Storage; return URLs), maintenance resolution, payroll generation.
- Webhooks/Tasks: email forward for incidents (send attachments, set forwarded=true); maintenance export endpoint (only explicit export ask).

## Storage
- Supabase Storage buckets: `incident-photos/`, `vehicle-docs/`.

## Auth/RBAC
- Use Supabase Auth for email/password (replace demo login). Seed one super/admin user; allow only customers to self-register via public signup. Map roles to row-level policies: workers can only read/write their shifts/tasks/incidents; customers read-only their plans/requests; team leader/admin manage assignments/maintenance; super admin full access (including customer plans management). Admin can promote/demote users (role field).

## Exports (stubbed in UI)
- Maintenance export endpoint (filter by vehicle/tag). Other exports were not explicitly requested.
