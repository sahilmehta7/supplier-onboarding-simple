# Security & RBAC Baseline

## Session Strategy
- NextAuth database sessions via Prisma adapter (`session.strategy = "database"`).
- Callbacks (Phase 1) will add `role`, `organizationIds` into `session.user` and JWT tokens.
- Session hydration happens server-side in `app/layout.tsx`, preventing flicker.

## Authentication Decisions
- Stick with Google SSO for internal users initially; evaluate passwordless/email OTP for suppliers later.
- `signIn` callback can enforce domain allowlist for internal roles.
- Future: multi-provider support for external suppliers.

## Role Model
- Current roles: `admin`, `member` (internal workspace concept).
- Target roles: `SUPPLIER`, `PROCUREMENT`, `MDM`, `ADMIN` with organization/entity scoping.
- Membership table links `userId` ↔ `organizationId` + `role`.

## Authorization Guards
- Server helpers (`requireAdmin`, `canManageUsers`) used in API routes and pages.
- App Router layouts ensure `auth()` before rendering protected sections.
- Plan to add middleware for route-level role checks once roles expand.

## Environment & Secrets
- `.env.example` lists required vars (DB, NextAuth, Google, etc.).
- Environment matrix tracked in Phase 0 doc; secrets stored in Vercel env settings for staging/prod.
- Rotation cadence: quarterly or on staff changes; log updates in `/docs/security-baseline.md`.

## Data Protection
- Sensitive fields (bank info) to be masked / encrypted at rest in later phases.
- File uploads validated client + server side; stored in private bucket (Phase 2 implementation).

## Logging & Monitoring Roadmap
- Structured logs around auth events + API actions (Phase 6).
- Audit log table capturing actor/action/time/payload.

## Action Items
- [ ] Implement callback enrichment for role/org claims.
- [ ] Design supplier-facing auth policy (SSO vs passwordless).
- [ ] Automate secret parity checks between environments.
