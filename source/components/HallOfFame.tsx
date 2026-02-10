import React, { useMemo } from 'react';
import { Player, Match, EloHistoryEntry } from '../types';
import { Trophy, Crown, Flame, Target, TrendingUp, Zap, Medal, Award, Star } from 'lucide-react';

interface HallOfFameProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
}

interface RecordEntry {
  title: string;
  icon: React.ReactNode;
  holders: { player: Player; value: string; detail: string; rank: number }[];
  emptyMessage: string;
}

const RANK_COLORS: Record<number, { border: string; text: string; glow: string; bg: string }> = {
  1: {
    border: 'border-cyber-yellow/50',
    text: 'text-cyber-yellow',
    glow: 'shadow-[0_0_12px_rgba(252,238,10,0.25)]',
    bg: 'bg-cyber-yellow/5',
  },
  2: {
    border: 'border-gray-400/30',
    text: 'text-gray-300',
    glow: '',
    bg: 'bg-white/[0.02]',
  },
  3: {
    border: 'border-orange-400/30',
    text: 'text-orange-400',
    glow: '',
    bg: 'bg-orange-400/5',
  },
};

function getRankStyle(rank: number) {
  return RANK_COLORS[rank] || { border: 'border-white/5', text: 'text-gray-500', glow: '', bg: 'bg-white/[0.01]' };
}

function rankLabel(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

const HallOfFame: React.FC<HallOfFameProps> = ({ players, matches, history }) => {
  const records = useMemo<RecordEntry[]>(() => {
    const playerMap = new Map(players.map(p => [p.id, p]));
    const getPlayer = (id: string) => playerMap.get(id);

    // ─── 1. Highest ELO Ever (Singles) ─────────────────────
    const singlesHistory = history.filter(h => h.gameType === 'singles');
    const highestSinglesMap = new Map<string, { elo: number; date: string }>();
    for (const entry of singlesHistory) {
      const current = highestSinglesMap.get(entry.playerId);
      if (!current || entry.newElo > current.elo) {
        highestSinglesMap.set(entry.playerId, { elo: entry.newElo, date: entry.timestamp });
      }
    }
    const highestSingles = [...highestSinglesMap.entries()]
      .map(([id, { elo, date }]) => ({ id, elo, date }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 3);

    // ─── 2. Highest ELO Ever (Doubles) ─────────────────────
    const doublesHistory = history.filter(h => h.gameType === 'doubles');
    const highestDoublesMap = new Map<string, { elo: number; date: string }>();
    for (const entry of doublesHistory) {
      const current = highestDoublesMap.get(entry.playerId);
      if (!current || entry.newElo > current.elo) {
        highestDoublesMap.set(entry.playerId, { elo: entry.newElo, date: entry.timestamp });
      }
    }
    const highestDoubles = [...highestDoublesMap.entries()]
      .map(([id, { elo, date }]) => ({ id, elo, date }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 3);

    // ─── 3. Longest Win Streak ──────────────────────────────
    const sortedMatches = [...matches].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const streakMap = new Map<string, { max: number; current: number }>();
    for (const m of sortedMatches) {
      // Winners: increment streak
      for (const wId of m.winners) {
        const s = streakMap.get(wId) || { max: 0, current: 0 };
        s.current++;
        s.max = Math.max(s.max, s.current);
        streakMap.set(wId, s);
      }
      // Losers: reset streak
      for (const lId of m.losers) {
        const s = streakMap.get(lId) || { max: 0, current: 0 };
        s.current = 0;
        streakMap.set(lId, s);
      }
    }
    const longestStreaks = [...streakMap.entries()]
      .map(([id, s]) => ({ id, streak: s.max }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);

    // ─── 4. Most Matches Played ─────────────────────────────
    const matchCountMap = new Map<string, number>();
    for (const m of matches) {
      for (const id of [...m.winners, ...m.losers]) {
        matchCountMap.set(id, (matchCountMap.get(id) || 0) + 1);
      }
    }
    const mostMatches = [...matchCountMap.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // ─── 5. Highest Single-Match ELO Gain ───────────────────
    const sortedByElo = [...matches].sort((a, b) => b.eloChange - a.eloChange).slice(0, 3);

    // ─── 6. Best Win Rate (min 20 matches) ──────────────────
    const winRates = players
      .filter(p => p.wins + p.losses >= 20)
      .map(p => ({ player: p, rate: p.wins / (p.wins + p.losses) }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);

    // ─── 7. Most Dominant Victory ───────────────────────────
    const sortedByMargin = [...matches]
      .map(m => ({ match: m, margin: m.scoreWinner - m.scoreLoser }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);

    // ─── 8. Comeback King (underdog wins) ───────────────────
    // An underdog win = winner had lower ELO than loser
    // We approximate by checking ELO history entries before the match or current player ELO
    // Since we have current player stats, we use a simpler heuristic:
    // Count wins where the player's team won but had a lower combined average ELO at the time
    // Since exact historical ELO per match is complex, use eloChange: higher eloChange = bigger upset
    const underdogMap = new Map<string, number>();
    for (const m of matches) {
      // Higher eloChange indicates the winners were underdogs (ELO formula gives more for upset wins)
      // A reasonable heuristic: eloChange > 16 (the default K-factor midpoint) means upset
      if (m.eloChange > 16) {
        for (const wId of m.winners) {
          underdogMap.set(wId, (underdogMap.get(wId) || 0) + 1);
        }
      }
    }
    const comebackKings = [...underdogMap.entries()]
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // ─── Build records array ────────────────────────────────
    const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const records: RecordEntry[] = [
      {
        title: 'Highest ELO (Singles)',
        icon: <Crown size={18} className="text-cyber-yellow" />,
        holders: highestSingles.map((h, i) => {
          const p = getPlayer(h.id);
          return p ? { player: p, value: `${h.elo} ELO`, detail: formatDate(h.date), rank: i + 1 } : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No singles matches recorded',
      },
      {
        title: 'Highest ELO (Doubles)',
        icon: <Star size={18} className="text-cyber-purple" />,
        holders: highestDoubles.map((h, i) => {
          const p = getPlayer(h.id);
          return p ? { player: p, value: `${h.elo} ELO`, detail: formatDate(h.date), rank: i + 1 } : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No doubles matches recorded',
      },
      {
        title: 'Longest Win Streak',
        icon: <Flame size={18} className="text-orange-400" />,
        holders: longestStreaks.map((h, i) => {
          const p = getPlayer(h.id);
          return p ? { player: p, value: `${h.streak} wins`, detail: 'Consecutive', rank: i + 1 } : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No matches recorded',
      },
      {
        title: 'Most Matches Played',
        icon: <Target size={18} className="text-cyber-cyan" />,
        holders: mostMatches.map((h, i) => {
          const p = getPlayer(h.id);
          return p ? { player: p, value: `${h.count} matches`, detail: 'Total games', rank: i + 1 } : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No matches recorded',
      },
      {
        title: 'Highest ELO Gain (Single Match)',
        icon: <TrendingUp size={18} className="text-green-400" />,
        holders: sortedByElo.map((m, i) => {
          const winnerNames = m.winners.map(id => getPlayer(id)?.name || 'Unknown').join(' & ');
          const p = getPlayer(m.winners[0]);
          return p
            ? { player: p, value: `+${m.eloChange} ELO`, detail: `${winnerNames} • ${formatDate(m.timestamp)}`, rank: i + 1 }
            : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No matches recorded',
      },
      {
        title: 'Best Win Rate',
        icon: <Medal size={18} className="text-cyber-pink" />,
        holders: winRates.map((h, i) => ({
          player: h.player,
          value: `${(h.rate * 100).toFixed(1)}%`,
          detail: `${h.player.wins}W / ${h.player.losses}L (min 20 matches)`,
          rank: i + 1,
        })),
        emptyMessage: 'No player with 20+ matches yet',
      },
      {
        title: 'Most Dominant Victory',
        icon: <Zap size={18} className="text-cyber-yellow" />,
        holders: sortedByMargin.map((h, i) => {
          const winnerNames = h.match.winners.map(id => getPlayer(id)?.name || 'Unknown').join(' & ');
          const loserNames = h.match.losers.map(id => getPlayer(id)?.name || 'Unknown').join(' & ');
          const p = getPlayer(h.match.winners[0]);
          return p
            ? {
                player: p,
                value: `${h.match.scoreWinner}-${h.match.scoreLoser}`,
                detail: `${winnerNames} vs ${loserNames} • ${formatDate(h.match.timestamp)}`,
                rank: i + 1,
              }
            : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No matches recorded',
      },
      {
        title: 'Comeback King',
        icon: <Award size={18} className="text-cyber-purple" />,
        holders: comebackKings.map((h, i) => {
          const p = getPlayer(h.id);
          return p ? { player: p, value: `${h.count} upsets`, detail: 'Underdog victories', rank: i + 1 } : null;
        }).filter(Boolean) as RecordEntry['holders'],
        emptyMessage: 'No upsets recorded',
      },
    ];

    return records;
  }, [players, matches, history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="text-cyber-yellow drop-shadow-[0_0_10px_rgba(252,238,10,0.5)]" size={28} />
        <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
          HALL OF <span className="text-cyber-yellow">FAME</span>
        </h2>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map((record, ri) => (
          <div
            key={ri}
            className="glass-panel rounded-xl p-5 relative overflow-hidden"
          >
            {/* Subtle glow for the top card */}
            {record.holders.length > 0 && record.holders[0].rank === 1 && (
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-cyber-yellow/5 blur-[60px] rounded-full pointer-events-none" />
            )}

            {/* Record title */}
            <div className="flex items-center gap-2 mb-4">
              {record.icon}
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                {record.title}
              </h3>
            </div>

            {record.holders.length === 0 ? (
              <div className="text-gray-600 text-xs font-mono italic py-4 text-center">
                {record.emptyMessage}
              </div>
            ) : (
              <div className="space-y-2">
                {record.holders.map((h, i) => {
                  const style = getRankStyle(h.rank);
                  const isFirst = h.rank === 1;
                  return (
                    <div
                      key={i}
                      className={`
                        flex items-center gap-3 p-2.5 rounded-lg border
                        ${style.border} ${style.bg} ${style.glow}
                        transition-all
                      `}
                    >
                      {/* Rank */}
                      <span className="text-lg w-8 text-center shrink-0">{rankLabel(h.rank)}</span>

                      {/* Avatar */}
                      <img
                        src={h.player.avatar}
                        alt={h.player.name}
                        className={`w-8 h-8 rounded-full object-cover border ${isFirst ? 'border-cyber-yellow shadow-[0_0_6px_rgba(252,238,10,0.4)]' : 'border-white/20'}`}
                        referrerPolicy="no-referrer"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${isFirst ? 'text-white' : 'text-gray-300'}`}>
                          {h.player.name}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 truncate">{h.detail}</div>
                      </div>

                      {/* Value */}
                      <div className={`text-right shrink-0 font-mono text-sm font-bold ${style.text}`}>
                        {h.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HallOfFame;
