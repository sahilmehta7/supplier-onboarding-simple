# Conditional Sections PRD & Implementation Plan

## 1. Overview
- **Problem**: Today, conditional logic only hides individual fields. Entire sections/steps always render, forcing suppliers to click through irrelevant steps even when all fields are hidden or a section only applies to specific profiles.
- **Goal**: Introduce section-level visibility rules so the form wizard can skip sections unless their conditions pass. Maintain parity with existing field-level visibility UX and engine so admins get predictable behavior while we avoid duplicating logic.
- **Audience**: Supplier onboarding operations team (config authors), supplier applicants (form end-users), engineering teams that maintain admin tooling + runtime wizard.

## 2. Objectives & Key Results
1. **Reduce supplier friction**  
   - KPI: % of applications with ≥1 skipped section when inapplicable (target ≥40%).  
   - KPI: Average steps per applicant decreases by ≥15% on forms that use conditional sections.
2. **Improve admin productivity**  
   - KPI: Time-to-configure specialized compliance variants drops by ≥20% (measured via internal survey).  
   - KPI: Admin bug reports related to “empty steps” goes to zero.
3. **Maintain runtime guarantees**  
   - KPI: No regressions in autosave/validation flows (monitored via existing integration tests).  
   - KPI: Visibility evaluation latency increase ≤5% measured on wizard render.

## 3. User Stories
1. *As an admin*, I can declare that “Tax Information” section only appears when `entity_type === 'vendor'`.  
2. *As an admin*, I can reuse the same conditional operators (equals/notEquals/contains/>, <, isEmpty, isNotEmpty) at the section level, including AND/OR rule groups.  
3. *As a supplier*, I never see empty steps. The step indicator skips hidden sections and renumbers automatically.  
4. *As a supplier*, section skipping respects navigation (Next/Previous/Step click) and validation (hidden sections never block submission).  
5. *As compliance reviewers*, we can audit which sections were skipped via submitted application payload metadata.

## 4. Functional Requirements
### 4.1 Admin Authoring
- Section objects gain optional `visibility` JSON with same schema as field rules.
- Admin UI exposes a “Conditional visibility” editor at section level with:  
  - Toggle (Always show vs Conditional).  
  - Rule builder UI shared with field config (reuse component).  
  - Preview snippet describing the section trigger.
- Validation prevents circular dependencies (e.g., section depending on field inside itself is fine, but section depending on another section’s visibility should not be allowed; we only depend on field values).

### 4.2 API & Persistence
- `FormSection.visibility` column already exists as `Json?` (per Prisma schema) but unused—reuse it.  
- Admin CRUD endpoints accept/return visibility JSON.  
- Audit logs capture visibility updates.

### 4.3 Runtime Wizard
- Section visibility evaluation uses new helper built atop `visibility-engine` (same rule schema).  
- Hidden sections are omitted from:
  - Step indicator list.  
  - Section render stack.  
  - Validation targets & autosave snapshots (except stored data should remain for auditing).  
- Navigation:
  - “Next” jumps to next visible section; if none, triggers submission.  
  - “Previous” jumps back to prior visible section.  
  - Direct step selection only allows visible sections.  
- Accessibility: Live region message reflects new total steps; screen readers skip hidden sections cleanly.

### 4.4 Data & Audit
- Application submissions include `hiddenSections: string[]` to track what was skipped.
- Draft snapshots also store hidden section keys for debugging (optional, nice-to-have).

### 4.5 Non-Functional
- Evaluation must remain synchronous & memoized to avoid introducing wizard lag.  
- All new logic covered by unit + integration tests (≥90% statement coverage for new modules).  
- Feature flagged? Optional; default enabled once shipped (assumes low risk).

## 5. Edge Cases & Constraints
- If every section is hidden, wizard should show a friendly message and block submission with guidance (“Form not applicable”).  
- If a section becomes visible again due to user changing dependency, previously entered data resurfaces; nothing is lost.  
- Draft restore should respect stored section visibility when form data meets conditions.  
- Admin UI must warn if section has zero fields; conditional rules still applicable but section should be hidden by default to avoid useless steps.

## 6. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Circular visibility chains cause infinite recursion | High | Reuse `getFieldVisibilityState` pattern with cycle detection; treat section nodes separately. |
| Navigation regression when steps disappear mid-session | Medium | Derive visible sections array from state each render; clamp `currentStep` to nearest valid index. |
| Admin UX confusion between field vs section rules | Medium | Provide inline documentation + reuse rule builder UI to ensure consistency. |
| Analytics dashboards expect fixed step counts | Low | Update instrumentation to track `visibleSections` length per render. |

## 7. Dependencies
- Field visibility engine + hook (existing).  
- Admin form definition editor components.  
- Autosave + validation systems (need integration updates).  
- No external service dependencies.

---

## Implementation Plan

### Phase 0 – Discovery (0.5d)
1. Inventory current admin editor components (`components/admin/form-definition-editor.tsx`, dialogs).  
2. Confirm Prisma schema + migrations already include `visibility` on `FormSection` (they do).  
3. Identify shared rule-builder component for reuse (likely needs extraction from form field editor).

### Phase 1 – Data & API (1d)
1. **Model typings**  
   - Extend `FormSectionSummary`, `FormConfigWithFields`, and related types to include optional `visibility`.  
   - Update Zod schemas / API validators to accept `visibility`.
2. **CRUD endpoints**  
   - `app/api/configuration/forms/.../sections` routes: accept `visibility`, persist JSON.  
   - Include field-level validation to ensure rule schema correctness (call `normalizeConfig`).  
   - Add audit metadata to include `visibility` diffs.

### Phase 2 – Admin UI (1.5d)
1. Extract reusable `VisibilityRuleBuilder` from field editor (if not already).  
2. Inject builder into section editor modal:  
   - Show summary chips when rules exist.  
   - Provide quick actions (convert to always-visible, duplicate rules from existing sections).  
3. Update `FormDefinitionsPanel` previews to show when a section is conditional (badge).

### Phase 3 – Runtime Engine (2d)
1. Create `lib/forms/section-visibility.ts`  
   - Mirror field engine but operate on `FormSection` objects.  
   - Provide `getSectionVisibilityState(sections, formData, fields)` returning `Record<sectionId, boolean>`.  
   - Detect cycles via dependency graph (sections rely on field data only, so leverage field dependencies).  
2. Update `useFieldVisibility` or introduce `useSectionVisibility` that composes both maps.  
3. Modify `DynamicFormWizard`:  
   - Maintain `visibleSections` derived list.  
   - Ensure `currentStep` indexes into visible array.  
   - Adjust navigation handlers, progress calculation, and `StepIndicator` props.  
   - Filter validation keys via both field + section visibility (skip entire step).  
4. Update `FormStep` to early-return `null` if its section hidden (defensive).

### Phase 4 – Persistence & Analytics (0.5d)
1. Extend draft save payload with `hiddenSections`.  
2. On submit, store `hiddenSections` array on application record (new column or JSON attribute).  
3. Emit telemetry event `form.section_hidden` with section metadata for analytics.

### Phase 5 – Testing & QA (1d)
1. Unit tests  
   - New test suite for section visibility normalization + evaluation.  
   - Wizard navigation tests covering step skipping, toggling visibility mid-step, all hidden case.  
2. Integration / Playwright  
   - Update `tests/integration/conditional-fields-flow` to include sections.  
   - Add e2e spec for multi-step conditional sections scenario.  
3. Manual QA checklist  
   - verify with screen reader, keyboard only navigation.  
   - confirm autosave + draft restore with toggled sections.

### Phase 6 – Rollout (0.5d)
1. Feature flag (if desired) to gradually enable on select forms.  
2. Update documentation (`docs/features.md`, admin handbook).  
3. Conduct enablement session for ops team.

### Estimated Effort
- **Backend**: 2 engineer-days  
- **Frontend/Admin**: 2 engineer-days  
- **Frontend/Wizard Runtime**: 2 engineer-days  
- **QA & Docs**: 1 engineer-day  
- Total ≈ 7 engineer-days spread over 1.5 weeks including review cycles.

### Open Questions
1. Do we need dependency on section order (e.g., section B depends on field in section C)? Current wizard collects all field data even if later step hidden—should be acceptable, but confirm with ops.  
2. Should analytics capture *why* a section was hidden (rule metadata) for debugging?  
3. Do we require cascading hide/unhide transition animations for better UX? Optional for MVP.


