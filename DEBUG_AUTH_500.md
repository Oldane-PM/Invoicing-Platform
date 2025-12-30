# 🔍 Debug Auth 500 Error - Step by Step

## Current Status

You're still getting:
```
Server Error (500): Database error querying schema
```

Even after running the RLS fix. This means we need to go deeper.

---

## 🎯 Option 1: Check Supabase Logs (DO THIS FIRST!)

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Logs** (left sidebar)

### Step 2: Check Auth Logs

**Click: Auth Logs**

Look for recent errors containing:
- `"Database error querying schema"`
- `"permission denied"`
- `"relation does not exist"`

**Take a screenshot or copy the exact error message!**

### Step 3: Check Postgres Logs

**Click: Postgres Logs**

Look for:
- RLS policy errors
- Permission errors on tables
- Schema errors

**Example of what to look for:**
```
error: permission denied for schema auth
detail: User does not have USAGE on schema auth
```

---

## 🎯 Option 2: Nuclear Fix (Disable RLS Temporarily)

If logs don't help, we can temporarily disable RLS to unblock you:

### Run This SQL in Supabase:

```sql
-- File: SUPABASE_NUCLEAR_FIX.sql
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** This disables security on employees table!
- Only for development/testing
- DO NOT use in production
- We'll re-enable it properly once auth works

### After Running:

```bash
npm run test:auth-smoke
```

**Expected:** Should pass now!

---

## 🎯 Option 3: Check Project Health

### Supabase Dashboard → Settings → General

Check:
- [ ] **Project Status:** Active (not paused)
- [ ] **Database Status:** Healthy
- [ ] **Connection String:** Accessible

### If Project is Paused:

1. Click "Restore Project"
2. Wait 2-3 minutes
3. Run smoke test again

---

## 🎯 Option 4: Check Auth Schema Health

### Run This in Supabase SQL Editor:

```sql
-- Check if auth schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';
-- Should return: auth

-- Check if auth.users table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth' AND table_name = 'users';
-- Should return: users

-- Check if test user exists
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@test.com';
-- Should return the user

-- Check permissions on auth schema
SELECT 
  grantee,
  privilege_type
FROM information_schema.schema_privileges
WHERE schema_name = 'auth';
```

**If any of these fail:** Your auth schema is corrupted. Contact Supabase support.

---

## 🎯 Option 5: Check All RLS Policies

### Run This to See ALL Policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Look for:**
- Any policies that query `employees` within an `employees` policy
- Any policies that query `onboarding_cases` within RLS for auth
- Recursive policies (policies that check themselves)

---

## 🎯 Decision Tree

```
Is project paused?
├─ YES → Restore project → Test again
└─ NO  → Continue

Can you see auth logs with specific error?
├─ YES → Share the error → We'll fix specifically
└─ NO  → Continue

Does SUPABASE_NUCLEAR_FIX.sql work?
├─ YES → Auth issue is RLS-related → We'll rebuild RLS properly
└─ NO  → Continue

Does auth schema exist and have users?
├─ YES → Supabase backend issue → Contact support
└─ NO  → Auth schema corrupted → Contact support
```

---

## 🚀 Recommended Action Plan

### Fastest Path (5 Minutes):

1. **Run Nuclear Fix:**
   ```bash
   # In Supabase SQL Editor:
   # Copy and run SUPABASE_NUCLEAR_FIX.sql
   ```

2. **Test:**
   ```bash
   npm run test:auth-smoke
   ```

3. **If it works:**
   - ✅ Problem was RLS
   - We'll rebuild RLS properly after you're unblocked
   - You can test the full app now

4. **If it still fails:**
   - Check Supabase logs (Step 1 above)
   - Share the exact error message
   - Might be Supabase backend issue

---

## 📞 What to Share If Still Broken

If you're still stuck after trying everything:

1. **Supabase Project Ref:**
   - Dashboard → Settings → General → Reference ID

2. **Auth Logs:**
   - Screenshot or copy of the error

3. **Postgres Logs:**
   - Screenshot or copy of any RLS/permission errors

4. **Test Results:**
   - Output of `npm run test:auth-smoke`

5. **Schema Health Check:**
   - Results of the auth schema SQL queries above

---

## 🎯 TL;DR - Do This Now:

```bash
# 1. Run in Supabase SQL Editor:
# SUPABASE_NUCLEAR_FIX.sql

# 2. Test:
npm run test:auth-smoke

# 3. If it works, you're unblocked!
# 4. If not, check Supabase logs and share the error
```

---

**Let's get you unblocked! Try the nuclear fix and tell me what happens.** 🚀

