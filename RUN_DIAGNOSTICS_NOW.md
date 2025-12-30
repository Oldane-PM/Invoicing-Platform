# 🚨 Run Diagnostics NOW - Find the Real Issue

## What Just Changed

Your app now has **laser-accurate error reporting** and **automated diagnostics**.

When you try to login now, instead of seeing:
```
❌ Invalid email or password
```

You'll see the REAL error:
```
🔥 Auth Service Error (500): Database error querying schema
```

---

## 🎯 Step 1: Refresh Browser & Try Login

1. **Refresh:** Cmd+Shift+R (clear cache)
2. **Login:** Try any of these:
   - `admin@test.com` / `admin123456`
   - `employee@test.com` / `employee123456`
   - `new@test.com` / `new123456`

3. **Check Console** for exact error

---

## 🔬 Step 2: Run Smoke Test

This automated test will pinpoint exactly what's broken:

```bash
npm run test:auth-smoke
```

**What it tests:**
1. ✅ Environment variables loaded
2. ✅ Supabase client can be created
3. ✅ Auth health endpoint reachable
4. ✅ Can sign in with test accounts
5. ✅ Session works
6. ✅ User data retrieved
7. ✅ Database queries work

**Expected output if healthy:**
```
✅ NEXT_PUBLIC_SUPABASE_URL is set
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set
✅ Supabase client created
✅ Auth health endpoint reachable (200)
✅ Login successful!
✅ ALL TESTS PASSED!
```

**Output if broken:**
```
❌ Server Error (500): Database error querying schema
   This is a Supabase service issue, not credentials!
❌ TESTS FAILED
```

---

## 🩺 Step 3: Check Health Endpoints

**Start dev server:**
```bash
npm run dev
```

**In another terminal, check auth health:**
```bash
npm run diag:auth
```

**Expected response:**
```json
{
  "healthy": true,
  "errors": [],
  "checks": {
    "envVars": { "SUPABASE_URL_present": true, ... },
    "clientCreated": true,
    "getSession": { "success": true },
    "authHealthEndpoint": { "reachable": true, "status": 200 }
  }
}
```

**Check DB health:**
```bash
npm run diag:db
```

---

## 📊 Interpreting Results

### Scenario A: Smoke Test Shows 500 Error

**Error message:**
```
❌ Server Error (500): Database error querying schema
```

**This means:** Supabase Auth backend is broken (not your app!)

**Next steps:**
1. Open Supabase Dashboard
2. Check if project is paused (Settings → General)
3. Check Auth Logs (Logs → Auth)
4. Run `SUPABASE_FIX_AUTH_SCHEMA_ERROR.sql`

---

### Scenario B: "Cannot reach auth health endpoint"

**This means:** Network issue or wrong Supabase URL

**Next steps:**
1. Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
2. Check your internet connection
3. Check Supabase dashboard for incidents

---

### Scenario C: "Could not sign in with any test account"

**This means:** Test users don't exist

**Next steps:**
1. Run `SUPABASE_CLEAN_AND_SEED.sql` to create test users
2. Verify in Supabase Dashboard → Authentication → Users

---

### Scenario D: All Tests Pass!

**This means:** Supabase Auth is healthy!

**Next steps:**
1. Try login in browser again
2. If still fails, check browser console for RLS errors
3. Run `SUPABASE_FIX_AUTH_SCHEMA_ERROR.sql` to fix RLS

---

## 🛠️ Quick Fixes

### If Project is Paused

**Supabase Dashboard → Project → Settings**
- Click "Restore Project"
- Wait 2-3 minutes
- Retry smoke test

---

### If RLS is Blocking Auth

**Run this SQL in Supabase:**
```bash
SUPABASE_FIX_AUTH_SCHEMA_ERROR.sql
```

This removes the circular dependency in employees table policies.

---

### If Test Users Missing

**Run this SQL in Supabase:**
```bash
SUPABASE_CLEAN_AND_SEED.sql
```

This creates 4 test users with passwords.

---

## 📋 Full Diagnostic Sequence

**Copy and paste this entire block:**

```bash
# 1. Check environment
cat .env.local | grep SUPABASE

# 2. Run smoke test
npm run test:auth-smoke

# 3. If dev server running, check health
npm run diag:auth
npm run diag:db

# 4. Check Supabase Dashboard
open https://supabase.com/dashboard/project/YOUR_PROJECT/settings/general
```

---

## 🎯 Success Checklist

When everything works, you should see:

- [ ] ✅ Smoke test passes (exit code 0)
- [ ] ✅ Login in browser works
- [ ] ✅ Console shows: "Supabase Auth successful, user ID: ..."
- [ ] ✅ Redirects to dashboard (not stuck on login)
- [ ] ✅ No 500 errors anywhere
- [ ] ✅ Diagnostic endpoints return `"healthy": true`

---

## 📞 Still Stuck?

Read the full troubleshooting guide:
```
SUPABASE_AUTH_500_TROUBLESHOOTING.md
```

It has:
- Detailed root cause analysis
- Supabase Dashboard checklist
- Step-by-step fixes for each scenario
- Temporary workarounds
- When to contact Supabase support

---

## 🚀 Run It Now!

```bash
npm run test:auth-smoke
```

**Paste the output here** and I'll tell you exactly what's wrong! 🔍

