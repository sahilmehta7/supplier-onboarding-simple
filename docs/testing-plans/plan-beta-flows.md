# Plan Beta — Flow, Draft & Conditional Integration

## Purpose

Exercise the full multi-step wizard experience in a realistic browser-like environment without relying on Playwright. Focus on validating that state, drafts, conditional visibility, and validation layers cooperate when users move through the wizard.

## Scope

- `DynamicFormWizard`, `FormStep`, `FormNavigation` composed together.
- Autosave + explicit “Save Draft” flows, including resume dialog.
- Conditional fields triggered by Stream 6 visibility rules.
- Validation surfacing (per-field, per-step, full-form) with Stream 4 rules.
- Multi-entity form routes (entity/geography + formConfig pages).

## Prerequisites

1. Plan Alpha merged (component/unit stability).
2. Test harness utilities for mounting full wizard in JSDOM (RTL).
3. Mocked server actions for draft save/load plus mock `fetch` for submission.
4. Seeded test configs:
   - Simple 3-step onboarding form.
   - Complex 8-step compliance form with conditional sections.

## Deliverables

- `tests/integration/form-completion-flow.test.ts`
- `tests/integration/draft-resume-flow.test.ts`
- `tests/integration/conditional-fields-flow.test.ts`
- `tests/integration/validation-flow.test.ts`
- `tests/integration/multi-step-navigation.test.ts`
- Test fixtures under `tests/fixtures/forms/*.ts`

## Execution Strategy

- Use React Testing Library + Vitest with `happy-dom`.
- Mock `IntersectionObserver` and `ResizeObserver` for responsive behaviors borrowed from Stream 7.
- Simulate keyboard and pointer interactions with `user-event`.
- Persist drafts to in-memory store to simulate server round trips with latency.
- Validate analytics hooks (if any) via spies to ensure transitions emit events.

## Parallelization & Ownership

- QA Engineer D: Form completion + validation flows.
- QA Engineer E: Draft save/resume scenarios.
- QA Engineer F: Conditional fields + multi-step navigation.

Teams share fixture factories but author separate test suites, enabling simultaneous progress. Coordination via contract: if fixture shape changes, update central factory file before merging.

## Timeline

| Phase | Duration | Notes |
| --- | --- | --- |
| Harness hardening | 1 day | Build wizard mount helper |
| Scenario authoring | 2 days | Three engineers parallel |
| Flake remediation | 0.5 day | Focus on async drafts |
| Review & merge | 0.5 day | Requires Plan Alpha coverage report |

Total elapsed: ~4 working days.

## Acceptance Criteria

1. All integration suites pass locally and in CI with parallel shards.
2. Draft resume scenario proves persistence across reload (mock storage).
3. Conditional tests assert correct DOM presence/absence and animations classes.
4. Regression reproduction checklist documented in `/docs/forms/testing-scenarios.md`.

## Risks & Mitigations

- **Async timing issues**: wrap autosave expectations in `waitFor` with deterministic debounce (from Stream 5).
- **Conditional permutations**: cover representative paths (satisfied/unsatisfied conditions, nested dependencies).
- **Responsive hooks missing in JSDOM**: mock `matchMedia` responses for breakpoints.

## Handoffs

- Provide scenario scripts to Plan Gamma for Playwright translation.
- Share draft persistence mock server with E2E team.

