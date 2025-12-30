# 🚦 DECISION REQUIRED: Authentication Architecture

## Current Status
Your app uses **Mock Authentication** but you're requesting **Supabase Auth RLS policies**.

These are incompatible. You must choose one path.

---

## Path A: Keep Mock Auth (Fastest - 2 Minutes)

### What to Do
1. Run `SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql` in Supabase
2. Continue development with mock auth
3. All RLS checks bypassed for `anon` role

### Files to Run
- `SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql` ✅ (already created)

### Pros
- ✅ Works immediately
- ✅ No code changes
- ✅ Can test full onboarding flow today

### Cons
- ❌ Not production-ready
- ❌ No real security
- ❌ Must refactor before launch

### When to Use
- Development/testing
- POC/demos
- When you plan to add real auth later

---

## Path B: Switch to Supabase Auth (Production-Ready - 2 Hours)

### What to Do
1. Refactor sign-in to use `supabase.auth.signInWithPassword()`
2. Create users in Supabase Auth (Dashboard → Authentication)
3. Run proper RLS migration (the one you requested)
4. Remove localStorage auth code

### Files I'll Create/Update
- `app/(auth)/sign-in/page.tsx` - Use Supabase Auth
- `lib/supabase/client.ts` - Add session helpers
- `lib/utils/auth.ts` - Use Supabase session
- `SUPABASE_RLS_AUTHENTICATED.sql` - Proper RLS policies
- Delete `app/api/auth/mock-login/` - No longer needed

### Pros
- ✅ Production-ready security
- ✅ RLS policies work correctly
- ✅ Session management, password reset, OAuth
- ✅ The instructions you provided will work

### Cons
- ❌ Requires refactoring (~2 hours)
- ❌ Need to recreate test users in Supabase Auth
- ❌ More complex setup

### When to Use
- Production applications
- When security matters
- Long-term maintainability

---

## 📊 Decision Matrix

| Feature | Mock Auth (Path A) | Supabase Auth (Path B) |
|---------|-------------------|----------------------|
| Time to working app | ✅ 2 minutes | ❌ 2 hours |
| Production-ready | ❌ No | ✅ Yes |
| Your RLS request works | ❌ No (`auth.uid()` = NULL) | ✅ Yes |
| Security | ❌ None | ✅ Full |
| Password reset | ❌ | ✅ |
| OAuth (Google) | ❌ | ✅ |
| Session expiry | ❌ | ✅ |
| Multi-device login | ❌ | ✅ |

---

## 💡 My Recommendation

### Short Term (Next 2 Hours)
**Choose Path A** to unblock development:
```bash
# Run in Supabase SQL Editor
SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql
```

This lets you:
- Complete onboarding flow
- Test all features
- Build remaining functionality
- Get a working demo

### Before Production (Next 1-2 Weeks)
**Migrate to Path B**:
- I'll help you refactor to Supabase Auth
- Implement proper RLS policies (exactly as you requested)
- Add security best practices

---

## 🎯 Your RLS Request

The instructions you provided are **perfect for Path B** (Supabase Auth).

They **won't work** for Path A (Mock Auth) because:
```sql
-- This policy requires auth.uid() to return a value:
WITH CHECK (user_id = auth.uid())

-- But with mock auth:
auth.uid() = NULL  -- ❌ Always NULL (no Supabase session)
```

---

## 🚀 Next Step

**Tell me which path:**

### Option 1: "Use Path A - Keep Mock Auth"
I'll guide you through running `SUPABASE_FIX_RLS_FOR_MOCK_AUTH.sql`

### Option 2: "Use Path B - Switch to Supabase Auth"
I'll refactor your sign-in flow to use real Supabase Auth, then implement the RLS policies you requested

---

**Which path do you want to take?**

