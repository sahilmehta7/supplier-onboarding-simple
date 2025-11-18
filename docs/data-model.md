# Data Model Overview

## Core Tables
- **User** – NextAuth user record; linked to `Account`, `Session`, and `Membership`.
- **Organization** – Internal workspace or supplier org; slug + metadata.
- **Membership** – Junction of user ↔ organization with `role: MembershipRole` (ADMIN, MEMBER, SUPPLIER, PROCUREMENT, MDM).

## Configuration Tables
- **Entity** – Legal entities (Zetwerk, Unimacts, Spectrum).
- **Geography** – Regions (US, EU, IN, etc.).
- **EntityGeography** – Mapping table linking entities to supported geographies.
- **FormConfig** – Versioned form definition per entity+geography.
- **FormSection** / **FormField** – Hierarchical definitions of sections and fields; includes validation/visibility JSON.
- **DocumentType** – Catalog of required documents; linked via **FormDocumentRequirement**.

## Operational Tables
- **Application** – Supplier onboarding case; references organization, entity, geography, formConfig; tracks status via `ApplicationStatus` enum.
- **ApplicationDocument** – Uploaded documents with metadata + storage URL.
- **ApplicationComment** – Clarification threads; `visibility` differentiates supplier-visible vs internal.
- **AuditLog** – Immutable record of key actions (actor, role, organization/application refs, JSON payload).

## Enums
```prisma
enum MembershipRole {
  ADMIN
  MEMBER
  SUPPLIER
  PROCUREMENT
  MDM
}

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  IN_REVIEW
  PENDING_SUPPLIER
  APPROVED
  REJECTED
}
```

## Relationships Diagram (textual)
```
User --< Membership >-- Organization
Membership.role ∈ MembershipRole
Organization --< Application >-- Entity / Geography
FormConfig --< FormSection --< FormField
FormConfig --< FormDocumentRequirement >-- DocumentType
Application --< ApplicationDocument >-- DocumentType
Application --< ApplicationComment
Application --< AuditLog (optional)
```

## Notes
- JSON fields (`data`, `options`, `validation`, `visibility`, `details`) allow flexible schemas ahead of Phase 4 form builder.
- Cascade deletes: removing an organization or form config removes dependent sections/fields; use caution in admin tooling.
