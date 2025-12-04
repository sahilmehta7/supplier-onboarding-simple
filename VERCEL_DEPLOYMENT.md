# Vercel Deployment Guide

This application is ready for deployment on Vercel. Please follow the steps below to ensure a smooth deployment.

## 1. Environment Variables

You must configure the following environment variables in your Vercel project settings:

### Database (Prisma)

**Important for Supabase users:** Use connection pooling for optimal performance on Vercel.

- `DATABASE_URL`: Your **pooled** connection string
  - **For Supabase**: Use the **Transaction mode** pooler connection string
  - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
  - Find it in: Supabase Dashboard > Project Settings > Database > Connection Pooling > Transaction mode
  - This prevents connection exhaustion on serverless functions
  
- `DIRECT_URL`: Direct (non-pooled) connection string
  - **For Supabase**: Use the **Session mode** or direct connection string
  - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
  - Find it in: Supabase Dashboard > Project Settings > Database > Connection String
  - Required for running migrations with `prisma migrate deploy`

**Why use connection pooling?**
Vercel serverless functions create new database connections frequently. Without pooling, you may hit connection limits (default: 15-100 connections depending on your plan). Connection pooling via PgBouncer allows thousands of serverless function invocations to share a small pool of actual database connections.

### Authentication (NextAuth)
- `NEXTAUTH_URL`: The URL of your deployed application (e.g., `https://your-app.vercel.app`).
- `NEXTAUTH_SECRET`: A random string used to hash tokens. You can generate one with `openssl rand -base64 32`.
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.

### Email (Resend)
- `RESEND_API_KEY`: Your Resend API key.
- `EMAIL_FROM`: The email address to send from (e.g., `onboarding@yourdomain.com`).

### File Storage (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (found in Project Settings > API). **Important:** Do not use the Anon key, as we need server-side access to bypass RLS for uploads.
- `SUPABASE_STORAGE_BUCKET`: (Optional) Name of the storage bucket. Defaults to `documents`.

## 2. File Storage Setup

**Important:** The application is configured to use **Supabase Storage** when the above environment variables are present.

1.  Go to your Supabase Dashboard > Storage.
2.  Create a new bucket named `documents` (or whatever you set `SUPABASE_STORAGE_BUCKET` to).
3.  **Privacy:** You can make the bucket **Private** since all access is proxied through the application's API, which handles authentication.
4.  **Policies:** Since we are using the `SUPABASE_SERVICE_ROLE_KEY`, we bypass RLS policies for server-side operations. However, it is good practice to add a policy that denies public access.

If these variables are **not** set, the app will fall back to local filesystem storage, which is **not persistent** on Vercel.

## 3. Build Configuration

- **Framework Preset:** Next.js
- **Build Command:** `prisma migrate deploy && npm run db:seed:prod && next build`
- **Install Command:** `npm install` (Default)
- **Output Directory:** `.next` (Default)

**Note:** The build command above ensures that:
1.  Database migrations are applied.
2.  Form configurations (Unimacts US & Zetwerk India) are seeded/updated.
3.  The Next.js app is built.

A `postinstall` script has been added to `package.json` to automatically run `prisma generate` during deployment.

## 4. Deployment Steps

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project in Vercel.
3.  Add the Environment Variables listed above.
4.  Click **Deploy**.

## 5. Troubleshooting

### Prisma Errors
If you see errors related to Prisma Client, ensure `prisma generate` ran successfully (check the build logs). The added `postinstall` script should handle this.

### Database Connection Issues

**"Too many connections" or "P1001: Can't reach database server"**
- Verify you're using the **Transaction mode pooler** connection string for `DATABASE_URL`
- Check that your connection string includes `?pgbouncer=true` parameter
- For Supabase: Ensure connection pooling is enabled in your project settings

**"Error: prepared statement already exists"**
- This occurs when using Session mode pooler for `DATABASE_URL`
- Solution: Use Transaction mode pooler instead (it doesn't support prepared statements but works better with serverless)

**Migration Failures**
- Ensure `DIRECT_URL` is set to a non-pooled connection (Session mode or direct connection)
- The build command runs migrations, so this must be a direct connection that supports DDL operations

**Slow Query Performance**
- Check Vercel function logs for slow query warnings (queries >1000ms are logged)
- Review the query patterns and ensure indexes are properly set
- Consider upgrading your database plan if you're hitting resource limits

### Network Configuration
- Supabase allows connections from anywhere by default (0.0.0.0/0)
- If using a different provider, ensure your database allows connections from Vercel's IP addresses
- For enhanced security, you can restrict to Vercel's IP ranges (check Vercel documentation for current ranges)
