# Quick Start: Onboarding System Refactor

## 🚀 Run This in Supabase (5 minutes)

### Step 1: Copy SQL to Supabase

1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file: `SUPABASE_ONBOARDING_MIGRATION.sql`
5. Copy the **entire contents**
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected result:**
```
✅ Onboarding system migration complete!
Created:
  - 2 enums
  - 5 tables
  - 15 RLS policies
  - 3 functions
  - 1 view
  - Timesheet submission gate
```

### Step 2: Verify Tables Created

In Supabase Dashboard → **Table Editor**, you should see:

- ✅ `onboarding_cases`
- ✅ `onboarding_personal`
- ✅ `onboarding_banking`
- ✅ `onboarding_contract`
- ✅ `onboarding_events`

### Step 3: Test the System

1. **Sign up a new user** (creates onboarding case automatically)
2. **Complete personal info** → saves to `onboarding_personal`
3. **Complete banking info** → saves to `onboarding_banking`
4. **Submit for review** → case state changes to `submitted`
5. **Admin approves** → creates `employees` record with `status='active'`
6. **Employee can now submit hours** (timesheet gate opens)

## 📊 What Changed

### Before
```
employees table
├── name, email, role
├── address, phone, bank_name (mixed concerns)
├── onboarding_status, admin_approval_status
└── personal_info_completed_at, banking_info_completed_at
```

### After
```
onboarding_cases (workflow)
├── user_id, current_state, submitted_at
└── approved_at, rejected_at, rejection_reason

onboarding_personal (1-to-1)
├── full_name, address, city, state_parish
└── country, zip_code, phone, email

onboarding_banking (1-to-1, encrypted)
├── bank_name, bank_address, branch
└── account_number_encrypted, account_type, currency

onboarding_contract (admin-managed)
├── employment_type, position_title, rate
└── start_date, manager_id

onboarding_events (audit trail)
├── event_type, actor_user_id, payload
└── created_at

employees (clean, active staff only)
├── user_id, name, email, role
└── status='active' (created after approval)
```

## 🔐 Security Features

1. **RLS Policies**:
   - Employees can only see/edit their own data
   - Admins have full access via `is_admin()` function
   - Banking info has restricted access

2. **Timesheet Gate**:
   - Database-enforced via RLS policy on `submissions` table
   - Only employees with `status='active'` can submit hours
   - UI cannot bypass this restriction

3. **Audit Trail**:
   - Every action logged in `onboarding_events`
   - Immutable event log
   - Full accountability

## 🎯 Key Functions

### For Employees (via DAL)
```typescript
// Create case (called during signup)
createOnboardingCase(userId)

// Save personal info
savePersonalInfo(userId, { full_name, address, ... })

// Save banking info
saveBankingInfo(userId, { bank_name, account_number_encrypted, ... })

// Submit for review
submitOnboarding(userId)

// Check if can submit hours
canSubmitTimesheets(userId) // Returns true only if status='active'
```

### For Admins (via DAL)
```typescript
// Get pending cases
getOnboardingQueue()

// Approve with contract + manager
adminApproveOnboarding(caseId, managerId, contractInfo)

// Reject with reason
adminRejectOnboarding(caseId, reason)

// View audit trail
getOnboardingEvents(caseId)
```

## 🔄 State Machine

```
draft
  ↓ (employee submits)
submitted
  ↓ (admin reviews)
admin_review
  ↓ (admin adds contract)
contract_pending
  ↓ (admin assigns manager)
manager_pending
  ↓ (admin approves)
approved ✅
  → Creates employees record with status='active'
  → Employee can now submit hours

OR

rejected ❌
  → Employee can resubmit after fixing issues
```

## 📝 Next Steps

1. ✅ Run SQL migration in Supabase
2. ⏳ Update remaining UI components:
   - `app/employee/onboarding/banking/page.tsx`
   - `app/employee/onboarding/status/page.tsx`
   - `app/admin/onboarding/page.tsx`
   - `app/admin/onboarding/[id]/page.tsx`
3. ⏳ Update sign-in to use Supabase Auth
4. ⏳ Test complete flow

## 🆘 Troubleshooting

### Error: "Could not find the 'onboarding_cases' table"
→ SQL migration hasn't been run yet. Go to Step 1.

### Error: "permission denied for table onboarding_cases"
→ RLS policies not applied. Re-run the SQL migration.

### Error: "function is_admin() does not exist"
→ Function not created. Re-run the SQL migration.

### Timesheet submission still works before approval
→ Check RLS policy on `submissions` table:
```sql
SELECT * FROM pg_policies WHERE tablename = 'submissions';
```
Should see: "Active employees can create submissions"

## 📚 Full Documentation

See `ONBOARDING_REFACTOR_GUIDE.md` for:
- Detailed architecture
- Migration strategy for existing data
- Production considerations
- Rollback plan
- API reference

---

**Ready to run?** Copy `SUPABASE_ONBOARDING_MIGRATION.sql` to Supabase SQL Editor and click Run! 🚀

