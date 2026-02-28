# GitHub Issues Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three improvements: (1) match format selection with strict score validation, (2) browser back-button tab navigation, and (3) a correction request flow for match score disputes.

**Architecture:** Issue #7 adds a 3-step wizard to MatchLogger and a Supabase column; the back-button fix wires the History API into App.tsx tab switching; Issue #6 adds a new CorrectionRequest type, Supabase table, Express route, and admin UI panel.

**Tech Stack:** React 18 + TypeScript, Express (ESM), Supabase PostgreSQL via `@supabase/supabase-js`, Tailwind CDN (no build step for styles), Vite build, deployed on Google Cloud Run.

---

## Task 1: Match Format — SQL Migration

**Files:**
- Create: `supabase/migrations/007_match_format.sql`

**Step 1: Create the migration file**

```sql
-- supabase/migrations/007_match_format.sql
-- Existing matches default to 'vintage21' (the format used before this feature was added)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_format TEXT NOT NULL DEFAULT 'vintage21'
    CHECK (match_format IN ('standard11', 'vintage21'));
```

**Step 2: Apply the migration**

```bash
# You need the Supabase CLI installed: npm install -g supabase
supabase db push
```

Expected: `Applied migration 007_match_format` (or equivalent success message). If you don't have Supabase CLI set up locally, apply this SQL directly in the Supabase dashboard → SQL editor.

**Step 3: Verify**

In the Supabase dashboard, check the `matches` table has the new `match_format` column with default `'standard11'`.

**Step 4: Commit**

```bash
git add supabase/migrations/007_match_format.sql
git commit -m "feat: add match_format column to matches table"
```

---

## Task 2: Match Format — TypeScript Type

**Files:**
- Modify: `source/types.ts`

**Step 1: Add the MatchFormat type and update Match**

In `source/types.ts`, add after the `GameType` line (line 1):

```typescript
export type MatchFormat = 'standard11' | 'vintage21';
```

Then add `matchFormat` to the `Match` interface (after `leagueId`):

```typescript
matchFormat?: MatchFormat; // undefined = legacy match, treat as standard11
```

**Step 2: Verify TypeScript compiles**

```bash
cd source && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add source/types.ts
git commit -m "feat: add MatchFormat type to Match interface"
```

---

## Task 3: Match Format — Shared Validation Function

**Files:**
- Create: `source/utils/matchValidation.ts`

**Step 1: Create the validation utility**

```typescript
// source/utils/matchValidation.ts
import { MatchFormat } from '../types';

/**
 * Validates a table tennis score against the given format.
 * Returns null if valid, or an error string if invalid.
 *
 * Standard-11: first to 11, win by 2. If loser has <= 9 points,
 *   winner must be exactly 11 (no excess points before deuce threshold).
 *   Deuce at 10-10: winner = loser + 2.
 *
 * Vintage-21: same rules, but first to 21. Deuce at 20-20.
 */
export function validateMatchScore(
  s1: number,
  s2: number,
  format: MatchFormat = 'vintage21'
): string | null {
  const target = format === 'vintage21' ? 21 : 11;
  const deuceStart = target - 1;

  const winner = Math.max(s1, s2);
  const loser = Math.min(s1, s2);

  if (isNaN(s1) || isNaN(s2)) return 'Scores must be numbers';
  if (s1 === s2) return 'Draws are not allowed';
  if (winner - loser < 2) return 'Must win by at least 2 points';
  if (winner < target) return `Minimum winning score is ${target}`;
  if (loser < deuceStart && winner > target) {
    return `Invalid score: if opponent has fewer than ${deuceStart} points, winner must score exactly ${target}`;
  }

  return null;
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd source && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add source/utils/matchValidation.ts
git commit -m "feat: add validateMatchScore utility for Standard-11 and Vintage-21"
```

---

## Task 4: Match Format — 3-Step MatchLogger Wizard

**Files:**
- Modify: `source/components/MatchLogger.tsx`

**Context:** MatchLogger currently has all inputs on one screen. We're converting it to a 3-step wizard:
- Step 1: Pick format (Standard-11 or Vintage-21)
- Step 2: Pick game type (1v1 or 2v2)
- Step 3: Current player/score UI + submit

The component's `onSubmit` prop needs a new `matchFormat` parameter. Update the prop type too.

**Step 1: Update the MatchLogger interface and add step state**

At the top of the component, replace the import and interface:

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { Player, GameType, League, MatchFormat } from '../types';
import { validateMatchScore } from '../utils/matchValidation';
import { Swords, AlertCircle, Loader2, Globe, Search, ChevronLeft } from 'lucide-react';

interface MatchLoggerProps {
  players: Player[];
  onSubmit: (type: GameType, winners: string[], losers: string[], scoreW: number, scoreL: number, isFriendly: boolean, leagueId: string, matchFormat: MatchFormat) => void;
  prefill?: { type: GameType; team1: string[]; team2: string[] } | null;
  onPrefillConsumed?: () => void;
  currentPlayerId?: string;
  isAdmin?: boolean;
  activeLeagueId?: string | null;
  leagues?: League[];
}
```

**Step 2: Add step and matchFormat state inside the component**

After the existing `useState` declarations, add:

```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
const [matchFormat, setMatchFormat] = useState<MatchFormat>('vintage21');
```

Remove the existing `gameType` toggle from step-3 (it will be picked in step 2). Keep `gameType` state as-is.

**Step 3: Update the validation in handleSubmit**

Replace the existing score validation block in `handleSubmit`:

```typescript
const s1 = parseInt(score1);
const s2 = parseInt(score2);

const validationError = validateMatchScore(s1, s2, matchFormat);
if (validationError) return setError(validationError);
```

And pass `matchFormat` to `onSubmit`:

```typescript
await onSubmit(gameType, winners, losers, wScore, lScore, isFriendly, activeLeagueId || undefined, matchFormat);
```

Also reset to step 1 after submit (add `setStep(1);` in the reset block after submit).

**Step 4: Replace the JSX return with the 3-step wizard**

Replace the entire `return (...)` with:

```tsx
const FORMAT_OPTIONS: { value: MatchFormat; label: string; sub: string }[] = [
  { value: 'standard11', label: 'STANDARD-11', sub: 'First to 11 · Deuce at 10-10' },
  { value: 'vintage21', label: 'VINTAGE-21', sub: 'First to 21 · Deuce at 20-20' },
];

const TYPE_OPTIONS = [
  { value: 'singles' as GameType, label: '1 vs 1', sub: 'Singles' },
  { value: 'doubles' as GameType, label: '2 vs 2', sub: 'Doubles' },
];

return (
  <div className="glass-panel p-6 md:p-8 rounded-xl max-w-2xl mx-auto shadow-neon-pink animate-fadeIn">
    {/* Header */}
    <div className="flex items-center gap-3 mb-6">
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <Swords className="text-cyber-pink w-8 h-8" />
      <h2 className="text-2xl font-display font-bold text-white">
        LOG <span className="text-cyber-cyan">MATCH</span>
      </h2>
      <span className="ml-auto text-xs font-mono text-gray-500 uppercase tracking-widest">
        Step {step} / 3
      </span>
    </div>

    {/* Step 1: Format */}
    {step === 1 && (
      <div className="space-y-4">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest text-center mb-6">Select Match Format</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setMatchFormat(opt.value); setStep(2); }}
              className="p-6 rounded-xl border-2 border-white/10 bg-white/5 hover:border-cyber-cyan hover:bg-cyber-cyan/10 text-left transition-all group"
            >
              <div className="text-xl font-display font-bold text-white group-hover:text-cyber-cyan transition-colors">
                {opt.label}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Step 2: Game Type */}
    {step === 2 && (
      <div className="space-y-4">
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest text-center mb-2">
          {matchFormat === 'standard11' ? 'STANDARD-11' : 'VINTAGE-21'} · Select Game Type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setGameType(opt.value);
                setTeam1(currentPlayerId && !isAdmin ? [currentPlayerId] : []);
                setTeam2([]);
                setStep(3);
              }}
              className="p-6 rounded-xl border-2 border-white/10 bg-white/5 hover:border-cyber-pink hover:bg-cyber-pink/10 text-left transition-all group"
            >
              <div className="text-xl font-display font-bold text-white group-hover:text-cyber-pink transition-colors">
                {opt.label}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Step 3: Players & Score (existing UI, minus the type and format toggles) */}
    {step === 3 && (
      <>
        {/* Format + type summary badge */}
        <div className="flex justify-center gap-2 mb-4">
          <span className="text-[10px] font-mono text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-1 rounded-full uppercase tracking-widest">
            {matchFormat === 'standard11' ? 'S-11' : 'V-21'}
          </span>
          <span className="text-[10px] font-mono text-white/50 bg-white/5 border border-white/10 px-2 py-1 rounded-full uppercase tracking-widest">
            {gameType === 'singles' ? '1v1' : '2v2'}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Friendly Toggle */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsFriendly(!isFriendly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm transition-all ${
                isFriendly
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
              }`}
            >
              <span className="text-base">{isFriendly ? '🤝' : '🏆'}</span>
              {isFriendly ? 'FRIENDLY (No ELO)' : 'RANKED'}
            </button>
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Team 1 */}
            <div className="space-y-3">
              <h3 className="text-cyber-cyan font-mono font-bold text-center">TEAM 1 (CYAN)</h3>
              <div className="bg-black/40 p-4 rounded-lg border border-cyber-cyan/30 min-h-[100px] flex flex-wrap gap-2 justify-center">
                {team1.map(id => {
                  const p = players.find(player => player.id === id);
                  const locked = isLockedPlayer(id);
                  return (
                    <div key={id} onClick={() => !locked && setTeam1(team1.filter(pid => pid !== id))} className={`flex items-center gap-2 px-2 py-1 rounded font-bold text-sm ${locked ? 'bg-cyber-cyan/70 text-black ring-2 ring-white/40' : 'cursor-pointer bg-cyber-cyan text-black'}`}>
                      {p?.name} {locked ? <span className="text-[10px] opacity-60">&#128274;</span> : <span className="text-[10px]">&#10005;</span>}
                    </div>
                  );
                })}
                {team1.length === 0 && <span className="text-gray-600 text-sm italic self-center">Select players below</span>}
              </div>
              <input
                type="number"
                placeholder="Score"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded text-center font-mono text-xl focus:border-cyber-cyan outline-none transition-colors"
              />
            </div>

            {/* Team 2 */}
            <div className="space-y-3">
              <h3 className="text-cyber-pink font-mono font-bold text-center">TEAM 2 (PINK)</h3>
              <div className="bg-black/40 p-4 rounded-lg border border-cyber-pink/30 min-h-[100px] flex flex-wrap gap-2 justify-center">
                {team2.map(id => {
                  const p = players.find(player => player.id === id);
                  return (
                    <div key={id} onClick={() => setTeam2(team2.filter(pid => pid !== id))} className="cursor-pointer flex items-center gap-2 bg-cyber-pink text-black px-2 py-1 rounded font-bold text-sm">
                      {p?.name} <span className="text-[10px]">&#10005;</span>
                    </div>
                  );
                })}
                {team2.length === 0 && <span className="text-gray-600 text-sm italic self-center">Select players below</span>}
              </div>
              <input
                type="number"
                placeholder="Score"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded text-center font-mono text-xl focus:border-cyber-pink outline-none transition-colors"
              />
            </div>
          </div>

          {/* Roster Selection */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Available Players</p>
              <div className="flex items-center gap-2">
                {activeLeagueId && leagues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCrossLeague(!crossLeague)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                      crossLeague
                        ? 'bg-cyber-purple/20 border-cyber-purple/50 text-cyber-purple'
                        : 'border-white/10 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Globe size={12} />
                    {crossLeague ? 'ALL LEAGUES' : 'SAME LEAGUE'}
                  </button>
                )}
              </div>
            </div>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/30 border border-white/10 text-white text-sm pl-8 pr-3 py-2 rounded-lg font-mono focus:border-cyber-cyan outline-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {availablePlayers.map(player => {
                const active = isSelected(player.id);
                const playerLeague = leagues.find(l => l.id === player.leagueId);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={active}
                    onClick={() => {
                      if (team1.length < (gameType === 'singles' ? 1 : 2)) handlePlayerSelect(player.id, 1);
                      else if (team2.length < (gameType === 'singles' ? 1 : 2)) handlePlayerSelect(player.id, 2);
                    }}
                    className={`p-3 rounded border text-sm font-bold flex items-center gap-2 transition-all ${
                      active
                        ? 'opacity-30 border-gray-700 bg-gray-900 cursor-not-allowed'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 text-gray-300'
                    }`}
                  >
                    <img src={player.avatar} className="w-6 h-6 rounded-full" />
                    <span className="truncate">{player.name}</span>
                    {crossLeague && playerLeague && (
                      <span className="text-[8px] font-mono text-cyber-purple bg-cyber-purple/10 px-1 py-0.5 rounded-full ml-auto flex-shrink-0">
                        {playerLeague.name}
                      </span>
                    )}
                  </button>
                );
              })}
              {availablePlayers.length === 0 && (
                <p className="col-span-full text-gray-500 text-sm italic text-center py-4">
                  No players found{searchQuery ? ' matching search' : activeLeagueId ? ' in this league' : ''}.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-cyber-cyan to-cyber-pink text-black font-display font-bold text-xl rounded-lg shadow-neon-cyan hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> SUBMITTING...
              </>
            ) : (
              'SUBMIT MATCH'
            )}
          </button>
        </form>
      </>
    )}
  </div>
);
```

**Step 5: Verify the app builds**

```bash
cd source && npm run build
```

Expected: build succeeds, no TypeScript errors.

**Step 6: Commit**

```bash
git add source/components/MatchLogger.tsx
git commit -m "feat: convert MatchLogger to 3-step wizard with format selection"
```

---

## Task 5: Match Format — Wire Format Through App.tsx + storageService

**Files:**
- Modify: `source/App.tsx`
- Modify: `source/services/storageService.ts`
- Modify: `source/hooks/useLeagueHandlers.ts`

**Step 1: Update handleMatchSubmitWithTab in App.tsx**

Find `handleMatchSubmitWithTab` in `source/App.tsx` and add `matchFormat` parameter:

```typescript
const handleMatchSubmitWithTab = async (
  type: GameType,
  winners: string[],
  losers: string[],
  scoreW: number,
  scoreL: number,
  isFriendly = false,
  leagueId?: string,
  matchFormat?: MatchFormat
) => {
  const result = await handlers.handleMatchSubmit(type, winners, losers, scoreW, scoreL, isFriendly, leagueId, matchFormat);
  if (result) setActiveTab('leaderboard');
};
```

Also add `import { MatchFormat } from './types';` to the imports at the top of App.tsx.

**Step 2: Update recordMatch in storageService.ts**

```typescript
export const recordMatch = async (
  type: GameType,
  winnerIds: string[],
  loserIds: string[],
  scoreWinner: number,
  scoreLoser: number,
  isFriendly: boolean = false,
  leagueId?: string,
  matchFormat?: MatchFormat
) => {
  return apiRequest(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, winners: winnerIds, losers: loserIds, scoreWinner, scoreLoser, isFriendly, leagueId, matchFormat })
  });
};
```

**Step 3: Update handleMatchSubmit in useLeagueHandlers.ts**

```typescript
const handleMatchSubmit = useCallback(
  async (type: GameType, winners: string[], losers: string[], scoreW: number, scoreL: number, isFriendly = false, leagueId?: string, matchFormat?: MatchFormat) => {
    try {
      const result = await recordMatch(type, winners, losers, scoreW, scoreL, isFriendly, leagueId || (activeLeagueId ?? undefined), matchFormat);
      // ... rest unchanged
```

Add `import { GameType, RacketStats, Tournament, MatchFormat } from '../types';` at the top.

**Step 4: Build and verify**

```bash
cd source && npm run build
```

Expected: no errors.

**Step 5: Commit**

```bash
git add source/App.tsx source/services/storageService.ts source/hooks/useLeagueHandlers.ts
git commit -m "feat: thread matchFormat through submission pipeline"
```

---

## Task 6: Match Format — Backend Validation + Storage

**Files:**
- Modify: `source/server/routes/matches.js`

**Step 1: Add validateMatchScore as a JS function at the top of matches.js**

After the imports, add:

```javascript
/**
 * Validates a table tennis score. Returns error string or null.
 * Standard-11: first to 11, deuce at 10-10.
 * Vintage-21: first to 21, deuce at 20-20.
 */
function validateMatchScore(scoreWinner, scoreLoser, format = 'vintage21') {
  const target = format === 'vintage21' ? 21 : 11;
  const deuceStart = target - 1;

  if (scoreWinner === scoreLoser) return 'Draws are not allowed';
  if (scoreWinner - scoreLoser < 2) return 'Must win by at least 2 points';
  if (scoreWinner < target) return `Minimum winning score is ${target}`;
  if (scoreLoser < deuceStart && scoreWinner > target) {
    return `Invalid score: if opponent has fewer than ${deuceStart} points, winner must score exactly ${target}`;
  }
  return null;
}
```

**Step 2: Use validation in POST /api/matches**

After the existing `scoreWinner`/`scoreLoser` type check in `router.post('/matches', ...)`, add:

```javascript
const matchFormat = req.body.matchFormat || 'vintage21';
if (!['standard11', 'vintage21'].includes(matchFormat)) {
  return res.status(400).json({ error: 'Invalid match format' });
}
const scoreError = validateMatchScore(scoreWinner, scoreLoser, matchFormat);
if (scoreError) {
  return res.status(400).json({ error: scoreError });
}
```

Then add `matchFormat` to the `newMatch` object:

```javascript
const newMatch = {
  id: matchId, type, winners, losers,
  scoreWinner, scoreLoser, timestamp, eloChange: delta, loggedBy: req.user.uid,
  isFriendly: friendly,
  leagueId,
  matchFormat,   // <-- add this
};
```

**Step 3: Store match_format in Supabase**

In the Supabase branch of `dbOps.createMatch`, ensure `match_format` is written. Find where the match is inserted into Supabase (in `source/server/db/operations.js`) and add:

```javascript
match_format: match.matchFormat || 'vintage21',
```

> Note: Check `source/server/db/operations.js` → `createMatch` function and add this field to the Supabase insert call.

**Step 4: Return match_format from GET /api/state**

When the state endpoint reads matches from Supabase, ensure `match_format` is mapped back to `matchFormat` on the JS object (check `source/server/routes/state.js` for the match-mapping code).

**Step 5: Commit**

```bash
git add source/server/routes/matches.js source/server/db/operations.js source/server/routes/state.js
git commit -m "feat: add match format validation and storage to backend"
```

---

## Task 7: Match Format — Show Format Badge in RecentMatches

**Files:**
- Modify: `source/components/RecentMatches.tsx`

**Step 1: Update score validation in edit mode to use matchFormat**

In `submitEdit`, replace the existing score validation with a call to `validateMatchScore`:

```typescript
import { validateMatchScore } from '../utils/matchValidation';

const submitEdit = () => {
  if (!onEditMatch || !editingId) return;
  const s1 = parseInt(editScore1);
  const s2 = parseInt(editScore2);
  const format = matches.find(m => m.id === editingId)?.matchFormat || 'vintage21';
  const error = validateMatchScore(s1, s2, format);
  if (error) { setEditError(error); return; }
  // ... rest unchanged
```

**Step 2: Show format badge in match card**

In the non-editing match card JSX, add a format badge next to the existing ELO/FRIENDLY badge:

```tsx
{/* Format badge */}
<span className={`inline-block text-xs font-mono font-bold px-2 py-1 rounded border ${
  match.matchFormat === 'vintage21'
    ? 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/30'
    : 'bg-white/5 text-gray-500 border-white/10'
}`}>
  {match.matchFormat === 'vintage21' ? 'V-21' : 'S-11'}
</span>
```

Place this before the ELO/FRIENDLY badge in the badge area.

**Step 3: Build and verify**

```bash
cd source && npm run build
```

**Step 4: Commit**

```bash
git add source/components/RecentMatches.tsx
git commit -m "feat: show format badge in match feed and validate edits against format"
```

---

## Task 8: Browser Back Button Navigation

**Files:**
- Modify: `source/App.tsx`

**Context:** Currently `setActiveTab` uses React state only. We'll push a history entry on each tab switch and listen for `popstate`.

The valid tabs are: `'leaderboard'`, `'log'`, `'recent'`, `'players'`, `'matchmaker'`, `'challenges'`, `'tournaments'`, `'seasons'`, `'settings'`, `'leagues'`, `'rackets'`, `'weekly'`, `'hof'`.

**Step 1: Add navigateTo helper + history listeners in App.tsx**

Inside `AppContent` (or `App`), find the `const [activeTab, setActiveTab] = useState('leaderboard');` line.

Below it, add:

```typescript
const VALID_TABS = new Set([
  'leaderboard', 'log', 'recent', 'players', 'matchmaker',
  'challenges', 'tournaments', 'seasons', 'settings', 'leagues',
  'rackets', 'weekly', 'hof',
]);

// On mount: restore tab from hash (supports bookmarks / hard refresh)
useEffect(() => {
  const hash = window.location.hash.replace('#', '');
  if (hash && VALID_TABS.has(hash)) {
    setActiveTab(hash);
  } else {
    window.history.replaceState({ tab: 'leaderboard' }, '', '#leaderboard');
  }
}, []);

// Listen for browser back/forward
useEffect(() => {
  const handlePop = (e: PopStateEvent) => {
    const tab = e.state?.tab;
    if (tab && VALID_TABS.has(tab)) setActiveTab(tab);
  };
  window.addEventListener('popstate', handlePop);
  return () => window.removeEventListener('popstate', handlePop);
}, []);

// Replace setActiveTab calls with navigateTo
const navigateTo = (tab: string) => {
  window.history.pushState({ tab }, '', `#${tab}`);
  setActiveTab(tab);
};
```

**Step 2: Replace all setActiveTab calls with navigateTo**

Search for every `setActiveTab(` call in `App.tsx` and replace with `navigateTo(`. There are approximately 5-7 occurrences (tab change handlers, handleMatchmakerSelect, handleLeaderboardPlayerClick, etc.).

```bash
# Preview what needs changing:
grep -n "setActiveTab(" source/App.tsx
```

For each one, change `setActiveTab('leaderboard')` → `navigateTo('leaderboard')`, etc.

**Note:** The Layout component's `onTabChange` prop also calls `setActiveTab`. Find where `<Layout>` is rendered in App.tsx and change `onTabChange={setActiveTab}` to `onTabChange={navigateTo}`.

**Step 3: Build and verify**

```bash
cd source && npm run build
```

**Step 4: Manual test**

Open the app, navigate between tabs, then press the browser back button. Confirm it returns to the previous tab rather than exiting the SPA.

**Step 5: Commit**

```bash
git add source/App.tsx
git commit -m "feat: add browser history navigation so back button returns to previous tab"
```

---

## Task 9: Correction Requests — SQL Migration

**Files:**
- Create: `supabase/migrations/008_correction_requests.sql`

**Step 1: Create the migration**

```sql
-- supabase/migrations/008_correction_requests.sql

CREATE TABLE correction_requests (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,            -- Firebase UID
  proposed_score_winner INTEGER NOT NULL,
  proposed_score_loser INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_correction_requests_match_id ON correction_requests(match_id);
CREATE INDEX idx_correction_requests_status ON correction_requests(status);
CREATE INDEX idx_correction_requests_requested_by ON correction_requests(requested_by);

-- Players proposed for this correction (replaces current winners/losers)
CREATE TABLE correction_request_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id TEXT NOT NULL REFERENCES correction_requests(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  is_winner BOOLEAN NOT NULL
);

CREATE INDEX idx_correction_request_players_request_id ON correction_request_players(request_id);
```

**Step 2: Apply the migration**

```bash
supabase db push
```

Or apply via Supabase dashboard SQL editor.

**Step 3: Commit**

```bash
git add supabase/migrations/008_correction_requests.sql
git commit -m "feat: add correction_requests table to Supabase schema"
```

---

## Task 10: Correction Requests — TypeScript Types + storageService

**Files:**
- Modify: `source/types.ts`
- Modify: `source/services/storageService.ts`

**Step 1: Add CorrectionRequest type to types.ts**

```typescript
// In source/types.ts, add after the Challenge interface:

export interface CorrectionRequest {
  id: string;
  matchId: string;
  requestedBy: string;            // Firebase UID
  proposedWinners: string[];
  proposedLosers: string[];
  proposedScoreWinner: number;
  proposedScoreLoser: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
```

**Step 2: Add API functions to storageService.ts**

```typescript
// Add import at top:
import { ..., CorrectionRequest } from '../types';

// Add these functions:

export const createCorrectionRequest = async (data: {
  matchId: string;
  proposedWinners: string[];
  proposedLosers: string[];
  proposedScoreWinner: number;
  proposedScoreLoser: number;
  reason?: string;
}): Promise<CorrectionRequest> => {
  return apiRequest(`${API_URL}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const getCorrectionRequests = async (): Promise<CorrectionRequest[]> => {
  return apiRequest(`${API_URL}/corrections`);
};

export const approveCorrectionRequest = async (requestId: string): Promise<void> => {
  return apiRequest(`${API_URL}/corrections/${requestId}/approve`, { method: 'PATCH' });
};

export const rejectCorrectionRequest = async (requestId: string): Promise<void> => {
  return apiRequest(`${API_URL}/corrections/${requestId}/reject`, { method: 'PATCH' });
};
```

**Step 3: Add LeagueState field**

In `storageService.ts`, add `correctionRequests: CorrectionRequest[];` to the `LeagueState` interface.

**Step 4: Build and verify**

```bash
cd source && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add source/types.ts source/services/storageService.ts
git commit -m "feat: add CorrectionRequest type and storageService API functions"
```

---

## Task 11: Correction Requests — Backend Route

**Files:**
- Create: `source/server/routes/corrections.js`
- Modify: `source/server/index.js`

**Step 1: Create the corrections route**

```javascript
// source/server/routes/corrections.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { dbOps } from '../db/operations.js';
import { supabase, isSupabaseEnabled } from '../../lib/supabase.ts';

const router = Router();

// POST /api/corrections — submit a correction request
router.post('/corrections', authMiddleware, async (req, res) => {
  try {
    const { matchId, proposedWinners, proposedLosers, proposedScoreWinner, proposedScoreLoser, reason } = req.body;

    if (!matchId || !Array.isArray(proposedWinners) || !Array.isArray(proposedLosers)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Check requester is a participant
    const players = await dbOps.getPlayers();
    const callerPlayer = players.find(p => p.uid === req.user.uid);
    if (!callerPlayer) return res.status(403).json({ error: 'You need a player profile' });

    const allMatchPlayers = [...match.winners, ...match.losers];
    if (!allMatchPlayers.includes(callerPlayer.id)) {
      return res.status(403).json({ error: 'Only match participants can request corrections' });
    }

    const id = `cr_${Date.now()}`;
    const request = {
      id,
      matchId,
      requestedBy: req.user.uid,
      proposedWinners,
      proposedLosers,
      proposedScoreWinner,
      proposedScoreLoser,
      reason: reason || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseEnabled()) {
      await supabase.from('correction_requests').insert({
        id: request.id,
        match_id: matchId,
        requested_by: req.user.uid,
        proposed_score_winner: proposedScoreWinner,
        proposed_score_loser: proposedScoreLoser,
        reason: reason || null,
        status: 'pending',
        created_at: request.createdAt,
      });
      const playerRows = [
        ...proposedWinners.map(pid => ({ request_id: id, player_id: pid, is_winner: true })),
        ...proposedLosers.map(pid => ({ request_id: id, player_id: pid, is_winner: false })),
      ];
      await supabase.from('correction_request_players').insert(playerRows);
    }

    res.json(request);
  } catch (err) {
    console.error('POST /api/corrections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/corrections — list all (admin only)
router.get('/corrections', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (!isSupabaseEnabled()) {
      return res.json([]);
    }

    const { data: requests, error: reqErr } = await supabase
      .from('correction_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (reqErr) throw reqErr;

    const { data: playerRows, error: pErr } = await supabase
      .from('correction_request_players')
      .select('*');
    if (pErr) throw pErr;

    const result = requests.map(r => ({
      id: r.id,
      matchId: r.match_id,
      requestedBy: r.requested_by,
      proposedWinners: playerRows.filter(p => p.request_id === r.id && p.is_winner).map(p => p.player_id),
      proposedLosers: playerRows.filter(p => p.request_id === r.id && !p.is_winner).map(p => p.player_id),
      proposedScoreWinner: r.proposed_score_winner,
      proposedScoreLoser: r.proposed_score_loser,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /api/corrections error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/corrections/:id/approve — admin approves
router.patch('/corrections/:id/approve', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (!isSupabaseEnabled()) {
      return res.status(501).json({ error: 'Only supported in Supabase mode' });
    }

    const { data: rows } = await supabase
      .from('correction_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!rows) return res.status(404).json({ error: 'Request not found' });
    if (rows.status !== 'pending') return res.status(400).json({ error: 'Request already resolved' });

    const { data: playerRows } = await supabase
      .from('correction_request_players')
      .select('*')
      .eq('request_id', req.params.id);

    const proposedWinners = playerRows.filter(p => p.is_winner).map(p => p.player_id);
    const proposedLosers = playerRows.filter(p => !p.is_winner).map(p => p.player_id);

    // Re-use the edit match logic by making an internal call via dbOps
    // The edit route already handles ELO recalculation — replicate its core logic here
    const matches = await dbOps.getMatches();
    const match = matches.find(m => m.id === rows.match_id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Update the correction request status first
    await supabase.from('correction_requests').update({
      status: 'approved',
      reviewed_by: req.user.uid,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    // Apply the edit (forward to the edit match route logic)
    // We do this by calling a shared helper. For now, call the PUT /api/matches/:id
    // route internally via dbOps — this keeps the ELO logic DRY.
    // Note: The edit route already exists and handles ELO reverse + recalc.
    // We make a self-call to reuse it.
    await fetch(`http://localhost:${process.env.PORT || 3001}/api/matches/${rows.match_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Pass admin token — use service role for internal calls
        'x-internal-admin': process.env.INTERNAL_SECRET || 'internal',
      },
      body: JSON.stringify({
        winners: proposedWinners,
        losers: proposedLosers,
        scoreWinner: rows.proposed_score_winner,
        scoreLoser: rows.proposed_score_loser,
      }),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/corrections/:id/approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/corrections/:id/reject — admin rejects
router.patch('/corrections/:id/reject', authMiddleware, async (req, res) => {
  try {
    const admins = await dbOps.getAdmins();
    if (!admins.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    if (!isSupabaseEnabled()) {
      return res.json({ success: true });
    }

    await supabase.from('correction_requests').update({
      status: 'rejected',
      reviewed_by: req.user.uid,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/corrections/:id/reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

> **Implementation Note on Approve:** The self-HTTP-call approach is a workaround to avoid duplicating ELO logic. A cleaner alternative (if self-calls feel fragile) is to extract the edit-match ELO logic into a shared `source/server/services/matchEditor.js` helper and call it from both the PUT route and the approve route. Either approach works — choose based on time.

**Step 2: Register the route in index.js**

In `source/server/index.js`, add:

```javascript
import correctionsRoutes from './routes/corrections.js';
// ...
app.use('/api', correctionsRoutes);
```

**Step 3: Build and verify**

```bash
cd source && npm run build
```

**Step 4: Commit**

```bash
git add source/server/routes/corrections.js source/server/index.js
git commit -m "feat: add correction requests backend route (CRUD + approve/reject)"
```

---

## Task 12: Correction Requests — Frontend (Request Button + Form in RecentMatches)

**Files:**
- Modify: `source/components/RecentMatches.tsx`

**Context:** When a logged-in user is a participant in a match but not an admin, show a "Request Correction" button (flag icon). Clicking opens an inline form. The existing edit form (for admins/creators within 60s) stays unchanged.

**Step 1: Add correction request state and handler**

At the top of `RecentMatches`, add props and state:

```typescript
import { CorrectionRequest } from '../types';
import { Flag } from 'lucide-react';

interface RecentMatchesProps {
  // ... existing props ...
  currentPlayerIds?: string[];   // player IDs owned by the current user
  onRequestCorrection?: (matchId: string, data: {
    proposedWinners: string[];
    proposedLosers: string[];
    proposedScoreWinner: number;
    proposedScoreLoser: number;
    reason?: string;
  }) => void;
}

// Inside component:
const [requestingId, setRequestingId] = useState<string | null>(null);
const [reqScore1, setReqScore1] = useState('');
const [reqScore2, setReqScore2] = useState('');
const [reqWinners, setReqWinners] = useState<string[]>([]);
const [reqLosers, setReqLosers] = useState<string[]>([]);
const [reqReason, setReqReason] = useState('');
const [reqError, setReqError] = useState<string | null>(null);
```

**Step 2: Add canRequestCorrection helper**

```typescript
const canRequestCorrection = (match: Match) => {
  if (!currentPlayerIds || currentPlayerIds.length === 0) return false;
  if (isAdmin) return false; // admins use the edit button instead
  if (canModify(match)) return false; // already has edit access
  return currentPlayerIds.some(pid => match.winners.includes(pid) || match.losers.includes(pid));
};
```

**Step 3: Add startRequest and submitRequest functions**

```typescript
const startRequest = (match: Match) => {
  setRequestingId(match.id);
  setReqScore1(match.scoreWinner.toString());
  setReqScore2(match.scoreLoser.toString());
  setReqWinners([...match.winners]);
  setReqLosers([...match.losers]);
  setReqReason('');
  setReqError(null);
};

const cancelRequest = () => {
  setRequestingId(null);
  setReqError(null);
};

const submitRequest = () => {
  if (!onRequestCorrection || !requestingId) return;
  const s1 = parseInt(reqScore1);
  const s2 = parseInt(reqScore2);
  const match = matches.find(m => m.id === requestingId);
  const format = match?.matchFormat || 'vintage21';
  const error = validateMatchScore(s1, s2, format);
  if (error) { setReqError(error); return; }

  const winners = s1 > s2 ? reqWinners : reqLosers;
  const losers = s1 > s2 ? reqLosers : reqWinners;

  onRequestCorrection(requestingId, {
    proposedWinners: winners,
    proposedLosers: losers,
    proposedScoreWinner: Math.max(s1, s2),
    proposedScoreLoser: Math.min(s1, s2),
    reason: reqReason || undefined,
  });
  setRequestingId(null);
};
```

**Step 4: Add the "requesting" card state to the match map**

In the `visibleMatches.map(match => { ... })` block, add a `isRequesting` branch alongside the existing `isEditing` branch:

```tsx
const isRequesting = requestingId === match.id;

if (isRequesting) {
  return (
    <div key={match.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-amber-400 space-y-3">
      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Request Score Correction</span>

      <div className="flex items-center gap-2 text-sm">
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 1</div>
          <span className="font-bold text-white">{reqWinners.map(id => getPlayerName(id)).join(' & ')}</span>
        </div>
        <button
          onClick={() => { const tmp = [...reqWinners]; setReqWinners([...reqLosers]); setReqLosers(tmp); }}
          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-white/5 rounded transition-colors"
          title="Swap teams"
        >
          <ArrowLeftRight size={16} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 2</div>
          <span className="text-gray-400">{reqLosers.map(id => getPlayerName(id)).join(' & ')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-center">
        <input type="number" value={reqScore1} onChange={e => setReqScore1(e.target.value)}
          className="w-16 bg-black/50 border border-white/20 text-white text-center p-2 rounded-lg font-mono text-lg focus:border-amber-400 outline-none" min="0" />
        <span className="text-gray-500 font-bold">-</span>
        <input type="number" value={reqScore2} onChange={e => setReqScore2(e.target.value)}
          className="w-16 bg-black/50 border border-white/20 text-white text-center p-2 rounded-lg font-mono text-lg focus:border-amber-400 outline-none" min="0" />
      </div>

      <input
        type="text"
        placeholder="Reason (optional)"
        value={reqReason}
        onChange={e => setReqReason(e.target.value)}
        className="w-full bg-black/30 border border-white/10 text-white text-sm px-3 py-2 rounded-lg font-mono focus:border-amber-400 outline-none"
      />

      {reqError && <p className="text-red-400 text-xs font-mono text-center">{reqError}</p>}

      <div className="flex gap-2 justify-end">
        <button onClick={cancelRequest}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors font-bold flex items-center gap-1">
          <X size={12} /> Cancel
        </button>
        <button onClick={submitRequest}
          className="px-3 py-1.5 text-xs text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors font-bold flex items-center gap-1">
          <Flag size={12} /> Submit
        </button>
      </div>
    </div>
  );
}
```

**Step 5: Add the flag button to the normal match card**

In the action buttons area (where the edit and delete buttons are), add:

```tsx
{canRequestCorrection(match) && onRequestCorrection && (
  <button
    onClick={() => startRequest(match)}
    className="p-1.5 text-gray-600 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
    title="Request score correction"
  >
    <Flag size={14} />
  </button>
)}
```

**Step 6: Wire in App.tsx**

In `App.tsx`, pass `currentPlayerIds` and `onRequestCorrection` to `<RecentMatches>`:

```typescript
// Find current user's player ID
const currentPlayerIds = currentUser?.player ? [currentUser.player.id] : [];

// Handler
const handleRequestCorrection = async (matchId: string, data: { ... }) => {
  try {
    await createCorrectionRequest({ matchId, ...data });
    showToast('Correction request submitted — admin will review', 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to submit request', 'error');
  }
};
```

Add `import { createCorrectionRequest } from './services/storageService';` to App.tsx imports.

**Step 7: Build and verify**

```bash
cd source && npm run build
```

**Step 8: Commit**

```bash
git add source/components/RecentMatches.tsx source/App.tsx
git commit -m "feat: add correction request button and inline form to match feed"
```

---

## Task 13: Correction Requests — Admin Panel

**Files:**
- Create: `source/components/CorrectionRequests.tsx`
- Modify: `source/App.tsx` (or `source/components/Settings.tsx`)

**Step 1: Create CorrectionRequests component**

```tsx
// source/components/CorrectionRequests.tsx
import React, { useState } from 'react';
import { CorrectionRequest, Match, Player } from '../types';
import { Flag, Check, X } from 'lucide-react';

interface Props {
  requests: CorrectionRequest[];
  matches: Match[];
  players: Player[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const CorrectionRequests: React.FC<Props> = ({ requests, matches, players, onApprove, onReject }) => {
  const getName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const renderRequest = (r: CorrectionRequest) => {
    const match = matches.find(m => m.id === r.matchId);
    return (
      <div key={r.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-amber-400 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Correction Request</span>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
            r.status === 'pending' ? 'text-amber-300 border-amber-400/30 bg-amber-400/10' :
            r.status === 'approved' ? 'text-green-300 border-green-400/30 bg-green-400/10' :
            'text-red-300 border-red-400/30 bg-red-400/10'
          }`}>{r.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">ORIGINAL</p>
            {match && (
              <p className="text-white font-bold">
                {match.winners.map(getName).join(' & ')} {match.scoreWinner}-{match.scoreLoser} {match.losers.map(getName).join(' & ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">PROPOSED</p>
            <p className="text-amber-300 font-bold">
              {r.proposedWinners.map(getName).join(' & ')} {r.proposedScoreWinner}-{r.proposedScoreLoser} {r.proposedLosers.map(getName).join(' & ')}
            </p>
          </div>
        </div>

        {r.reason && (
          <p className="text-xs text-gray-400 italic">"{r.reason}"</p>
        )}

        {r.status === 'pending' && (
          <div className="flex gap-2 justify-end">
            <button onClick={() => onReject(r.id)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg border border-white/10 transition-colors font-bold flex items-center gap-1">
              <X size={12} /> Reject
            </button>
            <button onClick={() => onApprove(r.id)}
              className="px-3 py-1.5 text-xs text-black bg-green-400 hover:bg-green-300 rounded-lg transition-colors font-bold flex items-center gap-1">
              <Check size={12} /> Approve
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Flag className="text-amber-400 w-6 h-6" />
        <h3 className="text-xl font-display font-bold text-white border-l-4 border-amber-400 pl-3">
          CORRECTION <span className="text-amber-400">REQUESTS</span>
        </h3>
        {pending.length > 0 && (
          <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <p className="text-gray-500 italic text-sm text-center py-6">No correction requests yet.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Pending</p>
          {pending.map(renderRequest)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-4">Resolved</p>
          {resolved.slice(0, 10).map(renderRequest)}
        </div>
      )}
    </div>
  );
};

export default CorrectionRequests;
```

**Step 2: Add correctionRequests to LeagueContext and data loading**

In `source/context/LeagueContext.tsx` (or wherever state is fetched), add `correctionRequests` to the state and fetch it via `getCorrectionRequests()`. Only admins need this data, so you can conditionally fetch it:

```typescript
import { getCorrectionRequests } from '../services/storageService';
// Add correctionRequests to the context state
// Fetch in the same useEffect that loads other data, gated on isAdmin
```

**Step 3: Add CorrectionRequests panel to Settings.tsx (admin section)**

In `source/components/Settings.tsx`, in the admin section, import and render `<CorrectionRequests>` with the appropriate props.

**Step 4: Wire approve/reject handlers in useLeagueHandlers.ts**

```typescript
const handleApproveCorrection = useCallback(async (requestId: string) => {
  try {
    await approveCorrectionRequest(requestId);
    await refreshData();
    showToast('Correction approved & ELO recalculated', 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to approve correction', 'error');
  }
}, [refreshData, showToast]);

const handleRejectCorrection = useCallback(async (requestId: string) => {
  try {
    await rejectCorrectionRequest(requestId);
    await refreshData();
    showToast('Correction rejected', 'success');
  } catch (err: any) {
    showToast(err.message || 'Failed to reject correction', 'error');
  }
}, [refreshData, showToast]);
```

**Step 5: Build**

```bash
cd source && npm run build
```

**Step 6: Commit**

```bash
git add source/components/CorrectionRequests.tsx source/context/LeagueContext.tsx source/components/Settings.tsx source/hooks/useLeagueHandlers.ts
git commit -m "feat: add CorrectionRequests admin panel with approve/reject"
```

---

## Task 14: End-to-End Test + Deploy

**Step 1: Local smoke test**

```bash
cd source
npm run dev
```

1. Open the app in a browser.
2. Navigate to "LOG MATCH" — confirm the 3-step wizard appears.
3. Select "VINTAGE-21" on step 1 → "1v1" on step 2 → enter score `21-15` → confirm it submits.
4. Try score `11-5` with VINTAGE-21 → confirm it rejects ("Minimum winning score is 21").
5. Try score `500-0` with STANDARD-11 → confirm it rejects with "if opponent has fewer than 10 points, winner must score exactly 11".
6. Navigate between tabs, press back button → confirm it returns to the previous tab.
7. As a non-admin participant, hover over a match → confirm the flag icon appears.
8. As an admin, open Settings → confirm the Correction Requests panel appears.

**Step 2: Deploy**

```bash
# From repo root
cd source
npm run build

# Build Docker image and push to Cloud Run
# (Adjust project ID and service name to match your Cloud Run setup)
gcloud builds submit --tag gcr.io/gen-lang-client-0156697362/cyberpong source/
gcloud run deploy cyberpong \
  --image gcr.io/gen-lang-client-0156697362/cyberpong \
  --region us-west1 \
  --platform managed
```

**Step 3: Verify live**

Open https://cyber-pong-arcade-league-148169217091.us-west1.run.app/ and repeat the smoke test on the live URL.

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: all features complete — match format, back navigation, correction requests"
```

---

## Summary

| Task | Feature | Files |
|------|---------|-------|
| 1 | DB: match_format column | `supabase/migrations/007_match_format.sql` |
| 2 | Types: MatchFormat + Match | `source/types.ts` |
| 3 | Util: validateMatchScore | `source/utils/matchValidation.ts` |
| 4 | UI: 3-step MatchLogger wizard | `source/components/MatchLogger.tsx` |
| 5 | Wire: format through pipeline | `source/App.tsx`, `storageService.ts`, `useLeagueHandlers.ts` |
| 6 | Backend: format validation + storage | `source/server/routes/matches.js`, `db/operations.js` |
| 7 | UI: format badge in feed | `source/components/RecentMatches.tsx` |
| 8 | Nav: browser back button | `source/App.tsx` |
| 9 | DB: correction_requests table | `supabase/migrations/008_correction_requests.sql` |
| 10 | Types + API: CorrectionRequest | `source/types.ts`, `storageService.ts` |
| 11 | Backend: corrections route | `source/server/routes/corrections.js`, `index.js` |
| 12 | UI: request button + form | `source/components/RecentMatches.tsx`, `App.tsx` |
| 13 | UI: admin panel | `source/components/CorrectionRequests.tsx`, `Settings.tsx` |
| 14 | Test + deploy | Cloud Run |
