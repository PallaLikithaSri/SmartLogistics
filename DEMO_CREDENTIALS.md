# 🔐 Demo Login Credentials - All Roles Available

## Quick Reference Table

| Role | Email | Password | User Name |
|------|-------|----------|-----------|
| **SUPER_ADMIN** 👑 | `superadmin@demo.com` | *any* | Super Admin |
| **ADMIN** 👨‍💼 | `admin@demo.com` | *any* | Admin User |
| **TEAM_LEADER** 👨‍💼 | `teamlead@demo.com` | *any* | Team Lead - Operations |
| **WORKER** 👨‍🔧 | `john@demo.com` | *any* | John Driver |
| **WORKER** 👩‍🔧 | `jane@demo.com` | *any* | Jane Driver |
| **WORKER** 👨‍🔧 | `mike@demo.com` | *any* | Mike Worker |
| **CUSTOMER** 🏢 | `customer@demo.com` | *any* | ABC Logistics |
| **CUSTOMER** 🏢 | `customer2@demo.com` | *any* | XYZ Transport |

## Usage Instructions

1. **Choose a role** from the table above
2. **Enter the email** in the login form
3. **Enter any password** (it doesn't matter - demo mode ignores passwords)
4. Click **Login**
5. You'll be logged in with that role's permissions

## Additional Notes

- **Password Field**: Leave blank or type anything - passwords are ignored in demo mode
- **Custom Accounts**: You can also use any other email (e.g., `test@company.com`) to auto-create a new CUSTOMER account
- **No Data Persistence**: Data is stored in browser memory only. Refresh = clear data
- **Multiple Users**: Test multiple roles by logging out and logging back in with a different email

## What Each Role Can Do

| Role | Access Level | Features |
|------|--------------|----------|
| SUPER_ADMIN | Full System | All admin features, user management, system settings |
| ADMIN | High | Dashboard, fleet management, workers, reports |
| TEAM_LEADER | Medium | Team management, scheduling, assignments |
| WORKER | Low | Clock in/out, view shifts, personal dashboard |
| CUSTOMER | Low | View scheduling, customer plans, reporting |

## Implementation Details

The demo backend looks up users by email (case-insensitive) in the `mockUsers` object. Each role has a full set of permissions based on the role definition. Any unrecognized email automatically creates a new CUSTOMER account.

**File**: `services/demoBackend.ts` (mockUsers object)
**Location**: Lines 23-97
