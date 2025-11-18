# Phase 5 – MDM & Integrations

## Objectives
- Support master data (MDM) team workflows after procurement approval.
- Integrate with Freshdesk for automated handoff; prepare for future ERP syncs.

## Status: 🟡 Partial (40% Complete)

### ✅ Completed
- **Freshdesk Configuration UI** (`/dashboard/settings`)
  - Admin can configure Freshdesk domain and API key per organization
  - Settings stored in `Organization` table (`freshdeskDomain`, `freshdeskApiKey`)
  - Email template configuration available
- **Database Schema**
  - Application model supports ERP vendor ID tracking (field exists, implementation pending)
  - MDM role (`MembershipRole.MDM`) defined in schema
  - Audit log table ready for ERP ID update tracking

### ❌ Remaining Work
1. **MDM Dashboard**
   - ❌ `/dashboard/mdm` route not implemented
   - ❌ View of approved applications pending ERP ID assignment
   - ❌ Filters: entity, geography, approval date, Freshdesk status
   - ❌ Inline editing of ERP vendor ID, additional metadata, completion date
2. **Freshdesk Integration**
   - ❌ Freshdesk API client (`lib/integrations/freshdesk.ts`) not implemented
   - ❌ Automatic ticket creation on approval not implemented
   - ❌ Ticket ID storage on application record (`freshdesk_ticket_id` field missing from schema)
   - ❌ Retry mechanism for failed ticket creation
   - ❌ Error tracking (status: `PENDING`, `SUCCESS`, `FAILED`)
   - ❌ Webhook endpoint for ticket status updates
3. **Notifications & SLA**
   - ❌ Notify MDM queue when new approvals arrive
   - ❌ Escalate if ERP ID not filled within configured SLA
4. **ERP ID Management**
   - ❌ Server actions for ERP ID updates
   - ❌ ERP onboarding completion tracking

## Functional Scope
1. **MDM Dashboard**
   - View of approved applications pending ERP ID assignment.
   - Filters: entity, geography, approval date, Freshdesk status.
   - Inline editing of ERP vendor ID, additional metadata, completion date.
2. **Freshdesk Integration**
   - Service wrapper using API key + domain configured in admin console.
   - Ticket payload includes supplier data, document links, portal deep link.
   - Retry + error tracking (status: `PENDING`, `SUCCESS`, `FAILED`).
   - Webhook endpoint (optional) to update ticket status.
3. **Notifications & SLA**
   - Notify MDM queue when new approvals arrive.
   - Escalate if ERP ID not filled within configured SLA.
4. **Audit & Logging**
   - Log ticket creation attempts/outcomes.
   - Record ERP ID updates with actor + timestamp.

## Implementation Steps
1. ⏳ Build `/dashboard/mdm` route with protected layout (MDM role).
2. ⏳ Implement Freshdesk client (REST) with exponential backoff + structured logging.
3. ⏳ Create background job/queue (e.g., edge function or cron) for retries.
4. ⏳ Add server actions for ERP ID updates; trigger audit entries + notifications.
5. ⏳ Add `freshdesk_ticket_id` field to Application model (migration).
6. ⏳ Implement automatic ticket creation on approval (in procurement approve action).
7. ⏳ Document runbooks for Freshdesk failures and retry procedures.

## Deliverables
- MDM dashboard UI.
- `lib/integrations/freshdesk.ts` client + tests.
- Retry mechanism (queue table or external worker) with admin controls.
- Documentation `/docs/mdm-playbook.md` covering workflows + troubleshooting.

## Acceptance Criteria
- Approved application automatically creates Freshdesk ticket; status surfaced in portal.
- MDM user can input ERP ID, marking onboarding complete.
- Failed ticket creations are visible with retry option.

## Risks & Mitigations
- **API limits:** implement rate limiting/backoff.
- **Secrets leakage:** store Freshdesk API keys securely; never log raw secrets.
- **MDM adoption:** provide clear runbook + metrics to prove value.

## Current State
- Freshdesk configuration is ready in admin settings
- Database schema supports MDM role and workflow
- Missing: MDM dashboard, Freshdesk API integration, ERP ID editing UI
