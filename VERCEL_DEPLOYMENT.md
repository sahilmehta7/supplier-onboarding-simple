# Vercel Deployment Guide

This application is ready for deployment on Vercel. Please follow the steps below to ensure a smooth deployment.

## 1. Environment Variables

You must configure the following environment variables in your Vercel project settings:

### Database (Prisma)
- `DATABASE_URL`: Your connection string (e.g., from Supabase, Neon, or other Postgres provider).
- `DIRECT_URL`: (Optional) Used for migrations if your database requires it (e.g., Supabase).

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
- **Build Command:** `next build` (Default)
- **Install Command:** `npm install` (Default)
- **Output Directory:** `.next` (Default)

A `postinstall` script has been added to `package.json` to automatically run `prisma generate` during deployment.

## 4. Deployment Steps

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project in Vercel.
3.  Add the Environment Variables listed above.
4.  Click **Deploy**.

## 5. Troubleshooting

- **Prisma Errors:** If you see errors related to Prisma Client, ensure `prisma generate` ran successfully (check the build logs). The added `postinstall` script should handle this.
- **Database Connection:** Ensure your database allows connections from Vercel's IP addresses or is open to the internet (0.0.0.0/0) if using a managed service.
