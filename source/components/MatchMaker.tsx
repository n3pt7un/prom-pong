import React, { useState, useMemo } from 'react';
import { Player, GameType } from '../types';
import { Sparkles, Swords, ChevronDown, ChevronUp } from 'lucide-react';
import { predictWinProbability, predictDoublesWinProbability, formatProbability } from '../utils/predictionUtils';

interface MatchMakerProps {
  players: Player[];
  onSelectMatch: (type: GameType, team1: string[], team2: string[]) => void;
  activeLeagueId?: string | null;
}

interface Suggestion {
  team1: string[];
  team2: string[];
  gap: number;
  avgElo1: number;
  avgElo2: number;
}

const MAX_SINGLES_SUGGESTIONS = 8;
const MAX_DOUBLES_SUGGESTIONS = 8;

const MatchMaker: React.FC<MatchMakerProps> = ({ players, onSelectMatch, activeLeagueId }) => {
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<GameType>('singles');

  // Filter players by league when active
  const filteredPlayers = useMemo(() => {
    return activeLeagueId ? players.filter(p => p.leagueId === activeLeagueId) : players;
  }, [players, activeLeagueId]);

  const singlesSuggestions = useMemo((): Suggestion[] => {
    if (filteredPlayers.length < 2) return [];
    const sorted = [...filteredPlayers].sort((a, b) => a.eloSingles - b.eloSingles);
    const pairs: Suggestion[] = [];

    // Generate all pairs, sorted by ELO gap (smallest first)
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const gap = Math.abs(sorted[i].eloSingles - sorted[j].eloSingles);
        pairs.push({
          team1: [sorted[i].id],
          team2: [sorted[j].id],
          gap,
          avgElo1: sorted[i].eloSingles,
          avgElo2: sorted[j].eloSingles,
        });
      }
    }

    pairs.sort((a, b) => a.gap - b.gap);
    return pairs.slice(0, MAX_SINGLES_SUGGESTIONS);
  }, [filteredPlayers]);

  const doublesSuggestions = useMemo((): Suggestion[] => {
    if (filteredPlayers.length < 4) return [];

    // Generate all unique 2v2 combinations
    const combos: Suggestion[] = [];
    const ids = filteredPlayers.map(p => p.id);
    const eloMap = new Map(filteredPlayers.map(p => [p.id, p.eloDoubles]));

    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        for (let c = b + 1; c < ids.length; c++) {
          for (let d = c + 1; d < ids.length; d++) {
            // For each group of 4, there are 3 ways to split into pairs
            const group = [ids[a], ids[b], ids[c], ids[d]];
            const splits: [string[], string[]][] = [
              [[group[0], group[1]], [group[2], group[3]]],
              [[group[0], group[2]], [group[1], group[3]]],
              [[group[0], group[3]], [group[1], group[2]]],
            ];
            for (const [t1, t2] of splits) {
              const avg1 = (eloMap.get(t1[0])! + eloMap.get(t1[1])!) / 2;
              const avg2 = (eloMap.get(t2[0])! + eloMap.get(t2[1])!) / 2;
              combos.push({
                team1: t1,
                team2: t2,
                gap: Math.abs(avg1 - avg2),
                avgElo1: Math.round(avg1),
                avgElo2: Math.round(avg2),
              });
            }
          }
        }
      }
    }

    combos.sort((a, b) => a.gap - b.gap);
    return combos.slice(0, MAX_DOUBLES_SUGGESTIONS);
  }, [filteredPlayers]);

  const suggestions = type === 'singles' ? singlesSuggestions : doublesSuggestions;
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  const minPlayers = type === 'singles' ? 2 : 4;
  const hasEnough = filteredPlayers.length >= minPlayers;

  return (
    <div className="glass-panel rounded-xl border border-white/5 mb-6 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-cyber-yellow" />
          <span className="font-bold text-white text-lg">SUGGESTED MATCHUPS</span>
        </div>
        {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-slideUp">
          {/* Type Toggle */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setType('singles')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                type === 'singles' ? 'bg-cyber-cyan text-black shadow-neon-cyan' : 'text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              1v1 SINGLES
            </button>
            <button
              onClick={() => setType('doubles')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                type === 'doubles' ? 'bg-cyber-pink text-black shadow-neon-pink' : 'text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              2v2 DOUBLES
            </button>
          </div>

          {!hasEnough ? (
            <p className="text-center text-gray-500 text-sm py-4 italic">
              Need at least {minPlayers} players for {type} matchmaking.
            </p>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4 italic">No suggestions available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((s, i) => {
                const balancePercent = Math.max(0, 100 - s.gap);
                const balanceColor = s.gap < 30 ? 'text-green-400' : s.gap < 80 ? 'text-yellow-400' : 'text-orange-400';

                // Calculate win probabilities
                const winProbTeam1 = type === 'singles'
                  ? predictWinProbability(s.avgElo1, s.avgElo2)
                  : predictDoublesWinProbability(
                      s.team1.map(id => playerMap.get(id)?.eloDoubles ?? 1200),
                      s.team2.map(id => playerMap.get(id)?.eloDoubles ?? 1200)
                    );
                const winProbTeam2 = 1 - winProbTeam1;

                return (
                  <div
                    key={i}
                    className="bg-black/30 rounded-lg border border-white/5 p-3 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-mono font-bold ${balanceColor}`}>
                        {s.gap === 0 ? 'PERFECT MATCH' : `${Math.round(balancePercent)}% balanced`}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Δ{Math.round(s.gap)} ELO
                      </span>
                    </div>

                    {/* Win Prediction */}
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-[10px] font-mono">
                      <span className="text-cyber-cyan">{formatProbability(winProbTeam1)}</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-cyber-pink">{formatProbability(winProbTeam2)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Team 1 */}
                      <div className="flex-1 flex items-center gap-1.5 justify-end">
                        {s.team1.map(id => {
                          const p = playerMap.get(id);
                          return p ? (
                            <div key={id} className="flex items-center gap-1" title={p.name}>
                              <span className="text-xs text-gray-300 font-bold truncate max-w-[60px]">{p.name}</span>
                              <img src={p.avatar} className="w-6 h-6 rounded-full border border-cyber-cyan/30" />
                            </div>
                          ) : null;
                        })}
                        <span className="text-[10px] font-mono text-cyber-cyan ml-1">{s.avgElo1}</span>
                      </div>

                      <span className="text-gray-600 font-bold text-xs">vs</span>

                      {/* Team 2 */}
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-cyber-pink mr-1">{s.avgElo2}</span>
                        {s.team2.map(id => {
                          const p = playerMap.get(id);
                          return p ? (
                            <div key={id} className="flex items-center gap-1" title={p.name}>
                              <img src={p.avatar} className="w-6 h-6 rounded-full border border-cyber-pink/30" />
                              <span className="text-xs text-gray-300 font-bold truncate max-w-[60px]">{p.name}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectMatch(type, s.team1, s.team2)}
                      className="mt-2 w-full text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white px-2 py-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                    >
                      <Swords size={12} /> LOG THIS MATCH
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchMaker;
