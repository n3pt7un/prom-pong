import React, { useState, useRef, useMemo } from 'react';
import { Player, EloHistoryEntry, Racket, Match, GameType } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { RACKET_ICONS, formatRacketStats } from './RacketManager';
import { Zap, TrendingUp, TrendingDown, Calendar, Sword, AlertTriangle, Pencil, Check, X, Activity, BarChart3, Target, Shield } from 'lucide-react';
import { getPlayerAchievements } from '../achievements';
import { getStatsForGameType } from '../utils/gameTypeStats';
import {
  calculateRollingWinRate,
  getWinRateByOpponent,
  getDayOfWeekStats,
  getScoreAnalysis,
  getEloVolatility,
  getRecentForm,
} from '../utils/statsUtils';
import { computeSoS, computeAverageElo, computeSoSProgression } from '../utils/sosUtils';

interface PlayerProfileProps {
  player: Player;
  history: EloHistoryEntry[];
  matches: Match[];
  rackets: Racket[];
  players: Player[];
  onUpdateRacket: (playerId: string, racketId: string) => void;
  isAdmin?: boolean;
  currentUserId?: string;
  onNavigateToArmory?: () => void;
  onUpdatePlayerName?: (playerId: string, newName: string) => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({
  player, history, matches, rackets, players, onUpdateRacket,
  isAdmin, currentUserId, onNavigateToArmory, onUpdatePlayerName,
}) => {
  const [selectedGameType, setSelectedGameType] = useState<GameType>('singles');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(player.name);
  const [showEquipDropdown, setShowEquipDropdown] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Memoized filtered data by game type
  const filteredMatches = useMemo(() => 
    matches.filter(m => 
      (m.winners.includes(player.id) || m.losers.includes(player.id)) &&
      m.type === selectedGameType
    ), [matches, player.id, selectedGameType]
  );

  const filteredHistory = useMemo(() =>
    history.filter(h => 
      h.playerId === player.id && 
      h.gameType === selectedGameType
    ), [history, player.id, selectedGameType]
  );

  // Advanced stats calculations
  const rollingWinRate = useMemo(() =>
    calculateRollingWinRate(filteredMatches, player.id, 10),
    [filteredMatches, player.id]
  );

  const winRateByOpponent = useMemo(() => {
    const raw = getWinRateByOpponent(filteredMatches, player.id);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    return raw
      .filter(o => o.wins + o.losses >= 2)
      .map(o => ({
        ...o,
        opponentName: playerMap.get(o.opponentId) || o.opponentId,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [filteredMatches, player.id, players]);

  const dayOfWeekStats = useMemo(() =>
    getDayOfWeekStats(filteredMatches, player.id),
    [filteredMatches, player.id]
  );

  const scoreAnalysis = useMemo(() => {
    const analysis = getScoreAnalysis(filteredMatches, player.id);
    const playerMap = new Map(players.map(p => [p.id, p.name]));
    return {
      ...analysis,
      closestGame: {
        ...analysis.closestGame,
        opponents: analysis.closestGame.opponents.map(id => playerMap.get(id) || id),
      },
      biggestBlowout: {
        ...analysis.biggestBlowout,
        opponents: analysis.biggestBlowout.opponents.map(id => playerMap.get(id) || id),
      },
    };
  }, [filteredMatches, player.id, players]);

  const eloVolatility = useMemo(() =>
    getEloVolatility(filteredHistory, player.id, 20),
    [filteredHistory, player.id]
  );

  const recentForm = useMemo(() =>
    getRecentForm(filteredMatches, player.id, 10),
    [filteredMatches, player.id]
  );

  // Strength of Schedule: current value and progression
  const currentSoS = useMemo(() => {
    const result = computeSoS(players, [player], matches, history, selectedGameType);
    return result.get(player.id)?.sos ?? null;
  }, [players, player, matches, history, selectedGameType]);

  const leagueAvgElo = useMemo(
    () => computeAverageElo(players, selectedGameType),
    [players, selectedGameType]
  );

  const sosProgression = useMemo(
    () => computeSoSProgression(player.id, players, matches, history, selectedGameType),
    [player.id, players, matches, history, selectedGameType]
  );

  const playerMatchCount = filteredMatches.length;

  const playerHistory = filteredHistory
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const playerMatches = filteredMatches.slice(0, 5);

  const chartData = playerHistory.map((h, i) => ({
    name: i + 1,
    elo: h.newElo,
    date: new Date(h.timestamp).toLocaleDateString(),
    fullDate: new Date(h.timestamp).toLocaleString()
  }));

  if (chartData.length === 0) {
    chartData.push({ name: 0, elo: 1200, date: 'Start', fullDate: 'Start' });
  }

  const currentRacket = rackets.find(r => r.id === player.mainRacketId);
  const RacketIcon = currentRacket ? (RACKET_ICONS[currentRacket.icon] || Zap) : Zap;

  const stats = getStatsForGameType(player, selectedGameType);
  const { totalGames, winRate, wins, losses, streak } = stats;

  const achievements = getPlayerAchievements(player, matches);

  const getMatchResult = (m: Match) => {
    return m.winners.includes(player.id) ? 'WIN' : 'LOSS';
  };

  const isOwnProfile = currentUserId && currentUserId === player.id;
  const needsRacket = !player.mainRacketId && isOwnProfile;

  const handleNameEdit = () => {
    setNameValue(player.name);
    setEditingName(true);
  };

  const handleNameConfirm = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== player.name && onUpdatePlayerName) {
      onUpdatePlayerName(player.id, trimmed);
    }
    setEditingName(false);
  };

  const handleEquipFromPrompt = () => {
    setShowEquipDropdown(true);
    setTimeout(() => selectRef.current?.focus(), 100);
  };

  // Helper: bar color based on win rate
  const getBarColor = (winRate: number): string => {
    if (winRate > 0.6) return '#4ade80'; // green
    if (winRate >= 0.4) return '#fcee0a'; // yellow
    return '#f87171'; // red
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* No-Racket Prompt */}
      {needsRacket && (
        <div className="glass-panel p-4 rounded-xl border border-cyber-yellow/30 bg-cyber-yellow/5 flex flex-col sm:flex-row items-center gap-4 animate-slideUp">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle size={24} className="text-cyber-yellow flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">No racket equipped!</p>
              <p className="text-xs text-gray-400">Forge a new one in the Armory or equip an existing racket.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {onNavigateToArmory && (
              <button
                onClick={onNavigateToArmory}
                className="flex items-center gap-1.5 bg-cyber-yellow text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white transition-colors"
              >
                <Sword size={14} /> Go to Armory
              </button>
            )}
            {rackets.length > 0 && (
              <button
                onClick={handleEquipFromPrompt}
                className="flex items-center gap-1.5 bg-white/5 text-gray-300 font-bold text-xs px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Zap size={14} /> Equip Existing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 border-b-4 border-cyber-purple bg-gradient-to-r from-black/60 to-cyber-purple/10">
        <div className="relative">
            <img src={player.avatar} className="w-24 h-24 rounded-full border-4 border-white/10 shadow-lg object-cover" />
            <div className="absolute -bottom-2 -right-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded border border-white/20">
                Lvl {Math.floor(player.eloSingles / 100)}
            </div>
        </div>

        <div className="text-center md:text-left flex-1">
          {/* Name with admin edit */}
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameConfirm();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="bg-black/50 border border-cyber-yellow/50 text-white text-2xl font-display font-bold px-3 py-1 rounded outline-none focus:border-cyber-yellow"
                  autoFocus
                />
                <button onClick={handleNameConfirm} className="p-1.5 text-green-400 hover:bg-green-400/20 rounded transition-colors">
                  <Check size={18} />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:bg-white/10 rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-display font-bold text-white tracking-wide">{player.name}</h2>
                {isAdmin && onUpdatePlayerName && (
                  <button
                    onClick={handleNameEdit}
                    className="p-1.5 text-gray-500 hover:text-cyber-yellow hover:bg-cyber-yellow/10 rounded-full transition-colors"
                    title="Edit player name"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </>
            )}
          </div>

          {player.bio && (
            <p className="text-gray-400 text-sm mb-2 italic">{player.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
             <div className="bg-black/40 px-4 py-2 rounded border border-cyber-cyan/30">
               <div className="text-[10px] text-cyber-cyan uppercase tracking-widest font-bold">Singles</div>
               <div className="text-2xl font-mono font-bold text-white">{player.eloSingles}</div>
             </div>
             <div className="bg-black/40 px-4 py-2 rounded border border-cyber-pink/30">
               <div className="text-[10px] text-cyber-pink uppercase tracking-widest font-bold">Doubles</div>
               <div className="text-2xl font-mono font-bold text-white">{player.eloDoubles}</div>
             </div>
          </div>
        </div>

        {/* Equipped Racket Card */}
        <div className="bg-black/40 p-3 rounded-lg border border-white/10 flex flex-col items-center gap-2 min-w-[140px] hover:border-white/30 transition-colors">
           <div className="text-[10px] text-cyber-yellow uppercase tracking-widest font-bold flex items-center gap-1">
             <Zap size={10} /> Loadout
           </div>
           {currentRacket ? (
             <div className="text-center group cursor-help">
                <div className="mx-auto w-8 h-8 mb-1 flex items-center justify-center rounded-full bg-black/50 border border-white/10 group-hover:scale-110 transition-transform" style={{ color: currentRacket.color }}>
                   <RacketIcon size={16} />
                </div>
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{currentRacket.name}</div>
                <div className="text-[9px] text-gray-400">{formatRacketStats(currentRacket.stats)}</div>
             </div>
           ) : (
             <div className="text-xs text-gray-500 italic py-2">No Gear</div>
           )}

           <select
             ref={selectRef}
             className={`mt-1 bg-white/5 text-[10px] text-gray-300 border border-white/10 rounded px-2 py-1 outline-none w-full cursor-pointer hover:bg-white/10 ${showEquipDropdown ? 'ring-1 ring-cyber-yellow' : ''}`}
             value={player.mainRacketId || ''}
             onChange={(e) => { onUpdateRacket(player.id, e.target.value); setShowEquipDropdown(false); }}
           >
              <option value="">Equip...</option>
              {rackets.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
           </select>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="glass-panel p-4 rounded-xl">
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {achievements.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 hover:border-white/30 transition-colors group" title={a.description}>
                  <Icon size={16} style={{ color: a.color }} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">{a.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Type Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setSelectedGameType('singles')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              selectedGameType === 'singles' ? 'bg-cyber-cyan text-black shadow-neon-cyan' : 'text-gray-400 hover:text-white'
            }`}
          >
            SINGLES
          </button>
          <button
            onClick={() => setSelectedGameType('doubles')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              selectedGameType === 'doubles' ? 'bg-cyber-pink text-black shadow-neon-pink' : 'text-gray-400 hover:text-white'
            }`}
          >
            DOUBLES
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         <StatCard label="Matches" value={totalGames} color="text-white" icon={<Calendar size={16} />} />
         <StatCard label="Win Rate" value={`${winRate}%`} color="text-cyber-yellow" />
         <StatCard label="Record" value={`${wins}W - ${losses}L`} color="text-cyber-cyan" />
         <StatCard label={`${selectedGameType === 'singles' ? 'Singles' : 'Doubles'} Streak`} value={Math.abs(streak)} color={streak >= 0 ? 'text-green-400' : 'text-red-400'} icon={streak >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} />
         <StatCard
           label="SoS"
           value={currentSoS !== null ? currentSoS : '—'}
           color={(() => {
             if (currentSoS === null) return 'text-gray-500';
             const diff = currentSoS - leagueAvgElo;
             return diff >= 30 ? 'text-green-400' : diff >= -30 ? 'text-yellow-400' : 'text-orange-400';
           })()}
           icon={<Shield size={16} />}
           tooltip={currentSoS !== null ? `Avg opponent ELO (league avg: ${leagueAvgElo})` : 'No qualifying matches'}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl min-h-[250px]">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <span className="w-1.5 h-6 bg-cyber-cyan rounded-full" />
            Performance History
            </h3>
            <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis hide />
                <YAxis stroke="#444" domain={['auto', 'auto']} tick={{fill: '#666', fontSize: 10}} width={30} />
                <Tooltip
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#00f3ff' }}
                labelStyle={{ color: '#888', marginBottom: '0.5rem' }}
                labelFormatter={(label, payload) => payload[0]?.payload.fullDate || ''}
                />
                <Line
                type="monotone"
                dataKey="elo"
                stroke="#00f3ff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#fff', stroke: '#00f3ff' }}
                />
            </LineChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Recent Matches Mini-Feed */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-xl">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <span className="w-1.5 h-6 bg-cyber-pink rounded-full" />
            Recent Form
            </h3>
            <div className="space-y-3">
                {playerMatches.length > 0 ? playerMatches.map(m => {
                    const result = getMatchResult(m);
                    const gameTypeColor = m.type === 'singles' ? 'text-cyber-cyan' : 'text-cyber-pink';
                    const gameTypeBg = m.type === 'singles' ? 'bg-cyber-cyan/10 border-cyber-cyan/30' : 'bg-cyber-pink/10 border-cyber-pink/30';
                    return (
                        <div key={m.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] ${result === 'WIN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {result}
                                </span>
                                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${gameTypeColor} ${gameTypeBg}`}>
                                    {m.type}
                                </span>
                            </div>
                            <div className="font-mono">
                                <span className={result === 'WIN' ? 'text-white' : 'text-gray-500'}>{m.scoreWinner}</span>
                                <span className="text-gray-600 mx-1">-</span>
                                <span className={result === 'LOSS' ? 'text-white' : 'text-gray-500'}>{m.scoreLoser}</span>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="text-xs text-gray-600 italic">No matches played</div>
                )}
            </div>
        </div>
      </div>

      {/* Advanced Stats Section - Conditional Rendering */}
      {playerMatchCount >= 2 ? (
        <>
          {/* Recent Form Indicator */}
          <div className="glass-panel p-6 rounded-xl border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Activity size={16} className="text-cyber-cyan" />
              Recent Form
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentForm.length > 0 ? (
                recentForm.map((result, index) => (
                  <span
                    key={index}
                    className={`font-bold font-mono px-3 py-1.5 rounded text-sm ${
                      result === 'W'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {result}
                  </span>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic">No matches yet</div>
              )}
            </div>
          </div>

          {/* Charts Row: Win Rate by Opponent & Performance Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate by Opponent */}
            <div className="glass-panel rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-cyber-cyan" />
                <h3 className="font-display text-sm text-white tracking-wider">WIN RATE BY OPPONENT</h3>
              </div>
              {winRateByOpponent.length === 0 ? (
                <p className="text-gray-500 font-mono text-xs text-center py-8">
                  Need 2+ {selectedGameType} matches against an opponent
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
                <p className="text-gray-500 font-mono text-xs text-center py-8">Not enough {selectedGameType} matches</p>
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
              <Calendar size={16} className="text-cyber-cyan" />
              <h3 className="font-display text-sm text-white tracking-wider">DAY OF WEEK PERFORMANCE</h3>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dayOfWeekStats.map((dayStat) => {
                const totalMatches = dayStat.wins + dayStat.losses;
                const hasMatches = totalMatches > 0;
                
                // Calculate opacity based on match count (0.1 to 1.0 scale)
                // Find max matches across all days for normalization
                const maxMatches = Math.max(...dayOfWeekStats.map(d => d.wins + d.losses), 1);
                const opacity = hasMatches ? Math.max(0.1, Math.min(1.0, totalMatches / maxMatches)) : 0.1;
                
                // Background color based on win rate
                const bgColor = hasMatches 
                  ? (dayStat.winRate >= 0.5 ? 'bg-cyber-cyan' : 'bg-cyber-pink')
                  : 'bg-gray-700';
                
                return (
                  <div
                    key={dayStat.day}
                    className={`${bgColor} rounded-lg p-3 flex flex-col items-center justify-center gap-1 border border-white/10 transition-all hover:scale-105`}
                    style={{ opacity }}
                  >
                    <div className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {dayStat.day}
                    </div>
                    {hasMatches ? (
                      <>
                        <div className="text-lg font-mono font-bold text-white">
                          {Math.round(dayStat.winRate * 100)}%
                        </div>
                        <div className="text-[9px] text-white/80 font-mono">
                          {dayStat.wins}W-{dayStat.losses}L
                        </div>
                      </>
                    ) : (
                      <div className="text-[9px] text-white/60 italic">
                        No games
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Analysis Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Avg Win Margin */}
            <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
              <Target size={20} className="text-cyber-cyan mx-auto mb-2" />
              <div className="font-display text-xs text-gray-400 tracking-wider mb-1">AVG WIN MARGIN</div>
              <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #00f3ff' }}>
                {scoreAnalysis.avgWinMargin}
              </div>
            </div>

            {/* Closest Game */}
            <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
              <Activity size={20} className="text-cyber-pink mx-auto mb-2" />
              <div className="font-display text-xs text-gray-400 tracking-wider mb-1">CLOSEST GAME</div>
              <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #ff00ff' }}>
                {scoreAnalysis.closestGame.score}
              </div>
              {scoreAnalysis.closestGame.opponents.length > 0 && (
                <div className="text-[9px] text-gray-500 mt-1 truncate">
                  vs {scoreAnalysis.closestGame.opponents.join(', ')}
                </div>
              )}
            </div>

            {/* Biggest Blowout */}
            <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
              <Zap size={20} className="text-cyber-yellow mx-auto mb-2" />
              <div className="font-display text-xs text-gray-400 tracking-wider mb-1">BIGGEST BLOWOUT</div>
              <div className="font-mono text-2xl text-white" style={{ textShadow: '0 0 10px #fcee0a' }}>
                {scoreAnalysis.biggestBlowout.score}
              </div>
              {scoreAnalysis.biggestBlowout.opponents.length > 0 && (
                <div className="text-[9px] text-gray-500 mt-1 truncate">
                  vs {scoreAnalysis.biggestBlowout.opponents.join(', ')}
                </div>
              )}
            </div>

            {/* Total ELO Gained */}
            <div className="glass-panel rounded-xl border border-white/5 p-4 text-center">
              <TrendingUp 
                size={20} 
                className={`mx-auto mb-2 ${scoreAnalysis.totalEloGained >= 0 ? 'text-green-400' : 'text-red-400'}`} 
              />
              <div className="font-display text-xs text-gray-400 tracking-wider mb-1">TOTAL ELO</div>
              <div 
                className={`font-mono text-2xl ${scoreAnalysis.totalEloGained >= 0 ? 'text-green-400' : 'text-red-400'}`}
                style={{ textShadow: scoreAnalysis.totalEloGained >= 0 ? '0 0 10px #4ade80' : '0 0 10px #f87171' }}
              >
                {scoreAnalysis.totalEloGained >= 0 ? '+' : ''}{scoreAnalysis.totalEloGained}
              </div>
            </div>
          </div>

          {/* SoS Progression */}
          {sosProgression.length >= 2 && (
            <div className="glass-panel rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-cyber-yellow" />
                <h3 className="font-display text-sm text-white tracking-wider">STRENGTH OF SCHEDULE</h3>
                <span className="text-[10px] font-mono text-gray-500 ml-auto">
                  Running avg opponent ELO
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sosProgression} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis
                    dataKey="matchIndex"
                    stroke="#555"
                    fontSize={10}
                    label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#444"
                    domain={['auto', 'auto']}
                    tick={{ fill: '#666', fontSize: 10 }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={v => `Match #${v}`}
                    formatter={(value: number) => [value, 'Avg Opp. ELO']}
                  />
                  <Line
                    type="monotone"
                    dataKey="sos"
                    stroke="#fcee0a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#fcee0a', stroke: '#000' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-mono">
                <span className="text-green-400">● &ge; {leagueAvgElo + 30} tough</span>
                <span className="text-yellow-400">● ~{leagueAvgElo} balanced</span>
                <span className="text-orange-400">● &le; {leagueAvgElo - 30} easy</span>
              </div>
            </div>
          )}

          {/* ELO Volatility Gauge */}
          <div className="glass-panel rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-cyber-yellow" />
              <h3 className="font-display text-sm text-white tracking-wider">ELO VOLATILITY</h3>
            </div>
            <div className="space-y-3">
              {/* Progress bar gauge */}
              <div className="relative h-8 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((eloVolatility / 40) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #00f3ff 0%, #ff00ff 100%)',
                    boxShadow: '0 0 20px rgba(0, 243, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)',
                  }}
                />
              </div>
              {/* Volatility number and label */}
              <div className="flex items-center justify-between">
                <div 
                  className="font-mono text-3xl font-bold text-white"
                  style={{ textShadow: '0 0 10px #00f3ff, 0 0 20px #ff00ff' }}
                >
                  {eloVolatility.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400 italic">
                  Last 20 matches
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-panel p-6 rounded-xl border border-cyber-yellow/30 bg-cyber-yellow/5">
          <div className="flex items-center gap-3 justify-center">
            <AlertTriangle size={20} className="text-cyber-yellow" />
            <p className="text-sm text-gray-300">
              Need at least 2 {selectedGameType} matches for advanced stats analysis
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, icon, tooltip }: any) => (
  <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors" title={tooltip}>
    <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
        {icon} {label}
    </div>
    <div className={`text-xl md:text-2xl font-mono font-bold ${color}`}>
      {value}
    </div>
  </div>
);

export default PlayerProfile;

