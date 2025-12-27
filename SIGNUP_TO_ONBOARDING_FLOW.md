# Sign-up to Onboarding Flow

## Overview
New employees who sign up are now automatically directed through the complete 6-step onboarding process before they can access the main dashboard and submit timesheets.

## Flow Diagram

```
Sign Up → Login → Employee Dashboard Check → Onboarding Gate → 6-Step Process → Dashboard Access
```

## Implementation Details

### 1. Sign-up Process (`/app/api/auth/signup/route.ts`)
When a new employee signs up:
- A new employee record is created in the database
- `onboarding_status` is set to `'INCOMPLETE'`
- `admin_approval_status` is set to `'NOT_SUBMITTED'`
- The user is prompted to log in

```typescript
{
  id: uuidv4(),
  name: name.trim(),
  email: email.toLowerCase().trim(),
  role: 'employee',
  status: 'ACTIVE',
  onboarding_status: 'INCOMPLETE', // 🔑 Key field for onboarding gate
  admin_approval_status: 'NOT_SUBMITTED',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

### 2. Login Process (`/app/(auth)/sign-in/page.tsx`)
After successful login:
- Employees are redirected to `/employee`
- Managers are redirected to `/manager/dashboard`
- Admins are redirected to `/admin/dashboard`

### 3. Onboarding Gate (`/app/employee/page.tsx`)
The employee dashboard checks onboarding status on load:

```typescript
// Redirect to onboarding if not complete
if (!onboardingStatus || onboardingStatus === 'INCOMPLETE') {
  router.push('/employee/onboarding')
  return
}
```

**Behavior:**
- ✅ If `onboarding_status` is `'COMPLETE'` → Access dashboard
- 🚫 If `onboarding_status` is `null` or `'INCOMPLETE'` → Redirect to `/employee/onboarding`

### 4. Onboarding Process (`/app/employee/onboarding/...`)
The employee goes through:

1. **Welcome Screen** (`/employee/onboarding`) - "Start Onboarding" button
2. **Personal Information** (`/employee/onboarding/personal`) - Step 1 of 2
3. **Banking Details** (`/employee/onboarding/banking`) - Step 2 of 2
4. **Status Page** (`/employee/onboarding/status`) - Shows progress (3/6 steps completed)

### 5. Admin Review
After employee submission:
- Admin reviews in Onboarding Queue (`/admin/onboarding`)
- Admin performs actions:
  - Approve personal info
  - Approve banking info
  - Complete contract setup
  - Assign manager
- Once all 6 steps are complete, `onboarding_status` → `'COMPLETE'`

### 6. Dashboard Access
Once `onboarding_status = 'COMPLETE'`:
- Employee can access the dashboard
- Timesheet submission is enabled
- All features are unlocked

## Business Rules

### For New Sign-ups:
1. ✅ Account is created immediately with `status: 'ACTIVE'`
2. ✅ `onboarding_status` is set to `'INCOMPLETE'`
3. ✅ User must log in after sign-up
4. ✅ Upon login, they are redirected to `/employee`
5. ✅ The dashboard immediately detects incomplete onboarding and redirects to `/employee/onboarding`
6. ✅ User cannot bypass onboarding to access dashboard or submit timesheets

### Onboarding Completion:
- ✅ Employee submits personal info and banking details (Steps 1-3)
- ✅ Admin reviews and approves (Steps 4-6)
- ✅ When all 6 steps are complete, the DB trigger updates `onboarding_status` to `'COMPLETE'`
- ✅ Employee can now access dashboard and submit timesheets

### Rejection Handling:
- ✅ If admin rejects, employee is notified
- ✅ Employee must update and resubmit
- ✅ Approval status resets to `'PENDING'`
- ✅ Onboarding remains `'INCOMPLETE'` until all steps are approved

## Testing the Flow

### As a New Employee:
1. Go to `/sign-in` and click "Create Account"
2. Fill in name, email, and password
3. Click "Create Account"
4. Log in with the credentials
5. You should be automatically redirected to `/employee/onboarding`
6. Complete the onboarding steps
7. Wait for admin approval
8. Once approved, you can access the dashboard

### As an Admin:
1. Log in as an admin
2. Go to `/admin/onboarding`
3. See the new employee in the queue
4. Click on the employee
5. Review and approve personal info, banking info
6. Complete contract setup
7. Assign a manager
8. Employee's `onboarding_status` is now `'COMPLETE'`

## Key Files Modified

1. **`app/api/auth/signup/route.ts`**
   - Added `onboarding_status: 'INCOMPLETE'`
   - Added `admin_approval_status: 'NOT_SUBMITTED'`

2. **`app/employee/page.tsx`**
   - Updated onboarding check logic
   - Changed redirect from `/onboarding` to `/employee/onboarding`
   - Updated status values from old format to new format (`'INCOMPLETE'` / `'COMPLETE'`)

## Security & Edge Cases

✅ **Cannot bypass onboarding**: The dashboard check runs on every page load  
✅ **Server-side validation**: The `canSubmitTimesheets()` function also checks the DB  
✅ **State persistence**: Onboarding status is stored in the database  
✅ **No cross-employee access**: RLS policies enforce per-employee access  
✅ **Admin cannot be blocked**: Admins and managers have separate dashboards

## Future Enhancements

1. **Email Notifications**: Notify employees when admin approves/rejects
2. **Progress Persistence**: Save partial form data if employee navigates away
3. **Onboarding Reminders**: Send reminders to employees who haven't completed onboarding
4. **Admin Bulk Actions**: Approve multiple employees at once
5. **Onboarding Analytics**: Track completion rates and bottlenecks

---

**Status**: ✅ Complete and ready for testing  
**Last Updated**: December 27, 2025

