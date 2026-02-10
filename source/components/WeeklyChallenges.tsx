import React, { useState, useEffect, useMemo } from 'react';
import { Match, Player, EloHistoryEntry } from '../types';
import {
  Zap,
  Target,
  Flame,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  Swords,
} from 'lucide-react';

// ---- Types ----

interface ChallengeCondition {
  metric: 'wins' | 'matches_played' | 'streak' | 'elo_gain';
  target: number;
}

interface WeeklyChallenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  icon: string; // Lucide icon name
  condition: ChallengeCondition;
  startsAt: string;
  endsAt: string;
}

interface WeeklyChallengesProps {
  matches: Match[];
  players: Player[];
  history: EloHistoryEntry[];
  currentPlayerId?: string;
}

// ---- Icon Map ----

const ICON_MAP: Record<string, any> = {
  Target,
  Flame,
  Trophy,
  TrendingUp,
  Swords,
  Zap,
};

// ---- Challenge Templates ----

interface ChallengeTemplate {
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  icon: string;
  condition: ChallengeCondition;
}

const DAILY_TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'daily',
    title: 'Quick Wins',
    description: 'Win 2 matches today',
    icon: 'Trophy',
    condition: { metric: 'wins', target: 2 },
  },
  {
    type: 'daily',
    title: 'Active Player',
    description: 'Play 3 matches today',
    icon: 'Swords',
    condition: { metric: 'matches_played', target: 3 },
  },
  {
    type: 'daily',
    title: 'Dominant Victory',
    description: 'Win a match by 5+ points',
    icon: 'Flame',
    condition: { metric: 'wins', target: 1 },
  },
  {
    type: 'daily',
    title: 'Double Down',
    description: 'Win 3 matches today',
    icon: 'Target',
    condition: { metric: 'wins', target: 3 },
  },
  {
    type: 'daily',
    title: 'Getting Started',
    description: 'Play 2 matches today',
    icon: 'Zap',
    condition: { metric: 'matches_played', target: 2 },
  },
];

const WEEKLY_TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'weekly',
    title: 'Weekly Warrior',
    description: 'Win 5 matches this week',
    icon: 'Trophy',
    condition: { metric: 'wins', target: 5 },
  },
  {
    type: 'weekly',
    title: 'Marathon Runner',
    description: 'Play 10 matches this week',
    icon: 'Swords',
    condition: { metric: 'matches_played', target: 10 },
  },
  {
    type: 'weekly',
    title: 'Hot Streak',
    description: 'Reach a 3-win streak',
    icon: 'Flame',
    condition: { metric: 'streak', target: 3 },
  },
  {
    type: 'weekly',
    title: 'ELO Climber',
    description: 'Gain 30+ ELO this week',
    icon: 'TrendingUp',
    condition: { metric: 'elo_gain', target: 30 },
  },
  {
    type: 'weekly',
    title: 'Consistency',
    description: 'Win 7 matches this week',
    icon: 'Target',
    condition: { metric: 'wins', target: 7 },
  },
  {
    type: 'weekly',
    title: 'Social Butterfly',
    description: 'Play 8 matches this week',
    icon: 'Swords',
    condition: { metric: 'matches_played', target: 8 },
  },
];

// ---- Deterministic Seed Helpers ----

/** Get the ISO week number for a given date. */
const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

/** Simple deterministic hash from a number seed. */
const seedRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

/** Pick an item from an array using a seeded random value. */
const pickFromSeed = <T,>(arr: T[], rand: () => number): T => {
  return arr[Math.floor(rand() * arr.length)];
};

// ---- Date Window Helpers ----

/** Get the start (Monday 00:00) and end (Sunday 23:59:59) of the ISO week containing `date`. */
const getWeekBounds = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay() || 7; // 1=Mon, 7=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

/** Get the start (00:00) and end (23:59:59) of the day containing `date`. */
const getDayBounds = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ---- Time Remaining Formatter ----

const formatTimeRemaining = (endsAt: string): string => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

// ---- Component ----

const WeeklyChallenges: React.FC<WeeklyChallengesProps> = ({
  matches,
  players,
  history,
  currentPlayerId,
}) => {
  // Re-render every 60s for countdown freshness
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const weekNum = getISOWeek(now);
  const year = now.getFullYear();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(year, 0, 0).getTime()) / 86400000
  );

  // Generate challenges deterministically
  const challenges = useMemo((): WeeklyChallenge[] => {
    const weekSeed = year * 100 + weekNum;
    const daySeed = year * 1000 + dayOfYear;

    // Weekly challenges (2)
    const weekRand = seedRandom(weekSeed);
    const weekly1 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
    // Ensure second weekly is different
    let weekly2 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
    let attempts = 0;
    while (weekly2.title === weekly1.title && attempts < 10) {
      weekly2 = pickFromSeed(WEEKLY_TEMPLATES, weekRand);
      attempts++;
    }

    // Daily challenge (1)
    const dayRand = seedRandom(daySeed);
    const daily = pickFromSeed(DAILY_TEMPLATES, dayRand);

    const { start: weekStart, end: weekEnd } = getWeekBounds(now);
    const { start: dayStart, end: dayEnd } = getDayBounds(now);

    return [
      {
        id: `daily-${daySeed}`,
        type: 'daily',
        ...daily,
        startsAt: dayStart.toISOString(),
        endsAt: dayEnd.toISOString(),
      },
      {
        id: `weekly-1-${weekSeed}`,
        type: 'weekly',
        ...weekly1,
        startsAt: weekStart.toISOString(),
        endsAt: weekEnd.toISOString(),
      },
      {
        id: `weekly-2-${weekSeed}`,
        type: 'weekly',
        ...weekly2,
        startsAt: weekStart.toISOString(),
        endsAt: weekEnd.toISOString(),
      },
    ];
  }, [weekNum, dayOfYear, year]);

  // Compute progress for each challenge
  const getProgress = (challenge: WeeklyChallenge): number => {
    if (!currentPlayerId) return 0;

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
        if (challenge.description.toLowerCase().includes('by 5+')) {
          // Special: "Win by 5+ points" — count wins with margin >= 5
          return playerMatches.filter(
            m =>
              m.winners.includes(currentPlayerId) &&
              m.scoreWinner - m.scoreLoser >= 5
          ).length;
        }
        return playerMatches.filter(m => m.winners.includes(currentPlayerId)).length;

      case 'matches_played':
        return playerMatches.length;

      case 'streak': {
        // Find the max consecutive win streak within the window
        const sorted = playerMatches.sort(
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
        // Compute ELO change within the window using history entries
        const windowHistory = history.filter(
          h =>
            h.playerId === currentPlayerId &&
            new Date(h.timestamp).getTime() >= windowStart &&
            new Date(h.timestamp).getTime() <= windowEnd
        );
        if (windowHistory.length === 0) return 0;
        const sorted = windowHistory.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        // Find the player's ELO right before the window (use first entry's value minus change, or approximate)
        const firstElo = sorted[0].newElo;
        const lastElo = sorted[sorted.length - 1].newElo;
        // We approximate start ELO by looking at the entry just before window
        const beforeWindow = history
          .filter(
            h =>
              h.playerId === currentPlayerId &&
              new Date(h.timestamp).getTime() < windowStart
          )
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const startElo = beforeWindow.length > 0 ? beforeWindow[0].newElo : firstElo;
        return Math.max(0, lastElo - startElo);
      }

      default:
        return 0;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-display font-bold text-white border-l-4 border-cyber-cyan pl-3">
          ACTIVE <span className="text-cyber-cyan">CHALLENGES</span>
        </h3>
        <Zap size={16} className="text-cyber-cyan" />
      </div>

      {/* Challenge Cards */}
      <div className="grid gap-3">
        {challenges.map(challenge => {
          const progress = getProgress(challenge);
          const target = challenge.condition.target;
          const isCompleted = progress >= target;
          const progressPct = Math.min(100, Math.round((progress / target) * 100));

          const IconComponent = ICON_MAP[challenge.icon] || Target;

          return (
            <div
              key={challenge.id}
              className={`glass-panel p-4 rounded-lg border-l-2 transition-all ${
                isCompleted
                  ? 'border-l-green-500 bg-green-500/5'
                  : challenge.type === 'daily'
                  ? 'border-l-cyber-cyan'
                  : 'border-l-cyber-pink'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 p-2 rounded-lg ${
                    isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : challenge.type === 'daily'
                      ? 'bg-cyber-cyan/10 text-cyber-cyan'
                      : 'bg-cyber-pink/10 text-cyber-pink'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={18} />
                  ) : (
                    <IconComponent size={18} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title Row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm truncate">
                      {challenge.title}
                    </span>
                    {/* Type Badge */}
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0 ${
                        challenge.type === 'daily'
                          ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                          : 'bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30'
                      }`}
                    >
                      {challenge.type}
                    </span>
                    {isCompleted && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-widest flex-shrink-0">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 mb-2">{challenge.description}</p>

                  {/* Progress Bar */}
                  {currentPlayerId && (
                    <div className="mb-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-gray-500">
                          {progress}/{target}
                        </span>
                        <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1">
                          <Clock size={8} />
                          {formatTimeRemaining(challenge.endsAt)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${progressPct}%`,
                            background: isCompleted
                              ? '#22c55e'
                              : challenge.type === 'daily'
                              ? 'linear-gradient(90deg, #00f3ff, #bc13fe)'
                              : 'linear-gradient(90deg, #ff00ff, #fcee0a)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Time remaining when no player */}
                  {!currentPlayerId && (
                    <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1">
                      <Clock size={8} />
                      {formatTimeRemaining(challenge.endsAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyChallenges;
