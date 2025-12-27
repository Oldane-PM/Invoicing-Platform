# 🚀 Run Onboarding Migration

## Issue
The onboarding system requires database columns that don't exist yet. You need to run migration `012_employee_onboarding_system.sql`.

## Quick Fix Steps

### Option 1: Run Single Migration (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Click on **SQL Editor** in the left sidebar

2. **Copy the Migration SQL**
   - Open: `supabase/migrations/012_employee_onboarding_system.sql`
   - Copy ALL the contents (Cmd+A, Cmd+C)

3. **Execute in Supabase**
   - Paste the SQL into the SQL Editor
   - Click **Run** (or press Cmd+Enter)
   - Wait for success message

4. **Verify**
   - Go to **Table Editor** → **employees** table
   - Check that new columns exist:
     - `onboarding_status`
     - `admin_approval_status`
     - `personal_info_completed_at`
     - `banking_info_completed_at`
     - `onboarding_submitted_at`
     - `admin_rejection_reason`
     - `admin_approved_at`
     - `admin_approved_by`
     - `contract_completed_at`
     - `contract_completed_by`
     - `manager_assigned_at`

5. **Restart Dev Server**
   ```bash
   # Stop the dev server (Ctrl+C) and restart:
   npm run dev
   ```

6. **Test Sign-up**
   - Go to `/sign-in`
   - Click "Create Account"
   - Fill in details and submit
   - Should work without errors! ✅

### Option 2: Run All Migrations (If Starting Fresh)

If you need to run ALL migrations (not just the onboarding one):

1. Go to Supabase SQL Editor
2. Open: `supabase/migrations/combined.sql`
3. If it doesn't exist, run:
   ```bash
   node scripts/combine-migrations.js
   ```
4. Copy and paste the entire `combined.sql` file
5. Execute it

## After Migration

Once the migration is run, the sign-up flow will:
- ✅ Create new employees with `onboarding_status = 'INCOMPLETE'`
- ✅ Set `admin_approval_status = 'NOT_SUBMITTED'`
- ✅ Redirect new sign-ups to `/employee/onboarding`
- ✅ Lock timesheet submission until onboarding is complete

## Troubleshooting

### "Column already exists" error
- The migration has already been run
- Sign-up should work now
- Just restart your dev server

### "Permission denied" error
- Make sure you're using a Supabase account with owner/admin access
- Check that your service role key is correct in `.env.local`

### Still getting PGRST204 error
- The migration didn't run successfully
- Check Supabase logs for specific error messages
- Try running the migration again

## What This Migration Does

The `012_employee_onboarding_system.sql` migration:
- ✅ Adds onboarding tracking columns to `employees` table
- ✅ Creates `employee_profiles` table for personal info
- ✅ Creates `employee_banking` table for banking details
- ✅ Adds trigger to auto-update `onboarding_status` when steps are completed
- ✅ Sets up RLS policies for employee and admin access
- ✅ Creates helper functions for computing onboarding progress

---

**Need Help?** Check the Supabase logs or reach out if you encounter issues!

