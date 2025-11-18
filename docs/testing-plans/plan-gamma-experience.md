# Plan Gamma — E2E Experience, Performance & Documentation

## Purpose

Validate the end-user journey across authentication, multi-device usage, and final submission while ensuring performance targets and documentation deliverables from Stream 8 are met.

## Scope

- Playwright E2E specs for core journeys:
  - Sign in → complete form → submit
  - Draft save/resume
  - Conditional field interactions
  - Validation error surfacing and recovery
  - Responsive breakpoints (mobile/tablet/desktop)
- Performance audits: load time, step transition, autosave latency, bundle size.
- Documentation updates: user guide, developer guide, API reference, JSDoc sweep, README updates.

## Prerequisites

1. Plans Alpha & Beta merged (unit + integration stability).
2. Supabase test environment seeded with representative users/forms.
3. Playwright configured with devices profile + env secrets stored in `.env.test`.
4. CI runners with browsers installed (GitHub Actions Playwright deps).
5. Lighthouse CI or WebPageTest credentials for automation.

## Deliverables

- `tests/e2e/form-completion.spec.ts`
- `tests/e2e/draft-resume.spec.ts`
- `tests/e2e/conditional-fields.spec.ts`
- `tests/e2e/validation-errors.spec.ts`
- `tests/e2e/responsive-viewports.spec.ts`
- Performance report (Lighthouse + custom metrics script).
- Updated docs:
  - `docs/forms/user-guide.md`
  - `docs/forms/developer-guide.md`
  - `docs/forms/api-reference.md`
  - JSDoc comments in `components/forms/*`, `hooks/*`, `lib/forms/*`
  - `README.md` additions for form system/testing commands.

## Execution Strategy

- Use Playwright test fixtures for authentication (reuse existing login helpers).
- Run viewport matrix (mobile/tablet/desktop) via `test.use({ viewport })`.
- Capture console/network logs for each run; fail on browser errors.
- Measure performance with:
  - Playwright `tracing.startChunk({ screenshots: true, snapshots: true })`.
  - Lighthouse CI on deployed preview + local bundle analyzer.
- Autosave latency instrumentation via custom marker `window.performance.mark('autosave:complete')`.
- Document findings in Markdown and link to dashboards/screenshots.

## Parallelization & Ownership

- QA Engineer G: Playwright spec authoring + maintenance.
- Perf Engineer H: Lighthouse, bundle analyzer, React profiler work.
- Technical Writer I: Documentation updates + JSDoc sweep.

Workstreams operate concurrently; weekly sync ensures Playwright scenarios remain aligned with docs screenshots and performance optimizations.

## Timeline

| Phase | Duration | Notes |
| --- | --- | --- |
| Playwright harness & CI | 1 day | Device config, auth fixtures |
| Scenario scripting | 2 days | G executes, depends on Beta scripts |
| Performance audits | 1.5 days | Baseline + optimization passes |
| Documentation updates | 1.5 days | Writer parallel to perf |
| Final verification | 0.5 day | Cross-review + sign-off |

Total elapsed: ~5 working days with overlapping efforts.

## Acceptance Criteria

1. All Playwright specs pass locally and in CI (headed+headless).
2. Performance KPIs met: load < 2s p95, step transition < 200ms, autosave < 500ms.
3. Bundle size report attached to PR with regression budget.
4. Documentation PR approved by Eng + Product; README lists testing commands.
5. Final checklists in Stream 8 document marked complete.

## Risks & Mitigations

- **Auth instability in CI**: pre-create service user tokens; retry with exponential backoff.
- **Flaky mobile viewport rendering**: enforce deterministic viewport sizes and disable OS-level animations in test env.
- **Performance regressions introduced late**: add budgets to Lighthouse CI to fail PRs when thresholds exceeded.
- **Doc drift**: embed doc update checklist in PR template; TW participates in final QA run.

## Handoffs

- Archive Playwright traces and Lighthouse reports in `/artifacts/stream-8`.
- Notify release manager when all acceptance criteria satisfied; attach summary to Stream 8 tracker.

