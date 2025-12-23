# Supabase Database Setup Instructions

## 🚀 Quick Fix (5 minutes)

Follow these steps to fix the authentication error and get your app working.

---

## Step 1: Run the SQL Script

### 1.1 Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **"New query"** button

### 1.2 Copy and Run the SQL

**Option A: Use the prepared script**
1. Open the file: `supabase/fix-employees-table.sql`
2. Copy all the contents
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

**Option B: Copy from here**

```sql
-- Fix Employees Table - Add missing status column and insert test employees

-- 1. Add status column if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- 2. Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- 3. Update existing employees to have active status
UPDATE employees 
SET status = 'active' 
WHERE status IS NULL;

-- 4. Insert test employees (safe - won't create duplicates)
INSERT INTO employees (
  name, 
  email, 
  role, 
  status,
  contract_type, 
  rate_type, 
  hourly_rate, 
  overtime_rate,
  monthly_rate,
  position, 
  department, 
  onboarding_status, 
  contract_start_date
)
VALUES
  -- Test Employee
  (
    'Test Employee',
    'employee@test.com',
    'employee',
    'active',
    'Internal Project',
    'hourly',
    50.00,
    75.00,
    NULL,
    'Software Developer',
    'Engineering',
    'completed',
    '2024-01-01'
  ),
  -- Test Manager
  (
    'Test Manager',
    'manager@test.com',
    'manager',
    'active',
    'Internal Project',
    'hourly',
    75.00,
    100.00,
    NULL,
    'Engineering Manager',
    'Engineering',
    'completed',
    '2024-01-01'
  ),
  -- Test Admin
  (
    'Test Admin',
    'admin@test.com',
    'admin',
    'active',
    'Operational',
    'fixed',
    NULL,
    NULL,
    8000.00,
    'System Administrator',
    'Operations',
    'completed',
    '2024-01-01'
  )
ON CONFLICT (email) DO NOTHING;

-- 5. Verify the inserts
SELECT 
  id,
  name,
  email,
  role,
  status,
  rate_type,
  hourly_rate,
  monthly_rate
FROM employees
WHERE email IN ('employee@test.com', 'manager@test.com', 'admin@test.com')
ORDER BY role;
```

### 1.3 Verify Results

After running, you should see output showing 3 employees:
```
id                                   | name          | email              | role     | status
-------------------------------------|---------------|--------------------|-----------|---------
<uuid>                               | Test Admin    | admin@test.com     | admin    | active
<uuid>                               | Test Employee | employee@test.com  | employee | active
<uuid>                               | Test Manager  | manager@test.com   | manager  | active
```

---

## Step 2: Test Login

### 2.1 Clear Browser Data
1. Open your browser console (F12)
2. Run:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

### 2.2 Try Logging In
1. Go to http://localhost:3000/sign-in
2. Select **"Employee"** role
3. Click **"Continue with Google"**
4. ✅ You should now successfully log in!

### 2.3 Test All Roles

Try each role to verify they work:
- ✅ **Employee** → Redirects to `/` (Employee Dashboard)
- ✅ **Manager** → Redirects to `/manager/dashboard`
- ✅ **Admin** → Redirects to `/admin/dashboard`

---

## 🎯 What This SQL Does

### 1. Adds `status` Column
```sql
ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT 'active';
```
- Adds the missing `status` column
- Sets default value to 'active'
- Adds constraint to allow only: active, inactive, suspended

### 2. Creates Index
```sql
CREATE INDEX idx_employees_status ON employees(status);
```
- Speeds up queries that filter by status
- Improves performance of the mock-login API

### 3. Updates Existing Data
```sql
UPDATE employees SET status = 'active' WHERE status IS NULL;
```
- Sets status for any existing employees
- Ensures no NULL values

### 4. Inserts Test Employees
- Creates 3 test users (Employee, Manager, Admin)
- Uses `ON CONFLICT (email) DO NOTHING` to prevent duplicates
- Safe to run multiple times

### 5. Verifies Success
- Shows you the created employees
- Confirms data was inserted correctly

---

## 🔍 Troubleshooting

### Error: "column employees.email does not exist"

**Solution:** Your employees table needs an email column. Run this first:

```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
```

### Error: "relation employees does not exist"

**Solution:** You need to run the main database migrations first:

1. Run: `npm run db:combine`
2. Open: `supabase/migrations/combined.sql`
3. Copy all contents into Supabase SQL Editor
4. Click "Run"
5. Then run the fix-employees-table.sql script

### Error: "duplicate key value violates unique constraint"

**Solution:** Test employees already exist! You can:

**Option A - Use existing employees:**
Just try logging in - it should work now.

**Option B - Delete and recreate:**
```sql
DELETE FROM employees WHERE email IN (
  'employee@test.com', 
  'manager@test.com', 
  'admin@test.com'
);
```
Then run the insert script again.

### Still Getting "PGRST116" Error?

**Check the database:**
```sql
-- See all employees
SELECT id, name, email, role, status FROM employees;

-- Check if test employees exist
SELECT * FROM employees WHERE role IN ('employee', 'manager', 'admin');
```

If no results, the inserts didn't work. Try:
1. Running the SQL script again
2. Checking your Supabase project is active
3. Verifying you have write permissions

---

## 📋 Verify Your Setup

Run this checklist query in Supabase:

```sql
-- Setup Verification Checklist
SELECT 
  'Employees table exists' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM information_schema.tables 
WHERE table_name = 'employees'

UNION ALL

SELECT 
  'Status column exists' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'status'

UNION ALL

SELECT 
  'Test employees exist' AS check_name,
  CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM employees 
WHERE email IN ('employee@test.com', 'manager@test.com', 'admin@test.com')

UNION ALL

SELECT 
  'Active employees exist' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM employees 
WHERE status = 'active';
```

**Expected Output:**
```
check_name              | status
------------------------|--------
Employees table exists  | ✅ PASS
Status column exists    | ✅ PASS
Test employees exist    | ✅ PASS
Active employees exist  | ✅ PASS
```

All should show ✅ PASS!

---

## 🎉 Success!

Once you see all test employees in the database and can log in without errors, you're done!

**Next Steps:**
1. Explore the Employee Dashboard
2. Test the new Combobox components we implemented
3. Try switching between roles
4. Test the submission and invoice features

---

## 📞 Need Help?

If you're still stuck:
1. Check the console for specific error messages
2. Verify `.env.local` has correct Supabase credentials
3. Ensure your Supabase project is active (not paused)
4. Try restarting the dev server: `npm run dev`

---

**Last Updated**: December 2024  
**Status**: ✅ Ready to Use

