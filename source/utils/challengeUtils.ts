import { Match, Player, EloHistoryEntry } from '../types';

// ---- Types ----

export type ChallengeMetric =
  | 'wins'
  | 'matches_played'
  | 'streak'
  | 'elo_gain'
  | 'unique_opponents'
  | 'score_domination'
  | 'doubles_wins'
  | 'vs_higher_elo';

export interface ChallengeCondition {
  metric: ChallengeMetric;
  target: number; // gold tier target (highest)
}

export interface ChallengeTier {
  label: 'Bronze' | 'Silver' | 'Gold';
  target: number;
  xp: number;
}

export interface ChallengeTemplate {
  type: 'daily' | 'weekly';
  title: string;
  description: string; // describes the gold goal
  icon: string;
  condition: ChallengeCondition; // target = gold tier
  tiers: [ChallengeTier, ChallengeTier, ChallengeTier]; // [bronze, silver, gold]
  difficulty: 'easy' | 'medium' | 'hard';
  xp: number; // total XP for all tiers (sum), used for toast messages
}

export interface GeneratedChallenge extends ChallengeTemplate {
  id: string;
  startsAt: string;
  endsAt: string;
}

// ---- Tier computation ----

export interface TierStatus {
  /** Index of the highest completed tier: -1=none, 0=bronze, 1=silver, 2=gold */
  highestTier: number;
  /** Total XP earned so far from completed tiers */
  earnedXP: number;
  /** The next tier the player is working toward, or null if gold done */
  nextTier: ChallengeTier | null;
}

export const computeTierStatus = (
  progress: number,
  tiers: [ChallengeTier, ChallengeTier, ChallengeTier]
): TierStatus => {
  let highestTier = -1;
  let earnedXP = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (progress >= tiers[i].target) {
      highestTier = i;
      earnedXP += tiers[i].xp;
    }
  }
  const nextTier = highestTier < 2 ? tiers[highestTier + 1] : null;
  return { highestTier, earnedXP, nextTier };
};

// ---- Templates ----

export const DAILY_TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'daily', title: 'Quick Wins', description: 'Win 4 matches today',
    icon: 'Trophy', condition: { metric: 'wins', target: 4 },
    tiers: [{ label: 'Bronze', target: 1, xp: 20 }, { label: 'Silver', target: 2, xp: 30 }, { label: 'Gold', target: 4, xp: 50 }],
    difficulty: 'easy', xp: 100,
  },
  {
    type: 'daily', title: 'Active Player', description: 'Play 5 matches today',
    icon: 'Swords', condition: { metric: 'matches_played', target: 5 },
    tiers: [{ label: 'Bronze', target: 1, xp: 15 }, { label: 'Silver', target: 3, xp: 25 }, { label: 'Gold', target: 5, xp: 40 }],
    difficulty: 'easy', xp: 80,
  },
  {
    type: 'daily', title: 'Dominant Victory', description: 'Win 3 matches by 7+ points',
    icon: 'Flame', condition: { metric: 'score_domination', target: 3 },
    tiers: [{ label: 'Bronze', target: 1, xp: 30 }, { label: 'Silver', target: 2, xp: 40 }, { label: 'Gold', target: 3, xp: 60 }],
    difficulty: 'medium', xp: 130,
  },
  {
    type: 'daily', title: 'Double Down', description: 'Win 4 matches today',
    icon: 'Target', condition: { metric: 'wins', target: 4 },
    tiers: [{ label: 'Bronze', target: 1, xp: 20 }, { label: 'Silver', target: 2, xp: 30 }, { label: 'Gold', target: 4, xp: 50 }],
    difficulty: 'medium', xp: 100,
  },
  {
    type: 'daily', title: 'Getting Started', description: 'Play 3 matches today',
    icon: 'Zap', condition: { metric: 'matches_played', target: 3 },
    tiers: [{ label: 'Bronze', target: 1, xp: 10 }, { label: 'Silver', target: 2, xp: 20 }, { label: 'Gold', target: 3, xp: 30 }],
    difficulty: 'easy', xp: 60,
  },
  {
    type: 'daily', title: 'Giant Slayer', description: 'Beat 3 players with higher ELO than you',
    icon: 'Crosshair', condition: { metric: 'vs_higher_elo', target: 3 },
    tiers: [{ label: 'Bronze', target: 1, xp: 40 }, { label: 'Silver', target: 2, xp: 50 }, { label: 'Gold', target: 3, xp: 70 }],
    difficulty: 'hard', xp: 160,
  },
  {
    type: 'daily', title: 'Doubles Action', description: 'Win 3 doubles matches today',
    icon: 'Users', condition: { metric: 'doubles_wins', target: 3 },
    tiers: [{ label: 'Bronze', target: 1, xp: 20 }, { label: 'Silver', target: 2, xp: 30 }, { label: 'Gold', target: 3, xp: 50 }],
    difficulty: 'easy', xp: 100,
  },
  {
    type: 'daily', title: 'Hot Start', description: 'Win 4 matches in a row today',
    icon: 'Flame', condition: { metric: 'streak', target: 4 },
    tiers: [{ label: 'Bronze', target: 2, xp: 25 }, { label: 'Silver', target: 3, xp: 35 }, { label: 'Gold', target: 4, xp: 60 }],
    difficulty: 'medium', xp: 120,
  },
  {
    type: 'daily', title: 'Variety Pack', description: 'Play against 4 different opponents today',
    icon: 'Users', condition: { metric: 'unique_opponents', target: 4 },
    tiers: [{ label: 'Bronze', target: 2, xp: 20 }, { label: 'Silver', target: 3, xp: 30 }, { label: 'Gold', target: 4, xp: 50 }],
    difficulty: 'medium', xp: 100,
  },
  {
    type: 'daily', title: 'Shutout Artist', description: 'Win 3 matches by 7+ point margin',
    icon: 'Shield', condition: { metric: 'score_domination', target: 3 },
    tiers: [{ label: 'Bronze', target: 1, xp: 35 }, { label: 'Silver', target: 2, xp: 45 }, { label: 'Gold', target: 3, xp: 70 }],
    difficulty: 'hard', xp: 150,
  },
];

export const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'weekly', title: 'Weekly Warrior', description: 'Win 8 matches this week',
    icon: 'Trophy', condition: { metric: 'wins', target: 8 },
    tiers: [{ label: 'Bronze', target: 3, xp: 75 }, { label: 'Silver', target: 5, xp: 100 }, { label: 'Gold', target: 8, xp: 150 }],
    difficulty: 'easy', xp: 325,
  },
  {
    type: 'weekly', title: 'Marathon Runner', description: 'Play 15 matches this week',
    icon: 'Swords', condition: { metric: 'matches_played', target: 15 },
    tiers: [{ label: 'Bronze', target: 5, xp: 60 }, { label: 'Silver', target: 10, xp: 80 }, { label: 'Gold', target: 15, xp: 120 }],
    difficulty: 'medium', xp: 260,
  },
  {
    type: 'weekly', title: 'Hot Streak', description: 'Reach a 5-win streak',
    icon: 'Flame', condition: { metric: 'streak', target: 5 },
    tiers: [{ label: 'Bronze', target: 2, xp: 60 }, { label: 'Silver', target: 3, xp: 80 }, { label: 'Gold', target: 5, xp: 140 }],
    difficulty: 'medium', xp: 280,
  },
  {
    type: 'weekly', title: 'ELO Climber', description: 'Gain 50+ ELO this week',
    icon: 'TrendingUp', condition: { metric: 'elo_gain', target: 50 },
    tiers: [{ label: 'Bronze', target: 15, xp: 70 }, { label: 'Silver', target: 30, xp: 90 }, { label: 'Gold', target: 50, xp: 150 }],
    difficulty: 'hard', xp: 310,
  },
  {
    type: 'weekly', title: 'Consistency', description: 'Win 10 matches this week',
    icon: 'Target', condition: { metric: 'wins', target: 10 },
    tiers: [{ label: 'Bronze', target: 4, xp: 80 }, { label: 'Silver', target: 7, xp: 100 }, { label: 'Gold', target: 10, xp: 160 }],
    difficulty: 'hard', xp: 340,
  },
  {
    type: 'weekly', title: 'Social Butterfly', description: 'Play against 7 different opponents this week',
    icon: 'Users', condition: { metric: 'unique_opponents', target: 7 },
    tiers: [{ label: 'Bronze', target: 3, xp: 65 }, { label: 'Silver', target: 5, xp: 85 }, { label: 'Gold', target: 7, xp: 130 }],
    difficulty: 'medium', xp: 280,
  },
  {
    type: 'weekly', title: 'David Slayer', description: 'Beat 5 players with higher ELO than you',
    icon: 'Crosshair', condition: { metric: 'vs_higher_elo', target: 5 },
    tiers: [{ label: 'Bronze', target: 1, xp: 80 }, { label: 'Silver', target: 3, xp: 110 }, { label: 'Gold', target: 5, xp: 180 }],
    difficulty: 'hard', xp: 370,
  },
  {
    type: 'weekly', title: 'Doubles Champion', description: 'Win 6 doubles matches this week',
    icon: 'Users', condition: { metric: 'doubles_wins', target: 6 },
    tiers: [{ label: 'Bronze', target: 2, xp: 65 }, { label: 'Silver', target: 4, xp: 85 }, { label: 'Gold', target: 6, xp: 130 }],
    difficulty: 'medium', xp: 280,
  },
  {
    type: 'weekly', title: 'Blowout King', description: 'Win 5 matches by 7+ point margin',
    icon: 'Flame', condition: { metric: 'score_domination', target: 5 },
    tiers: [{ label: 'Bronze', target: 1, xp: 70 }, { label: 'Silver', target: 3, xp: 100 }, { label: 'Gold', target: 5, xp: 160 }],
    difficulty: 'hard', xp: 330,
  },
  {
    type: 'weekly', title: 'Grinder', description: 'Play 20 matches this week',
    icon: 'Dumbbell', condition: { metric: 'matches_played', target: 20 },
    tiers: [{ label: 'Bronze', target: 7, xp: 75 }, { label: 'Silver', target: 13, xp: 100 }, { label: 'Gold', target: 20, xp: 170 }],
    difficulty: 'hard', xp: 345,
  },
  {
    type: 'weekly', title: 'Win Streak Legend', description: 'Reach a 7-win streak',
    icon: 'Star', condition: { metric: 'streak', target: 7 },
    tiers: [{ label: 'Bronze', target: 3, xp: 80 }, { label: 'Silver', target: 5, xp: 110 }, { label: 'Gold', target: 7, xp: 180 }],
    difficulty: 'hard', xp: 370,
  },
  {
    type: 'weekly', title: 'ELO Hunter', description: 'Gain 80+ ELO this week',
    icon: 'TrendingUp', condition: { metric: 'elo_gain', target: 80 },
    tiers: [{ label: 'Bronze', target: 20, xp: 80 }, { label: 'Silver', target: 50, xp: 120 }, { label: 'Gold', target: 80, xp: 200 }],
    difficulty: 'hard', xp: 400,
  },
];

// ---- Date helpers ----

export const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const getWeekBounds = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

export const getDayBounds = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ---- Seed helpers ----

const seedRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const pickFromSeed = <T,>(arr: T[], rand: () => number): T =>
  arr[Math.floor(rand() * arr.length)];

// ---- Challenge generation ----

export const generateChallenges = (now: Date): GeneratedChallenge[] => {
  const year = now.getFullYear();
  const weekNum = getISOWeek(now);
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 0).getTime()) / 86400000
  );

  const weekSeed = year * 100 + weekNum;
  const daySeed = year * 1000 + dayOfYear;

  const weekRand = seedRandom(weekSeed);
  const weekly1 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
  let weekly2 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
  let attempts = 0;
  while (weekly2.title === weekly1.title && attempts < 10) {
    weekly2 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
    attempts++;
  }

  const dayRand = seedRandom(daySeed);
  const daily = pickFromSeed(DAILY_TEMPLATES, dayRand);

  const { start: weekStart, end: weekEnd } = getWeekBounds(now);
  const { start: dayStart, end: dayEnd } = getDayBounds(now);

  return [
    { id: `daily-${daySeed}`, ...daily, startsAt: dayStart.toISOString(), endsAt: dayEnd.toISOString() },
    { id: `weekly-1-${weekSeed}`, ...weekly1, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString() },
    { id: `weekly-2-${weekSeed}`, ...weekly2, startsAt: weekStart.toISOString(), endsAt: weekEnd.toISOString() },
  ];
};

// ---- Progress computation ----

export const getChallengeProgress = (
  challenge: GeneratedChallenge,
  matches: Match[],
  players: Player[],
  history: EloHistoryEntry[],
  currentPlayerId: string,
  currentPlayerElo: number
): number => {
  const windowStart = new Date(challenge.startsAt).getTime();
  const windowEnd = new Date(challenge.endsAt).getTime();

  const windowMatches = matches.filter(m => {
    const t = new Date(m.timestamp).getTime();
    return t >= windowStart && t <= windowEnd;
  });

  const playerMatches = windowMatches.filter(
    m => m.winners.includes(currentPlayerId) || m.losers.includes(currentPlayerId)
  );

  switch (challenge.condition.metric) {
    case 'wins':
      return playerMatches.filter(m => m.winners.includes(currentPlayerId)).length;

    case 'matches_played':
      return playerMatches.length;

    case 'streak': {
      const sorted = [...playerMatches].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      let maxStreak = 0;
      let currentStreak = 0;
      for (const m of sorted) {
        if (m.winners.includes(currentPlayerId)) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }
      return maxStreak;
    }

    case 'elo_gain': {
      const windowHistory = history.filter(
        h =>
          h.playerId === currentPlayerId &&
          new Date(h.timestamp).getTime() >= windowStart &&
          new Date(h.timestamp).getTime() <= windowEnd
      );
      if (windowHistory.length === 0) return 0;
      const sorted = [...windowHistory].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const lastElo = sorted[sorted.length - 1].newElo;
      const beforeWindow = history
        .filter(
          h =>
            h.playerId === currentPlayerId &&
            new Date(h.timestamp).getTime() < windowStart
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const startElo = beforeWindow.length > 0 ? beforeWindow[0].newElo : sorted[0].newElo;
      return Math.max(0, lastElo - startElo);
    }

    case 'unique_opponents': {
      const opponentIds = new Set<string>();
      for (const m of playerMatches) {
        const opponents = m.winners.includes(currentPlayerId) ? m.losers : m.winners;
        opponents.forEach(id => opponentIds.add(id));
      }
      return opponentIds.size;
    }

    case 'score_domination':
      return playerMatches.filter(
        m => m.winners.includes(currentPlayerId) && m.scoreWinner - m.scoreLoser >= 7
      ).length;

    case 'doubles_wins':
      return playerMatches.filter(
        m => m.type === 'doubles' && m.winners.includes(currentPlayerId)
      ).length;

    case 'vs_higher_elo':
      return playerMatches.filter(m => {
        if (!m.winners.includes(currentPlayerId)) return false;
        return m.losers.some(oppId => {
          const opp = players.find(p => p.id === oppId);
          return opp && opp.eloSingles > currentPlayerElo;
        });
      }).length;

    default:
      return 0;
  }
};
