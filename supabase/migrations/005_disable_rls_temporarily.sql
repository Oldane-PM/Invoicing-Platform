-- ============================================
-- TEMPORARILY DISABLE RLS (Until Auth is Implemented)
-- ============================================
-- Since we're using localStorage for auth (not Supabase Auth),
-- RLS policies with auth.uid() won't work.
-- Disable RLS temporarily until proper authentication is implemented.

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Note: Once you implement Better-Auth or Supabase Auth,
-- re-enable RLS and create proper policies that work with your auth system.

