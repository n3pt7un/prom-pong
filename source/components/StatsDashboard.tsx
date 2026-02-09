import React, { useState, useMemo } from 'react';
import { Player, Match, EloHistoryEntry, Racket } from '../types';
import PlayerProfile from './PlayerProfile';
import { Users, Swords, ArrowRightLeft, TrendingUp, Trophy, Search, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface StatsDashboardProps {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
  rackets: Racket[];
  onUpdateRacket: (playerId: string, racketId: string) => void;
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ players, matches, history, rackets, onUpdateRacket }) => {
  const [primaryId, setPrimaryId] = useState<string>(players[0]?.id || '');
  const [secondaryId, setSecondaryId] = useState<string>('');
  const [isCompareMode, setIsCompareMode] = useState(false);

  // --- Derived State ---
  const primaryPlayer = players.find(p => p.id === primaryId);
  const secondaryPlayer = players.find(p => p.id === secondaryId);

  // Compare Data Calculation
  const compareData = useMemo(() => {
    if (!primaryId || !secondaryId) return null;

    // Head to Head
    const h2hMatches = matches.filter(m => 
      (m.winners.includes(primaryId) && m.losers.includes(secondaryId)) ||
      (m.winners.includes(secondaryId) && m.losers.includes(primaryId))
    );
    const winsA = h2hMatches.filter(m => m.winners.includes(primaryId)).length;
    const winsB = h2hMatches.filter(m => m.winners.includes(secondaryId)).length;

    // Chart Data Construction
    // 1. Get all relevant history entries
    const historyA = history.filter(h => h.playerId === primaryId);
    const historyB = history.filter(h => h.playerId === secondaryId);
    
    // 2. Combine timestamps
    const allTimestamps = Array.from(new Set([
        ...historyA.map(h => h.timestamp),
        ...historyB.map(h => h.timestamp)
    ])).sort();

    // 3. Build cumulative Elo map
    let eloA = 1200;
    let eloB = 1200;
    const chartData = allTimestamps.map(ts => {
        const entryA = historyA.find(h => h.timestamp === ts);
        const entryB = historyB.find(h => h.timestamp === ts);
        
        if (entryA) eloA = entryA.newElo;
        if (entryB) eloB = entryB.newElo;

        return {
            date: new Date(ts).toLocaleDateString(),
            eloA,
            eloB
        };
    });
    // Ensure we have at least start points
    if (chartData.length === 0) {
        chartData.push({ date: 'Start', eloA: 1200, eloB: 1200 });
    }

    return { h2hMatches, winsA, winsB, chartData };

  }, [primaryId, secondaryId, matches, history]);


  // --- Render Helpers ---

  const renderPlayerSelect = (
    selectedId: string, 
    onChange: (id: string) => void, 
    excludeId?: string,
    placeholder = "Select Player"
  ) => (
    <div className="relative group min-w-[200px]">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
        <Search size={14} />
      </div>
      <select 
        value={selectedId}
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

  return (
    <div className="space-y-6">
      
      {/* Top Bar Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col gap-1 w-full md:w-auto">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Primary Agent</label>
                {renderPlayerSelect(primaryId, setPrimaryId, undefined, "Select Player...")}
            </div>
            
            {!isCompareMode && (
                 <button 
                 onClick={() => { setIsCompareMode(true); if(!secondaryId) setSecondaryId(players.find(p => p.id !== primaryId)?.id || ''); }}
                 className="mt-4 md:mt-auto bg-white/5 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 p-2.5 rounded-lg transition-all"
                 title="Compare Players"
               >
                 <ArrowRightLeft size={18} />
               </button>
            )}
        </div>

        {isCompareMode && (
             <div className="flex items-center gap-4 w-full md:w-auto animate-fadeIn">
                <div className="hidden md:flex items-center text-gray-500 font-display font-bold text-xl italic px-2">VS</div>
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Opponent</label>
                    {renderPlayerSelect(secondaryId, setSecondaryId, primaryId, "Select Opponent...")}
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

      {/* Main Content Area */}
      
      {/* CASE 1: Single Profile View */}
      {!isCompareMode && primaryPlayer && (
        <PlayerProfile 
            player={primaryPlayer}
            history={history}
            matches={matches}
            rackets={rackets}
            onUpdateRacket={onUpdateRacket}
        />
      )}

      {/* CASE 2: Comparison View */}
      {isCompareMode && primaryPlayer && secondaryPlayer && compareData && (
        <div className="animate-slideUp space-y-6">
            
            {/* Tale of the Tape */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Player A Card */}
                <div className="glass-panel p-6 rounded-xl border-t-4 border-cyber-cyan flex flex-col items-center">
                    <img src={primaryPlayer.avatar} className="w-20 h-20 rounded-full border-2 border-cyber-cyan shadow-neon-cyan mb-3 object-cover" />
                    <h3 className="text-xl font-bold text-white mb-1">{primaryPlayer.name}</h3>
                    <div className="text-cyber-cyan font-mono text-2xl font-bold">{primaryPlayer.eloSingles}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">Singles Elo</div>
                </div>

                {/* VS Stats */}
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

                {/* Player B Card */}
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
                            <th className="p-3 w-1/3 text-left pl-6">{primaryPlayer.name}</th>
                            <th className="p-3 w-1/3 text-center">Metric</th>
                            <th className="p-3 w-1/3 text-right pr-6">{secondaryPlayer.name}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-sm">
                        <ComparisonRow 
                            label="Doubles Elo" 
                            valA={primaryPlayer.eloDoubles} 
                            valB={secondaryPlayer.eloDoubles} 
                        />
                         <ComparisonRow
                            label="Win Rate"
                            valA={`${primaryPlayer.wins + primaryPlayer.losses > 0 ? Math.round((primaryPlayer.wins / (primaryPlayer.wins + primaryPlayer.losses)) * 100) : 0}%`}
                            valB={`${secondaryPlayer.wins + secondaryPlayer.losses > 0 ? Math.round((secondaryPlayer.wins / (secondaryPlayer.wins + secondaryPlayer.losses)) * 100) : 0}%`}
                            highlight
                        />
                        <ComparisonRow 
                            label="Current Streak" 
                            valA={primaryPlayer.streak} 
                            valB={secondaryPlayer.streak} 
                        />
                        <ComparisonRow 
                            label="Total Wins" 
                            valA={primaryPlayer.wins} 
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
                        <XAxis dataKey="date" stroke="#666" tick={{fill: '#666', fontSize: 10}} minTickGap={30} />
                        <YAxis stroke="#444" domain={['auto', 'auto']} tick={{fill: '#666', fontSize: 10}} width={30} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Line 
                            name={primaryPlayer.name}
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

      {!primaryPlayer && (
        <div className="text-center py-20 text-gray-500">
            Select a player to view statistics.
        </div>
      )}

    </div>
  );
};

const ComparisonRow = ({ label, valA, valB, highlight }: any) => {
    // Simple logic to bold the winner
    // Only works for numbers or percents formatted strictly
    let winner: 'A' | 'B' | null = null;
    
    // Parse values if possible
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

export default StatsDashboard;