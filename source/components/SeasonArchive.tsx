import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Season, SeasonStanding, Match, Player } from '../types';
import { Trophy, Crown, Medal, ChevronDown, ChevronUp, Archive, Loader } from 'lucide-react';
import MatchHistory from './MatchHistory';
import { getSeasonMatches } from '../services/storageService';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { shortName } from '../utils/playerRanking';
import { thumbUrl } from '../utils/imageUtils';

interface SeasonArchiveProps {
  seasons: Season[];
  players: Player[];
  onPlayerClick?: (playerId: string) => void;
}

type SeasonTab = 'standings' | 'stats' | 'history';
type StandingsType = 'singles' | 'doubles';

interface PlayerSeasonStats {
  singlesWins: number;
  singlesLosses: number;
  doublesWins: number;
  doublesLosses: number;
}

interface SeasonStats {
  singlesCount: number;
  doublesCount: number;
  playerStats: Map<string, PlayerSeasonStats>;
  seasonMatches: Match[];
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

function buildSeasonStats(seasonMatches: Match[]): SeasonStats {
  const singles = seasonMatches.filter(m => m.type === 'singles');
  const doubles = seasonMatches.filter(m => m.type === 'doubles');

  const playerStats = new Map<string, PlayerSeasonStats>();
  const ensurePlayer = (id: string) => {
    if (!playerStats.has(id)) {
      playerStats.set(id, { singlesWins: 0, singlesLosses: 0, doublesWins: 0, doublesLosses: 0 });
    }
    return playerStats.get(id)!;
  };

  singles.forEach(m => {
    m.winners.forEach(id => { ensurePlayer(id).singlesWins++; });
    m.losers.forEach(id => { ensurePlayer(id).singlesLosses++; });
  });
  doubles.forEach(m => {
    m.winners.forEach(id => { ensurePlayer(id).doublesWins++; });
    m.losers.forEach(id => { ensurePlayer(id).doublesLosses++; });
  });

  return { singlesCount: singles.length, doublesCount: doubles.length, playerStats, seasonMatches };
}

const SeasonArchive: React.FC<SeasonArchiveProps> = ({ seasons, players, onPlayerClick }) => {
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [seasonTabState, setSeasonTabState] = useState<Record<string, SeasonTab>>({});
  const [seasonStatsMap, setSeasonStatsMap] = useState<Map<string, SeasonStats>>(new Map());
  const [loadingSeasons, setLoadingSeasons] = useState<Set<string>>(new Set());

  const completedSeasons = useMemo(
    () => seasons.filter(s => s.status === 'completed').sort((a, b) => b.number - a.number),
    [seasons]
  );

  const fetchSeasonMatches = useCallback(async (seasonId: string) => {
    if (seasonStatsMap.has(seasonId) || loadingSeasons.has(seasonId)) return;
    setLoadingSeasons(prev => new Set(prev).add(seasonId));
    try {
      const matches = await getSeasonMatches(seasonId);
      setSeasonStatsMap(prev => new Map(prev).set(seasonId, buildSeasonStats(matches)));
    } catch (err) {
      console.error('Failed to load season matches:', err);
      // Set empty stats so we don't retry on every render
      setSeasonStatsMap(prev => new Map(prev).set(seasonId, buildSeasonStats([])));
    } finally {
      setLoadingSeasons(prev => { const s = new Set(prev); s.delete(seasonId); return s; });
    }
  }, [seasonStatsMap, loadingSeasons]);

  const handleExpand = (seasonId: string) => {
    const newExpanded = expandedSeasonId === seasonId ? null : seasonId;
    setExpandedSeasonId(newExpanded);
    if (newExpanded) fetchSeasonMatches(newExpanded);
  };

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getSeasonTab = (seasonId: string): SeasonTab => seasonTabState[seasonId] ?? 'standings';
  const setSeasonTab = (seasonId: string, tab: SeasonTab) => {
    setSeasonTabState(prev => ({ ...prev, [seasonId]: tab }));
  };

  if (completedSeasons.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-display font-bold text-white border-l-4 border-cyber-purple pl-3">
          SEASON <span className="text-cyber-purple">ARCHIVE</span>
        </h3>
        <Archive size={18} className="text-cyber-purple" />
      </div>

      {/* Season cards */}
      <div className="space-y-3">
        {completedSeasons.map(season => {
          const isExpanded = expandedSeasonId === season.id;
          const champion = season.championId ? getPlayer(season.championId) : null;
          const stats = seasonStatsMap.get(season.id);
          const isLoading = loadingSeasons.has(season.id);
          const activeTab = getSeasonTab(season.id);

          return (
            <Card key={season.id} className="overflow-hidden">
              {/* Season header */}
              <button
                onClick={() => handleExpand(season.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-mono font-bold text-gray-600">#{season.number}</div>
                  <div>
                    <div className="font-bold text-white text-sm">{season.name}</div>
                    <div className="text-[10px] font-mono text-gray-500">
                      {formatDate(season.startedAt)}
                      {season.endedAt && ` — ${formatDate(season.endedAt)}`}
                      <span className="text-gray-600 mx-1">•</span>
                      {season.matchCount} matches
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {champion && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                      <Crown size={12} className="text-yellow-400" />
                      <img
                        src={thumbUrl(champion.avatar, 40)}
                        alt={champion.name}
                        className="w-5 h-5 rounded-full border border-yellow-500/40"
                        loading="lazy"
                      />
                      <span className="text-xs font-bold text-yellow-400">{shortName(champion.name)}</span>
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-white/5 animate-slideUp">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                      <Loader size={16} className="animate-spin" />
                      <span className="text-sm font-mono">Loading season data…</span>
                    </div>
                  ) : (
                    <>
                      {/* Tab bar */}
                      <div className="flex gap-1 px-4 pt-3 border-b border-white/5">
                        {(['standings', 'stats', 'history'] as const).map(tab => (
                          <Button
                            key={tab}
                            size="sm"
                            variant="ghost"
                            className={`rounded-none rounded-t font-mono uppercase tracking-widest text-[10px] ${
                              activeTab === tab
                                ? 'bg-white/10 text-white border-b-2 border-cyber-cyan'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                            onClick={() => setSeasonTab(season.id, tab)}
                          >
                            {tab}
                          </Button>
                        ))}
                      </div>

                      <div className="p-4">
                        {activeTab === 'standings' && (
                          <StandingsTab season={season} stats={stats} getPlayer={getPlayer} />
                        )}
                        {activeTab === 'stats' && stats && (
                          <StatsTab season={season} stats={stats} getPlayer={getPlayer} />
                        )}
                        {activeTab === 'stats' && !stats && (
                          <p className="text-gray-500 text-sm text-center py-6 italic">No match data for this season.</p>
                        )}
                        {activeTab === 'history' && stats && (
                          <MatchHistory
                            matches={stats.seasonMatches}
                            players={players}
                            onPlayerClick={onPlayerClick ?? (() => {})}
                          />
                        )}
                        {activeTab === 'history' && !stats && (
                          <p className="text-gray-500 text-sm text-center py-6 italic">No match data for this season.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- Standings Tab ---------- */
interface StandingsTabProps {
  season: Season;
  stats: SeasonStats | undefined;
  getPlayer: (id: string) => Player | undefined;
}

const StandingsTab: React.FC<StandingsTabProps> = ({ season, stats, getPlayer }) => {
  const [type, setType] = useState<StandingsType>('singles');

  // Build standings sorted by the selected ELO type, enriched with per-type W/L from match data
  const rows = useMemo(() => {
    return [...season.finalStandings]
      .sort((a, b) =>
        type === 'singles' ? b.eloSingles - a.eloSingles : b.eloDoubles - a.eloDoubles
      )
      .map((s, idx) => {
        const ps = stats?.playerStats.get(s.playerId);
        return {
          ...s,
          computedRank: idx + 1,
          singlesWins: ps?.singlesWins ?? 0,
          singlesLosses: ps?.singlesLosses ?? 0,
          doublesWins: ps?.doublesWins ?? 0,
          doublesLosses: ps?.doublesLosses ?? 0,
        };
      });
  }, [season.finalStandings, type, stats]);

  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm text-center py-6 italic">No standings recorded for this season.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Singles / Doubles toggle */}
      <div className="flex gap-1">
        {(['singles', 'doubles'] as const).map(t => (
          <Button
            key={t}
            size="sm"
            variant={type === t ? (t === 'singles' ? 'cyber' : 'cyber-pink') : 'ghost'}
            className={type === t ? '' : 'border border-white/10'}
            onClick={() => setType(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-widest font-mono">
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3">Player</th>
              <th className="p-3 text-right">{type === 'singles' ? 'Singles ELO' : 'Doubles ELO'}</th>
              <th className="p-3 text-center">W/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((standing: typeof rows[0]) => {
              const player = getPlayer(standing.playerId);
              const isChampion = standing.playerId === season.championId && type === 'singles';
              const rank = standing.computedRank;
              const wins = type === 'singles' ? standing.singlesWins : standing.doublesWins;
              const losses = type === 'singles' ? standing.singlesLosses : standing.doublesLosses;
              const elo = type === 'singles' ? standing.eloSingles : standing.eloDoubles;
              const eloColor = isChampion ? 'text-yellow-400' : type === 'singles' ? 'text-cyber-cyan' : 'text-cyber-pink';

              return (
                <tr
                  key={standing.playerId}
                  className={`transition-colors ${isChampion ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-white/5'}`}
                >
                  <td className="p-3 text-center">
                    {isChampion ? (
                      <Crown size={14} className="text-yellow-400 mx-auto" />
                    ) : rank === 1 ? (
                      <Crown size={14} className={`mx-auto ${type === 'singles' ? 'text-cyber-cyan' : 'text-cyber-pink'}`} />
                    ) : rank <= 3 ? (
                      <Medal
                        size={14}
                        className={`mx-auto ${rank === 2 ? 'text-gray-300' : 'text-amber-700'}`}
                      />
                    ) : (
                      <span className="font-mono text-gray-500 text-sm font-bold">{rank}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {player && (
                        <img
                          src={thumbUrl(player.avatar, 56)}
                          alt={standing.playerName}
                          className={`w-7 h-7 rounded-full border ${isChampion ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)]' : 'border-white/20'}`}
                          loading="lazy"
                        />
                      )}
                      <span className={`font-bold text-sm ${isChampion ? 'text-yellow-400' : 'text-white'}`}>
                        {standing.playerName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-mono font-bold ${eloColor}`}>{elo}</span>
                  </td>
                  <td className="p-3 text-center font-mono text-xs">
                    {wins + losses > 0 ? (
                      <>
                        <span className="text-green-400">{wins}</span>
                        <span className="text-gray-600 mx-0.5">-</span>
                        <span className="text-red-400">{losses}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-green-400">{standing.wins}</span>
                        <span className="text-gray-600 mx-0.5">-</span>
                        <span className="text-red-400">{standing.losses}</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------- Stats Tab ---------- */
interface StatsTabProps {
  season: Season;
  stats: SeasonStats;
  getPlayer: (id: string) => Player | undefined;
}

const StatsTab: React.FC<StatsTabProps> = ({ season, stats, getPlayer }) => {
  const { singlesCount, doublesCount, playerStats } = stats;
  const total = singlesCount + doublesCount;

  const sortedPlayers = useMemo(() => {
    return Array.from(playerStats.entries())
      .map(([playerId, s]) => ({
        playerId,
        ...s,
        totalMatches: s.singlesWins + s.singlesLosses + s.doublesWins + s.doublesLosses,
        totalWins: s.singlesWins + s.doublesWins,
      }))
      .sort((a, b) => b.totalMatches - a.totalMatches);
  }, [playerStats]);

  const mostWins = sortedPlayers.length > 0
    ? sortedPlayers.reduce((best, p) => p.totalWins > best.totalWins ? p : best, sortedPlayers[0])
    : null;

  const highestElo = season.finalStandings.length > 0
    ? season.finalStandings.reduce((best, s) => s.eloSingles > best.eloSingles ? s : best, season.finalStandings[0])
    : null;

  const bestWinRate = sortedPlayers
    .filter(p => p.totalMatches >= 3)
    .reduce<typeof sortedPlayers[0] | null>((best, p) => {
      const rate = p.totalWins / p.totalMatches;
      if (!best) return p;
      return rate > best.totalWins / best.totalMatches ? p : best;
    }, null);

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Matches', value: total, color: 'text-white' },
          { label: 'Singles', value: singlesCount, color: 'text-cyber-cyan' },
          { label: 'Doubles', value: doublesCount, color: 'text-cyber-pink' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-3 text-center">
            <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Notable records */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Most Wins',
            playerId: mostWins?.playerId,
            value: mostWins ? `${mostWins.totalWins} wins` : null,
            Icon: Trophy,
            color: 'text-cyber-yellow',
          },
          {
            label: 'Highest Singles ELO',
            playerId: highestElo?.playerId,
            value: highestElo ? `${highestElo.eloSingles} ELO` : null,
            Icon: Crown,
            color: 'text-cyber-cyan',
          },
          {
            label: 'Best Win Rate',
            playerId: bestWinRate?.playerId,
            value: bestWinRate
              ? `${Math.round((bestWinRate.totalWins / bestWinRate.totalMatches) * 100)}%`
              : null,
            Icon: Medal,
            color: 'text-cyber-purple',
          },
        ].map(({ label, playerId, value, Icon, color }) => {
          const player = playerId ? getPlayer(playerId) : null;
          return (
            <Card key={label} className="p-3 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{label}</div>
                {player && value ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <img src={thumbUrl(player.avatar, 40)} alt={player.name} className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" loading="lazy" />
                    <span className={`font-bold text-sm truncate ${color}`}>{shortName(player.name)}</span>
                    <span className="text-xs font-mono text-gray-400 flex-shrink-0">{value}</span>
                  </div>
                ) : (
                  <span className="text-gray-600 text-xs font-mono">—</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Per-player breakdown table */}
      {sortedPlayers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-widest font-mono">
                <th className="p-3">Player</th>
                <th className="p-3 text-center">
                  <span className="text-cyber-cyan">Singles</span>
                </th>
                <th className="p-3 text-center hidden sm:table-cell">
                  <span className="text-cyber-pink">Doubles</span>
                </th>
                <th className="p-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedPlayers.map(({ playerId, singlesWins, singlesLosses, doublesWins, doublesLosses, totalMatches }) => {
                const player = getPlayer(playerId);
                const singlesTotal = singlesWins + singlesLosses;
                const doublesTotal = doublesWins + doublesLosses;
                const singlesWinRate = singlesTotal > 0 ? Math.round((singlesWins / singlesTotal) * 100) : null;
                const doublesWinRate = doublesTotal > 0 ? Math.round((doublesWins / doublesTotal) * 100) : null;
                return (
                  <tr key={playerId} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {player && (
                          <img src={thumbUrl(player.avatar, 48)} alt={player.name} className="w-6 h-6 rounded-full border border-white/20" loading="lazy" />
                        )}
                        <span className="font-bold text-sm text-white">{shortName(player?.name ?? 'Unknown')}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-xs">
                      {singlesTotal > 0 ? (
                        <>
                          <span className="text-green-400">{singlesWins}</span>
                          <span className="text-gray-600 mx-0.5">-</span>
                          <span className="text-red-400">{singlesLosses}</span>
                          {singlesWinRate !== null && (
                            <span className="text-gray-500 ml-1">({singlesWinRate}%)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-xs hidden sm:table-cell">
                      {doublesTotal > 0 ? (
                        <>
                          <span className="text-green-400">{doublesWins}</span>
                          <span className="text-gray-600 mx-0.5">-</span>
                          <span className="text-red-400">{doublesLosses}</span>
                          {doublesWinRate !== null && (
                            <span className="text-gray-500 ml-1">({doublesWinRate}%)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-sm font-bold text-white">
                      {totalMatches}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-6 italic">No match data available for this season.</p>
      )}
    </div>
  );
};

export default SeasonArchive;
