# Authentication Fix Guide

## Problem

The error you're seeing:
```
Error fetching employee: 
Object { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "Cannot coerce the result to a single JSON object" }
```

This occurs because the sign-in page uses mock employee IDs that don't exist in your database.

## ✅ Solution Implemented

### 1. **Updated Sign-In Page** (`app/(auth)/sign-in/page.tsx`)
- Now fetches **real employee IDs** from the database instead of hardcoded mocks
- Calls new API endpoint `/api/auth/mock-login` to get valid employees
- Shows error messages if no employees found

### 2. **New API Endpoint** (`app/api/auth/mock-login/route.ts`)
- Fetches a real employee from your database based on selected role
- Returns employee ID, name, email, and role
- Provides helpful error messages if no employees exist

### 3. **Database Seed Script** (`scripts/seed-test-employees.js`)
- Creates test employees for each role (Employee, Manager, Admin)
- Can be run multiple times safely (won't create duplicates)

## 🚀 How to Fix

### Step 1: Create Test Employees

Run this command to create test employees in your database:

```bash
npm run db:seed
```

This will create:
- **Test Employee** (employee@test.com) - Regular employee
- **Test Manager** (manager@test.com) - Manager role
- **Test Admin** (admin@test.com) - Admin role

### Step 2: Restart Your Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Try Logging In Again

1. Go to http://localhost:3000/sign-in
2. Select a role (Employee, Manager, or Admin)
3. Click "Continue with Google"
4. You should now be logged in successfully!

## 🔧 Manual Database Setup (Alternative)

If the seed script doesn't work, you can manually add employees via Supabase Dashboard:

### 1. Go to Supabase Dashboard
- Visit https://app.supabase.com
- Select your project
- Go to **Table Editor** → **employees**

### 2. Insert New Rows

**Employee:**
```
name: Test Employee
email: employee@test.com
role: employee
status: active
contract_type: Internal Project
rate_type: hourly
hourly_rate: 50
overtime_rate: 75
position: Software Developer
department: Engineering
onboarding_status: completed
contract_start_date: 2024-01-01
```

**Manager:**
```
name: Test Manager
email: manager@test.com
role: manager
status: active
contract_type: Internal Project
rate_type: hourly
hourly_rate: 75
overtime_rate: 100
position: Engineering Manager
department: Engineering
onboarding_status: completed
contract_start_date: 2024-01-01
```

**Admin:**
```
name: Test Admin
email: admin@test.com
role: admin
status: active
contract_type: Operational
rate_type: fixed
monthly_rate: 8000
position: System Administrator
department: Operations
onboarding_status: completed
contract_start_date: 2024-01-01
```

### 3. Copy the Employee IDs

After creating the employees, copy their IDs (UUID format) from the table.

## 🔍 Troubleshooting

### Error: "No employee found for this role"

**Cause:** No employees exist in the database with that role.

**Solution:**
1. Run `npm run db:seed` to create test employees
2. OR manually add employees via Supabase Dashboard (see above)
3. Make sure the `role` column matches: 'employee', 'manager', or 'admin'

### Error: "Failed to fetch employee data"

**Cause:** Database connection issue or missing environment variables.

**Solution:**
1. Check `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```
2. Restart your dev server
3. Check Supabase project is active

### Still Getting Errors After Seeding?

**Clear localStorage and try again:**
```javascript
// Open browser console (F12) and run:
localStorage.clear()
location.reload()
```

Then sign in again.

## 📝 How It Works Now

### Before (Broken):
```
Sign In → Hardcoded Mock ID → Database Query → ❌ No employee found
```

### After (Fixed):
```
Sign In → API Call → Fetch Real Employee ID → Database Query → ✅ Success!
```

### Login Flow:

1. **User selects role** (Employee/Manager/Admin)
2. **Sign-in page calls** `/api/auth/mock-login?role=employee`
3. **API queries database** for an active employee with that role
4. **API returns** real employee ID
5. **ID stored in localStorage**
6. **User redirected** to appropriate dashboard
7. **Dashboard loads** employee data successfully ✅

## 🎯 Testing

After running `npm run db:seed`:

### Test Employee Role
1. Go to sign-in page
2. Select "Employee"
3. Click "Continue with Google"
4. Should redirect to `/` (Employee Dashboard)
5. Should see: "Test Employee" in header

### Test Manager Role
1. Go to sign-in page
2. Select "Manager"
3. Click "Continue with Google"
4. Should redirect to `/manager/dashboard`
5. Should see: "Test Manager" in header

### Test Admin Role
1. Go to sign-in page
2. Select "Admin"
3. Click "Continue with Google"
4. Should redirect to `/admin/dashboard`
5. Should see: "Test Admin" in header

## 🔐 Security Notes

**This is for DEVELOPMENT ONLY.**

- The mock login bypasses actual authentication
- Use Better-Auth or similar in production
- Never expose SUPABASE_SERVICE_ROLE_KEY client-side
- Current implementation is for testing the UI

## 📚 Files Changed

1. ✅ `app/(auth)/sign-in/page.tsx` - Updated to fetch real employees
2. ✅ `app/api/auth/mock-login/route.ts` - New API endpoint (NEW)
3. ✅ `scripts/seed-test-employees.js` - Database seeding script (NEW)
4. ✅ `package.json` - Added `db:seed` script

## ✨ Benefits

- ✅ **No more database errors** - Uses real employee IDs
- ✅ **Easy testing** - One command to create test users
- ✅ **Helpful errors** - Clear messages if something's wrong
- ✅ **Role-based** - Automatically fetches correct role
- ✅ **Idempotent** - Safe to run seed script multiple times

## 🚀 Next Steps

Once logged in successfully:
1. Test the Combobox components we just implemented
2. Explore each portal (Employee, Manager, Admin)
3. Test the filtering and search functionality
4. Review the comprehensive Combobox documentation

## 📞 Still Having Issues?

If you're still seeing errors after following this guide:

1. **Check console for specific error messages**
2. **Verify environment variables are set**
3. **Confirm database migrations have run**
4. **Check Supabase project is active**
5. **Try clearing browser cache and localStorage**

---

**Last Updated**: December 2024  
**Status**: ✅ Ready to Use

