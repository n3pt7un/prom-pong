import React, { useState, useMemo } from 'react';
import { Player, Match, EloHistoryEntry } from '../types';
import { Crown, ChevronDown, ChevronUp, Calendar, TrendingUp, Zap, Target } from 'lucide-react';

interface PlayerOfTheWeekProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
}

interface WeeklyPerformance {
  playerId: string;
  weeklyWins: number;
  weeklyMatches: number;
  eloGained: number;
  currentStreak: number;
  performanceScore: number;
  winRate: number;
}

interface WeekWinner {
  player: Player;
  performance: WeeklyPerformance;
  weekLabel: string;
  weekStart: Date;
}

/** Get Monday 00:00 of the week that contains `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

/** Get Sunday 23:59:59.999 of the same week. */
function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${weekEnd.toLocaleDateString(undefined, opts)}`;
}

function computePerformances(
  players: Player[],
  matches: Match[],
  history: EloHistoryEntry[],
  weekStart: Date,
  weekEnd: Date
): WeeklyPerformance[] {
  const weekMatches = matches.filter(m => {
    const t = new Date(m.timestamp).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  });

  if (weekMatches.length === 0) return [];

  const weekMatchIds = new Set(weekMatches.map(m => m.id));

  return players.map(player => {
    const wins = weekMatches.filter(m => m.winners.includes(player.id));
    const losses = weekMatches.filter(m => m.losers.includes(player.id));
    const weeklyWins = wins.length;
    const weeklyMatches = weeklyWins + losses.length;

    // ELO gained: sum of eloChange from matches where the player won this week
    const eloGained = wins.reduce((sum, m) => sum + m.eloChange, 0);

    // Current streak: only count if it includes recent matches from this week
    let currentStreak = 0;
    if (weeklyMatches > 0) {
      // Look at all matches in reverse chronological order for this player
      const playerMatches = matches
        .filter(m => m.winners.includes(player.id) || m.losers.includes(player.id))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      let streakIncludesWeek = false;
      for (const m of playerMatches) {
        if (m.winners.includes(player.id)) {
          currentStreak++;
          if (weekMatchIds.has(m.id)) streakIncludesWeek = true;
        } else {
          break;
        }
      }
      if (!streakIncludesWeek) currentStreak = 0;
    }

    const performanceScore =
      (weeklyWins * 3) +
      (eloGained * 0.5) +
      (Math.max(0, currentStreak) * 2);

    const winRate = weeklyMatches > 0 ? weeklyWins / weeklyMatches : 0;

    return {
      playerId: player.id,
      weeklyWins,
      weeklyMatches,
      eloGained,
      currentStreak,
      performanceScore,
      winRate,
    };
  }).filter(p => p.weeklyMatches > 0);
}

function pickWinner(performances: WeeklyPerformance[]): WeeklyPerformance | null {
  if (performances.length === 0) return null;

  const sorted = [...performances].sort((a, b) => {
    if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.weeklyMatches - a.weeklyMatches;
  });

  return sorted[0];
}

const PlayerOfTheWeek: React.FC<PlayerOfTheWeekProps> = ({ players, matches, history }) => {
  const [showPrevious, setShowPrevious] = useState(false);

  const { currentWinner, previousWinners } = useMemo(() => {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const currentWeekEnd = getWeekEnd(currentWeekStart);

    // Current week
    const currentPerfs = computePerformances(players, matches, history, currentWeekStart, currentWeekEnd);
    const currentBest = pickWinner(currentPerfs);
    const currentPlayer = currentBest ? players.find(p => p.id === currentBest.playerId) : null;

    const currentWinner: WeekWinner | null = currentBest && currentPlayer
      ? { player: currentPlayer, performance: currentBest, weekLabel: formatWeekLabel(currentWeekStart), weekStart: currentWeekStart }
      : null;

    // Previous 4 weeks
    const prevWinners: WeekWinner[] = [];
    for (let i = 1; i <= 4; i++) {
      const ws = new Date(currentWeekStart);
      ws.setDate(ws.getDate() - 7 * i);
      const we = getWeekEnd(ws);
      const perfs = computePerformances(players, matches, history, ws, we);
      const best = pickWinner(perfs);
      const p = best ? players.find(pl => pl.id === best.playerId) : null;
      if (best && p) {
        prevWinners.push({ player: p, performance: best, weekLabel: formatWeekLabel(ws), weekStart: ws });
      }
    }

    return { currentWinner, previousWinners: prevWinners };
  }, [players, matches, history]);

  return (
    <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyber-yellow/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Crown
            className="text-cyber-yellow drop-shadow-[0_0_10px_rgba(252,238,10,0.6)]"
            size={28}
            style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          />
        </div>
        <h3 className="text-xl font-display font-bold text-white tracking-wide">
          PLAYER OF THE <span className="text-cyber-yellow">WEEK</span>
        </h3>
      </div>

      {!currentWinner ? (
        <div className="text-center py-10">
          <div className="text-gray-500 text-sm font-mono">No matches played this week yet</div>
          <div className="text-gray-600 text-xs mt-1">Play some games to crown this week's champion!</div>
        </div>
      ) : (
        <>
          {/* Spotlight Card */}
          <div className="flex flex-col items-center text-center mb-5">
            {/* Avatar */}
            <div
              className="mb-3 w-20 h-20 rounded-full border-2 border-cyber-yellow shadow-[0_0_20px_rgba(252,238,10,0.3)] overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(252,238,10,0.1), rgba(252,238,10,0.02))' }}
            >
              <img
                src={currentWinner.player.avatar}
                alt={currentWinner.player.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Name */}
            <h4 className="font-display text-2xl font-bold text-white mb-1">
              {currentWinner.player.name}
            </h4>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">
              {currentWinner.weekLabel}
            </span>

            {/* Performance Score */}
            <div className="mb-4">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-1">Performance Score</div>
              <div className="text-3xl font-display font-bold text-cyber-yellow drop-shadow-[0_0_8px_rgba(252,238,10,0.4)]">
                {currentWinner.performance.performanceScore.toFixed(1)}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <StatCard
                icon={<Target size={14} className="text-cyber-cyan" />}
                label="Wins"
                value={currentWinner.performance.weeklyWins.toString()}
              />
              <StatCard
                icon={<Calendar size={14} className="text-cyber-pink" />}
                label="Matches"
                value={currentWinner.performance.weeklyMatches.toString()}
              />
              <StatCard
                icon={<TrendingUp size={14} className="text-green-400" />}
                label="ELO Gained"
                value={`+${currentWinner.performance.eloGained}`}
              />
              <StatCard
                icon={<Zap size={14} className="text-cyber-yellow" />}
                label="Win Rate"
                value={`${(currentWinner.performance.winRate * 100).toFixed(0)}%`}
              />
            </div>
          </div>

          {/* Previous Winners */}
          {previousWinners.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => setShowPrevious(!showPrevious)}
                className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors w-full justify-between"
              >
                <span className="uppercase tracking-widest">Previous Winners</span>
                {showPrevious ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showPrevious && (
                <div className="mt-3 space-y-2">
                  {previousWinners.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5"
                    >
                      <img src={w.player.avatar} alt={w.player.name} className="w-8 h-8 rounded-full object-cover border border-cyber-yellow/30" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{w.player.name}</div>
                        <div className="text-[10px] font-mono text-gray-500">{w.weekLabel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-cyber-yellow">
                          {w.performance.performanceScore.toFixed(1)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {w.performance.weeklyWins}W / {w.performance.weeklyMatches}M
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-center">
    <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
    <div className="text-sm font-mono font-bold text-white">{value}</div>
    <div className="text-[10px] font-mono text-gray-500 uppercase">{label}</div>
  </div>
);

export default PlayerOfTheWeek;
