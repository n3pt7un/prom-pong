import React from 'react';
import { TeammateSortBy, SortOrder } from '../../types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TeammateSortControlsProps {
  sortBy: TeammateSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: TeammateSortBy) => void;
  onOrderChange: (order: SortOrder) => void;
}

const TeammateSortControls: React.FC<TeammateSortControlsProps> = ({
  sortBy,
  sortOrder,
  onSortChange,
  onOrderChange,
}) => {
  const toggleOrder = () => {
    onOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="glass-panel p-3 rounded-lg border border-white/5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Sort by:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onSortChange('winRate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'winRate'
                  ? 'bg-cyber-pink text-black shadow-neon-pink'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Win Rate
            </button>
            <button
              onClick={() => onSortChange('matchesPlayed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'matchesPlayed'
                  ? 'bg-cyber-pink text-black shadow-neon-pink'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Matches Played
            </button>
            <button
              onClick={() => onSortChange('avgEloChange')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'avgEloChange'
                  ? 'bg-cyber-pink text-black shadow-neon-pink'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Avg ELO Change
            </button>
          </div>
        </div>

        <button
          onClick={toggleOrder}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs font-bold"
          title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortOrder === 'asc' ? (
            <>
              <ArrowUp size={14} />
              <span>Low to High</span>
            </>
          ) : (
            <>
              <ArrowDown size={14} />
              <span>High to Low</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TeammateSortControls;
