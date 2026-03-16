---
phase: 2
slug: formula-trust-boundary-and-persistence-contracts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (existing, jest.config.cjs) |
| **Config file** | `source/jest.config.cjs` |
| **Quick run command** | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` |
| **Full suite command** | `cd source && npm test -- --runInBand` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run the specific test file for that task (commands below)
- **After every plan wave:** Run `cd source && npm test -- --runInBand`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | SECU-01 | unit (inline boundary) | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | SECU-02 | unit | `cd source && npx jest server/__tests__/formula-trust-boundary.test.mjs --runInBand` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 0 | DATA-01 | unit | `cd source && npx jest server/__tests__/persistence-adapter-contracts.test.mjs --runInBand` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 0 | DATA-03 | unit | `cd source && npx jest server/__tests__/persistence-adapter-contracts.test.mjs --runInBand` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `source/server/__tests__/formula-trust-boundary.test.mjs` — stubs for SECU-01, SECU-02
- [ ] `source/server/__tests__/persistence-adapter-contracts.test.mjs` — stubs for DATA-01, DATA-03

*No framework install needed — Jest is already present and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin UI trust boundary note visible in EloConfigTab | SECU-01 | Visual/UI inspection required | Open admin panel → ELO Config tab → verify warning note listing available formula variables is displayed |
| Supabase full import (live env) | DATA-01 | Requires live Supabase credentials + schema access | With `USE_SUPABASE=true` env, POST /api/import with full export payload — verify players, matches, history, rackets all imported |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
