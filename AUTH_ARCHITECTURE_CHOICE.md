# 🔐 Authentication Architecture Choice

## Current Situation

Your app currently uses **MOCK AUTH** (localStorage-based), but your database uses **Supabase RLS** (requires Supabase Auth).

This mismatch causes the `42501` RLS policy violation error.

---

## 📊 Two Paths Forward

### Option A: Keep Mock Auth (Quick Fix)

**Run:** `SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql`

#### ✅ Pros
- Works immediately with existing login flow
- No code changes required
- Fast development iteration

#### ❌ Cons
- **NOT production-ready** (no real security)
- Bypasses all RLS protection
- Anyone with your Supabase URL can access all data
- No user sessions, password resets, email verification, etc.

#### Best For
- Development/testing
- Demos
- Proof of concept
- When you plan to add real auth later

---

### Option B: Implement Supabase Auth (Production-Ready)

**Requires code changes** to `sign-in/page.tsx` and `lib/supabase/client.ts`

#### ✅ Pros
- Production-ready security
- RLS policies work correctly
- Built-in features: password reset, email verify, OAuth, MFA
- Proper session management
- Supabase handles auth tokens

#### ❌ Cons
- Requires refactoring sign-in flow
- More initial work (~1-2 hours)
- Need to migrate/recreate test users in Supabase Auth

#### Implementation Steps

1. **Update Sign-In Page:**
```typescript
// OLD (mock):
const response = await fetch('/api/auth/mock-login')

// NEW (Supabase):
import { supabase } from '@/lib/supabase/client'

const { data, error } = await supabase.auth.signInWithPassword({
  email: loginEmail,
  password: loginPassword,
})

if (error) throw error

// Session is automatically stored in Supabase client
// No need for localStorage.setItem('userId', ...)
```

2. **Update Sign-Up Page:**
```typescript
// OLD:
fetch('/api/auth/signup', { body: JSON.stringify({...}) })

// NEW:
const { data, error } = await supabase.auth.signUp({
  email: signupEmail,
  password: signupPassword,
  options: {
    data: { name: signupName }
  }
})
```

3. **Update Data Access:**
```typescript
// No need to pass userId everywhere
// RLS automatically uses auth.uid()

// OLD:
const userId = localStorage.getItem('userId')
await getOnboardingStatus(userId)

// NEW:
// Session is already in Supabase client
await getOnboardingStatus() // Can get user from session internally
```

4. **Create Users in Supabase:**
   - Delete mock login API
   - Create test users via Supabase Dashboard → Authentication → Users
   - Or use `supabase.auth.admin.createUser()` in a seed script

---

## 🎯 Recommendation

### For Right Now (Next 5 Minutes)
Run `SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql` to unblock development.

### For Production (Before Launch)
Switch to Supabase Auth (Option B).

---

## 📋 Decision Table

| Requirement | Mock Auth | Supabase Auth |
|-------------|-----------|---------------|
| Works immediately | ✅ | ❌ (need refactor) |
| Secure for production | ❌ | ✅ |
| Password reset | ❌ | ✅ |
| Email verification | ❌ | ✅ |
| OAuth (Google, etc) | ❌ | ✅ |
| RLS policies work | ❌ (need bypass) | ✅ |
| Session management | ❌ (localStorage) | ✅ (secure tokens) |
| Multi-device login | ❌ | ✅ |
| Development speed | ✅ Fast | ⚠️ Slower |

---

## 🚀 Next Steps

### If Choosing Option A (Mock Auth - Quick Fix)
```bash
# In Supabase SQL Editor:
1. Run: SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql
2. Refresh your browser
3. Click "Start Onboarding" again
4. Should work now!
```

### If Choosing Option B (Supabase Auth - Production)
```bash
# I can help you refactor to Supabase Auth
# Just say: "Let's switch to Supabase Auth"
# I'll update all the necessary files
```

---

## 💡 My Suggestion

**Start with Option A** (mock auth bypass) to:
- Complete and test the onboarding flow
- Ensure all features work end-to-end
- Get the app functional

**Then switch to Option B** before production:
- Refactor to Supabase Auth
- Re-enable proper RLS policies
- Add security best practices

This gives you working app NOW while maintaining a clear upgrade path.

---

**What would you like to do?**

