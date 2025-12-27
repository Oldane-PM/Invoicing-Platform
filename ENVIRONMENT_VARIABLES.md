# Environment Variables Guide

This document explains all environment variables used in the Invoice Platform application, their security levels, and how to obtain them.

## 🔐 Security Classification

### 🔴 **CRITICAL - NEVER SHARE PUBLICLY**
These keys provide full access to your systems and must be kept absolutely secret:

- `BETTER_AUTH_SECRET` - Master secret for authentication system
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access (bypasses RLS policies)

**⚠️ WARNING:** If these keys are exposed, immediately rotate them in their respective dashboards.

### 🟡 **INTERNAL ONLY - TEAM SHARING OK**
These can be shared within your team but not publicly:

- `GOOGLE_CLIENT_ID` - Google OAuth client identifier
- `ALLOWED_GOOGLE_DOMAIN` - Your company domain restriction
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL

### 🟢 **PUBLIC - SAFE TO EXPOSE**
These are designed to be included in client-side code:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key (with RLS protection)
- `NEXT_PUBLIC_APP_URL` - Your application URL

---

## 📋 Environment Variables Reference

### Supabase Configuration

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type:** Public
- **Purpose:** Your Supabase project URL
- **Example:** `https://xxxxx.supabase.co`
- **How to get:** Supabase Dashboard → Settings → API → Project URL

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type:** Public
- **Purpose:** Client-side authentication and database access (protected by RLS)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to get:** Supabase Dashboard → Settings → API → Project API keys → anon/public

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type:** 🔴 CRITICAL SECRET
- **Purpose:** Server-side operations that bypass Row Level Security
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **How to get:** Supabase Dashboard → Settings → API → Project API keys → service_role
- **⚠️ WARNING:** This key has unrestricted database access. Only use on the server.

---

### Authentication Configuration

#### `BETTER_AUTH_SECRET`
- **Type:** 🔴 CRITICAL SECRET
- **Purpose:** Encrypts sessions and signs tokens
- **Example:** `kcq33RxSsk5PDIJi1VGBFAu2znHUliDLyNG/qG2W1UM=`
- **How to generate:**
  ```bash
  openssl rand -base64 32
  ```
- **⚠️ WARNING:** Changing this will invalidate all existing sessions.

#### `BETTER_AUTH_URL`
- **Type:** Internal
- **Purpose:** Base URL for authentication callbacks
- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com`

---

### Google OAuth Configuration

#### `GOOGLE_CLIENT_ID`
- **Type:** Internal (can share with team)
- **Purpose:** Identifies your application to Google OAuth
- **Example:** `123456789-xxxxx.apps.googleusercontent.com`
- **How to get:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  2. Create OAuth 2.0 Client ID (Web application)
  3. Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

#### `GOOGLE_CLIENT_SECRET`
- **Type:** 🔴 CRITICAL SECRET
- **Purpose:** Authenticates your application to Google
- **Example:** `GOCSPX-xxxxx`
- **How to get:** Same as Client ID (shown once when creating OAuth credentials)
- **⚠️ WARNING:** If exposed, regenerate immediately in Google Cloud Console.

#### `ALLOWED_GOOGLE_DOMAIN`
- **Type:** Internal
- **Purpose:** Restricts sign-in to specific email domain
- **Example:** `intellibus.com`
- **Note:** Only users with `@intellibus.com` emails can authenticate

---

### Application Configuration

#### `NEXT_PUBLIC_APP_URL`
- **Type:** Public
- **Purpose:** Base URL for the application
- **Development:** `http://localhost:3000`
- **Production:** `https://your-production-domain.com`
- **Usage:** Used for generating absolute URLs, OAuth callbacks, etc.

---

## 🚀 Setup Instructions

### For New Team Members

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Request credentials from your team lead:**
   - Supabase URL and keys
   - Google OAuth credentials
   - Better Auth secret

3. **Update `.env.local`** with the provided values

4. **Verify the setup:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` and test Google sign-in

### For New Projects

1. **Set up Supabase:**
   - Create project at [supabase.com](https://supabase.com)
   - Run migrations from `/supabase/migrations/`
   - Copy API keys from Settings → API

2. **Generate Better Auth secret:**
   ```bash
   openssl rand -base64 32
   ```

3. **Configure Google OAuth:**
   - Create project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Configure authorized redirect URIs

4. **Create `.env.local`** using `.env.example` as template

---

## 🔄 Key Rotation

If a secret key is compromised:

### BETTER_AUTH_SECRET
1. Generate new secret: `openssl rand -base64 32`
2. Update `.env.local`
3. Restart application
4. All users will need to sign in again

### GOOGLE_CLIENT_SECRET
1. Go to Google Cloud Console
2. Edit OAuth 2.0 Client
3. Regenerate secret
4. Update `.env.local`
5. Restart application

### SUPABASE_SERVICE_ROLE_KEY
1. Go to Supabase Dashboard
2. Settings → API → Reset service_role key
3. Update `.env.local`
4. Restart application

---

## 📝 Notes

- **Never commit `.env.local`** to version control (already in `.gitignore`)
- **Use different keys** for development, staging, and production
- **Rotate secrets regularly** (every 90 days recommended)
- **Audit key access** periodically
- **Use environment-specific keys** on deployment platforms (Vercel, Netlify, etc.)

---

## ❓ Troubleshooting

### "Invalid JWT" errors
- Check that `BETTER_AUTH_SECRET` hasn't changed
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct

### Google OAuth fails
- Verify redirect URIs match in Google Cloud Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure your email matches `ALLOWED_GOOGLE_DOMAIN`

### Database connection issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is not paused
- Confirm API keys are from the correct project

---

## 🔗 Useful Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Google Cloud Console](https://console.cloud.google.com)
- [Better Auth Documentation](https://better-auth.com)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

