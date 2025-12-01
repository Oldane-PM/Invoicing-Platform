# Supabase Database Setup

This directory contains SQL migration files to set up your Supabase database.

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `001_initial_schema.sql`
5. Click **Run** to execute
6. Then copy and paste the contents of `002_rls_policies.sql`
7. Click **Run** to execute

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref oarhunattvffddzlodmj

# Run migrations
supabase db push
```

## Tables Created

1. **employees** - User accounts (employees, managers, admins)
2. **projects** - Project listings
3. **submissions** - Time submission records
4. **team_members** - Manager-employee relationships
5. **notifications** - Employee notifications
6. **invoices** - Invoice records

## Row-Level Security (RLS)

RLS policies are configured to ensure:
- Employees can only see their own data
- Managers can see their team's data
- Admins can see everything
- Proper access control for all operations

## Important Notes

⚠️ **Authentication**: These RLS policies assume you're using Supabase Auth with `auth.uid()`. If you're using Better-Auth or another auth system, you'll need to adjust the policies accordingly.

⚠️ **Service Role**: Some operations (like creating notifications) may need to use the service role key to bypass RLS when appropriate.

## Testing

After running the migrations, you can test the connection:
- Visit: `http://localhost:3000/api/test-connection`
- Should return: `{"connected": true}`

## Sample Data (Optional)

You can insert sample data for testing:

```sql
-- Insert a test admin
INSERT INTO employees (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@example.com', 'admin');

-- Insert a test manager
INSERT INTO employees (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Manager User', 'manager@example.com', 'manager');

-- Insert a test employee
INSERT INTO employees (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Employee User', 'employee@example.com', 'employee');
```

