# Plan Alpha — Component & Logic Assurance

## Purpose

Validate all isolated building blocks of the dynamic form platform so that later flow-level testing can focus on integration risk rather than basic correctness. This plan covers form components, validation logic, state hooks, visibility engine, and draft persistence utilities.

## Scope

- Components: `FormFieldRenderer`, `FormStep`, `StepIndicator`, `FormNavigation`, `DraftSaveIndicator`, field wrappers.
- Hooks: `use-form-state`, `use-autosave`, `use-field-visibility`.
- Utilities: `form-validator`, `visibility-engine`, `draft-manager`, form state helpers.
- Server actions: draft save/load action handlers (mocked fetch layer).

## Prerequisites

1. Streams 5–7 tagged as complete (✅ confirmed by user).
2. Vitest + RTL toolchain already configured (verify via `pnpm test:unit`).
3. Mock form configs checked into `tests/fixtures/forms`.
4. Test database seeded with baseline field definitions for snapshot comparisons.

## Deliverables

- `tests/forms/form-components.test.tsx`
- `tests/forms/form-validation.test.ts`
- `tests/forms/form-state.test.ts`
- `tests/forms/visibility-engine.test.ts`
- `tests/forms/draft-persistence.test.ts`
- Coverage report ≥ 80% lines/branches for `components/forms`, `lib/forms`, `hooks`.

## Execution Strategy

- Write tests per component/module with React Testing Library and Vitest.
- Leverage `@testing-library/user-event` for interactive cases (navigation buttons, inputs).
- Mock form config via factory helpers to keep cases deterministic.
- Use table-driven tests for validation/visibility permutations to maximize coverage with minimal code.
- Snapshot accessibility attributes (ARIA labels, role assignments) for StepIndicator/Form navigation after Stream 7 upgrades.

## Parallelization & Ownership

- QA Engineer A: Components + StepIndicator + FormNavigation tests.
- QA Engineer B: Validation + visibility engine suites.
- QA Engineer C: Draft manager + autosave hooks + server actions.

Each engineer works off independent test files with no shared fixtures beyond read-only factories, enabling fully parallel development and execution (Vitest `--runInBand=false` for CI).

## Timeline

| Phase | Duration | Notes |
| --- | --- | --- |
| Test scaffolding | 0.5 day | Ensure fixtures/util factories exist |
| Writing tests | 2 days | Three engineers in parallel |
| Coverage tuning | 0.5 day | Fill gaps to hit ≥80% |
| Review & merge | 0.5 day | Pair review + CI ✅ |

Total elapsed: ~3 working days wall-clock with parallel effort.

## Acceptance Criteria

1. All planned test files exist and run green locally and in CI.
2. Coverage gate (80%) enforced in `vitest.config.ts`.
3. No flakiness across three consecutive CI runs.
4. Docs updated: add “Unit Testing” section to `/docs/forms/developer-guide.md`.

## Risks & Mitigations

- **Flaky timers in autosave tests**: use fake timers + deterministic debounce intervals.
- **Visibility engine combinatorial explosion**: constrain to top 6 rule types, rely on table-driven coverage.
- **Server action mocks diverge from real API**: consume shared Zod schema so tests fail when contract changes.

## Handoffs

- Emit coverage summary artifact for Plan Beta.
- Tag commits `qa/plan-alpha-*` for traceability.

