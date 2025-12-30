# Fix: PGRST116 / 406 Errors on Employee Fetch

## 🐛 Root Cause

**Problem:** App queries `employees.id = auth_user_id` when it should query `employees.user_id = auth_user_id`

- `employees.id` = Employee row PK (UUID)
- `employees.user_id` = Foreign key to `auth.users.id` (UUID)

localStorage stores the **auth user ID**, but old code treats it as the employee row ID.

## ✅ Fix Applied

### 1. Created New DAL Function

**File:** `lib/data/employees.ts`

Added `getEmployeeByUserId(userId)`:
- Queries by `employees.user_id` (correct)
- Uses `.maybeSingle()` instead of `.single()` (handles null gracefully)
- Returns `null` if no employee record exists (onboarding scenario)
- Includes logging for debugging

### 2. Update Required in `app/employee/page.tsx`

**Lines to Change:**

```typescript
// OLD (❌ WRONG):
useEffect(() => {
  const storedEmployeeId = localStorage.getItem('employeeId')
  if (!storedEmployeeId) {
    router.push('/sign-in')
    return
  }
  setEmployeeId(storedEmployeeId)
  loadEmployee()
}, [router])

const loadEmployee = async () => {
  if (!employeeId) return
  setLoadingEmployee(true)
  const employeeData = await getEmployeeById(employeeId) // ❌ Queries by employees.id
  // ...
}

// NEW (✅ CORRECT):
useEffect(() => {
  const storedUserId = localStorage.getItem('userId') || localStorage.getItem('employeeId')
  if (!storedUserId) {
    router.push('/sign-in')
    return
  }
  setUserId(storedUserId)
  loadEmployee(storedUserId)
}, [router])

const loadEmployee = async (uid: string) => {
  if (!uid) return
  
  try {
    setLoadingEmployee(true)
    const employeeData = await getEmployeeByUserId(uid) // ✅ Queries by employees.user_id
    
    // Handle null (no employee record yet)
    if (!employeeData) {
      console.log('[Employee Portal] No employee record found, redirecting to onboarding')
      router.push('/employee/onboarding')
      return
    }
    
    // Set both userId and employeeId for backward compatibility
    setUserId(uid)
    setEmployeeId(employeeData.id)
    
    // Format last login from updated_at timestamp
    const lastLoginDate = employeeData.updated_at 
      ? format(new Date(employeeData.updated_at), 'MMM dd, yyyy, h:mm a')
      : employeeData.created_at
        ? format(new Date(employeeData.created_at), 'MMM dd, yyyy, h:mm a')
        : 'Never'

    setEmployee({
      name: employeeData.name,
      lastLogin: lastLoginDate,
      hourlyRate: employeeData.hourly_rate || null,
      onboarding_status: employeeData.onboarding_status as any,
    })
  } catch (error) {
    console.error('Error loading employee data:', error)
    // Don't throw - just show error state
  } finally {
    setLoadingEmployee(false)
  }
}
```

### 3. Update Other Fetch Calls

**In the same file, around line 437-442:**

```typescript
// OLD:
const employee = await getEmployeeById(employeeId) // ❌

// NEW:
const employee = employeeId 
  ? await getEmployeeById(employeeId) // Use row ID if we have it
  : await getEmployeeByUserId(userId) // Otherwise use auth ID
```

### 4. Update Imports

```typescript
// OLD:
import { getEmployeeById } from '@/lib/supabase/queries/employees'

// NEW:
import { getEmployeeByUserId, getEmployeeById } from '@/lib/data/employees'
```

## 🎯 Testing Checklist

After applying the fix:

- [ ] No more `PGRST116` errors in console
- [ ] No more `HTTP 406` responses for employee queries
- [ ] Employee portal loads correctly for existing employees
- [ ] New signups redirect to onboarding (no crash)
- [ ] localStorage values are used correctly
- [ ] Timesheet submission still works

## 📝 Files Changed

1. ✅ `lib/data/employees.ts` - Added `getEmployeeByUserId()` function
2. ⏳ `app/employee/page.tsx` - Update to use new function (IN PROGRESS)
3. ⏳ `app/profile/page.tsx` - Same fix needed
4. ⏳ `app/employee/onboarding/personal/page.tsx` - Already fixed
5. ⏳ Any other component using `getEmployeeById` with localStorage value

## 🚀 Quick Apply

**To apply this fix immediately:**

1. `lib/data/employees.ts` is already updated ✅
2. Update `app/employee/page.tsx` with the code above
3. Restart dev server
4. Clear localStorage and login fresh
5. Verify no 406 errors

## 🔍 Debug Helper

Add this to any component having issues:

```typescript
useEffect(() => {
  const userId = localStorage.getItem('userId') || localStorage.getItem('employeeId')
  console.log('🔍 Debug Info:', {
    userId,
    isAuthUUID: userId?.length === 36,
    localStorageKeys: Object.keys(localStorage),
  })
}, [])
```

## 🎓 Key Learnings

1. **Always distinguish** between auth user ID and database row ID
2. **Use `.maybeSingle()`** when a record might not exist yet
3. **Handle null gracefully** - redirect to onboarding, don't crash
4. **Log queries** during development for easier debugging
5. **Separate concerns** - use `user_id` for auth lookups, `id` for internal references

---

**Status:** ✅ DAL Fixed | ⏳ Component Updates In Progress

**Next Step:** Apply the component changes and test end-to-end

