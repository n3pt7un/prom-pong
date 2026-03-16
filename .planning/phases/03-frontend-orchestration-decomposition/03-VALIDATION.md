---
phase: 3
slug: frontend-orchestration-decomposition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (via ts-jest) + @testing-library/react |
| **Config file** | `source/jest.config.cjs` |
| **Quick run command** | `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest --passWithNoTests -x` |
| **Full suite command** | `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest --passWithNoTests -x`
- **After every plan wave:** Run `cd /Users/tarasivaniv/Documents/test-pong/source && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | ARCH-03 | unit | `npx jest --testPathPattern="mutationHelper" -x` | ❌ W0 | ⬜ pending |
| 3-W0-02 | W0 | 0 | ARCH-02 | unit | `npx jest --testPathPattern="useMatchHandlers" -x` | ❌ W0 | ⬜ pending |
| 3-W0-03 | W0 | 0 | ARCH-02 | unit | `npx jest --testPathPattern="useLeagueHandlers.facade" -x` | ❌ W0 | ⬜ pending |
| 3-W0-04 | W0 | 0 | ARCH-01 | unit | `npx jest --testPathPattern="LeaderboardContainer" -x` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | ARCH-03 | unit | `npx jest --testPathPattern="mutationHelper" -x` | ✅ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | ARCH-02 | unit | `npx jest --testPathPattern="handlers/" -x` | ✅ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | ARCH-02 | unit | `npx jest --testPathPattern="useLeagueHandlers" -x` | ✅ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | ARCH-01 | unit | `npx jest --testPathPattern="containers/" -x` | ✅ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | ARCH-04 | file existence | `test ! -f source/components/Settings.old.tsx && echo "PASS"` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `source/utils/mutationHelper.test.ts` — stubs for ARCH-03: runMutation success, error, skipRefresh, undo action
- [ ] `source/hooks/handlers/useMatchHandlers.test.ts` — stubs for ARCH-02: handler key presence, basic invocation with mocked storageService
- [ ] `source/hooks/useLeagueHandlers.facade.test.ts` — stubs for ARCH-02: facade returns all 35 handler keys as functions
- [ ] `source/containers/LeaderboardContainer.test.tsx` — stubs for ARCH-01: renders without crash, passes handlers from context

*Existing integration tests in `source/components/integration.test.tsx` and component tests remain valid as regression guard.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Navigation and modal UX matches pre-refactor behavior | ARCH-01 | Visual/interaction fidelity hard to fully automate | Open app, navigate all tabs, open/close all modals, confirm no regressions |
| Toast and error displays appear correctly | ARCH-03 | Toast rendering requires browser interaction | Trigger match add, player add, admin action; confirm toast appears and dismisses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
