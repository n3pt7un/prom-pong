import React, { useState, useRef } from 'react';
import { Player, EloHistoryEntry, Racket, Match, GameType } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { RACKET_ICONS, formatRacketStats } from './RacketManager';
import { Zap, TrendingUp, TrendingDown, Calendar, Sword, AlertTriangle, Pencil, Check, X } from 'lucide-react';
import { getPlayerAchievements } from '../achievements';
import { getStatsForGameType } from '../utils/gameTypeStats';

interface PlayerProfileProps {
  player: Player;
  history: EloHistoryEntry[];
  matches: Match[];
  rackets: Racket[];
  onUpdateRacket: (playerId: string, racketId: string) => void;
  isAdmin?: boolean;
  currentUserId?: string;
  onNavigateToArmory?: () => void;
  onUpdatePlayerName?: (playerId: string, newName: string) => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({
  player, history, matches, rackets, onUpdateRacket,
  isAdmin, currentUserId, onNavigateToArmory, onUpdatePlayerName,
}) => {
  const [selectedGameType, setSelectedGameType] = useState<GameType>('singles');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(player.name);
  const [showEquipDropdown, setShowEquipDropdown] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const playerHistory = history
    .filter(h => h.playerId === player.id && h.gameType === selectedGameType)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const playerMatches = matches
    .filter(m => 
      (m.winners.includes(player.id) || m.losers.includes(player.id)) &&
      m.type === selectedGameType
    )
    .slice(0, 5);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <StatCard label="Matches" value={totalGames} color="text-white" icon={<Calendar size={16} />} />
         <StatCard label="Win Rate" value={`${winRate}%`} color="text-cyber-yellow" />
         <StatCard label="Record" value={`${wins}W - ${losses}L`} color="text-cyber-cyan" />
         <StatCard label="Streak" value={Math.abs(streak)} color={streak >= 0 ? 'text-green-400' : 'text-red-400'} icon={streak >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} />
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
                    return (
                        <div key={m.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] ${result === 'WIN' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {result}
                                </span>
                                <span className="text-gray-400 text-xs">{m.type}</span>
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
    </div>
  );
};

const StatCard = ({ label, value, color, icon }: any) => (
  <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors">
    <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
        {icon} {label}
    </div>
    <div className={`text-xl md:text-2xl font-mono font-bold ${color}`}>
      {value}
    </div>
  </div>
);

export default PlayerProfile;
