import React, { useState, useMemo } from 'react';
import { Player, Match, GameType, League, EloHistoryEntry } from '../types';
import RankBadge from './RankBadge';
import { Info, Target } from 'lucide-react';
import { RANKS } from '../constants';
import { getPlayerStats } from '../utils/gameTypeStats';
import { partitionPlayers, sortRankedPlayers, sortUnrankedPlayers, shortName } from '../utils/playerRanking';
import { thumbUrl } from '../utils/imageUtils';
import { computeSoS, getSoSColor } from '../utils/sosUtils';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useLeague } from '../context/LeagueContext';

interface LeaderboardProps {
  players: Player[];
  matches: Match[];
  history?: EloHistoryEntry[];
  onPlayerClick?: (playerId: string) => void;
  activeLeagueId?: string | null;
  leagues?: League[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players, matches, history = [], onPlayerClick, activeLeagueId, leagues = [] }) => {
  const [type, setType] = useState<GameType>('singles');
  const [showInfo, setShowInfo] = useState(false);
  const { eloConfig } = useLeague();

  const kFactor = eloConfig?.kFactor ?? 32;
  const initialElo = eloConfig?.initialElo ?? 1200;
  const dFactor = eloConfig?.dFactor ?? 200;
  const formulaPreset = eloConfig?.formulaPreset ?? 'standard';

  // Filter players by league if active (memoized)
  const filteredPlayers = useMemo(() => 
    activeLeagueId
      ? players.filter(p => p.leagueId === activeLeagueId)
      : players,
    [players, activeLeagueId]
  );

  const activeLeague = activeLeagueId ? leagues.find(l => l.id === activeLeagueId) : null;

  // Partition players into ranked and unranked, then sort each group (memoized)
  const { sortedRanked, sortedUnranked } = useMemo(() => {
    const { ranked, unranked } = partitionPlayers(filteredPlayers, type);
    return {
      sortedRanked: sortRankedPlayers(ranked, type),
      sortedUnranked: sortUnrankedPlayers(unranked)
    };
  }, [filteredPlayers, type]);

  // Compute Strength of Schedule using historical Elo and league scoping
  const sosMap = useMemo(() => {
    const raw = computeSoS(players, filteredPlayers, matches, history, type, activeLeagueId);
    const map = new Map<string, number | null>();
    for (const [id, result] of raw) {
      map.set(id, result.sos);
    }
    return map;
  }, [players, filteredPlayers, matches, history, type, activeLeagueId]);


  // Find last ELO delta for each player from the most recent match they were in (memoized)
  const getLastDelta = useMemo(() => {
    const sortedMatchesByType = [...matches]
      .filter(m => m.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (playerId: string): number | null => {
      const lastMatch = sortedMatchesByType.find(
        m => m.winners.includes(playerId) || m.losers.includes(playerId)
      );
      if (!lastMatch) return null;
      return lastMatch.winners.includes(playerId) ? lastMatch.eloChange : -lastMatch.eloChange;
    };
  }, [matches, type]);

  return (
    <Card className="p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-bold text-white tracking-widest uppercase">
            {activeLeague ? activeLeague.name.toUpperCase() : 'GLOBAL'}{' '}
            <span className="text-cyber-cyan">RANKINGS</span>
          </span>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1 rounded-md border transition-all ${
              showInfo
                ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan'
                : 'border-white/10 text-gray-600 hover:text-gray-300 hover:border-white/25'
            }`}
            title="How ELO & Ranking Works"
          >
            <Info size={12} />
          </button>
        </div>
        <Tabs value={type} onValueChange={(v) => setType(v as GameType)}>
          <TabsList>
            <TabsTrigger value="singles">Singles</TabsTrigger>
            <TabsTrigger value="doubles">Doubles</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ELO Info Panel */}
      {showInfo && (
        <div className="mb-4 bg-black/30 border border-cyber-cyan/20 rounded-xl p-4 space-y-3 animate-fade-in text-xs">
          <h3 className="text-xs font-display font-bold text-cyber-cyan tracking-widest uppercase">How Ranking Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">ELO System</p>
              <p className="text-gray-300 leading-relaxed">
                Start at <span className="text-cyber-cyan font-mono font-bold">{initialElo}</span>.{' '}
                Points transfer from loser to winner. K-factor: <span className="font-mono font-bold text-white">{kFactor}</span>.{' '}
                Singles &amp; doubles rated separately.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                Formula
                {formulaPreset !== 'standard' && (
                  <span className="ml-1.5 text-cyber-yellow normal-case tracking-normal font-normal">
                    ({formulaPreset === 'score_weighted' ? 'score-weighted' : 'custom'})
                  </span>
                )}
              </p>
              <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 font-mono text-gray-300 space-y-1">
                {formulaPreset === 'custom' && eloConfig?.customFormula ? (
                  <p className="text-[10px] break-all text-gray-400">{eloConfig.customFormula}</p>
                ) : (
                  <>
                    <p><span className="text-gray-500">Expected =</span> 1 / (1 + 10<sup>(opp−you)/{dFactor}</sup>)</p>
                    {formulaPreset === 'score_weighted' ? (
                      <p><span className="text-gray-500">New =</span> Old + {kFactor} × <span className="text-cyber-yellow">(1 + score_margin)</span> × (result − expected)</p>
                    ) : (
                      <p><span className="text-gray-500">New =</span> Old + {kFactor} × (result − expected)</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1.5 flex items-center gap-1">
              <Target size={10} className="text-cyber-yellow" /> Strength of Schedule
            </p>
            <p className="text-gray-300">Average ELO of your opponents, coloured relative to your own rating.</p>
            <div className="mt-1.5 flex gap-3 font-mono text-[10px]">
              <span className="text-green-400">● Near/above your ELO</span>
              <span className="text-yellow-400">● Moderately below</span>
              <span className="text-orange-400">● Well below</span>
            </div>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">Rank Tiers</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {RANKS.map((rank, i) => {
                const next = RANKS[i + 1]?.threshold;
                return (
                  <div key={rank.name} className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
                    <div className={`text-xs font-display font-bold ${rank.color}`}>{rank.name}</div>
                    <div className="text-[9px] font-mono text-gray-600 mt-0.5">{rank.threshold}{next ? `–${next - 1}` : '+'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ranked rows */}
      <div className="space-y-0.5">
        {sortedRanked.map((player, index) => {
          const elo = type === 'singles' ? player.eloSingles : player.eloDoubles;
          const delta = getLastDelta(player.id);
          const stats = getPlayerStats(player, type);
          const sos = sosMap.get(player.id);
          const isTop = index === 0;
          return (
            <div
              key={player.id}
              onClick={() => onPlayerClick?.(player.id)}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg border transition-colors ${
                onPlayerClick ? 'cursor-pointer hover:bg-white/[0.05]' : ''
              } ${isTop ? 'bg-cyber-cyan/[0.04] border-cyber-cyan/10' : 'border-transparent'}`}
            >
              {/* Position */}
              <span className={`w-5 text-center text-[11px] font-mono font-bold flex-shrink-0 ${
                isTop ? 'text-cyber-cyan' : index < 3 ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {index + 1}
              </span>

              {/* Avatar */}
              <Avatar className="w-8 h-8 ring-1 ring-white/10 flex-shrink-0">
                <AvatarImage src={thumbUrl(player.avatar, 64)} alt={player.name} />
                <AvatarFallback className="text-[10px]">{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>

              {/* Name + sub-chips */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span className="font-bold text-white text-sm leading-tight truncate">{shortName(player.name)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <RankBadge elo={elo} />
                  {stats.streak !== 0 && (
                    <span className={`text-[10px] font-mono font-bold ${stats.streak > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.streak > 0 ? `↑${stats.streak}` : `↓${Math.abs(stats.streak)}`}
                    </span>
                  )}
                  {sos !== null && sos !== undefined && (
                    <span className={`text-[10px] font-mono hidden sm:inline ${getSoSColor(sos, elo)}`} title={`Avg opponent ELO: ${sos}`}>
                      SoS {sos}
                    </span>
                  )}
                </div>
              </div>

              {/* ELO + delta */}
              <div className="flex flex-col items-end flex-shrink-0">
                <span className={`font-mono text-base font-bold leading-tight ${isTop ? 'text-cyber-cyan neon-text-cyan' : 'text-cyber-cyan'}`}>
                  {elo}
                </span>
                {delta !== null && (
                  <span className={`text-[10px] font-mono font-bold leading-tight ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unranked */}
      {sortedUnranked.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2">Unranked — No Games Played</p>
          <div className="space-y-0.5">
            {sortedUnranked.map((player) => {
              const elo = type === 'singles' ? player.eloSingles : player.eloDoubles;
              return (
                <div
                  key={player.id}
                  onClick={() => onPlayerClick?.(player.id)}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${
                    onPlayerClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''
                  }`}
                >
                  <span className="w-5 text-center text-[11px] font-mono text-gray-700 flex-shrink-0">—</span>
                  <Avatar className="w-7 h-7 ring-1 ring-white/5 flex-shrink-0 opacity-50">
                    <AvatarImage src={thumbUrl(player.avatar, 64)} alt={player.name} />
                    <AvatarFallback className="text-[10px]">{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-500 text-sm truncate block">{shortName(player.name)}</span>
                    <RankBadge elo={elo} />
                  </div>
                  <span className="font-mono text-sm font-bold text-gray-700 flex-shrink-0">{elo}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default Leaderboard;
