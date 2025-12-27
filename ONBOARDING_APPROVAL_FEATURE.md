# Onboarding Approval Feature - Admin Employee Directory

## Overview
Admins can now approve employee onboarding directly from the Employee Directory with a single click. The approval system includes full validation, loading states, success/error feedback, and automatic table refresh.

---

## ✅ What Was Implemented

### 1. **API Route** (`/api/admin/employees/:id/approve-onboarding`)

**Endpoint:** `POST /api/admin/employees/[id]/approve-onboarding`

**Request Body:**
```json
{
  "adminId": "uuid-of-admin"
}
```

**Validations:**
- ✅ Employee exists
- ✅ Current status is `WAITING` (not already approved/rejected)
- ✅ Personal information completed (`personal_info_completed_at` not null)
- ✅ Banking information completed (`banking_info_completed_at` not null)
- ✅ Onboarding submitted (`onboarding_submitted_at` not null)

**Success Response (200):**
```json
{
  "success": true,
  "message": "John Doe's onboarding has been approved",
  "employee": { /* updated employee object */ }
}
```

**Error Responses:**
- `400` - Missing prerequisites or invalid status
- `404` - Employee not found
- `409` - Already approved
- `500` - Server error

**What It Does:**
1. Validates all prerequisites
2. Calls `adminApproveOnboarding(employeeId, adminId)` from DAL
3. Updates employee record:
   - `admin_approval_status` → `'APPROVED'`
   - `admin_approved_at` → current timestamp
   - `admin_approved_by` → admin's UUID
   - `admin_rejection_reason` → null (clears any previous rejection)
4. Returns updated employee data

---

### 2. **Employee Directory UI Updates**

#### **Updated Employee Interface**
Added onboarding tracking fields:
```typescript
interface Employee {
  // ... existing fields ...
  admin_approval_status: string | null
  personal_info_completed_at: string | null
  banking_info_completed_at: string | null
  onboarding_submitted_at: string | null
  onboarding_status: string | null
}
```

#### **New Actions Column**
Added a new table column: **Actions**

**Column displays:**
- **Waiting Status** → Green "Approve" button (primary action)
- **Approved Status** → Green badge "Approved"
- **Rejected Status** → Red badge "Rejected"
- **Not Submitted** → Gray text "Not submitted"
- **No Status** → Em dash "—"

---

### 3. **Approve Button**

**Visual States:**
```typescript
// Normal state
<button className="bg-green-600 text-white">
  Approve
</button>

// Loading state (during API call)
<button className="bg-green-600 text-white opacity-50 cursor-not-allowed" disabled>
  <Spinner /> Approving...
</button>
```

**Behavior:**
- ✅ Only visible when `admin_approval_status === 'WAITING'`
- ✅ Shows spinner during approval (prevents double-click)
- ✅ Disabled while approving any employee (only one approval at a time)
- ✅ Click event stops propagation (doesn't trigger row click)

---

### 4. **Toast Notifications**

**Success Toast (Green, 3 seconds):**
```
✓ John Doe's onboarding approved
```

**Error Toast (Red, 4 seconds):**
```
✗ Personal information must be completed before approval
✗ Employee has already been approved
✗ Failed to approve onboarding
```

**Animation:**
- Slides in from the right (`animate-slide-in-right`)
- Fixed positioning (top-right corner)
- Auto-dismisses after timeout

**CSS Animation Added (`globals.css`):**
```css
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

### 5. **State Management**

**New State:**
```typescript
const [approvingEmployeeId, setApprovingEmployeeId] = useState<string | null>(null)
```

**Purpose:**
- Tracks which employee is currently being approved
- Disables the button for that specific employee
- Prevents concurrent approvals

**Flow:**
1. User clicks "Approve" → `setApprovingEmployeeId(employeeId)`
2. API call in progress → Button shows "Approving..."
3. Success/Error → `setApprovingEmployeeId(null)`
4. Table refreshes → Updated status appears

---

### 6. **Auto-Refresh After Approval**

```typescript
await refetchEmployees()
```

**What happens:**
- ✅ TanStack Query automatically refetches employee list
- ✅ Table updates with new status
- ✅ "Approve" button disappears
- ✅ "Approved" badge appears
- ✅ No manual page refresh needed

---

## 🧪 Testing the Feature

### As Admin:

1. **Log in** as admin
2. **Navigate** to `/admin/employees`
3. **Find employee** with "Waiting" status in Actions column
4. **Click "Approve"**
   - Button shows spinner: "Approving..."
   - Green toast appears: "✓ [Name]'s onboarding approved"
   - Table refreshes
   - "Approve" button → "Approved" badge

### Expected Edge Cases:

#### Already Approved:
```
Action: Click "Approve" on already-approved employee
Result: Error toast "✗ Employee has already been approved"
Status: 409 Conflict
```

#### Missing Prerequisites:
```
Action: Click "Approve" on employee without banking info
Result: Error toast "✗ Banking information must be completed before approval"
Status: 400 Bad Request
```

#### Network Error:
```
Action: Approval fails due to network/server issue
Result: Error toast "✗ Failed to approve onboarding"
Button: Re-enabled for retry
```

---

## 🔒 Security & Permissions

### API Route Protection:
- ✅ Requires admin ID in request body
- ✅ Validates employee exists before proceeding
- ✅ Checks current status before allowing approval
- ✅ Uses admin's UUID for audit trail (`admin_approved_by`)

### UI Protection:
- ✅ Admin ID fetched from `localStorage` (admin must be logged in)
- ✅ Alert shown if admin ID missing ("Please log in again")
- ✅ Button only appears in Admin Portal (route-protected)

### RLS Policies (Existing):
- Admins can update all employee records
- Employees cannot approve their own onboarding
- Audit trail preserved (`admin_approved_by`, `admin_approved_at`)

---

## 📊 Database Changes

### Columns Used (Already Exist from Migration 012):
- `admin_approval_status` - Tracks approval state
- `admin_approved_at` - Approval timestamp
- `admin_approved_by` - Admin UUID who approved
- `admin_rejection_reason` - Reason if rejected
- `personal_info_completed_at` - Prerequisite check
- `banking_info_completed_at` - Prerequisite check
- `onboarding_submitted_at` - Prerequisite check

### No New Migrations Needed ✅
All required columns were added in `012_employee_onboarding_system.sql`

---

## 🎯 Acceptance Criteria (All Met)

✅ Admin sees "Approve" button in Employee Directory for employees with `admin_approval_status = 'WAITING'`  
✅ Clicking approve updates employee status to `APPROVED` in database  
✅ Table updates instantly with new status (no manual refresh required)  
✅ Button has loading state ("Approving...") and prevents double-click  
✅ Success toast appears: "✓ [Name]'s onboarding approved"  
✅ Error toast appears for failures with specific error messages  
✅ Proper permission checks (admin ID required)  
✅ Validates prerequisites (personal + banking info completed)  
✅ Prevents approval if already approved (409 Conflict)  
✅ Audit trail maintained (`admin_approved_by`, `admin_approved_at`)

---

## 🚀 Next Steps (Optional Enhancements)

### 1. **Reject Button**
Add a "Reject" button next to "Approve" for WAITING employees:
```typescript
<button onClick={() => setRejectDialogOpen(true)}>
  Reject
</button>
```
Opens a dialog to enter rejection reason, then calls:
```
POST /api/admin/employees/:id/reject-onboarding
Body: { adminId, reason }
```

### 2. **Bulk Approval**
Add checkbox selection and "Approve Selected" button:
```typescript
const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
```

### 3. **Activity Log**
Show approval history in employee drawer:
```typescript
Approved by: Jane Doe (Admin)
Date: Dec 27, 2025 at 3:45 PM
```

### 4. **Email Notifications**
Send email to employee when approved:
```typescript
await sendEmail({
  to: employee.email,
  subject: 'Onboarding Approved',
  body: 'Your onboarding has been approved...'
})
```

### 5. **Onboarding Metrics**
Add dashboard widget showing:
- Pending approvals count
- Average approval time
- Completion rate

---

## 📝 Files Modified

1. **`app/api/admin/employees/[id]/approve-onboarding/route.ts`** (NEW)
   - API route handler for approval
   - Full validation and error handling

2. **`app/admin/employees/page.tsx`**
   - Added onboarding fields to Employee interface
   - Added `approvingEmployeeId` state
   - Added `handleApproveOnboarding()` function
   - Added Actions column to table
   - Added Approve button with loading states
   - Added status badges (Approved, Rejected, Not submitted)

3. **`app/globals.css`**
   - Added `slide-in-right` keyframe animation
   - Added `.animate-slide-in-right` utility class

4. **No DAL Changes Needed**
   - `adminApproveOnboarding()` function already exists in `lib/data/onboarding.ts`

---

## 🎉 Status: ✅ Complete & Ready for Production

All features implemented, tested, and committed to `feature/employee-onboarding-flow` branch.

**Commit:** `feat: add onboarding approval action to Admin Employee Directory`

---

**Last Updated:** December 27, 2025

