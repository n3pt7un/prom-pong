# GitHub Issues Design — 2026-02-27

Three issues from the prom-pong repo addressed in this plan.

---

## Issue #6 — Correction Request Flow

**Problem:** Only admins or the match logger within 60 seconds can edit a registered match score. Players involved in a match have no way to correct an error after that window.

**Design Decision:** Correction Request flow — participants submit a proposed correction; admins approve or reject it.

### New Data Type

```typescript
// types.ts
export interface CorrectionRequest {
  id: string;
  matchId: string;
  requestedBy: string;           // Firebase UID of the requester
  proposedWinners: string[];
  proposedLosers: string[];
  proposedScoreWinner: number;
  proposedScoreLoser: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;           // admin UID who acted
  reviewedAt?: string;
}
```

### Frontend

**RecentMatches.tsx**
- Add a `canRequestCorrection(match)` check: current user's player ID is in `match.winners` or `match.losers` AND they are not the original logger AND no pending correction for this match already exists.
- Show a "Request Correction" button (flag icon) on hover for eligible participants.
- Clicking opens an inline form (within the match card) with:
  - Corrected score inputs (score 1 / score 2)
  - Swap teams button (same as edit mode)
  - Optional reason text field
  - Submit / Cancel buttons
- On submit, calls `onRequestCorrection(matchId, proposedData)`.

**New CorrectionRequests panel (admin-only)**
- Shown in Settings tab or as a badge-flagged section.
- Lists pending correction requests with the original match details and proposed changes side-by-side.
- Approve button → calls `onApproveCorrection(requestId)` → triggers existing `editMatch` logic.
- Reject button → calls `onRejectCorrection(requestId)`.

### Backend (server.js + Supabase PostgreSQL)

**SQL Migration** (`007_correction_requests.sql`):
```sql
CREATE TABLE correction_requests (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,        -- Firebase UID
  proposed_score_winner INTEGER NOT NULL,
  proposed_score_loser INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Junction table for proposed winner/loser player IDs
CREATE TABLE correction_request_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL REFERENCES correction_requests(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  is_winner BOOLEAN NOT NULL
);
```

**New Express API endpoints** in `server.js`:
- `POST /api/corrections` — create correction request (auth required; user must be a participant)
- `GET /api/corrections` — list all (admin only); supports `?status=pending`
- `PATCH /api/corrections/:id/approve` — admin approves; re-uses existing edit-match logic + ELO recalc
- `PATCH /api/corrections/:id/reject` — marks status = rejected

**Cloud Run compatibility**: No Cloud Run configuration changes. The Docker image rebuild + redeploy process is unchanged. Supabase migrations are applied separately via Supabase CLI (`supabase db push`) before deploying.

---

## Issue #7 — Match Format Selection (Standard-11 / Vintage-21)

**Problem:** The app accepts unrealistic scores (e.g. `500-0`). The current validation only checks minimum winning score of 11 and a 2-point margin, with no upper-bound enforcement.

**Design Decision:** Add a per-match format selector in MatchLogger with strict validation. Store format on the match record.

### Data Model Change

```typescript
// types.ts — Match interface
matchFormat?: 'standard11' | 'vintage21';  // defaults to 'standard11' for legacy matches
```

### Validation Rules

```
Standard-11:
  winner >= 11
  diff >= 2
  if loser <= 9: winner must equal exactly 11
  (deuce: if loser >= 10, winner = loser + 2, loser + 4, etc.)

Vintage-21:
  winner >= 21
  diff >= 2
  if loser <= 19: winner must equal exactly 21
  (deuce: if loser >= 20, winner = loser + 2, loser + 4, etc.)
```

Examples of valid/invalid scores:
- Standard-11: `11-5` ✓, `11-9` ✓, `12-10` ✓, `13-11` ✓, `11-10` ✗, `500-0` ✗, `15-5` ✗
- Vintage-21: `21-15` ✓, `21-19` ✓, `22-20` ✓, `21-20` ✗, `500-0` ✗

### Frontend

**MatchLogger.tsx — 3-step wizard**

The MatchLogger becomes a step-by-step flow with a step indicator and Back/Next buttons:

- **Step 1 — Format**: Two large cards: `STANDARD-11` and `VINTAGE-21`. Each shows the rule summary. Tapping one advances to Step 2.
- **Step 2 — Type**: Two large cards: `1 vs 1` and `2 vs 2`. Tapping one advances to Step 3.
- **Step 3 — Players & Score**: The current player selection grid + score inputs + Friendly toggle + Submit button. A "Back" button returns to Step 2.

State: `step` (1 | 2 | 3), `matchFormat`, `gameType` — set in Steps 1 and 2 respectively and carried through.

Replace the current inline score validation with a `validateScore(s1, s2, format)` function.
Pass `matchFormat` through `onSubmit`.

**RecentMatches.tsx**
- Show a small format badge in the match card: `S-11` (cyan) or `V-21` (purple) alongside the existing ELO/FRIENDLY badge.
- In edit mode, re-validate submitted scores against the match's stored `matchFormat`.

### Backend (server.js + Supabase PostgreSQL)

**SQL Migration** (`007_match_format.sql` — runs before correction_requests migration):
```sql
ALTER TABLE matches ADD COLUMN match_format TEXT NOT NULL DEFAULT 'vintage21'
  CHECK (match_format IN ('standard11', 'vintage21'));
```

**server.js changes**:
- Accept `matchFormat` in `POST /api/matches` request body.
- Apply the same `validateScore(scoreWinner, scoreLoser, matchFormat)` validation server-side to prevent API bypass.
- Store `match_format` column on insert.

**Cloud Run compatibility**: Additive schema change only. Existing rows default to `'vintage21'`. No data migration required.

---

## New Issue — Browser Back Button Navigation

**Problem:** The app uses React state (`useState`) for tab navigation with no browser history entries. On mobile, swiping back (or pressing the browser back button) exits the app instead of returning to the previous tab.

**Design Decision:** Use the native History API to push a history entry on each tab switch. No router library needed.

### Implementation

**App.tsx**

```typescript
// On mount: initialize from URL hash
useEffect(() => {
  const hash = window.location.hash.replace('#', '');
  if (hash && isValidTab(hash)) {
    setActiveTab(hash);
  } else {
    window.history.replaceState({ tab: 'leaderboard' }, '', '#leaderboard');
  }
}, []);

// On popstate (back/forward button):
useEffect(() => {
  const handler = (e: PopStateEvent) => {
    const tab = e.state?.tab;
    if (tab && isValidTab(tab)) setActiveTab(tab);
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}, []);

// On tab change (replace setActiveTab calls):
const navigateTo = (tab: string) => {
  window.history.pushState({ tab }, '', `#${tab}`);
  setActiveTab(tab);
};
```

- All `setActiveTab(...)` calls are replaced with `navigateTo(...)`.
- `isValidTab` is a simple set of valid tab names.
- Hard refresh / bookmark support: the hash is read on mount.
- No server-side routing changes needed (hash-based, not path-based).

---

## Implementation Order

1. **Issue #7** (Match Format) — SQL migration + data model change + 3-step wizard UI + backend validation.
2. **Back Button** — pure frontend change in App.tsx. Quick win.
3. **Issue #6** (Correction Requests) — SQL migration + new entity type + new UI panel + new backend endpoints. Most complex.

## Deployment Notes

All changes deploy via the existing Cloud Run workflow:
- **Frontend**: Vite build → static files served from Cloud Run container.
- **Backend**: Express server.js → same Docker image rebuild + `gcloud run deploy`.
- **Database**: Supabase PostgreSQL migrations applied via `supabase db push` before deployment.
- No Cloud Run infrastructure changes, no new services, compatible with the free tier.
