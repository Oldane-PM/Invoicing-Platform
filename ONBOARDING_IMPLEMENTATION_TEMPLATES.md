# Employee Onboarding System - Implementation Templates

## 🎯 What's Complete
- ✅ Database migration (012_employee_onboarding_system.sql)
- ✅ Data access layer (lib/data/onboarding.ts)
- ✅ OnboardingProgress component
- ✅ Welcome page (/employee/onboarding)

## 📋 Remaining Implementation

---

## 1️⃣ PERSONAL INFORMATION FORM
**File:** `app/employee/onboarding/personal/page.tsx`
**Priority:** HIGH (Step 1 of employee flow)

### Requirements:
- Form with fields: Full Name, Address, State, Country, Zip Code, Email, Phone
- Stepper UI (Step 1 of 2)
- Save & Continue button
- Auto-save personal_info_completed_at timestamp
- Redirect to banking page on success

### Template Structure:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { savePersonalInfo } from '@/lib/data/onboarding'
// Form with validation
// Progress indicator (1 of 2)
// Save button calls savePersonalInfo(employeeId, formData)
// Navigate to /employee/onboarding/banking on success
```

### API Call:
```typescript
const result = await savePersonalInfo(employeeId, {
  name: formData.fullName,
  address: formData.address,
  state_parish: formData.state,
  country: formData.country,
  zip_code: formData.zipCode,
  email: formData.email,
  phone: formData.phone,
})
```

---

## 2️⃣ BANKING INFORMATION FORM
**File:** `app/employee/onboarding/banking/page.tsx`
**Priority:** HIGH (Step 2 of employee flow)

### Requirements:
- Form with fields: Bank Name, Bank Address, SWIFT Code, ABA Routing, Account Type, Currency, Account Number
- Stepper UI (Step 2 of 2)
- Save & Continue button
- Auto-save banking_info_completed_at timestamp
- Call submitOnboarding() after saving
- Redirect to status page on success

### Template Structure:
```typescript
'use client'
import { useState } from 'react'
import { saveBankingInfo, submitOnboarding } from '@/lib/data/onboarding'
// Form with banking fields
// Progress indicator (2 of 2)
// Submit button:
//   1. saveBankingInfo()
//   2. submitOnboarding() 
//   3. Navigate to /employee/onboarding/status
```

### API Calls:
```typescript
await saveBankingInfo(employeeId, {
  bank_name: formData.bankName,
  bank_address: formData.bankAddress,
  swift_code: formData.swiftCode,
  aba_wire_routing: formData.abaRouting,
  account_type: formData.accountType,
  currency: formData.currency,
  account_number: formData.accountNumber,
})
await submitOnboarding(employeeId)
```

---

## 3️⃣ SUBMISSION STATUS PAGE
**File:** `app/employee/onboarding/status/page.tsx`
**Priority:** HIGH (Shows after submission)

### Requirements:
- "Your Information Has Been Submitted" message
- Badge showing "3 of 6 steps completed"
- <OnboardingProgress /> component
- "Timesheet Submissions Locked" panel
- "What happens next?" info box
- Real-time status updates (optional)
- "View Dashboard" link

### Template Structure:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getOnboardingStatus } from '@/lib/data/onboarding'
import { OnboardingProgress } from '@/components/employee/OnboardingProgress'

export default function OnboardingStatus() {
  const [status, setStatus] = useState(null)
  
  useEffect(() => {
    // Load status
    // If status.onboardingStatus === 'COMPLETE', redirect to /employee
    // Poll or subscribe to updates
  }, [])
  
  return (
    <div>
      {/* Success message */}
      {/* Badge: {status.progress.completed_steps} of 6 */}
      <OnboardingProgress progress={status.progress} approvalStatus={status.adminApprovalStatus} rejectionReason={status.adminRejectionReason} />
      {/* Timesheet lock panel */}
      {/* What happens next */}
      {/* View Dashboard button */}
    </div>
  )
}
```

---

## 4️⃣ TIMESHEET LOCK IMPLEMENTATION
**Files to Modify:**
- `app/employee/page.tsx` (main dashboard)
- Any submit hours modal/form

**Priority:** HIGH (Core requirement)

### Requirements:
- Check `canSubmitTimesheets(employeeId)` before showing submit UI
- If locked:
  - Show lock icon + "Timesheet Submissions Locked" message
  - Disable "Submit Hours" button
  - Provide link to `/employee/onboarding/status`

### Implementation:
```typescript
// In app/employee/page.tsx
import { canSubmitTimesheets } from '@/lib/data/onboarding'

const [canSubmit, setCanSubmit] = useState(false)

useEffect(() => {
  if (employeeId) {
    canSubmitTimesheets(employeeId).then(setCanSubmit)
  }
}, [employeeId])

// In JSX:
{!canSubmit && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
    <div className="flex items-center gap-3">
      <Lock className="w-6 h-6 text-amber-600" />
      <div>
        <h3 className="font-semibold text-amber-900">Timesheet Submissions Locked</h3>
        <p className="text-sm text-amber-700">
          Complete your onboarding to unlock timesheet submissions.
        </p>
        <a href="/employee/onboarding/status" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
          View onboarding status →
        </a>
      </div>
    </div>
  </div>
)}

<button
  onClick={() => setShowSubmitModal(true)}
  disabled={!canSubmit}
  className="..."
>
  Submit Hours
</button>
```

---

## 5️⃣ ADMIN ONBOARDING QUEUE
**File:** `app/admin/onboarding/page.tsx`
**Priority:** MEDIUM (Admin feature)

### Requirements:
- Table showing employees with onboarding_status = 'INCOMPLETE'
- Columns: Name, Email, Status (WAITING/REJECTED/NOT_SUBMITTED), Progress (3/6), Date Submitted
- Filter by status
- Click row to open detail view
- Sort by submission date

### Template Structure:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { getOnboardingQueue } from '@/lib/data/onboarding'

export default function AdminOnboardingQueue() {
  const [queue, setQueue] = useState([])
  const [filter, setFilter] = useState('ALL') // ALL, WAITING, REJECTED
  
  useEffect(() => {
    loadQueue()
  }, [])
  
  const loadQueue = async () => {
    const data = await getOnboardingQueue()
    setQueue(data)
  }
  
  const filteredQueue = queue.filter(item => {
    if (filter === 'ALL') return true
    return item.adminApprovalStatus === filter
  })
  
  return (
    <div>
      {/* Filter tabs */}
      {/* Table with queue items */}
      {/* Click row -> navigate to /admin/onboarding/${id} */}
    </div>
  )
}
```

---

## 6️⃣ ADMIN REVIEW DETAIL PAGE
**File:** `app/admin/onboarding/[id]/page.tsx`
**Priority:** MEDIUM (Admin feature)

### Requirements:
- Display employee info (read-only): personal + banking
- Show OnboardingProgress component
- Action buttons:
  - Approve ✅
  - Reject ❌ (with reason textarea)
  - Complete Contract 📄 (with hourly rate input)
  - Assign Manager 👤 (with manager dropdown)
- Each action updates the DB and refreshes status

### Template Structure:
```typescript
'use client'
import { useState, useEffect } from 'react'
import { 
  getOnboardingStatus,
  adminApproveOnboarding,
  adminRejectOnboarding,
  adminCompleteContract,
  adminAssignManager 
} from '@/lib/data/onboarding'

export default function AdminOnboardingDetail({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState(null)
  const [adminId, setAdminId] = useState('')
  
  useEffect(() => {
    // Get adminId from localStorage
    // Load employee onboarding status
  }, [])
  
  const handleApprove = async () => {
    await adminApproveOnboarding(params.id, adminId)
    // Reload status
  }
  
  const handleReject = async (reason: string) => {
    await adminRejectOnboarding(params.id, reason)
    // Reload status
  }
  
  const handleCompleteContract = async (hourlyRate: number) => {
    await adminCompleteContract(params.id, adminId, { hourly_rate: hourlyRate })
    // Reload status
  }
  
  const handleAssignManager = async (managerId: string) => {
    await adminAssignManager(params.id, managerId)
    // Reload status
  }
  
  return (
    <div>
      {/* Employee info display */}
      <OnboardingProgress progress={employee.progress} ... />
      {/* Action buttons based on current step */}
    </div>
  )
}
```

---

## 🎯 Implementation Priority

### Option A: Complete Employee Flow First (Recommended)
1. Personal form page → Banking form page → Status page → Timesheet lock
2. This unlocks the full employee experience
3. Employees can complete onboarding and see their progress

### Option B: Admin Interface First
1. Admin queue page → Admin detail/action page
2. Allows admin to approve/manage onboarding
3. But employees need forms to submit data first

### Option C: Parallel Development
1. One developer on employee pages
2. Another on admin interface
3. Integrate at the end

---

## 🚀 Quick Start Commands

### Run Migration:
```bash
# In Supabase SQL Editor or CLI:
psql $DATABASE_URL -f supabase/migrations/012_employee_onboarding_system.sql
```

### Test Data Access:
```typescript
import { getOnboardingStatus } from '@/lib/data/onboarding'
const status = await getOnboardingStatus('employee-uuid-here')
console.log(status.progress) // { completed_steps: 1, total_steps: 6, ... }
```

### Component Usage:
```typescript
import { OnboardingProgress } from '@/components/employee/OnboardingProgress'
<OnboardingProgress 
  progress={status.progress} 
  approvalStatus={status.adminApprovalStatus}
  rejectionReason={status.adminRejectionReason}
/>
```

---

## 📝 Notes

- All data access functions are ready in `lib/data/onboarding.ts`
- OnboardingProgress component is styled and ready
- Migration includes triggers for automatic status computation
- RLS policies ensure employees only see their own data
- Admin policies allow full access to manage onboarding

**Estimated Time:**
- Personal form: 1-2 hours
- Banking form: 1-2 hours
- Status page: 1 hour
- Timesheet lock: 30 minutes
- Admin queue: 2 hours
- Admin detail: 2-3 hours

**Total: 8-11 hours** for complete implementation

