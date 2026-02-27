/**
 * Unit tests for sosUtils — run with: npx tsx utils/sosUtils.test.ts
 */
import { computeSoS, computeAverageElo, computeSoSProgression, SoSResult } from './sosUtils';
import { Player, Match, EloHistoryEntry, GameType } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────
function makePlayer(id: string, eloSingles: number, eloDoubles = 1200, leagueId?: string): Player {
    return {
        id, name: id, avatar: '', eloSingles, eloDoubles,
        winsSingles: 0, lossesSingles: 0, streakSingles: 0,
        winsDoubles: 0, lossesDoubles: 0, streakDoubles: 0,
        joinedAt: '2025-01-01T00:00:00Z', leagueId,
    };
}

function makeMatch(
    id: string, type: GameType, winners: string[], losers: string[],
    eloChange: number, opts: { isFriendly?: boolean; leagueId?: string } = {}
): Match {
    return {
        id, type, winners, losers,
        scoreWinner: 21, scoreLoser: 18,
        timestamp: '2025-06-01T00:00:00Z',
        eloChange,
        isFriendly: opts.isFriendly,
        leagueId: opts.leagueId,
    };
}

function makeHistory(playerId: string, matchId: string, newElo: number, gameType: GameType): EloHistoryEntry {
    return { playerId, matchId, newElo, timestamp: '2025-06-01T00:00:00Z', gameType };
}

// ── Test runner ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        console.error(`  ❌ ${label}`);
    }
}

function assertEq(actual: any, expected: any, label: string) {
    const ok = actual === expected;
    if (!ok) {
        console.error(`  ❌ ${label}: expected ${expected}, got ${actual}`);
        failed++;
    } else {
        passed++;
        console.log(`  ✅ ${label}`);
    }
}

// ── Test 1: Historical Elo is used when available ────────────────────
console.log('\nTest 1: Uses historical Elo over current Elo');
{
    const alice = makePlayer('alice', 1400);    // current Elo = 1400
    const bob = makePlayer('bob', 1500);        // current Elo = 1500 (was 1100 when match happened)

    const match = makeMatch('m1', 'singles', ['alice'], ['bob'], 10);

    // History says Bob was at 1100 after this match (he lost, so pre-match was ~1110)
    const history = [
        makeHistory('bob', 'm1', 1100, 'singles'),
        makeHistory('alice', 'm1', 1410, 'singles'),
    ];

    const result = computeSoS([alice, bob], [alice], [match], history, 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.sos, 1100, 'Alice SoS should use Bob\'s historical Elo (1100), not current (1500)');
    assertEq(aliceSoS?.matchCount, 1, 'Alice matchCount should be 1');
}

// ── Test 2: Falls back to current Elo when no history ────────────────
console.log('\nTest 2: Falls back to current Elo when no history exists');
{
    const alice = makePlayer('alice', 1400);
    const bob = makePlayer('bob', 1300);

    const match = makeMatch('m1', 'singles', ['alice'], ['bob'], 10);

    const result = computeSoS([alice, bob], [alice], [match], [], 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.sos, 1300, 'Alice SoS should fall back to Bob\'s current Elo (1300)');
}

// ── Test 3: Friendly matches are excluded ────────────────────────────
console.log('\nTest 3: Friendly matches are excluded from SoS');
{
    const alice = makePlayer('alice', 1400);
    const bob = makePlayer('bob', 1100);

    const friendlyMatch = makeMatch('m1', 'singles', ['alice'], ['bob'], 0, { isFriendly: true });
    const rankedMatch = makeMatch('m2', 'singles', ['alice'], ['bob'], 10);

    const history = [
        makeHistory('bob', 'm2', 1090, 'singles'),
        makeHistory('alice', 'm2', 1410, 'singles'),
    ];

    const result = computeSoS([alice, bob], [alice], [friendlyMatch, rankedMatch], history, 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.matchCount, 1, 'Only ranked match should count');
    assertEq(aliceSoS?.sos, 1090, 'SoS should only include ranked match opponent Elo');
}

// ── Test 4: League scoping ───────────────────────────────────────────
console.log('\nTest 4: League scoping filters matches by leagueId');
{
    const alice = makePlayer('alice', 1400, 1200, 'league-a');
    const bob = makePlayer('bob', 1200, 1200, 'league-a');
    const carol = makePlayer('carol', 1600, 1200, 'league-b');

    // Match 1: Alice vs Bob in league-a
    const m1 = makeMatch('m1', 'singles', ['alice'], ['bob'], 10, { leagueId: 'league-a' });
    // Match 2: Alice vs Carol with no league (global)
    const m2 = makeMatch('m2', 'singles', ['alice'], ['carol'], 5);

    const history = [
        makeHistory('bob', 'm1', 1190, 'singles'),
        makeHistory('alice', 'm1', 1410, 'singles'),
        makeHistory('carol', 'm2', 1595, 'singles'),
        makeHistory('alice', 'm2', 1415, 'singles'),
    ];

    // With league-a filter: only m1 counts
    const resultLeague = computeSoS(
        [alice, bob, carol], [alice], [m1, m2], history, 'singles', 'league-a'
    );
    const sosLeague = resultLeague.get('alice');
    assertEq(sosLeague?.sos, 1190, 'With league-a filter, SoS uses only Bob\'s Elo from m1');
    assertEq(sosLeague?.matchCount, 1, 'Only 1 match in league-a');

    // Without league filter: both m1 and m2 count
    const resultGlobal = computeSoS(
        [alice, bob, carol], [alice], [m1, m2], history, 'singles', null
    );
    const sosGlobal = resultGlobal.get('alice');
    // Average of Bob's 1190 and Carol's 1595 = round((1190+1595)/2) = 1393
    assertEq(sosGlobal?.sos, 1393, 'Without filter, SoS averages both opponents');
    assertEq(sosGlobal?.matchCount, 2, '2 matches globally');
}

// ── Test 5: Doubles uses eloDoubles ──────────────────────────────────
console.log('\nTest 5: Doubles mode uses eloDoubles');
{
    const alice = makePlayer('alice', 1400, 1300);
    const bob = makePlayer('bob', 1200, 1100);
    const carol = makePlayer('carol', 1500, 1450);
    const dave = makePlayer('dave', 1350, 1250);

    const match = makeMatch('m1', 'doubles', ['alice', 'bob'], ['carol', 'dave'], 10);

    // No history — should fall back to current doublesElo for opponents
    const result = computeSoS([alice, bob, carol, dave], [alice], [match], [], 'doubles');
    const aliceSoS = result.get('alice');

    // Alice's opponents are carol (1450) and dave (1250), avg = round((1450+1250)/2) = 1350
    assertEq(aliceSoS?.sos, 1350, 'Doubles SoS should use eloDoubles of opponents');
}

// ── Test 6: Player with no matches gets null SoS ─────────────────────
console.log('\nTest 6: Player with no matches gets null SoS');
{
    const alice = makePlayer('alice', 1400);
    const bob = makePlayer('bob', 1200);

    // No matches at all
    const result = computeSoS([alice, bob], [alice], [], [], 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.sos, null, 'SoS should be null with no matches');
    assertEq(aliceSoS?.matchCount, 0, 'matchCount should be 0');
}

// ── Test 7: Opponent not in players array is skipped ─────────────────
console.log('\nTest 7: Deleted opponent (not in players array) is handled gracefully');
{
    const alice = makePlayer('alice', 1400);
    // bob is NOT in the players array (deleted)

    const match = makeMatch('m1', 'singles', ['alice'], ['bob'], 10);

    // No history for bob either
    const result = computeSoS([alice], [alice], [match], [], 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.sos, null, 'SoS should be null when opponent is deleted and no history');
    assertEq(aliceSoS?.matchCount, 0, 'matchCount should be 0');
}

// ── Test 8: Opponent deleted but history exists ──────────────────────
console.log('\nTest 8: Deleted opponent with history entry still counts');
{
    const alice = makePlayer('alice', 1400);
    // bob is deleted, but history exists for this match

    const match = makeMatch('m1', 'singles', ['alice'], ['bob'], 10);
    const history = [makeHistory('bob', 'm1', 1150, 'singles')];

    const result = computeSoS([alice], [alice], [match], history, 'singles');
    const aliceSoS = result.get('alice');

    assertEq(aliceSoS?.sos, 1150, 'SoS should use historical Elo even for deleted opponents');
    assertEq(aliceSoS?.matchCount, 1, 'matchCount should be 1');
}

// ── Test 9: computeAverageElo ────────────────────────────────────────
console.log('\nTest 9: computeAverageElo');
{
    const players = [
        makePlayer('a', 1200), makePlayer('b', 1400), makePlayer('c', 1600),
    ];

    assertEq(computeAverageElo(players, 'singles'), 1400, 'Average of 1200,1400,1600 = 1400');
    assertEq(computeAverageElo([], 'singles'), 1200, 'Empty array returns default 1200');
}

// ── Test 10: Wrong game type history is ignored ──────────────────────
console.log('\nTest 10: History entries for wrong game type are ignored');
{
    const alice = makePlayer('alice', 1400, 1300);
    const bob = makePlayer('bob', 1200, 1100);

    const match = makeMatch('m1', 'singles', ['alice'], ['bob'], 10);

    // History entry says Bob was at 900 for DOUBLES on this match — should be ignored for singles
    const history = [makeHistory('bob', 'm1', 900, 'doubles')];

    const result = computeSoS([alice, bob], [alice], [match], history, 'singles');
    const aliceSoS = result.get('alice');

    // Should fall back to current singles Elo (1200), not the doubles history (900)
    assertEq(aliceSoS?.sos, 1200, 'Should ignore doubles history for singles SoS');
}

// ── Test 11: computeSoSProgression basic progression ─────────────────
console.log('\nTest 11: SoS progression produces correct running average');
{
    const alice = makePlayer('alice', 1400);
    const bob = makePlayer('bob', 1200);
    const carol = makePlayer('carol', 1600);

    const m1: Match = {
        ...makeMatch('m1', 'singles', ['alice'], ['bob'], 10),
        timestamp: '2025-06-01T00:00:00Z',
    };
    const m2: Match = {
        ...makeMatch('m2', 'singles', ['alice'], ['carol'], 5),
        timestamp: '2025-06-02T00:00:00Z',
    };

    const history = [
        makeHistory('bob', 'm1', 1190, 'singles'),
        makeHistory('carol', 'm2', 1595, 'singles'),
    ];

    const prog = computeSoSProgression('alice', [alice, bob, carol], [m1, m2], history, 'singles');
    assertEq(prog.length, 2, 'Should have 2 progression points');
    assertEq(prog[0].sos, 1190, 'After match 1: SoS = Bob\'s Elo 1190');
    assertEq(prog[1].sos, 1393, 'After match 2: SoS = avg(1190, 1595) = 1393');
    assertEq(prog[0].matchIndex, 1, 'First point index is 1');
    assertEq(prog[1].matchIndex, 2, 'Second point index is 2');
}

// ── Test 12: computeSoSProgression excludes friendlies ───────────────
console.log('\nTest 12: SoS progression excludes friendly matches');
{
    const alice = makePlayer('alice', 1400);
    const bob = makePlayer('bob', 1200);

    const friendly: Match = {
        ...makeMatch('m1', 'singles', ['alice'], ['bob'], 0, { isFriendly: true }),
        timestamp: '2025-06-01T00:00:00Z',
    };
    const ranked: Match = {
        ...makeMatch('m2', 'singles', ['alice'], ['bob'], 10),
        timestamp: '2025-06-02T00:00:00Z',
    };

    const prog = computeSoSProgression('alice', [alice, bob], [friendly, ranked], [], 'singles');
    assertEq(prog.length, 1, 'Friendly match excluded, only 1 point');
    assertEq(prog[0].sos, 1200, 'SoS from ranked match uses current Elo fallback');
}

// ── Test 13: computeSoSProgression empty for player with no matches ──
console.log('\nTest 13: SoS progression empty for player with no matches');
{
    const alice = makePlayer('alice', 1400);
    const prog = computeSoSProgression('alice', [alice], [], [], 'singles');
    assertEq(prog.length, 0, 'No matches means empty progression');
}

// ── Test 14: computeSoSProgression respects league scoping ──────────
console.log('\nTest 14: SoS progression respects league scoping');
{
    const alice = makePlayer('alice', 1400, 1200, 'league-a');
    const bob = makePlayer('bob', 1200, 1200, 'league-a');
    const carol = makePlayer('carol', 1600, 1200, 'league-b');

    const m1: Match = {
        ...makeMatch('m1', 'singles', ['alice'], ['bob'], 10, { leagueId: 'league-a' }),
        timestamp: '2025-06-01T00:00:00Z',
    };
    const m2: Match = {
        ...makeMatch('m2', 'singles', ['alice'], ['carol'], 5, { leagueId: 'league-b' }),
        timestamp: '2025-06-02T00:00:00Z',
    };

    const prog = computeSoSProgression('alice', [alice, bob, carol], [m1, m2], [], 'singles', 'league-a');
    assertEq(prog.length, 1, 'Only league-a match counts');
    assertEq(prog[0].sos, 1200, 'SoS from Bob in league-a');
}

// ── Summary ──────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log('All tests passed! ✅');
}
