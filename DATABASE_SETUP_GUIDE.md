# 🗄️ Database Setup Guide

## 🚨 Current Issue

**Error:** `relation "employees" does not exist`

**Cause:** The Supabase database hasn't been set up yet. No tables exist.

---

## ✅ Quick Fix (5 Minutes)

### Step 1: Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Or: Supabase Dashboard → SQL Editor → New query

### Step 2: Run the Setup Script
1. Open file: `SUPABASE_SETUP_DATABASE.sql`
2. **Copy the ENTIRE file** (all ~350 lines)
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Success
You should see:
```
✅ Database setup complete!

Table Name              | Column Count
------------------------|-------------
employees               | 28
invoices                | 8
notifications           | 7
onboarding_banking      | 11
onboarding_cases        | 11
onboarding_events       | 5
onboarding_personal     | 16
submissions             | 13
team_members            | 9
```

---

## 📋 What the Script Creates

### Tables (9 total)
1. **employees** - User accounts and profiles
2. **submissions** - Hour submissions
3. **team_members** - Manager-employee relationships
4. **invoices** - Generated invoices
5. **notifications** - User notifications
6. **onboarding_cases** - Onboarding workflow
7. **onboarding_personal** - Personal info
8. **onboarding_banking** - Banking details
9. **onboarding_events** - Audit trail

### Indexes (15 total)
- Optimized for common queries
- Foreign key lookups
- Status filtering

### RLS Policies (12 total)
- Users can view/edit own data
- Admins have full access
- Secure by default

### Triggers (5 total)
- Auto-update `updated_at` timestamps
- Audit trail logging

---

## 🧪 Test After Setup

### 1. Verify Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Check Employees Table
```sql
SELECT * FROM employees LIMIT 5;
```

Should return: `0 rows` (empty, but table exists!)

### 3. Test in Your App
1. Refresh browser: http://localhost:3000
2. Error should be gone
3. App should load (but show "No employees" since DB is empty)

---

## 🌱 Seed Test Data (Optional)

After setup, you can add test users:

### Option A: Quick Test Data
```bash
# Run in Supabase SQL Editor
SUPABASE_CLEAN_AND_SEED.sql
```

Creates:
- `admin@test.com` / `admin123456`
- `manager@test.com` / `manager123456`
- `employee@test.com` / `employee123456`

### Option B: Manual Test User
```sql
-- Create a test employee
INSERT INTO employees (name, email, role, status)
VALUES ('Test User', 'test@example.com', 'employee', 'active');
```

---

## 🔧 Troubleshooting

### Error: "permission denied for schema public"
**Fix:** Enable public schema access
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

### Error: "type onboarding_state already exists"
**Fix:** Script is idempotent, safe to re-run. Or drop and recreate:
```sql
DROP TYPE IF EXISTS onboarding_state CASCADE;
-- Then re-run setup script
```

### Error: "relation already exists"
**Fix:** Tables already created! You're good to go.

---

## 🎯 Next Steps After Setup

1. ✅ **Run setup script** → Tables created
2. ✅ **Seed test data** → Users created
3. ✅ **Test login** → http://localhost:3000
4. ✅ **Create PR** → Merge your reporting manager fix

---

## 📖 Alternative: Run Migrations Individually

If you prefer to run migrations one-by-one:

```bash
# In order:
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_rls_policies.sql
3. supabase/migrations/011_add_reporting_manager_column.sql
4. supabase/migrations/012_employee_onboarding_system.sql
5. supabase/migrations/014_separate_onboarding_tables.sql
```

**But the all-in-one script is faster!** ⚡

---

## 🆘 Still Having Issues?

### Check Supabase Project Status
- Dashboard → Project Settings → General
- Ensure project is not paused
- Check database is active

### Verify Connection
```sql
SELECT NOW();  -- Should return current timestamp
```

### Check Logs
- Dashboard → Logs → Postgres Logs
- Look for errors during script execution

---

**Created:** December 30, 2025  
**Purpose:** Set up Supabase database from scratch  
**Time Required:** ~5 minutes  
**Difficulty:** Easy (copy-paste-run)

