# Phase 6 – Reporting, Audit, Hardening

## Objectives
- Deliver insights (dashboards, KPIs) for procurement/admin leadership.
- Finalize auditability, performance, accessibility, and automated testing to prepare for launch.

## Status: 🟡 Partial (30% Complete)

### ✅ Completed
- **Basic Audit Logging**
  - `AuditLog` table implemented with actor, action, timestamp, details JSON
  - Audit log entries created for key actions (submit, approve, reject, etc.)
  - Audit log viewer in procurement detail pages (`/dashboard/procurement/[id]`)
  - Admin audit log viewer (`/dashboard/admin/audit`) with filtering
- **Test Infrastructure**
  - Vitest test suite with 53+ tests
  - Test coverage for: schema building, validation, visibility, organizations, permissions, application state
  - Test plans documented (`/docs/testing-plans/`)
- **Basic Performance**
  - Pagination on list views
  - Indexes on key foreign keys and status fields

### ❌ Remaining Work
1. **Reporting & Metrics**
   - ❌ `/dashboard/insights` page not implemented
   - ❌ KPIs: onboarding cycle time, approval volume per entity/geo, rejection rate, SLA breaches
   - ❌ Visuals: trend charts, status breakdown, top rejection reasons
   - ❌ CSV export functionality
   - ❌ Drill-down links to submissions from reports
2. **Hardening Tasks**
   - ⚠️ **Performance & Resilience**
     - ⚠️ Caching for read-heavy endpoints (partial)
     - ❌ Load testing on supplier wizard + procurement dashboard
     - ❌ Retry/backoff policies for external services (Freshdesk - pending Phase 5)
   - ⚠️ **Security & Compliance**
     - ⚠️ Accessibility: Basic ARIA labels and focus management implemented (needs WCAG AA audit)
     - ❌ Pen-test style checklist (auth bypass, IDOR, SSRF, file upload validation)
     - ❌ Secrets rotation playbook
   - ⚠️ **Testing Automation**
     - ✅ Unit tests for helpers (permissions, schema generator, state machine)
     - ⚠️ Integration tests (partial - 53 tests exist, need route handler tests)
     - ❌ E2E tests (Playwright/Cypress) covering supplier flow + procurement approval
   - ❌ **Observability**
     - ❌ Centralized logging (structured logs with correlation IDs)
     - ❌ Metrics + alerting (status of background jobs, Freshdesk failures, SLA violations)

## Reporting Scope
1. **Metrics Dashboard**
   - KPIs: onboarding cycle time, approval volume per entity/geo, rejection rate, SLA breaches.
   - Visuals: trend charts, status breakdown, top rejection reasons.
2. **Operational Reports**
   - Export CSV of applications by filters.
   - Drill-down links to submissions.
3. **Audit Log Viewer** ✅ (Basic implementation exists)
   - Filter by actor, action, entity, date range. ✅
   - Downloadable JSON/CSV for compliance. ❌ (Export pending)

## Hardening Tasks
1. **Performance & Resilience**
   - ⚠️ Enable caching for read-heavy endpoints (partial), add pagination everywhere. ✅
   - ❌ Conduct load test on supplier wizard + procurement dashboard.
   - ❌ Verify retry/backoff policies for external services (Freshdesk - pending Phase 5).
2. **Security & Compliance**
   - ⚠️ Accessibility audit (WCAG AA) and fix focus states + ARIA labels. (Basic implementation, needs audit)
   - ❌ Pen-test style checklist (auth bypass, IDOR, SSRF, file upload validation).
   - ❌ Secrets rotation playbook.
3. **Testing Automation**
   - ✅ Unit tests for helpers (permissions, schema generator, state machine).
   - ⚠️ Integration tests (Next.js route handlers, Prisma queries) - 53 tests exist, needs expansion.
   - ❌ E2E tests (Playwright/Cypress) covering supplier flow + procurement approval.
4. **Observability**
   - ❌ Centralized logging (structured logs with correlation IDs).
   - ❌ Metrics + alerting (status of background jobs, Freshdesk failures, SLA violations).

## Deliverables
- `/dashboard/insights` page with KPIs. ❌
- Audit log viewer UI. ✅ (Basic implementation exists)
- Test coverage report + CI gate. ⚠️ (Tests exist, CI gate pending)
- `/docs/launch-readiness.md` summarizing checklists, monitoring setup, rollback plan. ❌

## Acceptance Criteria
- ❌ Stakeholders can view real-time metrics with filtering.
- ⚠️ Audit log exports are compliant and tamper-resistant. (Viewer exists, export pending)
- ⚠️ Automated test suite runs in CI with defined threshold. (Tests exist, CI gate pending)
- ⚠️ Accessibility and security checklists signed off. (Basic accessibility, needs audit)

## Risks & Mitigations
- **Data accuracy:** validate SQL queries vs manual calculations.
- **Test flakiness:** invest in deterministic fixtures and isolated test DB.
- **Scope creep:** lock MVP metric set; backlog advanced analytics.

## Current State
- Basic audit logging and viewing implemented
- Test infrastructure in place with good coverage (53+ tests)
- Missing: Reporting dashboard, E2E tests, observability, comprehensive hardening
