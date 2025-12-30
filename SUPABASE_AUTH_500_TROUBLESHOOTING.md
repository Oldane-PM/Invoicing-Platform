# 🔥 Supabase Auth 500 Error Troubleshooting Guide

## Error

```
AuthApiError: Database error querying schema
POST /auth/v1/token?grant_type=password -> HTTP 500
```

This is a **Supabase backend issue**, not a credentials problem!

---

## 🚀 Quick Diagnostics (Start Here)

### Step 1: Run Smoke Test

```bash
npm run test:auth-smoke
```

This will test:
- ✅ Environment variables
- ✅ Supabase client creation
- ✅ Auth service health
- ✅ Sign-in with test credentials
- ✅ Session retrieval
- ✅ Database connectivity

**If the smoke test passes**, your issue is app-specific (check RLS policies).  
**If the smoke test fails with 500**, your Supabase project has a backend issue.

---

### Step 2: Check Diagnostic Endpoints

Start your dev server:
```bash
npm run dev
```

Then check:

**Auth Health:**
```bash
npm run diag:auth
# Or: curl http://localhost:3000/api/diag/supabase-auth
```

**Database Health:**
```bash
npm run diag:db
# Or: curl http://localhost:3000/api/diag/supabase-db
```

Look for `"healthy": true` in the response.

---

## 🔍 Root Cause Analysis

### Common Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Database error querying schema" | Auth schema corrupted or RLS blocking auth service | See [Fix Auth Schema](#fix-auth-schema) |
| "Invalid API key" | Wrong anon key or project paused | Check dashboard |
| "Connection refused" | Project paused or down | Unpause project |
| All queries fail | RLS policies too restrictive | See [Fix RLS](#fix-rls-policies) |

---

## 🛠️ Supabase Dashboard Checklist

### 1. Check Project Status

**Supabase Dashboard → Project → Settings → General**

- [ ] Project Status: **Active** (not paused)
- [ ] Database Status: **Healthy** (green)
- [ ] Billing: No issues

**If paused:**
1. Click "Restore Project"
2. Wait 2-3 minutes
3. Retry login

---

### 2. Check Auth Configuration

**Dashboard → Authentication → Providers**

- [ ] **Email** provider is **Enabled**
- [ ] Confirm Email: **Disabled** (for testing) or **Enabled** (for production)
- [ ] Site URL matches your app (http://localhost:3000 for dev)

---

### 3. Check Auth Logs

**Dashboard → Logs → Auth Logs**

Look for:
- `"Database error querying schema"` - Auth can't access database
- `"permission denied for schema auth"` - Permission issue
- `"relation does not exist"` - Missing table in auth schema

**Example error:**
```
error: permission denied for schema auth
detail: User does not have permission to access schema auth
```

**Fix:** This means RLS policies are blocking Supabase's internal auth service. See [Fix RLS](#fix-rls-policies).

---

### 4. Check Postgres Logs

**Dashboard → Logs → Postgres Logs**

Look for:
- Schema errors
- Permission errors on `auth.*` tables
- RLS policy errors during login

---

### 5. Check Database Health

**Dashboard → Database → Health**

- [ ] CPU < 80%
- [ ] Memory < 90%
- [ ] Disk space available
- [ ] No active incidents

---

## 🔧 Fix Auth Schema

### Problem: Auth Schema Corruption

The `auth` schema contains tables that GoTrue (Supabase Auth) needs. If these are corrupted or have wrong permissions, auth fails.

### Solution: Reset Auth Schema (NUCLEAR OPTION)

⚠️ **WARNING**: This deletes all users!

```sql
-- In Supabase SQL Editor:

-- 1. Drop and recreate auth schema
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth;

-- 2. Re-run Supabase migrations
-- Dashboard → Database → Migrations → "Run all migrations"
```

**Better approach:** Contact Supabase support if auth schema is corrupted.

---

## 🔐 Fix RLS Policies

### Problem: RLS Blocking Auth Service

If `employees` table has RLS policies that query itself recursively, auth service gets blocked:

```sql
-- ❌ BAD (causes circular dependency):
CREATE POLICY "Admins only"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees  -- ❌ Querying same table!
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
```

When Supabase Auth tries to log you in, it needs to query `employees`, but the policy checks `employees` again → deadlock!

### Solution: Run the Fix

```bash
# In Supabase SQL Editor, run:
SUPABASE_FIX_AUTH_SCHEMA_ERROR.sql
```

This simplifies employees policies to avoid recursion:

```sql
-- ✅ GOOD (no recursion):
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);  -- Allow all authenticated users
```

---

## 🧪 Verify the Fix

### 1. Run Smoke Test

```bash
npm run test:auth-smoke
```

**Expected output:**
```
✅ NEXT_PUBLIC_SUPABASE_URL is set
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
✅ Supabase client created
✅ Auth health endpoint reachable (200)
✅ Login successful!
   User ID: abc-123...
   Email: admin@test.com
✅ Successfully signed in with test account
```

---

### 2. Test in Browser

1. Go to http://localhost:3000/sign-in
2. Login: `admin@test.com` / `admin123456`
3. **Expected:** Redirects to dashboard
4. **Not expected:** "Auth Service Error (500)"

---

### 3. Check Diagnostic Endpoints

```bash
curl http://localhost:3000/api/diag/supabase-auth | jq .
```

**Expected:**
```json
{
  "healthy": true,
  "errors": [],
  "checks": {
    "authHealthEndpoint": {
      "reachable": true,
      "status": 200
    }
  }
}
```

---

## 🆘 Still Broken? Temporary Workaround

If Supabase Auth is still down and you need to unblock development:

### Option: Use Service Role for Testing (Dev Only!)

**⚠️ NEVER use in production!**

1. **Create dev-only bypass:**

```typescript
// lib/supabase/dev-bypass.ts (TEMP FILE - DELETE BEFORE PRODUCTION)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

2. **Use in sign-in (TEMP ONLY):**

```typescript
// In sign-in/page.tsx (TEMP - REVERT BEFORE PRODUCTION)
if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH) {
  // Bypass broken auth, query employees directly
  const { data: employee } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('email', loginEmail)
    .single()
  
  if (employee) {
    // Manually set localStorage (mimics old mock auth)
    localStorage.setItem('userId', employee.user_id)
    localStorage.setItem('employeeId', employee.id)
    // ... redirect to dashboard
  }
}
```

3. **Add to `.env.local`:**
```
DEV_BYPASS_AUTH=true
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. **⚠️ REMOVE THIS BEFORE PRODUCTION!**

---

## 📞 When to Contact Supabase Support

If you've tried everything and auth is still broken:

1. **Dashboard → Help → Contact Support**

2. **Include:**
   - Project ref: `[your-project-ref]`
   - Error: "Database error querying schema" during signInWithPassword
   - Steps you've tried
   - Screenshots of Auth Logs and Postgres Logs
   - Output of smoke test

3. **Ask:**
   - "Can you check if the auth schema is corrupted?"
   - "Are there any ongoing incidents affecting auth service?"

---

## 🎯 Prevention Checklist

To avoid this in the future:

- [ ] Never manually modify `auth` schema tables
- [ ] Avoid recursive RLS policies (querying same table within policy)
- [ ] Test RLS policies before applying to production
- [ ] Run smoke tests after major schema changes
- [ ] Monitor Supabase dashboard for incidents
- [ ] Keep diagnostic endpoints in production (with auth)

---

## 📚 Related Files

- `SUPABASE_FIX_AUTH_SCHEMA_ERROR.sql` - Fixes circular RLS dependency
- `scripts/supabaseAuthSmokeTest.ts` - Automated test suite
- `app/api/diag/supabase-auth/route.ts` - Auth diagnostic endpoint
- `app/api/diag/supabase-db/route.ts` - Database diagnostic endpoint

---

## 🎉 Success Indicators

You'll know it's fixed when:

- ✅ Smoke test passes
- ✅ Login works without errors
- ✅ No 500 errors in console
- ✅ Diagnostic endpoints return `"healthy": true`
- ✅ Can complete full onboarding flow

**Good luck! 🚀**

