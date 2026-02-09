import React, { useState } from 'react';
import { Player, Match, GameType } from '../types';
import RankBadge from './RankBadge';
import { TrendingUp, TrendingDown, Minus, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { RANKS } from '../constants';

interface LeaderboardProps {
  players: Player[];
  matches: Match[];
  onPlayerClick?: (playerId: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players, matches, onPlayerClick }) => {
  const [type, setType] = useState<GameType>('singles');
  const [showInfo, setShowInfo] = useState(false);

  const sortedPlayers = [...players].sort((a, b) => {
    const eloA = type === 'singles' ? a.eloSingles : a.eloDoubles;
    const eloB = type === 'singles' ? b.eloSingles : b.eloDoubles;
    return eloB - eloA;
  });

  // Find last ELO delta for each player from the most recent match they were in
  const getLastDelta = (playerId: string): number | null => {
    const sortedMatches = [...matches].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const lastMatch = sortedMatches.find(
      m => m.winners.includes(playerId) || m.losers.includes(playerId)
    );
    if (!lastMatch) return null;
    return lastMatch.winners.includes(playerId) ? lastMatch.eloChange : -lastMatch.eloChange;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-display font-bold text-white neon-text-cyan">
            GLOBAL <span className="text-cyber-pink">RANKINGS</span>
          </h2>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg border transition-all ${
              showInfo
                ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan'
                : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
            }`}
            title="How ELO & Ranking Works"
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setType('singles')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              type === 'singles' ? 'bg-cyber-cyan text-black shadow-neon-cyan' : 'text-gray-400 hover:text-white'
            }`}
          >
            SINGLES
          </button>
          <button
            onClick={() => setType('doubles')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              type === 'doubles' ? 'bg-cyber-pink text-black shadow-neon-pink' : 'text-gray-400 hover:text-white'
            }`}
          >
            DOUBLES
          </button>
        </div>
      </div>

      {/* ELO Info Panel */}
      {showInfo && (
        <div className="glass-panel p-6 rounded-xl border border-cyber-cyan/20 space-y-5 animate-slideUp">
          <h3 className="text-lg font-display font-bold text-cyber-cyan">HOW RANKING WORKS</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ELO Explanation */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">The ELO System</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Every player starts at <span className="text-cyber-cyan font-mono font-bold">1200 ELO</span>. After each match, rating points transfer from the loser to the winner.
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">K-Factor</span>
                  <span className="text-white font-mono font-bold">32</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Starting Rating</span>
                  <span className="text-white font-mono font-bold">1200</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Separate Ratings</span>
                  <span className="text-white font-mono font-bold">Singles + Doubles</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Beating a higher-rated player gives more points. Beating a lower-rated player gives fewer. The K-factor of 32 means ratings shift quickly, ideal for small leagues.
              </p>
            </div>

            {/* How it works */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">How Points Are Calculated</h4>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-2 text-xs font-mono text-gray-300">
                <p><span className="text-gray-500">Expected Score =</span> 1 / (1 + 10<sup>(opponent - you) / 400</sup>)</p>
                <p><span className="text-gray-500">New Rating =</span> Old + 32 x (result - expected)</p>
                <p className="text-gray-500 pt-1">result: 1 = win, 0 = loss</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-xs space-y-1">
                <p className="text-gray-400"><span className="text-green-400 font-bold">Example:</span> You (1200) beat someone at 1400</p>
                <p className="text-gray-300">Expected win chance: ~24%. You gain <span className="text-green-400 font-bold">+24 pts</span></p>
                <p className="text-gray-400 mt-1"><span className="text-red-400 font-bold">Example:</span> You (1400) lose to someone at 1200</p>
                <p className="text-gray-300">Expected win chance: ~76%. You lose <span className="text-red-400 font-bold">-24 pts</span></p>
              </div>
            </div>
          </div>

          {/* Doubles */}
          <div className="bg-black/30 rounded-lg p-3 border border-white/5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Doubles Matches</h4>
            <p className="text-xs text-gray-300">In doubles, the <span className="text-white font-bold">average ELO</span> of each team is used for the calculation. Both teammates gain/lose the same amount. Doubles has a separate rating from singles.</p>
          </div>

          {/* Rank Tiers */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rank Tiers</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RANKS.map((rank, i) => {
                const nextThreshold = RANKS[i + 1]?.threshold;
                return (
                  <div key={rank.name} className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                    <div className={`text-sm font-display font-bold ${rank.color}`}>{rank.name}</div>
                    <div className="text-[10px] font-mono text-gray-500 mt-1">
                      {rank.threshold}{nextThreshold ? ` - ${nextThreshold - 1}` : '+'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Deleting a match reverses ELO changes but resets streak to 0 (exact streak reconstruction is not possible). Win streaks are tracked as consecutive wins/losses.
          </p>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-widest font-mono">
                <th className="p-4 text-center w-16">#</th>
                <th className="p-4">Player</th>
                <th className="p-4 text-right">Rating</th>
                <th className="p-4 text-center hidden md:table-cell">W/L</th>
                <th className="p-4 text-center hidden sm:table-cell">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPlayers.map((player, index) => {
                const elo = type === 'singles' ? player.eloSingles : player.eloDoubles;
                const delta = getLastDelta(player.id);
                return (
                  <tr key={player.id} className={`hover:bg-white/5 transition-colors group ${onPlayerClick ? 'cursor-pointer' : ''}`} onClick={() => onPlayerClick?.(player.id)}>
                    <td className="p-4 text-center font-mono text-gray-500 font-bold text-lg group-hover:text-cyber-cyan">
                      {index + 1}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-10 h-10 rounded-full border border-white/20"
                        />
                        <div>
                          <div className="font-bold text-white tracking-wide">{player.name}</div>
                          <RankBadge elo={elo} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-xl font-bold text-cyber-cyan neon-text-cyan">
                        {elo}
                      </span>
                      {delta !== null && (
                        <span className={`ml-2 text-xs font-mono font-bold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center hidden md:table-cell text-sm text-gray-400 font-mono">
                      <span className="text-green-400">{player.wins}</span> - <span className="text-red-400">{player.losses}</span>
                    </td>
                    <td className="p-4 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1 font-mono text-xs font-bold">
                        {player.streak > 0 ? (
                          <span className="flex items-center text-green-400">
                            <TrendingUp size={14} className="mr-1" /> {player.streak}W
                          </span>
                        ) : player.streak < 0 ? (
                          <span className="flex items-center text-red-400">
                            <TrendingDown size={14} className="mr-1" /> {Math.abs(player.streak)}L
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-500">
                            <Minus size={14} className="mr-1" /> -
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
