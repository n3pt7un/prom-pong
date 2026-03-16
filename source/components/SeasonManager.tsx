import React, { useState, useMemo } from 'react';
import { Player } from '../types';
import {
  Calendar,
  Trophy,
  Play,
  Square,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface SeasonStanding {
  playerId: string;
  playerName: string;
  rank: number;
  eloSingles: number;
  eloDoubles: number;
  wins: number;
  losses: number;
}

interface Season {
  id: string;
  name: string;
  number: number;
  status: 'active' | 'completed';
  startedAt: string;
  endedAt?: string;
  finalStandings: SeasonStanding[];
  matchCount: number;
  championId?: string;
}

interface SeasonManagerProps {
  seasons: Season[];
  players: Player[];
  currentSeason?: Season;
  isAdmin: boolean;
  onStartSeason: (name: string) => void;
  onEndSeason: () => void;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDuration = (startedAt: string): string => {
  const diff = Date.now() - new Date(startedAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''}`;
};

const SeasonManager: React.FC<SeasonManagerProps> = ({
  seasons,
  players,
  currentSeason,
  isAdmin,
  onStartSeason,
  onEndSeason,
}) => {
  const [newSeasonName, setNewSeasonName] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const completedSeasons = seasons
    .filter(s => s.status === 'completed')
    .sort((a, b) => b.number - a.number);

  const getPlayer = (id: string) => players.find(p => p.id === id);

  // Default name for new season
  const nextSeasonNumber = seasons.length > 0 ? Math.max(...seasons.map(s => s.number)) + 1 : 1;
  const defaultSeasonName = `Season ${nextSeasonNumber}`;

  const handleStartSeason = () => {
    const name = newSeasonName.trim() || defaultSeasonName;
    onStartSeason(name);
    setNewSeasonName('');
  };

  const handleEndSeason = () => {
    onEndSeason();
    setShowEndConfirm(false);
  };

  // Season comparison chart data: top players' ELO across completed seasons
  const comparisonData = useMemo(() => {
    if (completedSeasons.length < 2) return null;

    // Find players who appeared in at least 2 seasons
    const playerSeasonCount = new Map<string, number>();
    completedSeasons.forEach(s => {
      s.finalStandings.forEach(st => {
        playerSeasonCount.set(st.playerId, (playerSeasonCount.get(st.playerId) || 0) + 1);
      });
    });

    const recurringPlayerIds = Array.from(playerSeasonCount.entries())
      .filter(([, count]) => count >= 2)
      .map(([id]) => id);

    // Get top 5 by highest ELO in the most recent season
    const latestSeason = completedSeasons[0];
    const topPlayerIds = latestSeason.finalStandings
      .filter(st => recurringPlayerIds.includes(st.playerId))
      .sort((a, b) => b.eloSingles - a.eloSingles)
      .slice(0, 5)
      .map(st => st.playerId);

    if (topPlayerIds.length === 0) return null;

    // Build chart data (chronological order)
    const sortedSeasons = [...completedSeasons].reverse();
    const chartData = sortedSeasons.map(season => {
      const point: Record<string, string | number> = { season: season.name };
      topPlayerIds.forEach(pid => {
        const standing = season.finalStandings.find(st => st.playerId === pid);
        point[pid] = standing?.eloSingles ?? 0;
      });
      return point;
    });

    return { chartData, topPlayerIds };
  }, [completedSeasons]);

  const CHART_COLORS = ['#00f3ff', '#ff00ff', '#fcee0a', '#bc13fe', '#22c55e'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-display font-bold text-white border-l-4 border-cyber-purple pl-3">
          SEASON <span className="text-cyber-purple">MANAGER</span>
        </h2>
        <Calendar size={20} className="text-cyber-purple" />
      </div>

      {/* Current Season Banner */}
      {currentSeason && (
        <Card className="p-6 border-cyber-cyan/20 relative overflow-hidden">
          {/* Accent glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-green-500/30 uppercase tracking-widest">
                  Active
                </span>
                <span className="text-[10px] font-mono text-gray-500">
                  Season {currentSeason.number}
                </span>
              </div>
              <h3 className="text-xl font-display font-bold text-white">{currentSeason.name}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                <span>Started {formatDate(currentSeason.startedAt)}</span>
                <span className="text-gray-600">|</span>
                <span>Running for {formatDuration(currentSeason.startedAt)}</span>
                <span className="text-gray-600">|</span>
                <span>
                  <span className="text-white font-bold">{currentSeason.matchCount}</span> matches
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex-shrink-0">
                {!showEndConfirm ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setShowEndConfirm(true)}
                  >
                    <Square size={14} />
                    End Season
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <span className="text-xs text-red-400 font-bold">Are you sure?</span>
                    <Button variant="destructive" size="sm" onClick={handleEndSeason}>
                      Yes, end it
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowEndConfirm(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Start New Season (admin only, no active season) */}
      {isAdmin && !currentSeason && (
        <Card className="p-6 border border-dashed border-cyber-purple/40 space-y-4">
          <h3 className="text-sm font-display font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Play size={14} className="text-cyber-purple" />
            Start New Season
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newSeasonName}
              onChange={e => setNewSeasonName(e.target.value)}
              placeholder={defaultSeasonName}
              className="flex-1 bg-black/40 border border-white/10 text-white px-4 py-2.5 rounded-lg text-sm font-bold focus:border-cyber-purple outline-none transition-colors placeholder:text-gray-600"
            />
            <Button
              onClick={handleStartSeason}
              className="flex items-center gap-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 hover:shadow-[0_0_16px_rgba(188,19,254,0.25)]"
            >
              <Play size={14} />
              Start Season
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
            <span className="text-yellow-400/80 text-[10px]">⚠</span>
            <span className="text-yellow-400/80 text-[10px] font-mono">
              This will reset all ELO ratings and match history
            </span>
          </div>
        </Card>
      )}

      {/* Season Comparison Chart */}
      {comparisonData && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-display font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Trophy size={14} className="text-cyber-cyan" />
            ELO Progression Across Seasons
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="season"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 10 }}
                />
                <YAxis
                  stroke="#444"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#666', fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                {comparisonData.topPlayerIds.map((pid, i) => {
                  const player = getPlayer(pid);
                  return (
                    <Line
                      key={pid}
                      name={player?.name || pid}
                      type="monotone"
                      dataKey={pid}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {seasons.length === 0 && !currentSeason && (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <Calendar size={36} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 font-bold">No seasons yet</p>
          <p className="text-gray-600 text-xs mt-1">
            {isAdmin
              ? 'Start your first season above!'
              : 'Ask an admin to start the first season.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SeasonManager;
