# 🎯 Reporting Manager Mismatch Fix

## Problem

"Reporting Manager" field showed **different values** in two places:
- **Access Control tab**: Displayed `Sarah Williams`
- **Contract Info tab**: Displayed `Unassigned`

This mismatch occurred because the two tabs were reading from **different database sources**.

---

## Root Cause

### Before Fix

| Tab | Data Source | Column |
|-----|-------------|--------|
| **Access Control** | `employees` table | ✅ `employees.reporting_manager_id` |
| **Contract Info** | `team_members` table | ❌ `team_members.manager_id` |

**Why this caused the mismatch:**
- The GET endpoint (`/api/admin/employees/[id]/route.ts`) was building `contractInfo` from `team_members.manager_id`
- If a user was assigned a manager via Access Control but had no `team_members` record, Contract Info showed `Unassigned`

---

## Solution

### Single Source of Truth ✅

**Both tabs now read and write to:**
```
employees.reporting_manager_id
```

### Files Changed

#### 1. `/app/api/admin/employees/[id]/route.ts` (GET)

**Before:**
```javascript
// ❌ Reading from team_members table
const { data: employee } = await supabase
  .from('employees')
  .select('*')  // No manager join
  .eq('id', employeeId)
  .single()

const contractInfo = {
  // ...other fields
  reportingManager: (teamMember?.manager as any)?.name || 'Unassigned',
  reportingManagerId: teamMember?.manager_id || undefined,
}
```

**After:**
```javascript
// ✅ Reading from employees table with manager join
const { data: employee } = await supabase
  .from('employees')
  .select(`
    *,
    reporting_manager:employees!employees_reporting_manager_id_fkey (
      id,
      name,
      email
    )
  `)
  .eq('id', employeeId)
  .single()

const reportingManager = (employee as any).reporting_manager
const contractInfo = {
  // ...other fields
  reportingManager: reportingManager?.name || 'Unassigned',
  reportingManagerId: employee.reporting_manager_id || undefined,
}
```

#### 2. `/app/api/admin/employees/[id]/route.ts` (PATCH)

**Before:**
```javascript
// ❌ Using wrong column name
const employeeFields = ['hourly_rate', 'overtime_rate', 'monthly_rate', 'rate_type', 'status', 'active_project', 'manager_id']

if (body.reporting_manager_id !== undefined) {
  employeeUpdateData.manager_id = newManagerId  // ❌ Wrong column
}
```

**After:**
```javascript
// ✅ Using correct column name
const employeeFields = ['hourly_rate', 'overtime_rate', 'monthly_rate', 'rate_type', 'status', 'active_project', 'reporting_manager_id']

if (body.reporting_manager_id !== undefined) {
  employeeUpdateData.reporting_manager_id = newManagerId  // ✅ Correct column
}
```

#### 3. `/components/admin/employee-drawer/EmployeeDetailDrawer.tsx`

**Added:**
- Tracks full `employeeData` from API (including manager join)
- Refetches data after manager updates in both tabs
- Access Control tab now uses API data instead of stale prop data

**Before:**
```javascript
// ❌ Using stale prop data
{activeTab === 'access-control' && employee && (
  <EmployeeAccessControlTab
    currentManagerId={employee.reportingManagerId || null}
    currentManagerName={employee.reportingManagerName || null}
  />
)}
```

**After:**
```javascript
// ✅ Using fresh API data + auto-refresh on update
const [employeeData, setEmployeeData] = useState<any>(null)

{activeTab === 'access-control' && employee && employeeData && (
  <EmployeeAccessControlTab
    currentManagerId={employeeData.reporting_manager_id || null}
    currentManagerName={(employeeData as any).reporting_manager?.name || null}
    onRoleUpdate={(role, managerId, managerName) => {
      loadEmployeeData(employee.id)  // ✅ Refresh both tabs
      onManagerUpdate?.(employee.id, managerId, managerName)
    }}
  />
)}
```

---

## How It Works Now

### Read Flow
```
┌─────────────────────────────────────────────────────────────┐
│ GET /api/admin/employees/[id]                               │
├─────────────────────────────────────────────────────────────┤
│ 1. Query employees table with manager join                  │
│    .select(`*, reporting_manager:employees!...`)            │
│                                                              │
│ 2. Build contractInfo from employees.reporting_manager_id   │
│                                                              │
│ 3. Return both employee data and contractInfo               │
│                                                              │
│ 4. Access Control uses: employee.reporting_manager_id       │
│ 5. Contract Info uses:  contractInfo.reportingManagerId     │
│                         (same source!)                      │
└─────────────────────────────────────────────────────────────┘
```

### Write Flow
```
┌─────────────────────────────────────────────────────────────┐
│ User updates manager in either tab                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Access Control:  PATCH /api/admin/employees/[id]/access     │
│                  → UPDATE employees.reporting_manager_id    │
│                                                              │
│ Contract Info:   PATCH /api/admin/employees/[id]            │
│                  → UPDATE employees.reporting_manager_id    │
│                                                              │
│ ✅ Both write to the same column                            │
│                                                              │
│ After successful update:                                    │
│ → loadEmployeeData(employeeId) refetches API                │
│ → Both tabs re-render with fresh data                       │
│ → Values are now in sync                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Scenario 1: Update Manager in Access Control
1. Open Employee Directory (Admin Portal)
2. Click on an employee → Drawer opens
3. Go to **Access Control** tab
4. Click **Edit**
5. Change **Reporting Manager** → Save
6. ✅ **Expected**: Access Control shows new manager immediately
7. Switch to **Contract Info** tab
8. ✅ **Expected**: Contract Info shows the **same manager** (no mismatch)

### Scenario 2: Update Manager in Contract Info
1. Open Employee Directory
2. Click on an employee → Drawer opens
3. Go to **Contract Info** tab
4. Click **Edit**
5. Change **Reporting Manager** → Save
6. ✅ **Expected**: Contract Info shows new manager immediately
7. Switch to **Access Control** tab
8. ✅ **Expected**: Access Control shows the **same manager** (no mismatch)

### Scenario 3: Set Manager to Unassigned
1. Open employee drawer
2. Go to either **Access Control** or **Contract Info**
3. Edit and set manager to "No Manager" / "Unassigned" / blank
4. Save
5. ✅ **Expected**: Both tabs show "Unassigned" / "—" / "Not assigned"

### Scenario 4: Cross-Tab Consistency (No Refresh)
1. Open employee drawer → Access Control tab
2. Note current manager
3. Open **another browser tab** → same employee → Contract Info tab
4. ✅ **Expected**: Both show the same manager (no need to refresh)

### Scenario 5: New Employee (No Manager Yet)
1. Create new employee or find one with no manager assigned
2. Open drawer → Access Control tab
3. ✅ **Expected**: Shows "Not assigned" (red, if role is EMPLOYEE)
4. Switch to Contract Info tab
5. ✅ **Expected**: Shows "Unassigned"

---

## Database Schema (Reference)

```sql
-- Single source of truth
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'employee')),
  
  -- ✅ The canonical manager reference
  reporting_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- ... other fields
);

-- Secondary table (synced by backend, not used for display)
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES employees(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  -- ... contract dates, etc.
);
```

**Sync Logic:**
- When `employees.reporting_manager_id` is updated, backend ALSO updates `team_members.manager_id` for backward compatibility
- BUT UI only reads from `employees.reporting_manager_id`

---

## Rollback Instructions

If this change causes issues, revert these files:

```bash
git checkout HEAD~1 app/api/admin/employees/[id]/route.ts
git checkout HEAD~1 components/admin/employee-drawer/EmployeeDetailDrawer.tsx
```

Then restart the dev server:
```bash
npm run dev
```

---

## Acceptance Criteria ✅

- [x] Access Control and Contract Info display the same manager
- [x] Updating manager in Access Control updates Contract Info
- [x] Updating manager in Contract Info updates Access Control
- [x] "Unassigned" shows consistently in both tabs when no manager
- [x] No full page refresh required to see changes
- [x] No duplicate storage of manager data in client state
- [x] Single DB column (`employees.reporting_manager_id`) is the source of truth

---

## Related Files

- `app/api/admin/employees/[id]/route.ts` - GET & PATCH endpoints
- `app/api/admin/employees/[id]/access/route.ts` - Access Control PATCH endpoint
- `components/admin/employee-drawer/EmployeeDetailDrawer.tsx` - Drawer container
- `components/admin/employee-drawer/EmployeeAccessControlTab.tsx` - Access Control UI
- `components/admin/employee-drawer/EmployeeContractInfoTab.tsx` - Contract Info UI
- `supabase/migrations/011_add_reporting_manager_column.sql` - DB schema

---

**Fixed by:** Cursor AI Assistant  
**Date:** December 30, 2025  
**Issue:** "Reporting Manager" mismatch between Access Control and Contract Info tabs

