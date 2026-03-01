import React, { useState, useMemo } from 'react';
import { TeammateStatistics, TeammateSortBy, SortOrder } from '../../types';
import TeammateStatCard from './TeammateStatCard';
import TeammateSortControls from './TeammateSortControls';
import EmptyState from './EmptyState';
import InsufficientDataState from './InsufficientDataState';

interface DoublesTeammatePanelProps {
  stats: TeammateStatistics[];
}

const DoublesTeammatePanel: React.FC<DoublesTeammatePanelProps> = ({ stats }) => {
  const [sortBy, setSortBy] = useState<TeammateSortBy>('winRate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedStats = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'winRate') {
        compareValue = a.winRate - b.winRate;
      } else if (sortBy === 'matchesPlayed') {
        compareValue = a.matchesPlayed - b.matchesPlayed;
      } else if (sortBy === 'avgEloChange') {
        compareValue = a.avgEloChange - b.avgEloChange;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [stats, sortBy, sortOrder]);

  // Identify best and worst teammates (minimum 3 matches)
  const qualifiedStats = sortedStats.filter(s => s.matchesPlayed >= 3);
  const bestTeammate = qualifiedStats.length > 0 
    ? qualifiedStats.reduce((best, current) => 
        current.winRate > best.winRate ? current : best
      )
    : null;
  const worstTeammate = qualifiedStats.length > 0
    ? qualifiedStats.reduce((worst, current) => 
        current.winRate < worst.winRate ? current : worst
      )
    : null;

  if (stats.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No teammate data yet"
        message="Play some doubles matches to see your partnership statistics!"
        actionText="Find a partner and start playing"
      />
    );
  }

  const hasInsufficientData = qualifiedStats.length === 0;

  return (
    <div className="space-y-4">
      <TeammateSortControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortBy}
        onOrderChange={setSortOrder}
      />

      {hasInsufficientData && <InsufficientDataState />}

      {!hasInsufficientData && bestTeammate && worstTeammate && (
        <div className="glass-panel p-4 rounded-lg border border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Best Partner</div>
              <div className="text-lg font-bold text-green-400">{bestTeammate.teammateName}</div>
              <div className="text-sm text-gray-300">{bestTeammate.winRate}% win rate</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Needs Work</div>
              <div className="text-lg font-bold text-red-400">{worstTeammate.teammateName}</div>
              <div className="text-sm text-gray-300">{worstTeammate.winRate}% win rate</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedStats.map((stat) => (
          <TeammateStatCard
            key={stat.teammateId}
            stat={stat}
            isBest={bestTeammate?.teammateId === stat.teammateId}
            isWorst={worstTeammate?.teammateId === stat.teammateId}
          />
        ))}
      </div>
    </div>
  );
};

export default DoublesTeammatePanel;
