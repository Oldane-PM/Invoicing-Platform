# Database Migration Scripts

This folder contains helper scripts to manage database migrations for your Supabase database.

## Available Scripts

### 1. Seed Test Employees (`seed-test-employees.js`)

**Purpose:** Creates test employees in the database for development and testing.

**Usage:**
```bash
npm run db:seed
```

**What it creates:**
- **Test Employee** (employee@test.com) - Regular employee role
- **Test Manager** (manager@test.com) - Manager role  
- **Test Admin** (admin@test.com) - Admin role

**Features:**
- Safe to run multiple times (checks for existing employees)
- Creates employees with realistic data
- Sets up proper rates and contract information
- All employees are set to "active" status

**When to use:**
- After running database migrations
- When setting up a new development environment
- When you get "PGRST116: The result contains 0 rows" errors
- When testing different user roles

### 2. Combine Migrations (`combine-migrations.js`)

**Purpose:** Combines all individual migration files into a single `combined.sql` file that can be easily run in Supabase SQL Editor.

**Usage:**
```bash
npm run db:combine
```

Or directly:
```bash
node scripts/combine-migrations.js
```

**Output:** Creates `supabase/migrations/combined.sql`

### 2. Run Migrations (`run-migrations.js`)

**Purpose:** Attempts to run migrations programmatically (provides instructions for manual execution).

**Usage:**
```bash
npm run db:migrate
```

Or directly:
```bash
node scripts/run-migrations.js
```

## Quick Start Guide

### First-Time Setup

1. **Run Migrations** (creates database tables):
   ```bash
   npm run db:combine
   # Then paste combined.sql into Supabase SQL Editor
   ```

2. **Seed Test Data** (creates test employees):
   ```bash
   npm run db:seed
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Login**:
   - Go to http://localhost:3000/sign-in
   - Select a role (Employee/Manager/Admin)
   - Click "Continue with Google"

## How to Run Database Migrations

### Option 1: Using Combined SQL (Recommended)

1. **Generate the combined file:**
   ```bash
   npm run db:combine
   ```

2. **Open Supabase Dashboard:**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor**

3. **Create a new query:**
   - Click **"New query"**

4. **Copy and paste:**
   - Open `supabase/migrations/combined.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

5. **Execute:**
   - Click **"Run"** to execute all migrations at once

### Option 2: Run Migrations Individually

If you prefer to run migrations one at a time:

1. Go to Supabase Dashboard → SQL Editor
2. For each file in `supabase/migrations/` (in order):
   - Open the file
   - Copy its contents
   - Paste into SQL Editor
   - Run it

**Migration Order:**
1. `001_initial_schema.sql` - Creates tables
2. `002_rls_policies.sql` - Sets up security policies
3. `003_add_employee_profile_fields.sql` - Adds employee fields
4. `004_fix_rls_policies.sql` - Fixes RLS issues
5. `004_unified_submission_status.sql` - Updates submission statuses
6. `005_disable_rls_temporarily.sql` - RLS adjustments
7. `005_notifications_table.sql` - Creates notifications table
8. `006_add_idempotency_key.sql` - Adds idempotency support
9. `007_add_fixed_income_support.sql` - Adds fixed income fields

## Troubleshooting

### "Could not find the table 'public.notifications'"
**Solution:** Run migrations 005_notifications_table.sql or use the combined.sql file

### "Could not query the database for the schema cache"
**Solution:** After running migrations, refresh the schema cache:
```sql
NOTIFY pgrst, 'reload schema';
```
Or restart your Supabase project in the dashboard.

### Environment Variables Missing
Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Additional Scripts

### Clear Frontend Data (`clear-frontend-data.js`)

Clears localStorage data for testing purposes.

**Usage:**
```bash
node scripts/clear-frontend-data.js
```

## Notes

- Always run migrations in order (001, 002, 003, etc.)
- Backup your database before running migrations in production
- The combined.sql file includes all migrations with headers for easy identification
- After migrations, restart your Next.js dev server to ensure clean connections

