import React, { useState, useMemo } from 'react';
import { Player, Match, EloHistoryEntry } from '../types';
import { Crown, ChevronDown, ChevronUp, TrendingUp, Zap } from 'lucide-react';
import { shortName } from '../utils/playerRanking';
import { thumbUrl } from '../utils/imageUtils';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface PlayerOfTheWeekProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
  onPlayerClick?: (playerId: string) => void;
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

function sortByPerformance(performances: WeeklyPerformance[]): WeeklyPerformance[] {
  return [...performances].sort((a, b) => {
    if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.weeklyMatches - a.weeklyMatches;
  });
}

function pickWinner(performances: WeeklyPerformance[]): WeeklyPerformance | null {
  if (performances.length === 0) return null;
  return sortByPerformance(performances)[0];
}

interface RunnerUp {
  player: Player;
  performance: WeeklyPerformance;
  deltaToP1: number;
}

const PlayerOfTheWeek: React.FC<PlayerOfTheWeekProps> = ({ players, matches, history, onPlayerClick }) => {
  const [showPrevious, setShowPrevious] = useState(false);

  const { currentWinner, previousWinners, currentRunnerUps } = useMemo(() => {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const currentWeekEnd = getWeekEnd(currentWeekStart);

    // Current week
    const currentPerfs = computePerformances(players, matches, history, currentWeekStart, currentWeekEnd);
    const sortedPerfs = sortByPerformance(currentPerfs);
    const currentBest = sortedPerfs[0] ?? null;
    const currentPlayer = currentBest ? players.find(p => p.id === currentBest.playerId) : null;

    const currentWinner: WeekWinner | null = currentBest && currentPlayer
      ? { player: currentPlayer, performance: currentBest, weekLabel: formatWeekLabel(currentWeekStart), weekStart: currentWeekStart }
      : null;

    const p1Score = currentBest?.performanceScore ?? 0;
    const currentRunnerUps: RunnerUp[] = sortedPerfs.slice(1, 4).map((perf) => {
      const p = players.find(pl => pl.id === perf.playerId);
      return p ? { player: p, performance: perf, deltaToP1: perf.performanceScore - p1Score } : null;
    }).filter((r): r is RunnerUp => r !== null);

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

    return { currentWinner, previousWinners: prevWinners, currentRunnerUps };
  }, [players, matches, history]);

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyber-yellow/5 blur-[60px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-cyber-yellow drop-shadow-[0_0_6px_rgba(252,238,10,0.6)]" />
          <span className="text-xs font-display font-bold text-white tracking-widest uppercase">
            Player of the <span className="text-cyber-yellow">Week</span>
          </span>
        </div>
        {currentWinner && (
          <span className="text-[10px] font-mono text-gray-500">{currentWinner.weekLabel}</span>
        )}
      </div>

      {!currentWinner ? (
        <div className="py-6 text-center">
          <div className="text-gray-500 text-sm font-mono">No matches played this week yet</div>
          <div className="text-gray-600 text-xs mt-1">Play some games to crown a champion!</div>
        </div>
      ) : (
        <>
          {/* Winner row */}
          <div
            className={`flex items-center gap-4 ${onPlayerClick ? 'cursor-pointer group' : ''}`}
            onClick={() => onPlayerClick?.(currentWinner.player.id)}
          >
            <div className="relative flex-shrink-0">
              <img
                src={thumbUrl(currentWinner.player.avatar, 96)}
                alt={currentWinner.player.name}
                className="w-14 h-14 rounded-full border-2 border-cyber-yellow shadow-[0_0_14px_rgba(252,238,10,0.25)] object-cover"
                referrerPolicy="no-referrer"
              />
              <Crown size={12} className="absolute -top-1.5 -right-1 text-cyber-yellow drop-shadow-[0_0_4px_rgba(252,238,10,0.8)]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-lg text-white leading-tight group-hover:text-cyber-yellow transition-colors truncate">
                {shortName(currentWinner.player.name)}
              </div>
              {/* Inline stats chips */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <StatChip label="W" value={currentWinner.performance.weeklyWins.toString()} color="text-green-400" />
                <StatChip label="M" value={currentWinner.performance.weeklyMatches.toString()} color="text-gray-400" />
                <StatChip label="ELO" value={`+${currentWinner.performance.eloGained}`} color="text-cyber-cyan" icon={<TrendingUp size={10} />} />
                <StatChip label="WR" value={`${(currentWinner.performance.winRate * 100).toFixed(0)}%`} color="text-cyber-yellow" icon={<Zap size={10} />} />
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <div className="text-xl font-mono font-bold text-cyber-yellow">
                {currentWinner.performance.performanceScore.toFixed(1)}
              </div>
              <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wider">score</div>
            </div>
          </div>

          {/* Runner-ups */}
          {currentRunnerUps.length > 0 && (
            <div className="mt-4 flex gap-2">
              {currentRunnerUps.map((r, i) => (
                <div
                  key={r.player.id}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 min-w-0 ${
                    onPlayerClick ? 'cursor-pointer hover:bg-white/[0.06] transition-colors' : ''
                  }`}
                  onClick={() => onPlayerClick?.(r.player.id)}
                >
                  <span className="text-[10px] font-mono text-gray-600 font-bold w-3 flex-shrink-0">{i + 2}</span>
                  <img src={thumbUrl(r.player.avatar, 48)} alt={r.player.name} className="w-6 h-6 rounded-full object-cover border border-white/20 flex-shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{shortName(r.player.name)}</div>
                  </div>
                  <span className="text-xs font-mono text-cyber-cyan flex-shrink-0">{r.performance.performanceScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Previous Winners */}
          {previousWinners.length > 0 && (
            <div className="mt-3 border-t border-white/8 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between font-mono uppercase tracking-widest text-gray-500 hover:text-gray-300 h-7 text-[10px]"
                onClick={() => setShowPrevious(!showPrevious)}
              >
                <span>Previous Winners</span>
                {showPrevious ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>

              {showPrevious && (
                <div className="mt-2 space-y-1.5">
                  {previousWinners.map((w, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 py-1.5 px-2 rounded-lg ${
                        onPlayerClick ? 'cursor-pointer hover:bg-white/[0.04] transition-colors' : ''
                      }`}
                      onClick={() => onPlayerClick?.(w.player.id)}
                    >
                      <img src={thumbUrl(w.player.avatar, 48)} alt={w.player.name} className="w-6 h-6 rounded-full object-cover border border-cyber-yellow/20 flex-shrink-0" referrerPolicy="no-referrer" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white truncate block">{shortName(w.player.name)}</span>
                        <span className="text-[9px] font-mono text-gray-600">{w.weekLabel}</span>
                      </div>
                      <span className="text-xs font-mono text-cyber-yellow flex-shrink-0">{w.performance.weeklyWins}W · {w.performance.weeklyMatches}M</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

const StatChip: React.FC<{ label: string; value: string; color: string; icon?: React.ReactNode }> = ({ label, value, color, icon }) => (
  <span className="inline-flex items-center gap-1 text-[11px] font-mono">
    {icon && <span className={color}>{icon}</span>}
    <span className={`font-bold ${color}`}>{value}</span>
    <span className="text-gray-600">{label}</span>
  </span>
);

export default PlayerOfTheWeek;
