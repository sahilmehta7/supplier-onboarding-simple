## Supplier Review Workspace PRD

### 1. Product Overview
- **Working name:** Supplier Review Workspace  
- **Primary users:** Internal Admin & Procurement reviewers  
- **Objective:** Provide a focused workspace to triage every supplier submission, locate a specific supplier fast, inspect the full submission (data + uploaded files), and take workflow actions without losing context.

### 2. Scope & Goals
1. **List View Efficiency**  
   - Tabular list of all supplier submissions, default-sorted from newest to oldest (submission date).  
   - Column sorting on key fields (Supplier Name, Entity, Geography, Status, Submission Date, Last Updated, Owner).  
   - Pagination with a fixed page size of 50 rows.  
   - Free-text search covering Supplier Name (from form submission) plus exact matches for IDs.
2. **Filtering & Discovery**  
   - Filters for Entity, Geography, Status, Submission Date range, Owner.  
   - Multi-select chips with clear “x” affordance and global “Clear all filters”.  
   - Filter bar displays active filters count implicitly via chips (no total submission counts needed in the header).
3. **Submission Detail View**  
   - Opens as a dedicated full-page route (`/dashboard/procurement/submissions/[id]`).  
   - Sections / tabs mirroring the form: Overview, Company Profile, Financials, Compliance, Banking, Contacts, Attachments, Activity.  
   - Read-only field rendering faithful to original submission (including conditional sections).  
   - Attachments tab lists uploaded files with inline preview (PDF/images) and download links.
4. **Action Bar**  
   - Sticky bar anchored to the bottom of the detail page with primary actions: Approve, Reject, Request Info.  
   - Secondary utilities: Assign Owner, Add Internal Note.  
   - Actions trigger confirmation modals capturing optional comments; handles optimistic updates + error states.
5. **Activity & Audit**  
   - Activity timeline showing status transitions, comments, requests, internal notes.  
   - Metadata captured for every action (actor, timestamp, comment) with audit log persistence.

### 3. Non-Goals / Deferred Items
- SLA timers or alerting around aging submissions.  
- Bulk row actions (multi-select approve/reject).  
- CSV exports from the list view.  
These remain future roadmap items; ensure architecture leaves hooks for later without blocking MVP.

### 4. Users & Needs
- **Admin Reviewer:** Needs reliable access to every submission, cross-entity visibility, ability to override ownership, and audit-ready trail.  
- **Procurement Reviewer:** Needs quick filters by their entities/geos, fast search by supplier name, full context view, and workflow actions.

### 5. User Journeys
1. **Browse & Filter**
   - Reviewer lands on `/dashboard/procurement/submissions`.  
   - Table loads newest submissions first (<1s for 200 rows).  
   - Reviewer adjusts filters (e.g., Entity = Unimacts, Geography = US, Status = Submitted).  
   - Active chips show current filters; hitting “Clear all” resets.
2. **Search**
   - Reviewer enters a supplier name (as submitted) or identifier in the search input.  
   - Table refreshes with matching results; search works alongside filters.
3. **Inspect Detail**
   - Clicking a row navigates to the full-page detail.  
   - Tabs/sections show structured data; attachments preview inline.  
   - Reviewer scrolls while sticky action bar remains visible.  
4. **Take Action**
   - Reviewer hits Approve/Reject/Request Info, confirms in modal, action recorded with comment.  
   - Activity timeline updates immediately; user can navigate back to list with state preserved via URL params (nuqs).

### 6. Information Architecture & UX Notes
- **List Layout**
  - Header row with column sort toggles; sticky table header.  
  - Columns: Status (pill), Supplier Name, Entity, Geography, Submission Date, Last Updated, Owner, Actions (icon to open detail).  
  - Hover state reveals “View details” affordance.  
  - Pagination controls at bottom: page indicator, next/prev buttons (page size locked at 50).  
  - No total-count badge in page header; focus remains on filters and table.
- **Detail Layout**
  - Breadcrumb back to list (retaining filters via query params).  
  - Page-level status badge + owner info near top.  
  - Tabs using Radix UI or shadcn components; each tab shows a sectioned layout with two-column data grid for readability.  
  - Attachments tab: cards with filename, uploaded date, preview button (using file viewer modal).  
  - Activity tab: chronological timeline with icons per event type.
- **Sticky Action Bar**
  - Contains status indicator, context text (e.g., “Last updated 2h ago”), and action buttons.  
  - Disabled states respect permissions or invalid transitions.  
  - Confirmation modal requires a comment for Reject / Request Info; optional for Approve.

### 7. Functional Requirements
#### 7.1 API Contracts
- `GET /api/admin/suppliers?search=&entity=&geo=&status=&owner=&submitted_from=&submitted_to=&page=&pageSize=50&sort=submittedAt:desc`  
  - Returns `{ data: SubmissionRow[], pagination: { page, pageSize, totalPages }, filtersMeta }`.  
  - Supports server-side sorting on allowed columns; default `submittedAt desc`.
- `GET /api/admin/suppliers/:id`  
  - Returns structured sections with field metadata + values, documents metadata (signed URLs), activity log.
- `POST /api/admin/suppliers/:id/action` with `{ action: 'approve'|'reject'|'request_info', comment?: string }`.  
  - Validates state transitions; logs activity; triggers downstream hooks (Freshdesk, notifications).

#### 7.2 Data Requirements
- List query includes: submission id, supplier name (from submission data), entity code/name, geography, status, submission timestamp, last modified timestamp, owner id/name.  
- Detail view pulls rendered form schema to ensure consistent ordering/labels relative to onboarding wizard configuration.  
- Attachments store MIME type for preview eligibility; generate signed URLs lazily (expire in 5 minutes).

#### 7.3 State & Error Handling
- Empty state messaging for zero results (with clear CTA to reset filters).  
- Loading skeleton for table + detail sections.  
- API failure surfaces inline error with retry.  
- Concurrent update guard: if another reviewer already acted, action endpoint returns conflict → show toast + fetch latest data.

#### 7.4 Permissions
- Only Admin / Procurement roles can access list & detail routes.  
- Actions limited to reviewers assigned to the submission or Admin override.  
- Activity log append-only; everyone with access can read.

### 8. Non-Functional Requirements
- Table interactions respond within 400ms after filter/search adjustments (server + UI combined).  
- Detail page initial load <1.5s for submissions with up to 20 attachments.  
- Fully keyboard-accessible (tab order through filters, table rows, action bar).  
- Responsive layout optimized for desktop ≥1280px; tablet view stacks sections vertically but retains sticky action bar.  
- Audit logging stored server-side for every action or status change.

### 9. Analytics & Success Metrics
- Average time to locate a submission (list load → detail open) <30 seconds.  
- ≥90% of approvals/rejections executed directly from the detail view without leaving the page.  
- Track usage of Request Info to measure reduction in external email loops.

### 10. Implementation Notes
- Prefer React Server Components for data-fetching (`async` page components).  
- Keep client components scoped to interactive controls (filters, table sorting, sticky action bar).  
- Use `nuqs` for URL state: filters, page, sort, search; ensures deep links.  
- Table component should be reusable (admin/procurement share base).  
- Form schema renderer reused between supplier view and read-only detail view by toggling read-only mode.  
- Attachments preview can leverage existing file viewer components; ensure SSR-safe dynamic import.

### 11. Future Enhancements
- SLA timers & alerts for overdue submissions.  
- Bulk actions (multi-select + batch approve/reject).  
- CSV or XLS exports of filtered results.  
- Kanban/board representation of statuses.  
- Metrics widgets / header counts once SLA tracking arrives.

### 12. Open Questions
1. Should the full-page detail view use split-pane layout (resizable table + detail) or dedicated route navigation only?  
2. Are there any compliance requirements around masking sensitive fields for certain internal roles?  
3. Do we need inline comparison against previous submissions (diff view) in MVP?  
4. What notification channels are required post action (email vs in-app only)?

---

**Next Steps**  
1. Align stakeholders on IA (full-page detail confirmed) and outstanding questions.  
2. Finalize API contracts with backend owners.  
3. Produce UX wireframes (list, filters, detail tabs, action bar).  
4. Break down engineering tasks (table/filter RSC, detail view renderer, action endpoints).  
5. Schedule UAT with sample submissions + attachments.

