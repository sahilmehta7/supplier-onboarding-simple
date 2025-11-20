# E2E Testing

This directory contains End-to-End (E2E) tests for the Supplier Onboarding application using Playwright.

## Prerequisites

1. **Database**: Ensure PostgreSQL is running (via Docker Compose or local instance)
2. **Environment**: Copy `.env.local` from `env.example` and configure it
3. **Dependencies**: Install dependencies with `npm install`
4. **Browsers**: Playwright browsers are installed automatically, or run `npx playwright install`

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests with UI (Interactive Mode)
```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Tests
```bash
npm run test:e2e:debug
```

### Run Specific Test File
```bash
npx playwright test e2e/scenario-1-complete-journey.spec.ts
```

## Test Scenarios

The E2E tests cover 5 main scenarios as defined in `docs/e2e-testing-plan.md`:

1. **Scenario 1**: Complete Supplier Submission Journey
   - File: `scenario-1-complete-journey.spec.ts`
   - Tests the full workflow from draft creation to approval

2. **Scenario 2**: Procurement Requests Changes
   - File: `scenario-2-procurement-changes.spec.ts`
   - Tests field-level editing control

3. **Scenario 3**: Concurrent Edit Detection
   - File: `scenario-3-concurrent-edits.spec.ts`
   - Tests optimistic locking prevents data loss

4. **Scenario 4**: Real-Time Status Updates
   - File: `scenario-4-status-updates.spec.ts`
   - Tests status polling and automatic updates

5. **Scenario 5**: Internal Team Submission
   - File: `scenario-5-internal-submission.spec.ts`
   - Tests internal team creating applications for suppliers

## Test Structure

```
e2e/
├── helpers/
│   ├── auth.ts              # Authentication helpers
│   ├── database.ts          # Database utilities
│   ├── test-setup.ts        # Test fixtures and setup
│   └── global-setup.ts      # Global setup/teardown
├── scenario-1-complete-journey.spec.ts
├── scenario-2-procurement-changes.spec.ts
├── scenario-3-concurrent-edits.spec.ts
├── scenario-4-status-updates.spec.ts
└── scenario-5-internal-submission.spec.ts
```

## Test Data

Tests use isolated test data that is:
- Created before each test run
- Cleaned up after tests complete
- Separate from production/development data

## Configuration

Test configuration is in `playwright.config.ts`:
- Base URL: `http://localhost:3005` (configurable via `PLAYWRIGHT_TEST_BASE_URL`)
- Tests run sequentially to avoid database conflicts
- Screenshots on failure
- HTML report generated after test run

## Troubleshooting

### Tests Fail with Database Errors
- Ensure database is running: `docker compose up -d postgres`
- Check database connection in `.env.local`
- Run migrations: `npm run db:migrate`

### Tests Fail with Authentication Errors
- Check that test users are being created correctly
- Verify session cookies are being set
- Check browser console for errors

### Tests Timeout
- Increase timeout in test file: `test.setTimeout(60000)`
- Check if application server is running
- Verify network connectivity

### Port Already in Use
- Change port in `playwright.config.ts` or set `PLAYWRIGHT_TEST_BASE_URL`
- Kill process using port 3005: `lsof -ti:3005 | xargs kill`

## CI/CD Integration

For CI/CD, set environment variables:
- `CI=true` - Enables retries and different worker configuration
- `PLAYWRIGHT_TEST_BASE_URL` - Set to your test environment URL

## Viewing Test Results

After running tests, view the HTML report:
```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- Test results
- Screenshots on failure
- Network requests
- Console logs

