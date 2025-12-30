# 🚀 READY TO TEST - Action Items

## ✅ What's Been Completed

### Code Changes (Already Deployed to `main`)
- ✅ Fixed redirect loop (userId vs employeeId)
- ✅ Fixed all 406/PGRST116 errors (`.single()` → `.maybeSingle()`)
- ✅ Implemented idempotent "Start Onboarding" button
- ✅ **Switched from mock auth to Supabase Auth**
- ✅ Updated sign-in to use `supabase.auth.signInWithPassword()`
- ✅ Sign-up already uses Supabase Auth (no changes needed)
- ✅ Created proper RLS policies for authenticated users

### SQL Migrations Created
- ✅ `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql` - Main schema
- ✅ `SUPABASE_CLEAN_AND_SEED.sql` - Test users & data
- ✅ `SUPABASE_RLS_AUTHENTICATED.sql` - RLS policies ⭐ **NEW**

---

## 🎯 REQUIRED: Run SQL Migrations (3 Steps)

### Step 1: Main Migration (If Not Already Run)
**File:** `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql`

**What it does:**
- Creates `onboarding_cases`, `onboarding_personal`, `onboarding_banking`, `onboarding_contract`, `onboarding_events` tables
- Adds `user_id`, `status`, `reporting_manager_id` to `employees`
- Creates helper functions and triggers

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql`
3. Paste and click "Run"

**Expected:** Success messages, no errors

---

### Step 2: Test Users & Seed Data
**File:** `SUPABASE_CLEAN_AND_SEED.sql`

**What it does:**
- Truncates all tables (clean slate)
- Creates 4 test users in `auth.users`:
  - `admin@test.com` / `admin123456` (Admin, has employee record)
  - `manager@test.com` / `manager123456` (Manager, has employee record)
  - `employee@test.com` / `employee123456` (Employee, has employee record)
  - `new@test.com` / `new123456` (New user, NO employee record - for onboarding test)
- Creates sample onboarding case for `new@test.com`
- Creates sample project and submissions

**How to run:**
1. Supabase Dashboard → SQL Editor
2. Copy entire contents of `SUPABASE_CLEAN_AND_SEED.sql`
3. Paste and click "Run"

**Expected:** Success messages, users created

**⚠️ WARNING:** This deletes ALL existing data!

---

### Step 3: RLS Policies (CRITICAL - FIXES 42501 ERROR) ⭐
**File:** `SUPABASE_RLS_AUTHENTICATED.sql`

**What it does:**
- Enables RLS on all onboarding tables
- Creates policies for authenticated users:
  - Users can INSERT/SELECT/UPDATE their own onboarding case
  - Users can manage their own personal/banking info
  - Admins can view/manage all cases
  - Timesheet submission blocked until approved
- Adds unique constraint on `onboarding_cases.user_id`

**How to run:**
1. Supabase Dashboard → SQL Editor
2. Copy entire contents of `SUPABASE_RLS_AUTHENTICATED.sql`
3. Paste and click "Run"

**Expected:** 
```
✅ RLS POLICIES CONFIGURED FOR SUPABASE AUTH
✅ Authenticated users can:
   - INSERT their own onboarding case (user_id = auth.uid())
   ...
```

---

## 🧪 Test the Fix

### Quick Test (2 Minutes)

1. **Refresh your browser:** `http://localhost:3000/sign-in`

2. **Clear browser cache** (Cmd+Shift+R / Ctrl+Shift+R)

3. **Login with:**
   - Email: `new@test.com`
   - Password: `new123456`

4. **Expected Flow:**
   - ✅ Login succeeds (no "Invalid password")
   - ✅ Redirects to `/employee/onboarding` (welcome page)
   - ✅ Click "Start Onboarding"
   - ✅ **NO `42501` error!** ⭐
   - ✅ **NO `HTTP 401` response!** ⭐
   - ✅ Navigates to personal info form
   - ✅ Console shows: `[DAL] New onboarding case created: <uuid>`

5. **Refresh page:** Should stay on onboarding, no redirect loop

---

### Full E2E Test (15 Minutes)

Follow: **`E2E_TEST_GUIDE.md`**

Tests all 6 scenarios:
1. Existing employee login
2. New user onboarding (full flow)
3. Admin approval
4. Post-approval timesheet submission
5. Concurrent onboarding (idempotency)
6. RLS policy enforcement

---

## 📋 Verification Checklist

Before running tests, verify migrations succeeded:

```sql
-- 1. Check onboarding tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'onboarding%';
-- Expected: onboarding_cases, onboarding_personal, onboarding_banking, 
--           onboarding_contract, onboarding_events

-- 2. Check test users exist
SELECT email, email_confirmed_at 
FROM auth.users 
ORDER BY email;
-- Expected: admin@test.com, employee@test.com, manager@test.com, new@test.com

-- 3. Check RLS policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'onboarding_cases';
-- Expected: onboarding_cases_select_own, onboarding_cases_insert_own, etc.

-- 4. Check new user has no employee record (for testing)
SELECT e.* 
FROM employees e 
JOIN auth.users u ON u.id = e.user_id 
WHERE u.email = 'new@test.com';
-- Expected: 0 rows (this user will go through onboarding)
```

---

## 🎯 Expected Results

| Action | Before (Mock Auth) | After (Supabase Auth) |
|--------|-------------------|----------------------|
| Click "Start Onboarding" | ✅ Creates case | ✅ Creates case |
| POST /onboarding_cases | ❌ HTTP 401 | ✅ HTTP 201 |
| Error 42501 | ❌ YES | ✅ NO |
| `auth.uid()` | ❌ NULL | ✅ Actual user ID |
| RLS policies | ❌ All blocked | ✅ Work correctly |
| Session management | ❌ localStorage only | ✅ Supabase tokens |

---

## 🐛 If Tests Fail

### Error: "Invalid email or password"
**Fix:** Run `SUPABASE_CLEAN_AND_SEED.sql` to create test users

### Error: `42501` still appears
**Fix:** Run `SUPABASE_RLS_AUTHENTICATED.sql` (Step 3)

### Error: `relation "onboarding_cases" does not exist`
**Fix:** Run `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql` (Step 1)

### Error: Redirect loop between `/employee` and `/employee/onboarding`
**Fix:** Clear localStorage in browser DevTools → Application → LocalStorage

---

## 📞 What to Report Back

After running the tests, tell me:

1. ✅ or ❌ for each SQL migration
2. Console output when clicking "Start Onboarding"
3. Any errors (include error code and message)
4. Screenshots (optional but helpful)

---

## 🎉 Success Looks Like

**Console Output:**
```
[Sign-In] ✅ Supabase Auth successful, user ID: 0ce805a4-4ba3-4978-8ada-7407a3315f70
[Sign-In] No employee record, redirecting to onboarding
[Onboarding Welcome] Checking onboarding status for userId: 0ce805a4...
[DAL] Fetching onboarding status for user_id: 0ce805a4...
[DAL] No onboarding case found for user - needs to start onboarding
[Onboarding Welcome] Creating onboarding case for userId: 0ce805a4...
[DAL] createOnboardingCase - checking for existing case
[DAL] Creating new onboarding case for userId: 0ce805a4...
[DAL] New onboarding case created: a1b2c3d4-...
```

**Network Tab:**
```
POST https://...supabase.co/rest/v1/onboarding_cases?select=id
Status: 201 Created  ✅ (NOT 401!)
```

**No Errors:** Zero `42501`, zero `HTTP 401`, zero redirect loops!

---

## 🚀 Ready to Rock!

1. Run the 3 SQL migrations
2. Test with `new@test.com`
3. Report back results

Let's crush this! 💪

