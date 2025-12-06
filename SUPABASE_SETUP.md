# Supabase Setup Instructions

## Finding Your Correct Supabase URL

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Under **Project URL**, copy the URL
   - Format: `https://xxxxx.supabase.co`
   - Example: `https://abcdefghijklmnop.supabase.co`

## Update .env.local

Open `.env.local` and update with your correct Supabase URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## After Updating

1. Save the `.env.local` file
2. **Restart your Next.js dev server** (important - env vars are loaded at startup)
   ```bash
   # Stop the server (Ctrl+C) and restart:
   npm run dev
   ```
3. Test the connection: `http://localhost:3000/api/test-connection`

## Common Issues

- **ENOTFOUND error**: URL is incorrect or project doesn't exist
- **401/403 errors**: API keys are incorrect
- **Connection works but tables missing**: Normal - you need to create database tables first

