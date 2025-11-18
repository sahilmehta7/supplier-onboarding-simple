# Auth & RBAC Strategy

## Authentication
- **Provider:** NextAuth with Google OAuth (Prisma adapter, database sessions).
- **Session Hydration:** `auth()` helper in `app/layout.tsx` fetches server-side session → `AuthProvider` for client components.
- **Callbacks:**
  - `jwt` callback loads membership roles on initial sign-in and stores as `token.organizationRoles`.
  - `session` callback exposes `session.user.organizationRoles` for layouts/components.

## Roles
- Enum `MembershipRole` defined in Prisma schema: `ADMIN`, `MEMBER`, `SUPPLIER`, `PROCUREMENT`, `MDM`.
- Memberships tie a user to an organization with a specific role.
- Internal dashboards currently use ADMIN/MEMBER; supplier/internal personas introduced in future phases.

## Permission Helpers
- `lib/permissions.ts`
  - `getCurrentUserMembership()` fetches membership (used in API routes).
  - `isAdmin` / `requireAdmin` guard sensitive routes (user management).
  - Future utility: `requireRole(role, organizationId)` to support PROC/MDM flows.

## Session Shape
```ts
session.user = {
  id,
  name?,
  email?,
  organizationRoles: Array<{ organizationId: string; role: MembershipRole }>
}
```
- Accessible in layouts/components for conditional rendering (e.g., admin-only buttons).

## Access Patterns
- **Layouts:** Protected `app/dashboard/layout.tsx` redirects unauthenticated users to `/signin`.
- **API Routes:** All `/api/users/*` routes call `auth()` + `requireAdmin` before mutating memberships.
- **Auto-Provisioning:** `ensureUserMembership` assigns first-login users as `ADMIN` for their workspace.

## Future Work
- Route middleware for role-based access to `/dashboard/procurement`, `/dashboard/mdm`, `/admin`.
- Supplier-specific auth policy (allowlist vs invitation) when external portal launches.
- Optional domain restrictions enforced via `signIn` callback.
