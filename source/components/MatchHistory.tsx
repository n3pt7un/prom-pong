import React, { useState, useMemo } from 'react';
import { Match, Player } from '../types';
import { ChevronDown, Search, X } from 'lucide-react';

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
  onPlayerClick: (playerId: string) => void;
}

const PAGE_SIZE = 20;

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, players, onPlayerClick }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'singles' | 'doubles'>('all');

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const filtered = useMemo(() => {
    let result = [...matches].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (typeFilter !== 'all') {
      result = result.filter(m => m.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(m => {
        const allIds = [...m.winners, ...m.losers];
        return allIds.some(id => {
          const name = getPlayer(id)?.name?.toLowerCase() || '';
          return name.includes(q);
        });
      });
    }

    return result;
  }, [matches, typeFilter, search, players]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const PlayerChip: React.FC<{ id: string }> = ({ id }) => {
    const player = getPlayer(id);
    return (
      <button
        onClick={() => onPlayerClick(id)}
        className="font-bold text-white hover:text-cyber-cyan transition-colors underline-offset-2 hover:underline truncate max-w-[120px]"
        title={player?.name || 'Unknown'}
      >
        {player?.name || 'Unknown'}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-display font-bold text-white border-l-4 border-cyber-cyan pl-3">
          MATCH <span className="text-cyber-cyan">HISTORY</span>
        </h3>
        <span className="text-xs text-gray-500 font-mono">{filtered.length} matches</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by player name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="w-full bg-black/40 border border-white/10 text-white text-sm pl-8 pr-8 py-2 rounded-lg font-mono focus:border-cyber-cyan outline-none placeholder:text-gray-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'singles', 'doubles'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setVisibleCount(PAGE_SIZE); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
                typeFilter === t
                  ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="text-gray-500 text-center py-10 italic border border-dashed border-white/10 rounded-lg text-sm">
            No matches found.
          </div>
        )}

        {visible.map(match => {
          const isDoubles = match.type === 'doubles';
          return (
            <div
              key={match.id}
              className="glass-panel rounded-lg border-l-2 border-l-cyber-cyan px-4 py-3"
            >
              {/* Top row: meta info */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDoubles ? 'bg-cyber-pink' : 'bg-cyber-cyan'}`} />
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    {match.type}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    match.matchFormat === 'vintage21'
                      ? 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/30'
                      : 'bg-white/5 text-gray-500 border-white/10'
                  }`}>
                    {match.matchFormat === 'vintage21' ? 'V-21' : 'S-11'}
                  </span>
                  {match.isFriendly && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                      FRIENDLY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-right">
                  {!match.isFriendly && (
                    <span className="text-[10px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 border border-cyber-cyan/20 px-1.5 py-0.5 rounded">
                      +{match.eloChange} ELO
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-gray-600">
                    {formatDate(match.timestamp)} {formatTime(match.timestamp)}
                  </span>
                </div>
              </div>

              {/* Match result */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                {/* Winners */}
                <div className="flex flex-col gap-0.5">
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">Winner{match.winners.length > 1 ? 's' : ''}</div>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                    {match.winners.map((id, i) => (
                      <React.Fragment key={id}>
                        <PlayerChip id={id} />
                        {i < match.winners.length - 1 && <span className="text-gray-600 text-sm">&</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div className="text-center flex-shrink-0 px-2">
                  <span className="font-mono font-bold text-lg text-cyber-cyan">{match.scoreWinner}</span>
                  <span className="text-gray-600 mx-1 font-bold">–</span>
                  <span className="font-mono font-bold text-lg text-gray-500">{match.scoreLoser}</span>
                </div>

                {/* Losers */}
                <div className="flex flex-col gap-0.5 items-end text-right">
                  <div className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-0.5">Loser{match.losers.length > 1 ? 's' : ''}</div>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 justify-end">
                    {match.losers.map((id, i) => (
                      <React.Fragment key={id}>
                        <PlayerChip id={id} />
                        {i < match.losers.length - 1 && <span className="text-gray-600 text-sm">&</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          className="w-full py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-2 font-bold"
        >
          <ChevronDown size={16} /> Show More ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
};

export default MatchHistory;
