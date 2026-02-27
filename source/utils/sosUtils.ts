import { Match, Player, GameType, EloHistoryEntry } from '../types';

/**
 * For a given match, find the opponent(s)' Elo at the time of that match.
 *
 * Strategy:
 *   1. Look for an EloHistoryEntry tied to this match — that gives us the
 *      opponent's Elo *after* the match. For the opponent-winner, the Elo
 *      before the match was `newElo - matchDelta`; for the opponent-loser,
 *      it was `newElo + matchDelta`. However, since we only need an
 *      approximate SoS, using the post-match Elo is acceptable.
 *   2. If no history entry is found for the match (e.g. legacy data), fall
 *      back to the opponent's current Elo.
 */
function getOpponentEloAtMatch(
    oppId: string,
    match: Match,
    gameType: GameType,
    historyByPlayerAndMatch: Map<string, number>,
    playerMap: Map<string, Player>
): number | null {
    // Try historical Elo first (keyed as `playerId:matchId`)
    const histElo = historyByPlayerAndMatch.get(`${oppId}:${match.id}`);
    if (histElo !== undefined) return histElo;

    // Fallback: current Elo
    const opp = playerMap.get(oppId);
    if (!opp) return null;
    return gameType === 'singles' ? opp.eloSingles : opp.eloDoubles;
}

export interface SoSResult {
    /** Average opponent Elo, or null if no qualifying matches */
    sos: number | null;
    /** Number of matches used in the calculation */
    matchCount: number;
}

/**
 * Compute Strength of Schedule for a set of players.
 *
 * @param players        All players in the system (for fallback Elo lookup)
 * @param targetPlayers  The players to compute SoS for (may be a league-filtered subset)
 * @param matches        All matches
 * @param history        Elo history entries (for point-in-time Elo)
 * @param gameType       'singles' or 'doubles'
 * @param leagueId       If set, only count matches played in this league
 */
export function computeSoS(
    players: Player[],
    targetPlayers: Player[],
    matches: Match[],
    history: EloHistoryEntry[],
    gameType: GameType,
    leagueId?: string | null
): Map<string, SoSResult> {
    const result = new Map<string, SoSResult>();
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Build a lookup: "playerId:matchId" -> newElo (post-match)
    const historyByPlayerAndMatch = new Map<string, number>();
    for (const h of history) {
        if (h.gameType === gameType) {
            historyByPlayerAndMatch.set(`${h.playerId}:${h.matchId}`, h.newElo);
        }
    }

    // Filter matches by type, non-friendly, and optionally by league
    const typeMatches = matches.filter(m => {
        if (m.type !== gameType) return false;
        if (m.isFriendly) return false;
        if (leagueId && m.leagueId !== leagueId) return false;
        return true;
    });

    for (const player of targetPlayers) {
        const opponentElos: number[] = [];
        let matchCount = 0;

        for (const m of typeMatches) {
            const isWinner = m.winners.includes(player.id);
            const isLoser = m.losers.includes(player.id);
            if (!isWinner && !isLoser) continue;

            const opponents = isWinner ? m.losers : m.winners;
            let matchCounted = false;

            for (const oppId of opponents) {
                const elo = getOpponentEloAtMatch(oppId, m, gameType, historyByPlayerAndMatch, playerMap);
                if (elo !== null) {
                    opponentElos.push(elo);
                    matchCounted = true;
                }
            }

            if (matchCounted) matchCount++;
        }

        result.set(player.id, {
            sos: opponentElos.length > 0
                ? Math.round(opponentElos.reduce((a, b) => a + b, 0) / opponentElos.length)
                : null,
            matchCount,
        });
    }

    return result;
}

/**
 * Compute the average Elo of a set of players for a given game type.
 * Returns 1200 (initial Elo) if the set is empty.
 */
export function computeAverageElo(
    players: Player[],
    gameType: GameType
): number {
    if (players.length === 0) return 1200;
    const sum = players.reduce(
        (acc, p) => acc + (gameType === 'singles' ? p.eloSingles : p.eloDoubles),
        0
    );
    return Math.round(sum / players.length);
}

export interface SoSProgressionPoint {
    matchIndex: number;
    sos: number;
    matchId: string;
    timestamp: string;
}

/**
 * Compute SoS progression for a single player — the running average of
 * opponent Elo after each match, sorted chronologically.
 *
 * This gives a timeline of how tough the player's schedule has been over
 * their career, useful for sparkline/chart displays in player profiles.
 */
export function computeSoSProgression(
    playerId: string,
    players: Player[],
    matches: Match[],
    history: EloHistoryEntry[],
    gameType: GameType,
    leagueId?: string | null
): SoSProgressionPoint[] {
    const playerMap = new Map(players.map(p => [p.id, p]));

    const historyByPlayerAndMatch = new Map<string, number>();
    for (const h of history) {
        if (h.gameType === gameType) {
            historyByPlayerAndMatch.set(`${h.playerId}:${h.matchId}`, h.newElo);
        }
    }

    const playerMatches = matches
        .filter(m => {
            if (m.type !== gameType) return false;
            if (m.isFriendly) return false;
            if (leagueId && m.leagueId !== leagueId) return false;
            return m.winners.includes(playerId) || m.losers.includes(playerId);
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const points: SoSProgressionPoint[] = [];
    let cumulativeSum = 0;
    let cumulativeCount = 0;

    for (const m of playerMatches) {
        const isWinner = m.winners.includes(playerId);
        const opponents = isWinner ? m.losers : m.winners;

        let matchHadElo = false;
        for (const oppId of opponents) {
            const elo = getOpponentEloAtMatch(oppId, m, gameType, historyByPlayerAndMatch, playerMap);
            if (elo !== null) {
                cumulativeSum += elo;
                cumulativeCount++;
                matchHadElo = true;
            }
        }

        if (matchHadElo) {
            points.push({
                matchIndex: points.length + 1,
                sos: Math.round(cumulativeSum / cumulativeCount),
                matchId: m.id,
                timestamp: m.timestamp,
            });
        }
    }

    return points;
}
