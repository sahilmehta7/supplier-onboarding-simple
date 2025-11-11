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

## UI components

Shadcn UI was initialised with the “Neutral · New York” theme. Common primitives (button, card, avatar, dropdown, separator, badge, skeleton) are available under `components/ui/`. To add more components:

```bash
npx shadcn@latest add <component>
```

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
