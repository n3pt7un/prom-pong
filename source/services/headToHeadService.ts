import { Match } from '../types';

const isSameTeam = (teamA: string[], teamB: string[]) =>
  teamA.length === teamB.length && teamA.every(id => teamB.includes(id));

const teamScoreForMatch = (match: Match, teamIds: string[]): number | null => {
  if (teamIds.every(id => match.winners.includes(id))) return match.scoreWinner;
  if (teamIds.every(id => match.losers.includes(id))) return match.scoreLoser;
  return null;
};

const teamWonMatch = (match: Match, teamIds: string[]): boolean | null => {
  if (teamIds.every(id => match.winners.includes(id))) return true;
  if (teamIds.every(id => match.losers.includes(id))) return false;
  return null;
};

export interface MatchupSummary {
  teamAWins: number;
  teamBWins: number;
  totalMatches: number;
  teamAWinRate: number;
  avgScoreMargin: number;
}

export interface MatchupDeltaEntry {
  match: Match;
  teamAEloDelta: number;
  teamBEloDelta: number;
}

/**
 * Returns historical matches between the two sides from a reference match.
 * Works for singles and doubles by keeping side composition intact.
 */
export const getMatchupHistory = (referenceMatch: Match, matches: Match[]): Match[] => {
  const teamA = referenceMatch.winners;
  const teamB = referenceMatch.losers;

  return matches
    .filter(m => {
      if (m.id === referenceMatch.id) return false;
      if (m.type !== referenceMatch.type) return false;

      const sameOrientation =
        isSameTeam(m.winners, teamA) && isSameTeam(m.losers, teamB);
      const swappedOrientation =
        isSameTeam(m.winners, teamB) && isSameTeam(m.losers, teamA);

      return sameOrientation || swappedOrientation;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getMatchupSummary = (referenceMatch: Match, matches: Match[]): MatchupSummary => {
  const history = getMatchupHistory(referenceMatch, matches);

  if (history.length === 0) {
    return {
      teamAWins: 0,
      teamBWins: 0,
      totalMatches: 0,
      teamAWinRate: 0,
      avgScoreMargin: 0,
    };
  }

  const teamA = referenceMatch.winners;
  const teamAWins = history.filter(m => teamWonMatch(m, teamA) === true).length;
  const teamBWins = history.length - teamAWins;
  const avgScoreMargin =
    history.reduce((acc, m) => acc + Math.abs(m.scoreWinner - m.scoreLoser), 0) / history.length;

  return {
    teamAWins,
    teamBWins,
    totalMatches: history.length,
    teamAWinRate: (teamAWins / history.length) * 100,
    avgScoreMargin,
  };
};

export const getRecentMatchupEloDeltas = (
  referenceMatch: Match,
  matches: Match[],
  limit: number = 10
): MatchupDeltaEntry[] => {
  const history = getMatchupHistory(referenceMatch, matches)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  const teamA = referenceMatch.winners;

  return history.map(match => {
    const teamAWon = teamWonMatch(match, teamA) === true;
    const delta = match.eloChange || 0;

    return {
      match,
      teamAEloDelta: match.isFriendly ? 0 : teamAWon ? delta : -delta,
      teamBEloDelta: match.isFriendly ? 0 : teamAWon ? -delta : delta,
    };
  });
};

/**
 * For doubles: returns overall historical performance for the selected pair.
 */
export const getPairGeneralRecord = (pairIds: string[], matches: Match[]) => {
  if (pairIds.length !== 2) return { wins: 0, losses: 0, total: 0, winRate: 0 };

  const pairMatches = matches.filter(
    m =>
      m.type === 'doubles' &&
      (pairIds.every(id => m.winners.includes(id)) || pairIds.every(id => m.losers.includes(id)))
  );

  const wins = pairMatches.filter(m => pairIds.every(id => m.winners.includes(id))).length;
  const losses = pairMatches.length - wins;

  return {
    wins,
    losses,
    total: pairMatches.length,
    winRate: pairMatches.length > 0 ? (wins / pairMatches.length) * 100 : 0,
  };
};

export const getTeamScore = teamScoreForMatch;
