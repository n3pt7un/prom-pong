# Testing Patterns

**Analysis Date:** 2026-03-16

## Test Framework

**Runner:**
- Jest 30 (`source/package.json`).
- Config: `source/jest.config.cjs`.

**Assertion Library:**
- Jest built-in matchers (`expect(...)`).
- DOM matchers from `@testing-library/jest-dom` via `source/jest.setup.cjs`.

**Run Commands:**
```bash
npm test              # Run all tests (Jest)
npm run test:watch    # Watch mode
npx jest --coverage   # Coverage output (ad-hoc; no script configured)
```

## Test File Organization

**Location:**
- Co-located tests beside implementation files in `source/components/`, `source/utils/`, and `source/services/`.

**Naming:**
- Uses `*.test.ts` and `*.test.tsx` naming (for example `source/services/insightsService.test.ts`, `source/components/StatsDashboard.test.tsx`).

**Structure:**
```
source/components/*.test.tsx
source/utils/*.test.ts
source/services/*.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('insightsService', () => {
  describe('simulateWinsNeeded', () => {
    it('should return 0 when player ELO is already equal to target', () => {
      const result = simulateWinsNeeded(1500, 1500);
      expect(result).toBe(0);
    });
  });
});
```
Pattern appears in `source/services/insightsService.test.ts`.

**Patterns:**
- Setup/cleanup uses `afterEach(() => cleanup())` in React tests (`source/components/Leaderboard.test.tsx`, `source/components/integration.test.tsx`).
- Assertions combine semantic queries and text checks: `screen.getAllByRole`, `within(...)`, `toContain`, `toBeInTheDocument` (`source/components/PlayerProfile.test.tsx`, `source/components/StatsDashboard.test.tsx`).
- Tests frequently encode requirement IDs in comments for traceability (`source/components/PlayerProfile.features.test.tsx`, `source/utils/gameTypeStats.test.ts`).

## Mocking

**Framework:**
- Jest global mocking utilities (`jest.fn`) and manual global stubs.

**Patterns:**
```typescript
// source/jest.setup.cjs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// source/utils/gameTypeStats.test.ts
const originalWarn = console.warn;
const warnMock = jest.fn();
console.warn = warnMock;
```

**What to Mock:**
- Browser APIs unavailable in JSDOM (for example `ResizeObserver` in `source/jest.setup.cjs`).
- Console side-effects when verifying warning paths (`source/utils/gameTypeStats.test.ts`).

**What NOT to Mock:**
- Core domain logic functions are tested directly with concrete inputs in utility/service tests (`source/services/insightsService.test.ts`, `source/utils/insightsSorting.test.ts`).

## Fixtures and Factories

**Test Data:**
```typescript
const createMatch = (id: string, type: 'singles' | 'doubles', winners: string[], losers: string[]): Match => ({
  id,
  type,
  winners,
  losers,
  scoreWinner: 11,
  scoreLoser: 9,
  timestamp: new Date().toISOString(),
  eloChange: 20,
});
```
Factory style appears in `source/services/insightsService.test.ts` and helper builders in `source/utils/sosUtils.test.ts`.

**Location:**
- Fixtures are defined inline per test file (no shared fixture directory detected).

## Coverage

**Requirements:**
- No global coverage threshold is enforced in `source/jest.config.cjs`.
- Coverage script is not defined in `source/package.json`; use direct Jest CLI for coverage runs.

**View Coverage:**
```bash
npx jest --coverage
```

## Test Types

**Unit Tests:**
- Pure logic and deterministic behavior in utilities/services (`source/utils/insightsSorting.test.ts`, `source/services/insightsService.test.ts`).

**Integration Tests:**
- Component-to-component data flow and state interaction in `source/components/integration.test.tsx`.

**E2E Tests:**
- Not detected.

## Common Patterns

**Async Testing:**
```typescript
it('submits and refreshes', async () => {
  const result = await someAsyncAction();
  expect(result).toBeDefined();
});
```
Async/await style appears broadly in service and handler tests; UI toggles are wrapped in `act(...)` for state transitions (`source/components/StatsDashboard.test.tsx`, `source/components/PlayerProfile.test.tsx`).

**Error Testing:**
```typescript
const result = simulateWinsNeeded(1200, 3500);
expect(result).toBeNull();
```
Sentinel-value and fallback-path assertions are common (`source/services/insightsService.test.ts`, `source/utils/gameTypeStats.test.ts`).

## Property-Based Testing

- Property-based testing with `fast-check` is used heavily in UI and utility tests (`source/components/Leaderboard.test.tsx`, `source/components/PlayerProfile.test.tsx`, `source/utils/gameTypeStats.test.ts`).
- Typical execution count uses bounded run counts such as `{ numRuns: 20 }` for UI-heavy tests and `{ numRuns: 100 }` for utility properties.

## Current First-Party Test Files

- `source/services/insightsService.test.ts`
- `source/components/PlayerProfile.test.tsx`
- `source/components/PlayerProfile.features.test.tsx`
- `source/components/integration.test.tsx`
- `source/components/GameTypeIndicators.test.tsx`
- `source/components/StatsDashboard.test.tsx`
- `source/components/Leaderboard.test.tsx`
- `source/utils/validation.test.ts`
- `source/utils/insightsSorting.test.ts`
- `source/utils/gameTypeStats.test.ts`
- `source/utils/sosUtils.test.ts`

---

*Testing analysis: 2026-03-16*
