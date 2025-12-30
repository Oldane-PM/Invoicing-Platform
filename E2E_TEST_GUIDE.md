# 🧪 End-to-End Onboarding Test Guide

## Prerequisites

### 1. Run Database Migrations (In Order)

Go to **Supabase Dashboard → SQL Editor**:

```sql
-- Step 1: Run main migration (if not already done)
-- File: SUPABASE_ONBOARDING_MIGRATION_FIXED.sql

-- Step 2: Create test users and seed data
-- File: SUPABASE_CLEAN_AND_SEED.sql

-- Step 3: Apply proper RLS policies for Supabase Auth
-- File: SUPABASE_RLS_AUTHENTICATED.sql
```

### 2. Verify Test Users Exist

Run this in Supabase SQL Editor:

```sql
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  e.name,
  e.role
FROM auth.users u
LEFT JOIN employees e ON e.user_id = u.id
ORDER BY e.role DESC NULLS LAST;
```

**Expected Output:**
| email | name | role |
|-------|------|------|
| admin@test.com | Admin User | ADMIN |
| manager@test.com | Manager User | MANAGER |
| employee@test.com | Employee User | EMPLOYEE |
| new@test.com | NULL | NULL |

---

## 🎯 Test Case 1: Existing Employee Login

### User Story
As an existing employee with an approved onboarding case, I should be redirected directly to my dashboard.

### Steps

1. **Navigate to:** `http://localhost:3000/sign-in`

2. **Login with:**
   - Email: `employee@test.com`
   - Password: `employee123456`

3. **Click:** "Sign In"

### ✅ Expected Results

- ✅ Console shows: `[Sign-In] ✅ Supabase Auth successful, user ID: <uuid>`
- ✅ Console shows: `[Sign-In] Employee record found, role: EMPLOYEE`
- ✅ Redirects to: `/employee` (Employee Dashboard)
- ✅ No console errors
- ✅ Can see timesheet submission form (not locked)

### ❌ If It Fails

**Symptom:** "Invalid email or password"
- **Fix:** Run `SUPABASE_CLEAN_AND_SEED.sql` again
- **Verify:** Check `auth.users` table has the user

**Symptom:** HTTP 401 or 406 errors
- **Fix:** Run `SUPABASE_RLS_AUTHENTICATED.sql`
- **Verify:** Check RLS policies exist:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'employees';
  ```

---

## 🎯 Test Case 2: New User Onboarding (Full Flow)

### User Story
As a new user without an employee record, I should be guided through the complete onboarding process.

### Steps

1. **Navigate to:** `http://localhost:3000/sign-in`

2. **Login with:**
   - Email: `new@test.com`
   - Password: `new123456`

3. **Click:** "Sign In"

4. **Expected:** Redirected to `/employee/onboarding` (Welcome Page)

5. **Verify Welcome Page:**
   - ✅ Shows: "Welcome, new!" (or email prefix)
   - ✅ Shows: 4-step onboarding checklist
   - ✅ Button: "Start Onboarding"

6. **Click:** "Start Onboarding"

7. **Expected:** Button shows spinner, then navigates to `/employee/onboarding/personal`

8. **Verify Console:**
   - ✅ `[Onboarding Welcome] Creating onboarding case for userId: <uuid>`
   - ✅ `[DAL] createOnboardingCase - checking for existing case`
   - ✅ `[DAL] Creating new onboarding case for userId: <uuid>`
   - ✅ `[DAL] New onboarding case created: <case-id>`
   - ✅ NO `42501` errors
   - ✅ NO `HTTP 401` responses

9. **Fill Personal Info Form:**
   - Full Name: Test Employee
   - Date of Birth: 01/15/1990
   - Address: 123 Test St
   - City: Kingston
   - State: St. Andrew
   - Country: Jamaica
   - Zip: 12345
   - Email: new@test.com
   - Phone: (876) 555-1234

10. **Click:** "Save and Continue"

11. **Expected:** Navigates to `/employee/onboarding/banking`

12. **Fill Banking Form:**
    - Bank Name: Test Bank
    - Bank Address: 456 Bank St
    - SWIFT Code: TESTJM22
    - ABA/Wire Routing: 123456789
    - Account Type: Checking
    - Currency: USD
    - Account Number: 9876543210

13. **Click:** "Save and Continue"

14. **Expected:** Navigates to `/employee/onboarding/status`

15. **Verify Status Page:**
    - ✅ Progress shows: Personal Info ✅, Banking ✅
    - ✅ Shows: "Pending Admin Review" status
    - ✅ No "Rejection Reason" displayed

16. **Refresh Page:** Should stay on status page (no redirect loop)

---

## 🎯 Test Case 3: Admin Approval

### User Story
As an admin, I should be able to review and approve pending onboarding cases.

### Steps

1. **Logout** (if still logged in as `new@test.com`)

2. **Login as Admin:**
   - Email: `admin@test.com`
   - Password: `admin123456`

3. **Expected:** Redirects to `/admin/dashboard`

4. **Navigate to:** `/admin/onboarding` (or click "Onboarding Queue" link)

5. **Verify Queue:**
   - ✅ Shows at least 1 pending case (the `new@test.com` user)
   - ✅ Shows employee name, email, submission date
   - ✅ Button: "Review"

6. **Click:** "Review" for the new employee

7. **Expected:** Navigates to `/admin/onboarding/[id]`

8. **Verify Review Page:**
   - ✅ Shows personal info (name, DOB, address, etc.)
   - ✅ Shows banking info (bank name, account type, currency - account number should be masked/encrypted)
   - ✅ Shows approval actions

9. **Fill Contract Details:**
   - Employment Type: Full-Time
   - Hourly Rate: $25.00
   - Start Date: Today's date
   - Assign Manager: (Select a manager if available)

10. **Click:** "Approve Onboarding"

11. **Expected:**
    - ✅ Success toast/message
    - ✅ Case status updates to "Approved"
    - ✅ Employee record created in `employees` table

12. **Verify Database:**
    ```sql
    SELECT 
      e.name,
      e.role,
      e.status,
      e.hourly_rate,
      oc.current_state,
      oc.approved_at
    FROM employees e
    JOIN onboarding_cases oc ON oc.user_id = e.user_id
    WHERE e.user_id = (SELECT id FROM auth.users WHERE email = 'new@test.com');
    ```
    
    **Expected:**
    - `e.status = 'active'`
    - `oc.current_state = 'approved'`
    - `oc.approved_at IS NOT NULL`

---

## 🎯 Test Case 4: Post-Approval Employee Access

### User Story
After approval, the employee should have full access to submit timesheets.

### Steps

1. **Logout** (if logged in as admin)

2. **Login as the newly approved employee:**
   - Email: `new@test.com`
   - Password: `new123456`

3. **Expected:** Redirects to `/employee` (NOT `/employee/onboarding`)

4. **Verify Employee Dashboard:**
   - ✅ No "Timesheet Submissions Locked" banner
   - ✅ Can see "Submit Hours" form
   - ✅ Employee name displayed correctly
   - ✅ Last login timestamp shown

5. **Test Timesheet Submission:**
   - Select a project
   - Enter hours (e.g., 8)
   - Add description
   - Click "Submit"

6. **Expected:**
   - ✅ Submission succeeds (no RLS error)
   - ✅ Shows in "Recent Submissions" list
   - ✅ Total hours updated

---

## 🎯 Test Case 5: Concurrent Onboarding (Idempotency)

### User Story
If a user double-clicks "Start Onboarding" or React Strict Mode causes double-renders, the system should handle it gracefully.

### Steps

1. **Create another new user** (or use existing if you have one)

2. **Login and navigate to onboarding welcome page**

3. **Click "Start Onboarding" twice rapidly**

4. **Expected:**
   - ✅ First click creates case
   - ✅ Second click detects existing case (no error)
   - ✅ Navigates to personal info form
   - ✅ No duplicate cases in database
   - ✅ No `23505` unique constraint violations in console

5. **Verify in Console:**
   - `[DAL] Onboarding case already exists: <case-id>` (on second call)

6. **Verify Database:**
   ```sql
   SELECT COUNT(*) FROM onboarding_cases WHERE user_id = '<your-test-user-id>';
   ```
   **Expected:** `COUNT = 1`

---

## 🎯 Test Case 6: RLS Policy Enforcement

### User Story
Users should only be able to access their own onboarding data, not others'.

### Steps

1. **Login as `new@test.com`**

2. **Open Browser DevTools → Console**

3. **Try to fetch another user's onboarding case:**
   ```javascript
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient('<your-supabase-url>', '<your-anon-key>');
   
   // Get another user's ID (e.g., admin's)
   const { data, error } = await supabase
     .from('onboarding_cases')
     .select('*')
     .eq('user_id', '<admin-user-id>') // Different user
     .maybeSingle();
   
   console.log('Result:', data, error);
   ```

4. **Expected:**
   - ✅ `data = null` (RLS blocks access)
   - ✅ No error (just empty result)

5. **Try to fetch your own case:**
   ```javascript
   const { data, error } = await supabase
     .from('onboarding_cases')
     .select('*')
     .eq('user_id', '<your-user-id>')
     .maybeSingle();
   
   console.log('Result:', data, error);
   ```

6. **Expected:**
   - ✅ `data = { id: '...', user_id: '...', current_state: '...' }`
   - ✅ Your own case is returned

---

## 📊 Acceptance Criteria Checklist

- [ ] ✅ No `42501` RLS errors on `onboarding_cases` INSERT
- [ ] ✅ No `HTTP 401` responses on POST `/rest/v1/onboarding_cases`
- [ ] ✅ Clicking "Start Onboarding" creates case and proceeds to personal form
- [ ] ✅ Refresh maintains onboarding progress (case is readable)
- [ ] ✅ Users cannot access other users' onboarding data
- [ ] ✅ Admins can view all onboarding cases
- [ ] ✅ Approved employees can submit timesheets
- [ ] ✅ Unapproved employees cannot submit timesheets
- [ ] ✅ Idempotent case creation (no duplicates on double-click)
- [ ] ✅ Complete onboarding flow from sign-up to approval works end-to-end

---

## 🐛 Troubleshooting

### Issue: `42501: new row violates row-level security policy`

**Cause:** RLS policies not applied or `auth.uid()` is NULL

**Fix:**
1. Verify you ran `SUPABASE_RLS_AUTHENTICATED.sql`
2. Check you're using Supabase Auth (not mock login)
3. Verify session exists:
   ```javascript
   const { data: session } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

### Issue: `PGRST116: Cannot coerce result to single JSON object`

**Cause:** Query using `.single()` but 0 rows returned

**Fix:**
1. Check user has an onboarding case
2. Verify query uses `.maybeSingle()` instead of `.single()`
3. Check RLS policies allow SELECT

### Issue: Redirect loop between `/employee` and `/employee/onboarding`

**Cause:** Auth detection logic mismatch

**Fix:**
1. Check localStorage has `userId` set
2. Verify employee record exists in database
3. Check `getEmployeeByUserId()` is being used

---

## 🎉 Success Indicators

If all tests pass, you should see:

- ✅ Clean console (no errors)
- ✅ Smooth navigation (no redirect loops)
- ✅ Data persists across page refreshes
- ✅ RLS properly enforces access control
- ✅ Admin can approve cases
- ✅ Employees can submit timesheets post-approval

**Congratulations! Your onboarding system is production-ready!** 🚀

