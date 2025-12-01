-- Enable Row-Level Security on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Employees policies
-- Employees can read their own record
CREATE POLICY "Employees can view own profile"
  ON employees FOR SELECT
  USING (auth.uid()::text = id::text);

-- Managers can view employees in their team
CREATE POLICY "Managers can view team employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = employees.id
      AND team_members.manager_id::text = auth.uid()::text
    )
    OR role = 'manager'
    OR role = 'admin'
  );

-- Admins can view all employees
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Submissions policies
-- Employees can view their own submissions
CREATE POLICY "Employees can view own submissions"
  ON submissions FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- Employees can create their own submissions
CREATE POLICY "Employees can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (employee_id::text = auth.uid()::text);

-- Employees can update their own pending submissions
CREATE POLICY "Employees can update own pending submissions"
  ON submissions FOR UPDATE
  USING (
    employee_id::text = auth.uid()::text
    AND status = 'submitted'
  );

-- Managers can view submissions from their team
CREATE POLICY "Managers can view team submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

-- Managers can update submissions from their team (approve/reject)
CREATE POLICY "Managers can update team submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.employee_id = submissions.employee_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Team members policies
-- Managers can view their team members
CREATE POLICY "Managers can view own team"
  ON team_members FOR SELECT
  USING (manager_id::text = auth.uid()::text);

-- Managers can add employees to their team
CREATE POLICY "Managers can add to own team"
  ON team_members FOR INSERT
  WITH CHECK (manager_id::text = auth.uid()::text);

-- Managers can remove employees from their team
CREATE POLICY "Managers can remove from own team"
  ON team_members FOR DELETE
  USING (manager_id::text = auth.uid()::text);

-- Employees can view if they're in a team
CREATE POLICY "Employees can view own team membership"
  ON team_members FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- Admins can view all team members
CREATE POLICY "Admins can view all team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Notifications policies
-- Employees can view their own notifications
CREATE POLICY "Employees can view own notifications"
  ON notifications FOR SELECT
  USING (employee_id::text = auth.uid()::text);

-- System can create notifications (this will be done via service role)
-- For now, allow employees to see notifications created for them
CREATE POLICY "Employees can update own notifications"
  ON notifications FOR UPDATE
  USING (employee_id::text = auth.uid()::text);

-- Projects policies
-- Everyone can view projects
CREATE POLICY "Everyone can view projects"
  ON projects FOR SELECT
  USING (true);

-- Admins can manage projects
CREATE POLICY "Admins can manage projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Invoices policies
-- Employees can view invoices for their submissions
CREATE POLICY "Employees can view own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = invoices.submission_id
      AND submissions.employee_id::text = auth.uid()::text
    )
  );

-- Managers can view invoices for their team's submissions
CREATE POLICY "Managers can view team invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      JOIN team_members ON submissions.employee_id = team_members.employee_id
      WHERE submissions.id = invoices.submission_id
      AND team_members.manager_id::text = auth.uid()::text
    )
  );

