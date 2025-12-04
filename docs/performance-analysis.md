# Performance Analysis – Vercel Production Slowness
Date: 2025-01-06  
Author: Codex (performance review)

## Symptoms
- Production on Vercel is slow across pages while local dev feels fast, pointing to server-side latency rather than client-side rendering issues.
- All routes render dynamically (no static caching), and multiple database round-trips occur before any HTML is sent.

## Key Findings (code references)
- **Global auth in root layout** – `app/layout.tsx:30-40` calls `auth()` for every route (including marketing and /signin) even though no client code consumes `SessionProvider`. This forces the entire app to be dynamic and issues a NextAuth database lookup on every request.
- **Database-backed sessions with membership lookups per request** – `lib/auth.ts:53-128` uses `session.strategy = "database"` and the session callback fetches memberships on every `auth()` call. Each call typically hits Postgres 2-3 times (session + user + memberships).
- **Duplicate session + membership queries per page** – Example for `/dashboard`:
  - Root layout `auth()` (DB round-trips) → dynamic render.
  - Dashboard layout `auth()` plus `isSupplier()` which calls `auth()` again and `prisma.user.findUnique` (`app/dashboard/layout.tsx:17-36`, `lib/permissions.ts:4-68`).
  - Page-level membership + drafts queries (`app/dashboard/page.tsx:32-70`).
  - Net: 5–7 Postgres calls before the first byte is sent; on Vercel these are network hops to the database.
- **Supplier routes have the same pattern** – `app/supplier/layout.tsx:12-30` (`auth()` + `isSupplier()` + membership enforcement) plus `app/supplier/page.tsx:16-73` and `lib/supplier-access.ts:56-85,146-169`. This repeats multiple membership lookups per request.
- **Internal HTTP round-trips** – Form “prepare” pages fetch metadata via `fetch(new URL(..., process.env.NEXTAUTH_URL))` (`app/forms/(by-entity)/[formSlug]/[geographyCode]/prepare/page.tsx:42-55` and `(by-config)/.../prepare/page.tsx:29-42`). This makes an extra network hop and re-runs a DB query the page already has data for. If `NEXTAUTH_URL` is mis-set, it falls back to `http://localhost:*` and can stall.
- **Uncached read-mostly data** – Static lists like organizations (`app/dashboard/settings/page.tsx:1-41`) and form configs (`lib/supplier-access.ts:146-169`, `lib/forms/form-config-fetcher.ts:8-72`) are fetched on every request with no `revalidate`/`cache`, keeping all routes dynamic.
- **No pooling/region hints** – There is no preferred region or connection pooling configuration for Vercel; if Postgres is in another region, each of the above calls pays cross-region latency.

## Why prod is slower than local
- Local dev hits a nearby database over a warm long-lived connection; Vercel runs serverless functions that cold-start and open new connections to a remote Postgres instance for every `auth()`/Prisma call.
- Because `auth()` runs in the root layout and again in each nested layout/page, every navigation causes several serialized DB round-trips plus an extra HTTP call on some pages. With cross-region latency, this easily balloons TTFB.

## Recommendations (priority ordered)
1) **Stop global session fetch** – Remove `auth()` from `app/layout.tsx` (or wrap only protected segments). Keep a lightweight public root and only hydrate `SessionProvider` where `useSession` is actually used. This restores static rendering for public pages and removes one DB hit per request.
2) **Switch to JWT sessions or slim the session callback** – Using NextAuth’s JWT strategy (or moving role fetching out of the session callback) removes DB lookups for session validation (`lib/auth.ts:53-128`). If DB sessions must stay, avoid membership queries in callbacks and rely on cached helpers instead.
3) **Memoize request-scoped auth/membership** – Wrap `auth`/membership helpers in `react-cache` or pass the resolved session/membership down the tree so `isSupplier`, layouts, and pages do not re-run `auth()` and Prisma queries multiple times per request.
4) **Drop internal HTTP fetches** – In form prepare pages, call `getFormConfigById`/`calculateFormMetadata` directly instead of `fetch`ing `/api/forms/.../metadata`. This removes an HTTP hop and a duplicate Prisma query; also set `NEXTAUTH_URL` in Vercel to avoid localhost fallbacks.
5) **Cache read-mostly queries** – Use `revalidate`/`unstable_cache` for form configs, organizations, and supplier form lists so they’re served from Vercel’s cache instead of hitting Postgres every time.
6) **Align infra** – Ensure the database is in the same region as the Vercel deployment and use a pooled connection string (Neon/Supabase pooler or `?pgbouncer=true`). Add Vercel Insights/DB query logging to verify request-level query counts and TTFB.

If you want, I can prototype the layout/auth refactor and caching changes to validate the TTFB improvements.
