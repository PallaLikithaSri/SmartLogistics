# Requirements Summary (Roles & Features)

## Roles
- **Super Admin**: Full control; manages admins/team leaders; assign customers; view all modules (assignments, fleet, maintenance, tasks, attendance, payroll, analytics, customer plans, documents).
- **Admin**: Manage workers, truck/trailer assignments, attendance, payroll, maintenance, customer planning, tasks, analytics; no access to restricted team-leader limits.
- **Team Leader**: Assign trucks/trailers; create tasks; view analytics; view availability; cannot see hourly wages/payroll/invoices.
- **Worker**: Start/end shift; select truck/trailer if not assigned; receive tasks; report damage (multiple photos); set availability (Day/Night/Both/Unavailable); read-only hourly wage (set at creation); “no pause” flag on clock-out.
- **Customer**: View own planning/availability; click availability to request/verify a worker; no access to others’ data.

## Modules & Behavior
- **Availability & Schedule**: Week starts Monday; 4-state availability. Visible in Admin Schedule, Assignments tab, Worker calendar, Customer availability view.
- **Assignments**: Admin/Team Leader assign truck/trailer per day; availability shown in Assignments tab. Equipment marked IN_USE; releasing sets AVAILABLE.
- **Fleet**: Trucks/trailers with statuses (Available/In Use/Out of Use). Fleet editing/adding is locked per client; docs/photos per category stored in Documents tab (hidden from assignment forms). Cannot assign Out of Use.
- **Maintenance**: Logs with tags (Mechanical/Electrical/Tires/Structural/Other); filter by tag; maintenance export stub (only); resolve sets vehicle available.
- **Shifts & Time**: Clock-in rounds up 15m; clock-out rounds down 15m. Total hours = (end-start) – pause. Pause defaults 30m unless customer plan sets “no deduct” or worker flags “no pause” (then 0). Editing start/end (15m increments) recalculates total. Monthly overview table shows date/start/stop/pause/total with worker filter; no-pause alerts collected for super admin review.
- **Tasks**: Active tasks sorted first; archive log for super admin (export stub). Team leader/admin can create; incident can be turned into a task.
- **Incidents**: Multi-photo upload. Assign as task (stub) or forward via email (stub; flagged as forwarded).
- **Customer Plans**: Day-level plan per customer with optional pause-deduct flag; managed by Super Admin; visible in Analytics workforce snapshot (assigned customer on workers).
- **Customer Requests**: Customer can click availability to log REQUESTED/VERIFIED for a worker/date; visible in Analytics.
- **Payroll**: Range generation from shifts with 30m pause logic; filter by worker/date; includes customer_id when present. Exports beyond maintenance were not requested (left out).
- **Attendance**: Basic presence logging.
- **Documents**: Fleet documents/photos per vehicle; hidden from assignment screens.
- **Auth (prototype)**: Email/password demo. Default admin: admin1@demo.com / demo123. Customer self-register enabled (prototype only). Backend to replace with Supabase Auth and enforce roles.
- **User provisioning**: Only customers self-register. Super Admin creates users and changes roles (e.g., promote a registered customer to worker/leader/admin). Admins/Team Leaders do not create users.

## Key Gaps for Backend to Implement
- Real auth (Supabase Auth), role-based access, and customer-only signup.
- Real email forwarding for incidents (UI flag set when forwarded).
- Maintenance export endpoint (only explicit export request); other exports not requested.
- Fleet edits are locked in UI; enforce restriction backend-side if needed.
