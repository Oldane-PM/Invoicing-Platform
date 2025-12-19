# Authentication Setup Guide

This project uses [Better Auth](https://www.better-auth.com/) with Google SSO for authentication. Only users with `@intellibus.com` email addresses are allowed to sign in.

## Environment Variables

Add the following environment variables to your `.env.local` file (for development) and Vercel environment settings (for production):

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET=<generate-a-random-long-string>
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Domain Restriction
ALLOWED_GOOGLE_DOMAIN=intellibus.com
```

### Generating `BETTER_AUTH_SECRET`

You can generate a secure random string using:

```bash
openssl rand -base64 32
```

Or using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Setting Up Google OAuth Credentials

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### Step 2: Enable the Google+ API

1. Navigate to **APIs & Services > Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **Internal** (for Workspace users only) or **External**
3. Fill in the required fields:
   - App name: "Intellibus Invoicing Platform"
   - User support email: Your email
   - Developer contact email: Your email
4. Add scopes:
   - `email`
   - `profile`
   - `openid`
5. Save and continue

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Configure the following:
   - **Name**: "Intellibus Invoicing Platform"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://your-production-domain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-production-domain.com/api/auth/callback/google` (production)
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Redirect URL Pattern

Better Auth expects callbacks at:

```
https://<domain>/api/auth/callback/google
```

Make sure this URL is added to your Google OAuth credentials.

## Testing Locally

1. Copy `.env.example` to `.env.local` (if available) or create `.env.local`
2. Add all the required environment variables
3. Run `npm run dev`
4. Navigate to `http://localhost:3000/login`
5. Click "Continue with Google"
6. Sign in with an `@intellibus.com` account

## Production Deployment

When deploying to Vercel or another platform:

1. Update `BETTER_AUTH_URL` to your production URL
2. Add the production redirect URI to Google OAuth credentials
3. Ensure all environment variables are set in your hosting platform

## Troubleshooting

### "unauthorized_domain" Error

This error appears when a user tries to sign in with a non-Intellibus email. Only `@intellibus.com` accounts are allowed.

### "google_auth_failed" Error

This is a generic Google OAuth error. Check:
- Your Google OAuth credentials are correct
- The redirect URIs match exactly
- The OAuth consent screen is properly configured

