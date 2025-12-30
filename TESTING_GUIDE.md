# Testing Guide: Clean Database & Test Users

## 🎯 Purpose
This guide helps you quickly reset your database and create test users for development and testing.

## ⚠️ WARNING
**`SUPABASE_CLEAN_AND_SEED.sql` will DELETE ALL DATA!**  
Only use this in development/testing environments, never in production.

---

## 📋 Step-by-Step Instructions

### Step 1: Run Migration (First Time Only)
If you haven't run the onboarding migration yet:

1. Open `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql`
2. Copy all contents
3. Go to Supabase Dashboard → **SQL Editor**
4. Paste and click **Run**

### Step 2: Clean & Seed Database
When you want to reset everything and start fresh:

1. Open `SUPABASE_CLEAN_AND_SEED.sql`
2. Copy all contents
3. Go to Supabase Dashboard → **SQL Editor**
4. Paste and click **Run**

**Result:** All data deleted, 4 test users created

---

## 👥 Test Users Created

### 1. Admin User
```
Email: admin@test.com
Password: admin123456
Role: admin
Status: active
Access: Full admin portal, can approve onboarding
```

### 2. Manager User
```
Email: manager@test.com
Password: manager123456
Role: manager
Status: active
Reports to: Admin
Access: Manager dashboard, team management
```

### 3. Employee User (Active)
```
Email: employee@test.com
Password: employee123456
Role: employee
Status: active
Reports to: Manager
Access: Employee portal, can submit hours
```

### 4. New Employee (Onboarding)
```
Email: newemployee@test.com
Password: newemployee123456
Status: Onboarding (submitted, awaiting admin review)
Access: Limited - can only view onboarding status
```

---

## 📊 Reporting Structure

```
Admin (admin@test.com)
 └─ Manager (manager@test.com)
     └─ Employee (employee@test.com)

New Employee (newemployee@test.com) - pending onboarding
```

---

## 🧪 Testing Scenarios

### Scenario 1: Test Admin Approval Workflow
1. **Login as admin** (`admin@test.com / admin123456`)
2. **Navigate to** `/admin/onboarding`
3. **See pending onboarding** for "New Employee"
4. **Click "Review"** to see details
5. **Approve with contract details**:
   - Position: Software Developer
   - Rate: 5000 JMD/hour
   - Manager: Manager User
   - Start Date: Today
6. **Verify** employee appears in active employees list
7. **Login as newemployee** to verify access to employee portal

### Scenario 2: Test Timesheet Submission Gate
1. **Login as newemployee** (`newemployee@test.com / newemployee123456`)
2. **Try to submit hours** - should be blocked
3. **See message**: "Complete onboarding first"
4. **Login as admin** and approve onboarding
5. **Login as newemployee** again
6. **Submit hours** - should now work ✅

### Scenario 3: Test New Employee Signup & Onboarding
1. **Logout** of all accounts
2. **Go to** `/sign-in`
3. **Click "Sign Up"** tab
4. **Create new account**:
   - Name: Test User
   - Email: testuser@test.com
   - Password: test123456
5. **Redirected to** `/employee/onboarding`
6. **Complete personal info** form
7. **Complete banking info** form
8. **Submit for review**
9. **Login as admin** to see in queue
10. **Approve** to activate

### Scenario 4: Test Rejection & Resubmission
1. **Login as admin**
2. **Review pending onboarding**
3. **Click "Reject"** with reason: "Invalid bank details"
4. **Login as employee** being rejected
5. **See rejection reason**
6. **Update banking info**
7. **Click "Resubmit"**
8. **Admin reviews again**

### Scenario 5: Test Manager Dashboard
1. **Login as manager** (`manager@test.com / manager123456`)
2. **View team members** (should see Employee User)
3. **Review submissions** from team
4. **Approve/reject** hours

---

## 🔄 Quick Reset Commands

### Reset Everything (Clean Slate)
```sql
-- Run: SUPABASE_CLEAN_AND_SEED.sql
-- Result: All data deleted, 4 test users created
```

### Add More Test Employees (Without Cleaning)
```sql
-- Create another employee
INSERT INTO auth.users (...) VALUES (...);
INSERT INTO employees (...) VALUES (...);
-- Or use the signup form in the app
```

---

## 📝 What Gets Cleaned

The script truncates these tables:
- ✅ `onboarding_events`
- ✅ `onboarding_contract`
- ✅ `onboarding_banking`
- ✅ `onboarding_personal`
- ✅ `onboarding_cases`
- ✅ `invoices`
- ✅ `notifications`
- ✅ `team_members`
- ✅ `submissions`
- ✅ `employees`
- ✅ `projects`
- ✅ `auth.users` (all users deleted)

---

## 🎯 Quick Login URLs

After running the seed script:

- **Admin Portal**: http://localhost:3000/sign-in → `admin@test.com`
- **Manager Dashboard**: http://localhost:3000/sign-in → `manager@test.com`
- **Employee Portal**: http://localhost:3000/sign-in → `employee@test.com`
- **Onboarding Queue**: http://localhost:3000/admin/onboarding (as admin)

---

## 🐛 Troubleshooting

### Error: "Cannot truncate table due to foreign key constraint"
**Solution:** The script handles this with `CASCADE`. If you still get errors, run the clean section twice.

### Error: "Password authentication failed"
**Solution:** The passwords are hashed with bcrypt. Make sure you're using the exact passwords listed above.

### Users can login but have no data
**Solution:** Check that the `user_id` in `employees` table matches the `id` in `auth.users`.

### Onboarding case not appearing in admin queue
**Solution:** Make sure the case `current_state` is `'submitted'`, not `'draft'`.

---

## 📊 Expected Output

When you run `SUPABASE_CLEAN_AND_SEED.sql`, you should see:

```
==========================================
🧹 CLEANING ALL DATA...
==========================================
✅ All tables cleaned
🗑️  Deleting auth users...
✅ Auth users deleted
==========================================
👥 CREATING TEST USERS...
==========================================
✅ Created 3 auth users
📝 Creating employee records...
✅ Created 3 employee records
📁 Creating sample project...
✅ Created sample project
📋 Creating sample onboarding case...
✅ Created sample onboarding case
==========================================
✅ DATABASE SEEDED SUCCESSFULLY!
==========================================
```

---

## 💡 Pro Tips

1. **Bookmark test user credentials** for quick access
2. **Run clean & seed before each testing session** for consistency
3. **Take screenshots of successful flows** for documentation
4. **Test on mobile devices** using ngrok or similar
5. **Create custom seed data** by modifying the SQL script

---

## 🔗 Related Files

- `SUPABASE_ONBOARDING_MIGRATION_FIXED.sql` - Initial schema setup
- `SUPABASE_CLEAN_AND_SEED.sql` - Clean & seed test data
- `QUICK_START_ONBOARDING.md` - Onboarding system guide
- `ONBOARDING_REFACTOR_GUIDE.md` - Technical documentation

---

**Ready to test?** Run the seed script and start with Scenario 1! 🚀

