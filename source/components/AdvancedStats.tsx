import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, BarChart3, Calendar, Activity, Target, Zap } from 'lucide-react';
import { Player, Match, EloHistoryEntry } from '../types';
import {
  calculateRollingWinRate,
  getWinRateByOpponent,
  getDayOfWeekStats,
  getScoreAnalysis,
  getEloVolatility,
  getRecentForm,
} from '../utils/statsUtils';

interface AdvancedStatsProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
}

const AdvancedStats: React.FC<AdvancedStatsProps> = ({ players, matches, history }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const selectedPlayer = useMemo(
    () => players.find(p => p.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId]
  );

  // --- Computed Stats ---

  const rollingWinRate = useMemo(() => {
    if (!selectedPlayerId) return [];
    return calculateRollingWinRate(matches, selectedPlayerId, 10);
  }, [matches, selectedPlayerId]);

  const winRateByOpponent = useMemo(() => {
    if (!selectedPlayerId) return [];
    const raw = getWinRateByOpponent(matches, selectedPlayerId);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    return raw
      .filter(o => o.wins + o.losses >= 2)
      .map(o => ({
        ...o,
        opponentName: playerMap.get(o.opponentId) || o.opponentId,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [matches, selectedPlayerId, players]);

  const dayOfWeekStats = useMemo(() => {
    if (!selectedPlayerId) return [];
    return getDayOfWeekStats(matches, selectedPlayerId);
  }, [matches, selectedPlayerId]);

  const scoreAnalysis = useMemo(() => {
    if (!selectedPlayerId) return null;
    const analysis = getScoreAnalysis(matches, selectedPlayerId);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    return {
      ...analysis,
      closestGame: {
        ...analysis.closestGame,
        opponent: playerMap.get(analysis.closestGame.opponent) || analysis.closestGame.opponent,
      },
      biggestBlowout: {
        ...analysis.biggestBlowout,
        opponent: playerMap.get(analysis.biggestBlowout.opponent) || analysis.biggestBlowout.opponent,
      },
    };
  }, [matches, selectedPlayerId, players]);

  const eloVolatility = useMemo(() => {
    if (!selectedPlayerId) return 0;
    return getEloVolatility(history, selectedPlayerId, 20);
  }, [history, selectedPlayerId]);

  const recentForm = useMemo(() => {
    if (!selectedPlayerId) return [];
    return getRecentForm(matches, selectedPlayerId, 10);
  }, [matches, selectedPlayerId]);

  const playerMatchCount = useMemo(() => {
    if (!selectedPlayerId) return 0;
    return matches.filter(
      m => m.winners.includes(selectedPlayerId) || m.losers.includes(selectedPlayerId)
    ).length;
  }, [matches, selectedPlayerId]);

  // --- Helper: bar color based on win rate ---
  const getBarColor = (winRate: number): string => {
    if (winRate > 0.6) return '#4ade80'; // green
    if (winRate >= 0.4) return '#fcee0a'; // yellow
    return '#f87171'; // red
  };

  // --- Render ---

  if (players.length === 0) {
    return (
      <div className="glass-panel rounded-xl border border-white/5 p-8 text-center">
        <Activity size={48} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 font-mono text-sm">No players registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player Selector */}
      <div className="glass-panel rounded-xl border border-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 size={20} className="text-cyber-cyan" />
          <h2 className="font-display text-lg text-white tracking-wider">ADVANCED STATS</h2>
        </div>
        <select
          value={selectedPlayerId}
          onChange={e => setSelectedPlayerId(e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyber-cyan/50 transition-colors"
        >
          <option value="">Select a player...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedPlayer && (
        <div className="glass-panel rounded-xl border border-white/5 p-8 text-center">
          <Target size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm">Select a player to view advanced stats.</p>
        </div>
      )}

      {selectedPlayer && playerMatchCount < 2 && (
        <div className="glass-panel rounded-xl border border-white/5 p-8 text-center">
          <Activity size={48} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 font-mono text-sm">
            {selectedPlayer.name} needs at least 2 matches for stats analysis.
          </p>
        </div>
      )}

      {selectedPlayer && playerMatchCount >= 2 && (
        <>
          {/* Form Indicator */}
          <div className="glass-panel rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-cyber-pink" />
              <h3 className="font-display text-sm text-white tracking-wider">RECENT FORM</h3>
              <span className="text-[10px] font-mono text-gray-500 ml-auto">Last {recentForm.length} matches</span>
            </div>
            <div className="flex items-center gap-1.5">
              {recentForm.map((result, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold font-mono ${
                    result === 'W'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {result}
                </span>
              ))}
              {recentForm.length === 0 && (
                <span className="text-gray-500 font-mono text-xs">No matches yet</span>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate by Opponent */}
            <div className="glass-panel rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-cyber-cyan" />
                <h3 className="font-display text-sm text-white tracking-wider">WIN RATE BY OPPONENT</h3>
              </div>
              {winRateByOpponent.length === 0 ? (
                <p className="text-gray-500 font-mono text-xs text-center py-8">
                  Need 2+ matches against an opponent
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, winRateByOpponent.length * 40)}>
                  <BarChart data={winRateByOpponent} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} stroke="#555" fontSize={10} />
                    <YAxis type="category" dataKey="opponentName" stroke="#555" fontSize={10} width={55} tick={{ fill: '#aaa' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [`${Math.round(value * 100)}%`, 'Win Rate']}
                    />
                    <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                      {winRateByOpponent.map((entry, idx) => (
                        <Cell key={idx} fill={getBarColor(entry.winRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Performance Trend */}
            <div className="glass-panel rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-cyber-cyan" />
                <h3 className="font-display text-sm text-white tracking-wider">PERFORMANCE TREND</h3>
              </div>
              {rollingWinRate.length === 0 ? (
                <p className="text-gray-500 font-mono text-xs text-center py-8">Not enough matches</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rollingWinRate} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <XAxis dataKey="index" stroke="#555" fontSize={10} label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} stroke="#555" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                      labelFormatter={v => `Match #${v}`}
                      formatter={(value: number) => [`${Math.round(value * 100)}%`, 'Win Rate']}
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke="#00f3ff"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#00f3ff', stroke: '#000' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Day of Week Heatmap */}
          <div className="glass-panel rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-cyber-pink" />
              <h3 className="font-display text-sm text-white tracking-wider">DAY OF WEEK HEATMAP</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dayOfWeekStats.map(stat => {
                const total = stat.wins + stat.losses;
                const opacity = total === 0 ? 0.1 : Math.min(0.3 + (total / 20) * 0.7, 1);
                const bgColor = stat.winRate >= 0.5 ? '#00f3ff' : '#ff00ff';
                return (
                  <div
                    key={stat.day}
                    className="rounded-lg p-3 text-center border border-white/5"
                    style={{ backgroundColor: bgColor, opacity }}
                  >
                    <div className="font-mono text-[10px] text-black font-bold mb-1">{stat.day}</div>
                    <div className="font-mono text-xs text-black font-bold">
                      {total > 0 ? `${Math.round(stat.winRate * 100)}%` : '—'}
                    </div>
                    <div className="font-mono text-[9px] text-black/60">
                      {total > 0 ? `${stat.wins}W ${stat.losses}L` : 'No games'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Analysis Cards */}
          {scoreAnalysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
                <Target size={20} className="text-cyber-cyan mx-auto mb-2" />
                <div className="font-display text-xs text-gray-400 tracking-wider mb-1">AVG WIN MARGIN</div>
                <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #00f3ff' }}>
                  {scoreAnalysis.avgWinMargin}
                </div>
                <div className="font-mono text-[10px] text-gray-500">points</div>
              </div>

              <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
                <Activity size={20} className="text-cyber-yellow mx-auto mb-2" />
                <div className="font-display text-xs text-gray-400 tracking-wider mb-1">CLOSEST GAME</div>
                <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #fcee0a' }}>
                  {scoreAnalysis.closestGame.score}
                </div>
                <div className="font-mono text-[10px] text-gray-500 truncate">vs {scoreAnalysis.closestGame.opponent}</div>
              </div>

              <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
                <Zap size={20} className="text-cyber-pink mx-auto mb-2" />
                <div className="font-display text-xs text-gray-400 tracking-wider mb-1">BIGGEST BLOWOUT</div>
                <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #ff00ff' }}>
                  {scoreAnalysis.biggestBlowout.score}
                </div>
                <div className="font-mono text-[10px] text-gray-500 truncate">vs {scoreAnalysis.biggestBlowout.opponent}</div>
              </div>

              <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
                <TrendingUp size={20} className="text-green-400 mx-auto mb-2" />
                <div className="font-display text-xs text-gray-400 tracking-wider mb-1">TOTAL ELO</div>
                <div
                  className={`font-mono text-2xl ${scoreAnalysis.totalEloGained >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  style={{ textShadow: `0 0 10px ${scoreAnalysis.totalEloGained >= 0 ? '#4ade80' : '#f87171'}` }}
                >
                  {scoreAnalysis.totalEloGained >= 0 ? '+' : ''}{scoreAnalysis.totalEloGained}
                </div>
                <div className="font-mono text-[10px] text-gray-500">net gained/lost</div>
              </div>
            </div>
          )}

          {/* ELO Volatility */}
          <div className="glass-panel rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-cyber-purple" />
              <h3 className="font-display text-sm text-white tracking-wider">ELO VOLATILITY</h3>
              <span className="text-[10px] font-mono text-gray-500 ml-auto">Last 20 matches</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                {/* Volatility gauge bar */}
                <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((eloVolatility / 40) * 100, 100)}%`,
                      background: `linear-gradient(90deg, #00f3ff, #ff00ff)`,
                      boxShadow: '0 0 8px #bc13fe',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono text-gray-600">Stable</span>
                  <span className="text-[9px] font-mono text-gray-600">Volatile</span>
                </div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="font-mono text-3xl text-white" style={{ textShadow: '0 0 12px #bc13fe' }}>
                  {eloVolatility}
                </div>
                <div className="font-mono text-[10px] text-gray-500">std dev</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedStats;
