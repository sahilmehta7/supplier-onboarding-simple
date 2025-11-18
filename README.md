## Supplier Hub SaaS Starter

A compact internal SaaS starter that pairs **Next.js 15 (App Router)** with **React 19**, **Tailwind CSS v4**, **Shadcn UI**, **Prisma**, **NextAuth (Google SSO)**, and a Dockerised PostgreSQL database. The default UI focuses on a dense, data-forward onboarding dashboard suitable for internal teams.

### Tech stack
- Next.js 15 · React 19 · TypeScript
- Tailwind CSS v4 with Shadcn UI components
- Prisma ORM with a PostgreSQL datasource
- NextAuth (database sessions) using the Prisma adapter
- nuqs for URL state management (not yet used, ready when needed)

---

## Prerequisites
- Node.js 20+
- npm 10+
- Docker Desktop (or a local PostgreSQL 16 instance if you prefer manual setup)

---

## 1. Environment variables

Copy the sample env file and fill in the values:

```bash
cp env.example .env.local
```

Required values:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Connection strings for local Postgres (already set for Docker Compose) |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` or similar |
| `NEXTAUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From your Google OAuth credentials |
| `NEXT_PUBLIC_APP_URL` | Used for absolute links in the UI |

> **Google OAuth redirect URI:** `http://localhost:3000/api/auth/callback/google`

---

## 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

Verify the service is healthy:

```bash
docker compose ps
```

---

## 3. Prisma schema & seed data

```bash
npm run db:migrate -- --name init
npm run db:seed
```

Useful extras:

```bash
npm run prisma:generate  # Regenerate the Prisma client
npm run db:studio       # Launch Prisma Studio
```

The default seed creates an `Acme Inc` organisation and a placeholder owner (`owner@example.com`).

---

## 4. Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/signin` where they can use Google SSO. After signing in you land on the internal onboarding overview.

---

## Testing & QA

- **Command summary**
  - `npm test` – run the full Vitest suite (unit + integration)
  - `npm run test:watch` – watch mode while authoring Plan Alpha/Plan Beta specs
- **Environment**: Vitest now runs with `happy-dom` so React Testing Library suites work out of the box.
- **Docs**:
  - `docs/testing-plans/plan-alpha-foundation.md`
  - `docs/testing-plans/plan-beta-flows.md`
  - `docs/testing-plans/plan-gamma-experience.md`

Follow the plan docs to understand ownership, prerequisites, and acceptance criteria for each test layer.

---

## UI components

Shadcn UI was initialised with the “Neutral · New York” theme. Common primitives (button, card, avatar, dropdown, separator, badge, skeleton) are available under `components/ui/`. To add more components:

```bash
npx shadcn@latest add <component>
```

---

## Application structure

### Navigation & layouts
- `/dashboard` – Dashboard overview rendered inside `app/dashboard/layout.tsx`
- `/dashboard/users` – Organization member management
- `/dashboard/settings` – Workspace configuration page
- Sidebar (`AppSidebar`) highlights the active route and shows the current organization name

### Automatic workspace provisioning
- First-time sign-ins that lack memberships are assigned a personal organization via `ensureUserMembership`
- The user becomes the org owner (`role = ADMIN`) and gains immediate access to `/dashboard/users` and `/dashboard/settings`

### User management flows
- `app/dashboard/users/page.tsx` lists all members in the active organization
- `UserList` displays avatar, email, role badge, join date, and action menu
- Invite users via the “Invite User” dialog:
  1. Enter email + desired role
  2. Existing users are added to the organization; new emails create placeholder accounts that can sign in with Google

### Role-based permissions
- Roles: `ADMIN`, `MEMBER`
- Admin-only capabilities:
  - Invite users
  - Update member roles
  - Remove members (cannot remove self or the last admin)
- Permission helpers live in `lib/permissions.ts` and guard both UI and API routes

### API routes
| Route | Method | Description |
| --- | --- | --- |
| `/api/users` | `GET` | List all members in the current organization |
| `/api/users/[id]` | `PATCH` | Update a member’s role (admin-only) |
| `/api/users/[id]` | `DELETE` | Remove a member (admin-only, safeguards last admin) |
| `/api/users/invite` | `POST` | Invite/add a user to the organization |

---

## Architecture Overview

| Layer | Details |
| --- | --- |
| Frontend | Next.js 15 App Router with shared root layout (`app/layout.tsx`) for session hydration and `app/dashboard/layout.tsx` for protected routes. |
| Auth | NextAuth + Prisma adapter (Google provider). Session helpers in `lib/auth.ts`, client hydration via `AuthProvider`. |
| RBAC | Membership + role helpers in `lib/permissions.ts`, organization auto-provisioning in `lib/organizations.ts`. |
| Data | Prisma ORM targeting Postgres (Docker locally). Migrations via `npm run db:migrate`, seeds via `npm run db:seed`. |
| UI Shell | Shadcn UI components + custom sidebar provider. |
| Docs | Detailed phase plans + foundation/security docs in `/docs`. |

See `/docs/foundation-architecture.md` and `/docs/security-baseline.md` for diagrams, session strategy, and environment matrix.

---

## Next steps & recommendations
- Replace the seed data with your production schema and add Prisma migrations as you evolve the database.
- Extend the Shadcn component library as you build out new flows.
- Configure additional NextAuth callbacks (e.g. RBAC) once you introduce role-specific surfaces.
- Add integration tests under `supplier_capabilities/tests` per project convention.

---

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Execute ESLint |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the database with fixtures |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio |
