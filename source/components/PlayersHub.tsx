import React, { useState, useMemo } from 'react';
import { Player, Match, EloHistoryEntry, Racket } from '../types';
import PlayerProfile from './PlayerProfile';
import RankBadge from './RankBadge';
import {
  Users, Swords, ArrowRightLeft, TrendingUp, TrendingDown, Minus,
  Search, X, Plus, Trash2, ArrowLeft, Pencil, Check
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface PlayersHubProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
  rackets: Racket[];
  isAdmin: boolean;
  currentUserId?: string;  // current logged-in player's ID
  initialSelectedId?: string | null;
  onUpdateRacket: (playerId: string, racketId: string) => void;
  onDeletePlayer: (id: string, name: string) => void;
  onAddPlayer: () => void;
  onNavigateToArmory: () => void;
  onUpdatePlayerName: (playerId: string, newName: string) => void;
  onClearInitialSelection?: () => void;
}

const PlayersHub: React.FC<PlayersHubProps> = ({
  players, matches, history, rackets, isAdmin, currentUserId,
  initialSelectedId, onUpdateRacket, onDeletePlayer, onAddPlayer,
  onNavigateToArmory, onUpdatePlayerName, onClearInitialSelection,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [secondaryId, setSecondaryId] = useState<string>('');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // If initialSelectedId changes externally (e.g. from leaderboard click), sync
  React.useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      setIsCompareMode(false);
      onClearInitialSelection?.();
    }
  }, [initialSelectedId]);

  const selectedPlayer = players.find(p => p.id === selectedId);
  const secondaryPlayer = players.find(p => p.id === secondaryId);

  // Compare Data Calculation (carried over from StatsDashboard)
  const compareData = useMemo(() => {
    if (!selectedId || !secondaryId) return null;
    const h2hMatches = matches.filter(m =>
      (m.winners.includes(selectedId) && m.losers.includes(secondaryId)) ||
      (m.winners.includes(secondaryId) && m.losers.includes(selectedId))
    );
    const winsA = h2hMatches.filter(m => m.winners.includes(selectedId)).length;
    const winsB = h2hMatches.filter(m => m.winners.includes(secondaryId)).length;
    const historyA = history.filter(h => h.playerId === selectedId);
    const historyB = history.filter(h => h.playerId === secondaryId);
    const allTimestamps = Array.from(new Set([
      ...historyA.map(h => h.timestamp),
      ...historyB.map(h => h.timestamp)
    ])).sort();
    let eloA = 1200;
    let eloB = 1200;
    const chartData = allTimestamps.map(ts => {
      const entryA = historyA.find(h => h.timestamp === ts);
      const entryB = historyB.find(h => h.timestamp === ts);
      if (entryA) eloA = entryA.newElo;
      if (entryB) eloB = entryB.newElo;
      return { date: new Date(ts).toLocaleDateString(), eloA, eloB };
    });
    if (chartData.length === 0) {
      chartData.push({ date: 'Start', eloA: 1200, eloB: 1200 });
    }
    return { h2hMatches, winsA, winsB, chartData };
  }, [selectedId, secondaryId, matches, history]);

  const handleBack = () => {
    setSelectedId(null);
    setIsCompareMode(false);
    setSecondaryId('');
  };

  const handleStartEdit = (playerId: string, currentName: string) => {
    setEditingNameId(playerId);
    setEditNameValue(currentName);
  };

  const handleConfirmEdit = (playerId: string) => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== players.find(p => p.id === playerId)?.name) {
      onUpdatePlayerName(playerId, trimmed);
    }
    setEditingNameId(null);
    setEditNameValue('');
  };

  const handleCancelEdit = () => {
    setEditingNameId(null);
    setEditNameValue('');
  };

  // --- Player select dropdown for compare ---
  const renderPlayerSelect = (
    value: string,
    onChange: (id: string) => void,
    excludeId?: string,
    placeholder = "Select Player"
  ) => (
    <div className="relative group min-w-[200px]">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
        <Search size={14} />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-black/40 border border-white/10 text-white pl-9 pr-8 py-2.5 rounded-lg text-sm font-bold focus:border-cyber-cyan outline-none transition-colors cursor-pointer hover:bg-white/5"
      >
        <option value="" disabled>{placeholder}</option>
        {players
          .filter(p => p.id !== excludeId)
          .map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))
        }
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
        <div className="border-l border-white/10 h-4 mx-2" />
        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-500" />
      </div>
    </div>
  );

  // ===== GRID VIEW =====
  if (!selectedId) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Users className="text-cyber-cyan w-8 h-8" />
            <h2 className="text-3xl font-display font-bold text-white neon-text-cyan">
              ROSTER
            </h2>
          </div>
          <button
            onClick={onAddPlayer}
            className="flex items-center gap-2 bg-cyber-pink text-black px-4 py-2 rounded font-bold hover:bg-white transition-colors"
          >
            <Plus size={18} /> Add Player
          </button>
        </div>

        {players.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-gray-500">
            No agents found. Initialize new player to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...players].sort((a, b) => b.eloSingles - a.eloSingles).map(player => {
              const totalGames = player.wins + player.losses;
              const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
              const isEditingThis = editingNameId === player.id;

              return (
                <div
                  key={player.id}
                  className="relative glass-panel rounded-xl border border-white/5 hover:border-cyber-cyan/40 transition-all cursor-pointer group"
                  onClick={() => { if (!isEditingThis) setSelectedId(player.id); }}
                >
                  {/* Admin Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={e => e.stopPropagation()}>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleStartEdit(player.id, player.name)}
                          className="p-1.5 text-gray-400 bg-black/50 hover:text-cyber-yellow hover:bg-cyber-yellow/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Name"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDeletePlayer(player.id, player.name)}
                          className="p-1.5 text-gray-400 bg-black/50 hover:text-red-500 hover:bg-red-500/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Player"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4 flex flex-col items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <img
                        src={player.avatar}
                        className="w-16 h-16 rounded-full border-2 border-white/10 group-hover:border-cyber-cyan/50 group-hover:scale-105 transition-all object-cover"
                      />
                    </div>

                    {/* Name (editable for admin) */}
                    {isEditingThis ? (
                      <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmEdit(player.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="flex-1 bg-black/50 border border-cyber-yellow/50 text-white text-center text-sm px-2 py-1 rounded font-bold outline-none focus:border-cyber-yellow"
                          autoFocus
                        />
                        <button
                          onClick={() => handleConfirmEdit(player.id)}
                          className="p-1 text-green-400 hover:bg-green-400/20 rounded transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-white text-center truncate w-full text-sm">
                        {player.name}
                      </span>
                    )}

                    {/* Rank Badge */}
                    <RankBadge elo={player.eloSingles} />

                    {/* Quick Stats */}
                    <div className="w-full grid grid-cols-3 gap-1 text-center">
                      <div className="bg-black/20 rounded px-1 py-1.5">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">ELO</div>
                        <div className="text-sm font-mono font-bold text-cyber-cyan">{player.eloSingles}</div>
                      </div>
                      <div className="bg-black/20 rounded px-1 py-1.5">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">W/L</div>
                        <div className="text-sm font-mono font-bold text-white">
                          <span className="text-green-400">{player.wins}</span>
                          <span className="text-gray-600">/</span>
                          <span className="text-red-400">{player.losses}</span>
                        </div>
                      </div>
                      <div className="bg-black/20 rounded px-1 py-1.5">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Win%</div>
                        <div className="text-sm font-mono font-bold text-cyber-yellow">{winRate}%</div>
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center justify-center gap-1 font-mono text-xs font-bold">
                      {player.streak > 0 ? (
                        <span className="flex items-center text-green-400">
                          <TrendingUp size={12} className="mr-0.5" /> {player.streak}W streak
                        </span>
                      ) : player.streak < 0 ? (
                        <span className="flex items-center text-red-400">
                          <TrendingDown size={12} className="mr-0.5" /> {Math.abs(player.streak)}L streak
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-500">
                          <Minus size={12} className="mr-0.5" /> No streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-4">
          Click a player card to view their full profile and stats.
        </p>
      </div>
    );
  }

  // ===== DETAIL / COMPARE VIEW =====
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={handleBack}
            className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white p-2.5 rounded-lg transition-all border border-white/10 hover:border-white/30"
            title="Back to Roster"
          >
            <ArrowLeft size={18} />
          </button>

          {!isCompareMode && (
            <>
              <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Player</label>
                {renderPlayerSelect(selectedId || '', (id) => setSelectedId(id), undefined, "Select Player...")}
              </div>
              <button
                onClick={() => { setIsCompareMode(true); if (!secondaryId) setSecondaryId(players.find(p => p.id !== selectedId)?.id || ''); }}
                className="mt-4 md:mt-auto bg-white/5 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 p-2.5 rounded-lg transition-all"
                title="Compare Players"
              >
                <ArrowRightLeft size={18} />
              </button>
            </>
          )}
        </div>

        {isCompareMode && (
          <div className="flex items-center gap-4 w-full md:w-auto animate-fadeIn">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Player A</label>
              {renderPlayerSelect(selectedId || '', (id) => setSelectedId(id), secondaryId, "Select Player...")}
            </div>
            <div className="hidden md:flex items-center text-gray-500 font-display font-bold text-xl italic px-2">VS</div>
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Player B</label>
              {renderPlayerSelect(secondaryId, setSecondaryId, selectedId || undefined, "Select Opponent...")}
            </div>
            <button
              onClick={() => setIsCompareMode(false)}
              className="mt-4 md:mt-auto text-gray-400 hover:text-white hover:bg-white/10 p-2.5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Single Profile View */}
      {!isCompareMode && selectedPlayer && (
        <PlayerProfile
          player={selectedPlayer}
          history={history}
          matches={matches}
          rackets={rackets}
          onUpdateRacket={onUpdateRacket}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onNavigateToArmory={onNavigateToArmory}
          onUpdatePlayerName={onUpdatePlayerName}
        />
      )}

      {/* Compare View */}
      {isCompareMode && selectedPlayer && secondaryPlayer && compareData && (
        <div className="animate-slideUp space-y-6">
          {/* Tale of the Tape */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-xl border-t-4 border-cyber-cyan flex flex-col items-center">
              <img src={selectedPlayer.avatar} className="w-20 h-20 rounded-full border-2 border-cyber-cyan shadow-neon-cyan mb-3 object-cover" />
              <h3 className="text-xl font-bold text-white mb-1">{selectedPlayer.name}</h3>
              <div className="text-cyber-cyan font-mono text-2xl font-bold">{selectedPlayer.eloSingles}</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Singles Elo</div>
            </div>

            <div className="glass-panel p-6 rounded-xl flex flex-col justify-center items-center">
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Head to Head</div>
              <div className="flex items-center gap-6 mb-2">
                <div className="text-4xl font-mono font-bold text-cyber-cyan">{compareData.winsA}</div>
                <Swords className="text-gray-600" size={24} />
                <div className="text-4xl font-mono font-bold text-cyber-pink">{compareData.winsB}</div>
              </div>
              <div className="text-sm text-gray-400 font-mono">
                {compareData.h2hMatches.length} Total Matches
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl border-t-4 border-cyber-pink flex flex-col items-center">
              <img src={secondaryPlayer.avatar} className="w-20 h-20 rounded-full border-2 border-cyber-pink shadow-neon-pink mb-3 object-cover" />
              <h3 className="text-xl font-bold text-white mb-1">{secondaryPlayer.name}</h3>
              <div className="text-cyber-pink font-mono text-2xl font-bold">{secondaryPlayer.eloSingles}</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Singles Elo</div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <table className="w-full text-center">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest">
                <tr>
                  <th className="p-3 w-1/3 text-left pl-6">{selectedPlayer.name}</th>
                  <th className="p-3 w-1/3 text-center">Metric</th>
                  <th className="p-3 w-1/3 text-right pr-6">{secondaryPlayer.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-sm">
                <ComparisonRow
                  label="Doubles Elo"
                  valA={selectedPlayer.eloDoubles}
                  valB={secondaryPlayer.eloDoubles}
                />
                <ComparisonRow
                  label="Win Rate"
                  valA={`${selectedPlayer.wins + selectedPlayer.losses > 0 ? Math.round((selectedPlayer.wins / (selectedPlayer.wins + selectedPlayer.losses)) * 100) : 0}%`}
                  valB={`${secondaryPlayer.wins + secondaryPlayer.losses > 0 ? Math.round((secondaryPlayer.wins / (secondaryPlayer.wins + secondaryPlayer.losses)) * 100) : 0}%`}
                  highlight
                />
                <ComparisonRow
                  label="Current Streak"
                  valA={selectedPlayer.streak}
                  valB={secondaryPlayer.streak}
                />
                <ComparisonRow
                  label="Total Wins"
                  valA={selectedPlayer.wins}
                  valB={secondaryPlayer.wins}
                />
              </tbody>
            </table>
          </div>

          {/* Comparison Chart */}
          <div className="glass-panel p-6 rounded-xl h-[300px] md:h-[400px]">
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp size={16} /> Elo Progression Comparison
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compareData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666', fontSize: 10 }} minTickGap={30} />
                <YAxis stroke="#444" domain={['auto', 'auto']} tick={{ fill: '#666', fontSize: 10 }} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Line
                  name={selectedPlayer.name}
                  type="stepAfter"
                  dataKey="eloA"
                  stroke="#00f3ff"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  name={secondaryPlayer.name}
                  type="stepAfter"
                  dataKey="eloB"
                  stroke="#ff00ff"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!selectedPlayer && (
        <div className="text-center py-20 text-gray-500">
          Select a player to view statistics.
        </div>
      )}
    </div>
  );
};

const ComparisonRow = ({ label, valA, valB, highlight }: any) => {
  let winner: 'A' | 'B' | null = null;
  const numA = typeof valA === 'number' ? valA : parseFloat(valA);
  const numB = typeof valB === 'number' ? valB : parseFloat(valB);
  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA > numB) winner = 'A';
    if (numB > numA) winner = 'B';
  }
  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className={`p-4 text-left pl-6 ${winner === 'A' ? 'text-cyber-cyan font-bold' : 'text-gray-300'} ${highlight ? 'text-lg' : ''}`}>
        {valA}
      </td>
      <td className="p-4 text-center text-gray-500 text-xs font-sans uppercase font-bold tracking-widest">
        {label}
      </td>
      <td className={`p-4 text-right pr-6 ${winner === 'B' ? 'text-cyber-pink font-bold' : 'text-gray-300'} ${highlight ? 'text-lg' : ''}`}>
        {valB}
      </td>
    </tr>
  );
};

export default PlayersHub;
