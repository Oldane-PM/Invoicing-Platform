# Onboarding System Refactor Guide

## Overview

The onboarding system has been refactored to use dedicated database tables instead of embedding all data in the `employees` table. This provides better data separation, security, and audit trails.

## Key Changes

### Database Architecture

**Before:**
- All onboarding data stored in `employees` table
- Mixed concerns: active employees + onboarding candidates
- Limited audit trail
- Difficult to manage state transitions

**After:**
- `onboarding_cases`: Main workflow state machine
- `onboarding_personal`: Personal information (1-to-1 with case)
- `onboarding_banking`: Banking details (1-to-1 with case, encrypted)
- `onboarding_contract`: Employment contract (admin-managed)
- `onboarding_events`: Complete audit trail
- `employees`: Clean "system of record" for active staff only

### State Machine

Onboarding now uses a proper state enum:

```
draft → submitted → admin_review → contract_pending → manager_pending → approved
                                                                          ↓
                                                                       rejected
```

States:
- `draft`: Employee filling out forms
- `submitted`: Submitted for admin review
- `personal_pending`: Admin requested changes to personal info
- `banking_pending`: Admin requested changes to banking info
- `admin_review`: Under admin review
- `contract_pending`: Admin adding contract details
- `manager_pending`: Waiting for manager assignment
- `approved`: Fully approved, employee created as active
- `rejected`: Rejected by admin
- `closed`: Case archived

### Security Improvements

1. **Row-Level Security (RLS)**:
   - Employees can only view/update their own onboarding data
   - Admins have full access via `is_admin()` function
   - Banking info has restricted access

2. **Timesheet Gate**:
   - RLS policy on `submissions` table
   - Only employees with `status='active'` can submit hours
   - Enforced at database level (UI cannot bypass)

3. **Audit Trail**:
   - Every action logged in `onboarding_events`
   - Immutable event log
   - Full accountability

### API Changes

**DAL Functions (lib/data/onboarding.ts):**

| Old Function | New Function | Changes |
|--------------|--------------|---------|
| `getOnboardingStatus(employeeId)` | `getOnboardingStatus(userId)` | Now uses `user_id` instead of `employee_id` |
| `savePersonalInfo(employeeId, data)` | `savePersonalInfo(userId, data)` | Saves to `onboarding_personal` table |
| `saveBankingInfo(employeeId, data)` | `saveBankingInfo(userId, data)` | Saves to `onboarding_banking` table |
| `submitOnboarding(employeeId)` | `submitOnboarding(userId)` | Updates case state to `submitted` |
| `adminApproveOnboarding(employeeId, adminId)` | `adminApproveOnboarding(caseId, managerId, contractInfo)` | Uses DB function, creates employee record |
| `adminRejectOnboarding(employeeId, reason)` | `adminRejectOnboarding(caseId, reason)` | Uses DB function |
| `canSubmitTimesheets(employeeId)` | `canSubmitTimesheets(userId)` | Checks `employees.status='active'` |

**New Functions:**
- `createOnboardingCase(userId)`: Create new case during signup
- `getOnboardingStatusByCase(caseId)`: Admin view of specific case
- `getOnboardingEvents(caseId)`: Get audit trail
- `getOnboardingQueue()`: Admin queue view

### Type Changes

**Old Types:**
```typescript
OnboardingApprovalStatus = 'NOT_SUBMITTED' | 'WAITING' | 'APPROVED' | 'REJECTED'
OnboardingStatus = 'INCOMPLETE' | 'COMPLETE'
```

**New Types:**
```typescript
OnboardingState = 'draft' | 'submitted' | 'personal_pending' | 'banking_pending' 
                | 'admin_review' | 'contract_pending' | 'manager_pending' 
                | 'approved' | 'rejected' | 'closed'
```

**OnboardingData Interface:**
```typescript
{
  caseId: string              // NEW: Case ID
  userId: string              // NEW: Auth user ID
  employeeId: string | null   // Only set after approval
  currentState: OnboardingState
  personalInfo: PersonalInfoPayload | null
  bankingInfo: BankingInfoDisplay | null
  contractInfo: ContractInfoPayload | null
  progress: OnboardingProgress
  // ... timestamps, etc
}
```

## Migration Steps

### Step 1: Run SQL Migration

```bash
# In Supabase Dashboard → SQL Editor
# Run: supabase/migrations/014_separate_onboarding_tables.sql
```

This creates:
- Enums (`onboarding_state`, `onboarding_event_type`)
- Tables (`onboarding_cases`, `onboarding_personal`, `onboarding_banking`, `onboarding_contract`, `onboarding_events`)
- RLS policies
- Helper functions (`is_admin()`, `approve_onboarding()`, `reject_onboarding()`)
- Triggers for `updated_at`
- Timesheet submission gate

### Step 2: Migrate Existing Data (Optional)

If you have existing employees with onboarding data in the `employees` table:

```sql
-- Create onboarding cases for existing employees
INSERT INTO onboarding_cases (user_id, current_state, approved_at, employee_id)
SELECT 
  user_id,
  CASE 
    WHEN onboarding_status = 'COMPLETE' THEN 'approved'::onboarding_state
    ELSE 'draft'::onboarding_state
  END,
  admin_approved_at,
  id
FROM employees
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Migrate personal info
INSERT INTO onboarding_personal (case_id, full_name, address, city, state_parish, country, zip_code, phone, email, completed_at)
SELECT 
  oc.id,
  e.name,
  e.address,
  NULL, -- city (if you have it)
  e.state_parish,
  e.country,
  e.zip_code,
  e.phone,
  e.email,
  e.personal_info_completed_at
FROM employees e
JOIN onboarding_cases oc ON oc.user_id = e.user_id
WHERE e.address IS NOT NULL
ON CONFLICT (case_id) DO NOTHING;

-- Migrate banking info
INSERT INTO onboarding_banking (case_id, bank_name, bank_address, account_number_encrypted, account_type, swift_code, aba_wire_routing, currency, completed_at)
SELECT 
  oc.id,
  e.bank_name,
  e.bank_address,
  e.account_number, -- TODO: Encrypt this!
  e.account_type,
  e.swift_code,
  e.aba_wire_routing,
  e.currency,
  e.banking_info_completed_at
FROM employees e
JOIN onboarding_cases oc ON oc.user_id = e.user_id
WHERE e.bank_name IS NOT NULL
ON CONFLICT (case_id) DO NOTHING;
```

### Step 3: Update Application Code

The DAL (`lib/data/onboarding.ts`) has been updated. Update UI components:

**Components to Update:**
1. `app/employee/onboarding/personal/page.tsx` - Use `userId` instead of `employeeId`
2. `app/employee/onboarding/banking/page.tsx` - Use `userId` instead of `employeeId`
3. `app/employee/onboarding/status/page.tsx` - Use `userId` instead of `employeeId`
4. `app/admin/onboarding/page.tsx` - Use new queue format
5. `app/admin/onboarding/[id]/page.tsx` - Use `caseId` instead of `employeeId`
6. `app/employee/page.tsx` - Update onboarding check to use `userId`

**Key Changes:**
- Replace `localStorage.getItem('employeeId')` with `localStorage.getItem('userId')` for onboarding
- Update function calls to use `userId` instead of `employeeId`
- Handle new `OnboardingData` structure
- Use `caseId` for admin operations

### Step 4: Update Authentication

The signup flow now creates:
1. Supabase Auth user (`auth.users`)
2. Onboarding case (`onboarding_cases`)
3. Initial event (`onboarding_events`)

The `employees` table entry is only created **after approval**.

**Update sign-in to store:**
```typescript
localStorage.setItem('userId', authUser.id)
// Only set employeeId if employee record exists
if (employee) {
  localStorage.setItem('employeeId', employee.id)
}
```

### Step 5: Test Workflow

1. **New Signup**:
   - User signs up → creates `auth.users` + `onboarding_cases`
   - User redirected to `/employee/onboarding`
   - User completes personal + banking forms
   - User submits for review

2. **Admin Approval**:
   - Admin views queue at `/admin/onboarding`
   - Admin reviews case at `/admin/onboarding/[caseId]`
   - Admin approves with contract details + manager
   - System creates `employees` record with `status='active'`
   - User can now submit timesheets

3. **Timesheet Gate**:
   - Before approval: `canSubmitTimesheets()` returns `false`
   - After approval: `canSubmitTimesheets()` returns `true`
   - Database enforces via RLS policy

## Rollback Plan

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS onboarding_events CASCADE;
DROP TABLE IF EXISTS onboarding_contract CASCADE;
DROP TABLE IF EXISTS onboarding_banking CASCADE;
DROP TABLE IF EXISTS onboarding_personal CASCADE;
DROP TABLE IF EXISTS onboarding_cases CASCADE;

-- Drop enums
DROP TYPE IF EXISTS onboarding_event_type;
DROP TYPE IF EXISTS onboarding_state;

-- Drop functions
DROP FUNCTION IF EXISTS approve_onboarding;
DROP FUNCTION IF EXISTS reject_onboarding;
DROP FUNCTION IF EXISTS is_admin;

-- Restore old RLS policy on submissions
DROP POLICY IF EXISTS "Active employees can create submissions" ON submissions;
CREATE POLICY "Employees can create own submissions"
  ON submissions FOR INSERT
  WITH CHECK (employee_id::text = auth.uid()::text);
```

Then revert application code to use the old DAL.

## Benefits

✅ **Separation of Concerns**: Onboarding data separate from active employees
✅ **Better Security**: RLS policies, encrypted banking data, admin-only functions
✅ **Audit Trail**: Complete event log for compliance
✅ **State Machine**: Clear workflow states, easier to debug
✅ **Scalability**: Can add more onboarding steps without polluting `employees` table
✅ **Data Integrity**: Foreign key constraints, proper relationships
✅ **Timesheet Gate**: Database-enforced, cannot be bypassed by UI

## Production Considerations

1. **Encrypt Banking Data**:
   ```sql
   -- Use pgcrypto extension
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   
   -- Encrypt account numbers
   UPDATE onboarding_banking 
   SET account_number_encrypted = pgp_sym_encrypt(account_number_encrypted, 'encryption-key')
   WHERE encryption_key_version = 'v1';
   ```

2. **Backup Before Migration**:
   ```bash
   pg_dump -h your-db-host -U postgres -d your-db > backup_before_onboarding_refactor.sql
   ```

3. **Monitor RLS Performance**:
   - RLS policies add query overhead
   - Monitor slow queries
   - Add indexes as needed

4. **Set up Notifications**:
   - Notify admins when new onboarding submitted
   - Notify employees when approved/rejected
   - Use `onboarding_events` as trigger

## Support

If you encounter issues:
1. Check Supabase logs for RLS policy violations
2. Verify `is_admin()` function returns correct value
3. Ensure `user_id` is properly set in `auth.uid()`
4. Check `onboarding_events` for audit trail

## Next Steps

- [ ] Run migration in Supabase
- [ ] Update UI components to use new DAL
- [ ] Test complete signup → onboarding → approval flow
- [ ] Verify timesheet gate works
- [ ] Set up notifications
- [ ] Implement banking data encryption
- [ ] Add onboarding analytics dashboard

