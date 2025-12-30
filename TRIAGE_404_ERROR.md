# 🔍 Triage Guide: 404 Employee Not Found

## ✅ Improvements Made

### 1. Detailed Error Logging ✅
**Files Changed:**
- `components/admin/employee-drawer/EmployeeDetailDrawer.tsx`
- `app/api/admin/employees/[id]/route.ts`

**What's Now Logged:**
```javascript
// Client-side (Browser Console)
❌ [Drawer] Failed to load employee data: {
  status: 404,
  statusText: "Not Found",
  employeeId: "23bcf755-...",
  error: "Employee not found",
  details: "...",
  hint: "...",
  code: "...",
  url: "/api/admin/employees/..."
}

// Server-side (Terminal/Logs)
❌ [API] Supabase error fetching employee: {
  employeeId: "23bcf755-...",
  code: "PGRST116" | "42501" | etc.,
  message: "...",
  details: "...",
  hint: "..."
}
```

### 2. Hardened DAL with `.maybeSingle()` ✅
**Before:**
```javascript
.single()  // ❌ Throws if 0 or 2+ rows
```

**After:**
```javascript
.maybeSingle()  // ✅ Returns null if 0 rows, no throw
if (!employee) {
  return 404 with clear message
}
```

### 3. employeeId Validation ✅
**Added Guards:**
```javascript
// API route now checks:
if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
  return 400 Bad Request
}
```

### 4. Simplified Reporting Manager Join ✅
**Changed from:**
```javascript
employees!employees_reporting_manager_id_fkey (...)  // ❌ Verbose, error-prone
```

**To:**
```javascript
employees!reporting_manager_id (...)  // ✅ Simpler, let Supabase infer FK
```

---

## 🧪 Testing the Improvements

### Step 1: Restart Dev Server
```bash
# Kill existing dev server
pkill -f "next dev"

# Clear cache
rm -rf .next

# Start fresh
npm run dev
```

### Step 2: Open Browser Console
1. Go to http://localhost:3000/admin/employees
2. Open DevTools (F12)
3. Go to **Console** tab
4. Click on any employee in the directory

### Step 3: Check the Logs

**If employee exists:**
```
[Drawer] Loading employee data for: abc123...
[API] GET /api/admin/employees/:id { employeeId: 'abc123...' }
[API] Employee found: { id: 'abc123...', name: 'John Doe' }
[Drawer] Successfully loaded employee data
```

**If employee doesn't exist:**
```
[Drawer] Loading employee data for: 23bcf755...
[API] GET /api/admin/employees/:id { employeeId: '23bcf755...' }
⚠️ [API] Employee not found: { employeeId: '23bcf755...' }
❌ [Drawer] Failed to load employee data: {
  status: 404,
  error: 'Employee not found',
  employeeId: '23bcf755...',
  hint: 'The employee ID does not exist in the database'
}
```

**If RLS blocks the read (42501):**
```
❌ [API] Supabase error fetching employee: {
  code: '42501',
  message: 'new row violates row-level security policy',
  details: '...',
  hint: 'Check RLS policies on employees table'
}
```

**If FK constraint name is wrong:**
```
❌ [API] Supabase error fetching employee: {
  code: '42703',
  message: 'column does not exist',
  details: 'constraint "employees_reporting_manager_id_fkey" not found'
}
```

---

## 🛠️ Fixes Based on Error Code

### Error: `404` - Employee not found
**Cause:** Employee ID doesn't exist in database

**Fix:**
1. Run `CHECK_EMPLOYEES.sql` in Supabase
2. Find valid employee IDs
3. Use one of those IDs (or seed test data)

**Seed test data:**
```bash
# Run in Supabase SQL Editor
SUPABASE_CLEAN_AND_SEED.sql
```

---

### Error: `42501` - Permission denied (RLS)
**Cause:** Row-Level Security policy blocking admin read

**Fix:**
1. Check if you're authenticated as admin
2. Verify RLS policies on `employees` table:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- Ensure admin can read all employees
CREATE POLICY IF NOT EXISTS "Admins can view all employees"
ON employees FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
  OR
  EXISTS (
    SELECT 1 FROM employees 
    WHERE id = auth.uid()::uuid 
    AND role = 'admin'
  )
);
```

---

### Error: `42703` - Column/constraint doesn't exist
**Cause:** FK constraint name mismatch or column doesn't exist

**Fix Option 1:** Verify FK constraint name
```bash
# Run VERIFY_FK_CONSTRAINT.sql in Supabase
# Copy the actual constraint name and update code
```

**Fix Option 2:** Remove the join temporarily
```javascript
// Test without the join first
const { data: employee } = await supabase
  .from('employees')
  .select('*')  // ✅ No join, just base employee
  .eq('id', employeeId)
  .maybeSingle()

// If this works, the join is the problem
// If this fails, the employee doesn't exist
```

**Fix Option 3:** Use alternative join syntax
```javascript
// Try explicit FK name from migration
employees!employees_reporting_manager_id_fkey (...)

// Or let PostgREST infer it
employees!reporting_manager_id (...)

// Or use a manual left join
```

---

### Error: `PGRST116` - Cannot coerce to single object
**Cause:** Using `.single()` when 0 rows returned

**Fix:** ✅ Already fixed! We now use `.maybeSingle()`

---

## 📊 Quick Diagnostic Checklist

Run through this in order:

1. **Is employeeId valid?**
   - [ ] Check browser console: `employeeId` is a UUID
   - [ ] Not `undefined`, `null`, or empty string

2. **Does employee exist in DB?**
   - [ ] Run: `SELECT * FROM employees WHERE id = '<employeeId>'`
   - [ ] Should return 1 row

3. **Are you authenticated?**
   - [ ] Check: `SELECT auth.uid()` returns your user ID
   - [ ] Check: localStorage has `userId` or session exists

4. **Is RLS blocking?**
   - [ ] Run query with admin service role (bypasses RLS)
   - [ ] If works with service role → RLS problem
   - [ ] If fails with service role → record doesn't exist

5. **Is the FK constraint correct?**
   - [ ] Run `VERIFY_FK_CONSTRAINT.sql`
   - [ ] Match constraint name in code

---

## 🎯 Expected Behavior After Fix

### Scenario 1: Valid Employee
1. Click employee in directory
2. Drawer opens immediately
3. Data loads within 1 second
4. Both tabs show correct manager

### Scenario 2: Invalid Employee ID
1. Direct URL: `/admin/employees?drawer=invalid-id`
2. Drawer shows error state: "Employee not found"
3. Console shows clear 404 with employee ID
4. User can close drawer and select different employee

### Scenario 3: Network Error
1. Supabase down or network failure
2. Drawer shows: "Unable to load data"
3. Console shows network error details
4. Retry button available

---

## 📝 Files Changed Summary

| File | Changes | Purpose |
|------|---------|---------|
| `components/admin/employee-drawer/EmployeeDetailDrawer.tsx` | Added detailed error logging | See actual error in browser |
| `app/api/admin/employees/[id]/route.ts` | `.single()` → `.maybeSingle()` | Handle 0 rows gracefully |
| `app/api/admin/employees/[id]/route.ts` | Added employeeId validation | Catch bad params early |
| `app/api/admin/employees/[id]/route.ts` | Improved error responses | Return code/details to client |
| `app/api/admin/employees/[id]/route.ts` | Simplified FK join syntax | Reduce FK name mismatch issues |

---

## 🚀 Next Actions

1. **Commit these changes:**
```bash
git add -A
git commit -m "fix: add comprehensive error logging and harden employee API

- Add detailed error logging (client + server)
- Replace .single() with .maybeSingle()
- Add employeeId validation guard
- Simplify reporting manager FK join
- Improve error responses with codes/hints"
```

2. **Push to feature branch:**
```bash
git push origin fix/reporting-manager-sync
```

3. **Test in browser:**
   - Open console
   - Click employee
   - Check logs
   - Verify you see detailed error info

4. **If FK constraint error:**
   - Run `VERIFY_FK_CONSTRAINT.sql`
   - Update join syntax with actual constraint name

5. **If employee not found:**
   - Run `CHECK_EMPLOYEES.sql`
   - Use valid employee ID
   - Or seed test data

---

**Created:** December 30, 2025  
**Purpose:** Diagnose and fix 404 employee API errors with comprehensive logging

