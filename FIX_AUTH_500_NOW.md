# 🚨 Fix Auth 500 Error - Quick Start

## Problem
Login fails with: `AuthApiError: Database error querying schema (HTTP 500)`

## Root Cause
Circular RLS dependency on `employees` table. Supabase Auth tries to query the table during login, but RLS policies prevent it.

---

## ✅ SOLUTION (3 Steps)

### Step 1: Disable RLS (TEMPORARY - for testing)

**In Supabase SQL Editor**, run:
```
SUPABASE_ULTRA_NUCLEAR.sql
```

This will:
- ✅ Disable RLS on ALL public tables
- ✅ Break the circular dependency
- ✅ Allow login to complete successfully

**Expected Output:**
```
All tables should show: rls_enabled = false
```

---

### Step 2: Test Auth (Automated)

**In your terminal**, run:
```bash
npm run test:auth-smoke
```

**Expected Output:**
```
✅ Environment Variables
✅ Supabase Client Created
✅ Auth Service Health
✅ Sign In with Test Credentials
✅ Session Retrieved
✅ User Data Retrieved
✅ Database Connectivity

🎉 ALL SUPABASE AUTH SMOKE TESTS PASSED!
```

---

### Step 3: Test in Browser

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Try logging in**:
   - **Admin**: `admin@test.com` / `admin123456`
   - **Manager**: `manager@test.com` / `manager123456`
   - **Employee**: `employee@test.com` / `employee123456`

4. **Expected**: You should land on the employee dashboard with all data showing!

---

## 🔧 If Login Still Fails After Disabling RLS

The issue is in Supabase's backend, not your code:

1. **Check Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Click **Logs** → **Auth Logs**
   - Look for errors

2. **Check Project Status**:
   - Is the project paused? (Free tier pauses after inactivity)
   - Is the database healthy?

3. **Check Environment Variables**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   Both should be set.

4. **Restart Supabase (if local)**:
   ```bash
   supabase stop
   supabase start
   ```

---

## ⚠️ Important Notes

### About RLS Being Disabled
- ✅ **For Development/Testing**: This is fine temporarily
- ❌ **For Production**: You MUST re-enable and fix RLS properly

### Re-enabling RLS Later
When ready to implement proper RLS:
1. Use simplified policies that don't create circular dependencies
2. Don't query `employees.role` inside the `employees` RLS policy
3. Use a separate `profiles` or `user_roles` table for auth-time role checks

---

## 📊 Current System Status

| Item | Status |
|------|--------|
| Employee Data | ✅ Complete |
| Onboarding Status | ✅ COMPLETE |
| Test Users | ✅ 3 users ready |
| RLS | ⚠️ Disabled (temporary) |
| Auth System | ⏳ Ready to test |

---

## 🎯 Success Criteria

After running these steps, you should be able to:
- ✅ Sign in with any test user
- ✅ See employee dashboard
- ✅ View all employee data (name, role, status)
- ✅ Navigate between pages
- ✅ No 500 errors in console

---

## Need Help?

If you still get errors after disabling RLS:
1. Paste the **exact error message** from browser console
2. Share the **Auth Logs** from Supabase Dashboard
3. Run diagnostic: `npm run diag:auth` and share output

Good luck! 🚀

