import React from 'react';
import { SinglesSortBy, SortOrder } from '../../types';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface InsightsSortControlsProps {
  sortBy: SinglesSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SinglesSortBy) => void;
  onOrderChange: (order: SortOrder) => void;
}

const InsightsSortControls: React.FC<InsightsSortControlsProps> = ({
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => onSortChange('winsNeeded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'winsNeeded'
                  ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Wins Needed
            </button>
            <button
              onClick={() => onSortChange('opponentElo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'opponentElo'
                  ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Opponent ELO
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

export default InsightsSortControls;
