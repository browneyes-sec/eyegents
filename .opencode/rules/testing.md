# Testing Rules

## Coverage Thresholds
- Unit tests: >80% lines, >70% branches
- Integration tests: >60% lines
- E2E tests: Critical paths 100%

## Test Structure
- AAA pattern (Arrange, Act, Assert)
- Descriptive names: `should_<expected>_when_<condition>`
- One assertion per test (preferred)
- No test interdependence

## Test Types
- **Unit**: Pure functions, services, utilities (fast, <100ms)
- **Integration**: DB, external APIs, message queues (Testcontainers)
- **E2E**: Critical user flows (Playwright, headed CI)
- **Property**: Invariants, edge cases (fast-check)

## Mocking
- Mock at boundaries only (DB, HTTP, time)
- Prefer real implementations for internals
- Use MSW for HTTP mocking

## CI Integration
- Run on every PR
- Fail on coverage drop
- Flaky test detection (retry 2x)