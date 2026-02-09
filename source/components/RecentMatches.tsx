import React, { useState } from 'react';
import { Match, Player } from '../types';
import { Trash2, ChevronDown } from 'lucide-react';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

interface RecentMatchesProps {
  matches: Match[];
  players: Player[];
  onDeleteMatch?: (matchId: string) => void;
}

const PAGE_SIZE = 15;

const RecentMatches: React.FC<RecentMatchesProps> = ({ matches, players, onDeleteMatch }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const handleDelete = (matchId: string) => {
    if (onDeleteMatch && window.confirm('Delete this match and reverse ELO changes?')) {
      onDeleteMatch(matchId);
    }
  };

  const visibleMatches = matches.slice(0, visibleCount);
  const hasMore = matches.length > visibleCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white border-l-4 border-cyber-pink pl-3">
          RECENT <span className="text-cyber-pink">ACTIVITY</span>
        </h3>
        <span className="text-xs text-gray-500 font-mono">{matches.length} total</span>
      </div>

      <div className="grid gap-3">
        {visibleMatches.map(match => (
          <div key={match.id} className="glass-panel p-4 rounded-lg flex items-center justify-between border-l-2 border-l-cyber-cyan hover:translate-x-1 transition-transform group">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${match.type === 'singles' ? 'bg-cyber-cyan' : 'bg-cyber-pink'}`}></span>
                {match.type} &bull; {timeAgo(match.timestamp)}
              </span>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <span className="font-bold text-white">
                  {match.winners.map(id => getPlayerName(id)).join(' & ')}
                </span>
                <span className="text-cyber-cyan font-mono font-bold mx-1">
                   {match.scoreWinner} - {match.scoreLoser}
                </span>
                <span className="text-gray-400">
                  {match.losers.map(id => getPlayerName(id)).join(' & ')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block bg-cyber-cyan/10 text-cyber-cyan text-xs font-mono font-bold px-2 py-1 rounded border border-cyber-cyan/30">
                +{match.eloChange}
              </span>
              {onDeleteMatch && (
                <button
                  onClick={() => handleDelete(match.id)}
                  className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete match & reverse ELO"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {matches.length === 0 && (
          <div className="text-gray-500 text-center py-8 italic border border-dashed border-white/10 rounded-lg">
            No recent activity.<br/>Log a match to start the feed.
          </div>
        )}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          className="w-full py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2 font-bold"
        >
          <ChevronDown size={16} /> Show More ({matches.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
};

export default RecentMatches;
