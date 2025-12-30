# 🔥 Fix Supabase Auth 500 – "Database error querying schema"

## 🎯 Problem

Login attempts using Supabase Auth fail with a 500 error:

```
AuthApiError: Database error querying schema
```

**Root Cause:** Test users were manually inserted into `auth.users` with NULL values in columns that Supabase Auth expects to be empty strings (not NULL).

---

## ✅ SOLUTION (5 Steps)

### **Step 1: Inspect Supabase Auth Logs** (Source of Truth)

1. Open **Supabase Dashboard**
2. Navigate to **Logs** → **Log Explorer**
3. Filter by **Auth**
4. Trigger a login attempt: `employee@test.com` / `employee123456`
5. Locate the `/auth/v1/token` request with **status 500**
6. Capture the exact Postgres error message

⚠️ **Do not proceed without confirming the Auth log message.**

---

### **Step 2: Diagnose NULL-sensitive columns**

**In Supabase SQL Editor**, run:

```sql
-- File: SUPABASE_DIAGNOSE_AUTH_USERS.sql
```

This checks if test users have NULL values in these critical columns:
- `confirmation_token`
- `email_change`
- `email_change_token_new`
- `recovery_token`
- `encrypted_password`
- `email_confirmed_at`

**Expected Issues:**
```
confirmation_token     = NULL  ❌ (should be '')
email_change           = NULL  ❌ (should be '')
email_change_token_new = NULL  ❌ (should be '')
recovery_token         = NULL  ❌ (should be '')
```

---

### **Step 3: Choose Your Fix**

#### **Option A: Quick Patch (Recommended for Testing)**

If Step 2 confirms NULL values, run:

```sql
-- File: SUPABASE_FIX_AUTH_NULLS.sql
```

This patches NULL → empty strings for all 3 test users.

**Expected Output:**
```
✅ confirmation_token = ''
✅ email_change = ''
✅ email_change_token_new = ''
✅ recovery_token = ''
✅ email_confirmed_at = NOW()
✅ confirmed_at = NOW()
```

---

#### **Option B: Nuclear Fix (If Option A Fails)**

Completely recreate users with ALL required columns:

```sql
-- File: SUPABASE_RECREATE_USERS_PROPERLY.sql
```

⚠️ **WARNING:** This deletes and recreates all 3 test users.

**Expected Output:**
```
✅ Created admin user
✅ Created manager user
✅ Created employee user
✅ Updated employees table with new user_ids
```

---

### **Step 4: Retest Authentication**

#### **A) Automated Smoke Test**

In your terminal:
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

#### **B) Manual Browser Test**

1. Start dev server: `npm run dev`
2. Open: http://localhost:3000
3. Try logging in:
   - 👤 **Admin**: `admin@test.com` / `admin123456`
   - 👤 **Manager**: `manager@test.com` / `manager123456`
   - 👤 **Employee**: `employee@test.com` / `employee123456`

**Expected:** Dashboard loads with employee data! 🎉

---

### **Step 5: Prevent Recurrence**

🚫 **NEVER manually insert into `auth.users`**

Replace `SUPABASE_CLEAN_AND_SEED.sql` with one of the following patterns:

#### **Option A: Client Sign-up** (Frontend)
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'employee@test.com',
  password: 'employee123456'
})
```

#### **Option B: Admin Creation** (Backend - **Recommended**)
```typescript
// Server-side only (requires service role key)
const { data, error } = await supabase.auth.admin.createUser({
  email: 'employee@test.com',
  password: 'employee123456',
  email_confirm: true
})
```

This ensures all Auth columns are properly initialized.

---

## 🔍 If Error Persists After Fixes

### Check Supabase Auth Logs for:

**1. Permission denied errors:**
```sql
-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
```

**2. Custom triggers blocking Auth:**
```sql
-- Check for triggers on auth.users
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;
```

**3. RLS interference:**
```sql
-- Check if RLS is enabled on auth.users (should be OFF)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'auth' AND tablename = 'users';
```

If `rowsecurity = true`:
```sql
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
```

---

## 📊 Diagnostic File Summary

| File | Purpose |
|------|---------|
| `SUPABASE_DIAGNOSE_AUTH_USERS.sql` | Check for NULL issues |
| `SUPABASE_FIX_AUTH_NULLS.sql` | Quick patch NULL → '' |
| `SUPABASE_RECREATE_USERS_PROPERLY.sql` | Nuclear: recreate users |
| `npm run test:auth-smoke` | Automated Auth test |

---

## ⚠️ Important Notes

### Ignore These Browser Warnings:
- ✅ `InstallTrigger is deprecated` (Firefox warning)
- ✅ `Download React DevTools` (React message)
- ✅ CORS warnings (if present)

### Browser Console ≠ Root Cause
Always check **Supabase Auth Logs** for the real error.

---

## ✅ Expected Outcome

After completing these steps:

- ✅ Login succeeds with all 3 test users
- ✅ No 500 errors from `/auth/v1/token`
- ✅ Dashboard loads with employee data
- ✅ Stable Auth flow going forward
- ✅ No more "Database error querying schema"

---

## 🚀 Quick Start

1. **Run**: `SUPABASE_DIAGNOSE_AUTH_USERS.sql` in Supabase SQL Editor
2. **If NULLs found**: Run `SUPABASE_FIX_AUTH_NULLS.sql`
3. **Test**: `npm run test:auth-smoke`
4. **Login**: Try in browser

**If still failing**: Run `SUPABASE_RECREATE_USERS_PROPERLY.sql` and retest.

---

## Need Help?

Paste the following:
1. **Exact error** from Supabase Auth Logs
2. **Results** from `SUPABASE_DIAGNOSE_AUTH_USERS.sql`
3. **Output** from `npm run test:auth-smoke`

Good luck! 🎯

