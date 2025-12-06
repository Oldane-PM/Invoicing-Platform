-- Migration: Unified Submission Status System
-- This migration updates the submissions table to use the new canonical status enum
-- and adds manager_comment and admin_comment fields.

-- 1. Add new comment columns
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS manager_comment TEXT,
ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- 2. Migrate existing status values to new canonical format
-- Old values: 'submitted', 'approved', 'rejected', 'payment_done'
-- New values: 'SUBMITTED', 'MANAGER_REJECTED', 'MANAGER_APPROVED', 'ADMIN_PAID', 'ADMIN_REJECTED', 'NEEDS_CLARIFICATION'

UPDATE submissions SET status = 'SUBMITTED' WHERE status = 'submitted';
UPDATE submissions SET status = 'MANAGER_APPROVED' WHERE status = 'approved';
UPDATE submissions SET status = 'MANAGER_REJECTED' WHERE status = 'rejected';
UPDATE submissions SET status = 'ADMIN_PAID' WHERE status = 'payment_done';

-- 3. Copy existing rejection_reason to manager_comment (if it was a manager rejection)
UPDATE submissions 
SET manager_comment = rejection_reason 
WHERE rejection_reason IS NOT NULL 
  AND status = 'MANAGER_REJECTED';

-- 4. (Optional) Add a check constraint for valid status values
-- Uncomment if you want to enforce at DB level
-- ALTER TABLE submissions
-- ADD CONSTRAINT submissions_status_check 
-- CHECK (status IN ('SUBMITTED', 'MANAGER_REJECTED', 'MANAGER_APPROVED', 'ADMIN_PAID', 'ADMIN_REJECTED', 'NEEDS_CLARIFICATION'));

-- 5. Verify migration
SELECT status, COUNT(*) as count FROM submissions GROUP BY status;

