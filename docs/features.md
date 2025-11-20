# Supplier Onboarding Portal - Feature Documentation

**Status:** ✅ All Features Complete  
**Last Updated:** 2025-01-21

This document consolidates all completed feature descriptions from the supplier onboarding portal implementation.

---

## Table of Contents

1. [Foundation Architecture](#foundation-architecture)
2. [Core Data & Authentication](#core-data--authentication)
3. [Supplier Experience Portal](#supplier-experience-portal)
4. [Procurement Workflow](#procurement-workflow)
5. [Admin Configuration Console](#admin-configuration-console)

---

## Foundation Architecture

**Status:** ✅ Complete  
**Related Phase:** Phase 0

### Overview

The Supplier Onboarding Portal is built on **Next.js 15 (App Router)** with **React 19**, **NextAuth**, **Prisma**, and **PostgreSQL**. The architecture supports multi-tenant organizations with role-based access control (RBAC) and a secure authentication flow using Google SSO.

### Tech Stack

- **Frontend:** Next.js 15 App Router, React 19, TypeScript
- **UI:** Tailwind CSS v4, Shadcn UI components
- **Authentication:** NextAuth with Google provider, Prisma adapter for session storage
- **Database:** PostgreSQL via Prisma ORM
- **State Management:** URL state management ready (nuqs)

### Architecture Components

#### Request Flow
1. **Root Layout** (`app/layout.tsx`) - Hydrates session via `AuthProvider`
2. **Auth Layer** (`lib/auth.ts`) - NextAuth configuration with Google provider, custom callbacks
3. **Permissions** (`lib/permissions.ts`) - Role/membership guards for server components and API routes
4. **Organizations** (`lib/organizations.ts`) - Auto-provision workspace logic
5. **Dashboard Layout** (`app/dashboard/layout.tsx`) - Sidebar navigation and protected route wrapper

#### Authentication Strategy

- **Session Storage:** Database sessions via Prisma adapter (not JWT)
- **Provider:** Google SSO only (passwordless/email auth deferred for external suppliers)
- **Session Enrichment:** Role and organization data loaded in NextAuth callbacks
- **Guards:** Server-side `requireRole()` and `assertOrgAccess()` helpers

#### Environment Setup

| Environment | URL | Secrets Source |
|------------|-----|----------------|
| Local | `http://localhost:3000` | `.env.local` (copied from `env.example`) |
| Staging | `https://supplier-hub-stg.vercel.app` (placeholder) | Vercel env vars |
| Production | `https://supplier-hub.vercel.app` (placeholder) | Vercel prod env vars |

#### Database

- **Connection:** PostgreSQL via Docker Compose (or local instance)
- **Migrations:** Prisma migrations (`npm run db:migrate`)
- **Seed Data:** `prisma/seed.ts` provisions demo org/user/entities/geographies

### Key Architectural Decisions

1. **NextAuth + Prisma** instead of Supabase Auth (per Phase 0 decision document)
2. **Database sessions** for better security and session management
3. **Multi-tenant via organizations** with RBAC at membership level
4. **Server components first** approach with minimal client-side state

### Security

- All requests over HTTPS in production
- Role-based permissions enforced at database and application level
- Session management via secure database storage
- Environment secrets managed via Vercel or `.env.local`

### Documentation References

- `/docs/foundation-architecture.md` (detailed architecture diagram)
- `/docs/security-baseline.md` (session strategy, role model, env matrix)

---

## Core Data & Authentication

**Status:** ✅ Complete  
**Related Phase:** Phase 1

### Overview

The application uses a comprehensive Prisma schema supporting multi-tenant organizations, role-based access control, dynamic form configurations, and a complete onboarding workflow. Authentication is handled via NextAuth with session enrichment for roles and organizations.

### Data Model

#### Core Tables

##### Users & Organizations
- **User** - NextAuth user accounts with Google SSO
- **Organization** - Multi-tenant organizations (suppliers, internal teams)
- **Membership** - Maps users to organizations with roles (ADMIN, MEMBER, SUPPLIER, PROCUREMENT, MDM)

##### Entities & Geographies
- **Entity** - Legal entities (Zetwerk, Unimacts, Spectrum)
- **Geography** - Supported geographies (US, EU, India, etc.)
- **EntityGeography** - Junction table mapping entities to supported geographies

##### Form Configuration
- **FormConfig** - Form definitions per (entity, geography, version)
- **FormSection** - Sections within forms (Requestor, Supplier Info, Addresses, Bank, Documents)
- **FormField** - Individual fields with type, validation, visibility rules, and order
- **DocumentType** - Catalog of document types (W-9, PAN, GST, etc.)
- **FormDocumentRequirement** - Document requirements per form config

##### Applications & Workflow
- **Application** - Onboarding applications with status lifecycle
  - Status: `DRAFT` → `SUBMITTED` → `IN_REVIEW` → `PENDING_SUPPLIER` → `APPROVED` → `REJECTED`
  - Stores form data as JSON
  - Links to organization, entity, geography, form config
- **ApplicationDocument** - Uploaded documents with metadata
- **ApplicationComment** - Comments/clarifications (supplier-visible vs internal-only)
- **AuditLog** - Complete audit trail of all actions

### Role Model

#### Membership Roles
- **ADMIN** - Superuser, can manage all configurations
- **MEMBER** - Basic organization member
- **SUPPLIER** - External supplier user
- **PROCUREMENT** - Internal procurement team member
- **MDM** - Master data management team member

#### Access Control

- **Server-side guards:** `requireRole()` and `assertOrgAccess()` in `lib/permissions.ts`
- **Session enrichment:** Roles and organization IDs loaded in NextAuth callbacks
- **RLS-ready:** Schema designed to support Row Level Security if migrated to Supabase

### Authentication Flow

1. User signs in via Google SSO
2. NextAuth creates/updates User record
3. Callbacks load user memberships and roles
4. Session enriched with `organizationRoles` for quick access checks
5. Server components use `requireRole()` to gate routes

### Migrations & Seeds

- **Migrations:** Managed via Prisma (`npm run db:migrate`)
- **Seeds:** `prisma/seed.ts` creates:
  - Demo organization ("Acme Inc")
  - Demo user (owner@example.com)
  - Sample entities (Zetwerk) and geographies (US)
  - Sample form configurations

### Key Features

- ✅ Complete data model for multi-tenant supplier onboarding
- ✅ Dynamic form configuration (no code changes needed for new fields)
- ✅ Role-based access control with session enrichment
- ✅ Audit logging for all key actions
- ✅ Version tracking for form configs and applications

### Documentation References

- `/docs/data-model.md` - ERD and detailed schema documentation
- `/docs/auth-rbac.md` - Role claims, guard usage, App Router integration

---

## Supplier Experience Portal

**Status:** ✅ Complete  
**Related Phase:** Phase 2

### Overview

The supplier-facing portal provides a self-service onboarding experience with a guided wizard, draft management, document upload, and status tracking. Suppliers can complete onboarding forms dynamically configured per entity and geography without code changes.

### Key Features

#### Supplier Onboarding Wizard

- **Multi-step wizard** with progress indicator and step navigation
- **Dynamic form rendering** from database configuration (FormConfig)
- **Save-as-draft** functionality with autosave hooks
- **Resume from draft** with dialog for selecting incomplete applications
- **Document upload** per section with type validation
- **Conditional field visibility** based on other field values
- **Conditional sections** automatically skip entire steps when prerequisites are unmet
- **Client and server validation** via generated Zod schemas

#### Routes & Navigation

- `/supplier` - Supplier dashboard listing all applications
- `/supplier/onboarding/new` - Start new onboarding application
- `/supplier/onboarding/[id]` - Continue/resume existing application
- `/forms/(by-entity)/[formSlug]/[geographyCode]` - Dynamic form routes
- `/forms/(by-config)/[formSlug]` - Form routes by config ID

#### Form Features

##### Dynamic Field Rendering
- Supports all field types: text, email, number, select, multi-select, checkbox, radio, date, textarea, file
- Field-level validation (required, regex, min/max, custom rules)
- Conditional visibility via AND/OR rule sets
- Help text and tooltips from configuration

##### State Management
- `use-form-state` hook tracks form data, touched state, errors, submitting state
- `use-autosave` hook handles debounce timers and before-unload warnings
- Draft persistence via server actions (`saveFormDraft`, `loadFormDraft`)
- Resume dialog shows incomplete drafts
- Drafts and submissions persist `hiddenSections` arrays for analytics/debugging

##### Validation
- Zod schema generation from FormConfig (`lib/form-schema.ts`)
- Step-level validation before navigation
- Error summary component with scroll-to-first-error
- Real-time client-side validation

#### Document Management

- File uploader with size/type constraints per document requirement
- Document metadata stored in `ApplicationDocument` table
- File URL storage (actual file storage integration pending - S3/Supabase Storage)
- Document type catalog from `DocumentType` table

#### Supplier Dashboard

- Lists all applications grouped by status
- Status badges (Draft, Submitted, In Review, Pending Supplier, Approved, Rejected)
- Quick actions: Continue draft, View submitted
- Checklist showing completed sections and outstanding items

### User Experience

#### Guided Workflow
- Stepper/progress bar showing all sections
- Clear labels and helper text from configuration
- Contextual help tooltips
- Responsive design (mobile, tablet, desktop)

#### Accessibility
- Step indicator with ARIA labels
- Live regions for step changes and autosave feedback
- Focus management for errors
- Keyboard navigation support

#### Responsive Design
- Step indicator switches to progress bar on mobile
- Navigation collapses to sticky action tray on small screens
- Two-column layout on tablet, full-width on mobile

### Implementation Highlights

- ✅ Dynamic form rendering from Prisma-backed config
- ✅ Conditional field visibility engine
- ✅ Section-level visibility with wizard step skipping + analytics hooks
- ✅ Draft management with server actions
- ✅ Autosave with debounce and before-unload warnings
- ✅ Validation system with Zod schema generation
- ✅ Responsive and accessible UI
- ✅ Test coverage (53+ Vitest tests)

### Technical Stack

- **Form Framework:** Custom dynamic form renderer (`components/forms/`)
- **Validation:** Zod with dynamic schema builder
- **State Management:** React hooks (`use-form-state`, `use-autosave`)
- **Draft Persistence:** Server actions (`app/forms/actions.ts`)
- **Visibility Engine:** `lib/forms/visibility-engine.ts`

### Documentation References

- `/docs/ui-implementation-summary.md` - Detailed implementation summary
- `/docs/testing-plans/` - Test plans and coverage

---

## Procurement Workflow

**Status:** ✅ Complete  
**Related Phase:** Phase 3

### Overview

The procurement workflow enables internal procurement team members to review supplier onboarding applications, request clarifications, manage approvals, and track status through a comprehensive dashboard and detail view.

### Key Features

#### Procurement Dashboard

- **List view** with filters:
  - Search by supplier/org name
  - Filter by status (SUBMITTED, IN_REVIEW, PENDING_SUPPLIER, APPROVED, REJECTED)
  - Filter by entity and geography
  - Date range filtering
- **Columns:** Supplier name, application ID, status, submitted date, SLA countdown, assigned reviewer
- **Pagination** for large result sets
- **Quick actions:** Open detail, Approve, Request Clarification

#### Application Detail View

- **Sectioned layout** mirroring supplier wizard structure
- **Supplier information snapshot** with all submitted data
- **Document viewing** with download links and metadata
- **Recent activity** showing audit log entries
- **Comments & clarifications** thread

#### Clarifications & Comments

- **Dual-channel threads:**
  - Supplier-visible comments (procurement can request clarifications)
  - Internal-only notes (procurement/MDM only)
- **Field-level comments** linking to specific form fields
- **Status change:** Automatically moves to `PENDING_SUPPLIER` when clarification requested
- **Notifications:** Console-based stubs (email service pending)

#### State Machine & Actions

- **Valid transitions enforced:**
  - `SUBMITTED` → `IN_REVIEW` (claim)
  - `IN_REVIEW` → `PENDING_SUPPLIER` (request clarification)
  - `IN_REVIEW` → `APPROVED` (approve)
  - `IN_REVIEW` → `REJECTED` (reject with reason)
- **Server actions** (`app/dashboard/procurement/[id]/actions.ts`) enforce transitions
- **Audit logging** for every status change

#### Approval/Rejection Flow

1. Procurement user opens submission detail
2. Reviews all sections and documents
3. Can add internal notes (not visible to supplier)
4. Can request clarifications (visible to supplier, status → `PENDING_SUPPLIER`)
5. Once satisfied, approves or rejects:
   - **Approve:** Status → `APPROVED` (triggers Freshdesk ticket creation - pending implementation)
   - **Reject:** Status → `REJECTED` with reason (visible to supplier)

### Routes & Access

- **Route:** `/dashboard/procurement`
- **Detail:** `/dashboard/procurement/[id]`
- **Access Control:** Gated to `ADMIN` and `PROCUREMENT` roles via `requireRole()`

### Components

- **ProcurementActionPanel** - Approve/reject/clarification actions
- **CommentThread** - Comment display and creation
- **Status badges** - Visual status indicators
- **Audit log viewer** - Recent activity display

### Audit Trail

All actions logged to `AuditLog` table:
- Actor ID and role
- Action type (approved, rejected, clarification_requested, etc.)
- Timestamp
- Details JSON payload
- Audit logs visible in both detail view and dashboard

### Implementation Highlights

- ✅ State machine validation in server actions
- ✅ Dual-channel comment system (supplier-visible vs internal)
- ✅ Comprehensive filtering and search
- ✅ Audit logging for all key events
- ✅ Responsive detail view layout

### Status Lifecycle

```
DRAFT (supplier)
  ↓ [submit]
SUBMITTED (procurement)
  ↓ [claim]
IN_REVIEW (procurement)
  ├─→ [request clarification] → PENDING_SUPPLIER (supplier)
  │                               ↓ [respond]
  │                               IN_REVIEW (procurement)
  ├─→ [approve] → APPROVED (MDM)
  └─→ [reject] → REJECTED (end state)
```

### Integration Points

- **Freshdesk:** On approval, should trigger ticket creation (pending Phase 5 implementation)
- **Notifications:** Email notifications on status changes (pending Phase 6 implementation)

---

## Admin Configuration Console

**Status:** ✅ Complete  
**Related Phase:** Phase 4

### Overview

The admin console enables system administrators to manage all configuration aspects of the supplier onboarding portal without code changes. Admins can configure entities, geographies, form schemas, document requirements, and integrations via a comprehensive UI.

### Key Features

#### Entities & Geographies Management

- **Entities CRUD** (`/dashboard/admin/entities`)
  - Create/edit legal entities (Zetwerk, Unimacts, Spectrum)
  - Entity code (unique identifier)
  - Name and description
- **Geographies CRUD** (`/dashboard/admin/geographies`)
  - Create/edit supported geographies (US, EU, India, etc.)
  - Geography code (unique identifier)
  - Name mapping
- **Entity-Geography Mapping**
  - Define which geographies each entity supports
  - Junction table (`EntityGeography`) managed via admin UI

#### Form Builder

- **Form Config Management** (`/dashboard/admin/forms`)
  - Create form configurations per (entity, geography, version)
  - Version tracking for form schema changes
  - Active/inactive toggle
  - Title and description
- **Section Management**
  - Add/edit sections within forms
  - Section ordering
  - Section key and label
- **Field Designer** (via forms page)
  - Add/edit fields within sections
  - Field types: text, email, number, select, multi-select, checkbox, radio, date, textarea, file
  - Field metadata:
    - Label, placeholder, help text
    - Required flag
    - Options JSON (for select/radio)
    - Validation JSON (regex, min/max, custom rules)
    - Visibility JSON (conditional logic)
    - Order/sorting
    - Sensitive field flag (for masked display)
- **Schema Preview**
  - Preview generated Zod schema from form config
  - Validate form structure before activation

#### Document Requirements

- **Document Type Catalog** (`/dashboard/admin/documents`)
  - Define document types (W-9, W-8BEN, PAN, GST, IBAN confirmation, etc.)
  - Document category (Tax, Bank, Legal)
  - Label and description
- **Per-Form Requirements** (`/dashboard/admin/requirements`)
  - Map document types to form configs
  - Mark as required/optional per form
  - Add help text for document requirements

#### Integrations & Settings

- **Integration Settings** (`/dashboard/settings`)
  - Freshdesk domain configuration (per organization)
  - Freshdesk API key storage (per organization)
  - Email template configuration
- **Workspace Settings**
  - Future: Notifications, SLAs, automation

#### Audit & Compliance

- **Audit Log Viewer** (`/dashboard/admin/audit`)
  - View all system actions
  - Filter by actor, action, entity, date range
  - Audit trail for admin configuration changes

### Routes & Access

- **Base Route:** `/dashboard/admin`
- **Sub-routes:**
  - `/dashboard/admin/entities` - Entity management
  - `/dashboard/admin/geographies` - Geography management
  - `/dashboard/admin/forms` - Form builder
  - `/dashboard/admin/documents` - Document type catalog
  - `/dashboard/admin/requirements` - Document requirements
  - `/dashboard/admin/audit` - Audit log viewer
- **Access Control:** Gated to `ADMIN` role via `requireRole()`

### Form Schema Generation

- **Dynamic Zod Schema Builder** (`lib/form-schema.ts`)
  - Generates Zod schemas from FormConfig stored in database
  - Used by supplier wizard for validation
  - Used by procurement view for data display
  - Supports all validation rules configured in admin UI

### Key Capabilities

#### No-Code Configuration
- ✅ Add new form fields without code changes
- ✅ Configure validation rules via UI
- ✅ Set conditional field visibility
- ✅ Define document requirements per geography

#### Version Control
- ✅ Form configs support versioning
- ✅ Track form schema changes over time
- ✅ Applications reference specific form config version

#### Data Integrity
- ✅ Unique constraints on entity codes, geography codes
- ✅ Referential integrity via Prisma relationships
- ✅ Cascade deletes for related records

### Implementation Highlights

- ✅ Complete CRUD operations for all config entities
- ✅ Form builder with section and field management
- ✅ Dynamic schema generator for validation
- ✅ Admin change history via audit logs
- ✅ Responsive admin UI

### Configuration Workflow

1. Admin creates entities (Zetwerk, Unimacts, etc.)
2. Admin creates geographies (US, EU, India, etc.)
3. Admin maps entities to supported geographies
4. Admin creates form config for (entity, geography, version 1)
5. Admin adds sections and fields to form
6. Admin configures document requirements
7. Admin activates form config
8. Suppliers can now use this form for onboarding

### Documentation References

- `/docs/implementation-status.md` - Overall implementation status
- `/docs/data-model.md` - Data model details

---

## Related Documentation

- **Implementation Status:** `/docs/implementation-status.md` - Complete comparison with PRD
- **Implementation Plans:** `/docs/implementation-plans/` - Remaining work (Phase 5 & 6)
- **UI Implementation:** `/docs/ui-implementation-summary.md` - Detailed UI implementation summary
- **Testing Plans:** `/docs/testing-plans/` - Test plans and coverage

