import React, { useState, useEffect } from 'react';
import { Match, Player } from '../types';
import { Trash2, ChevronDown, Pencil, Check, X, ArrowLeftRight } from 'lucide-react';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const isWithin60s = (timestamp: string) => Date.now() - new Date(timestamp).getTime() < 60000;

interface RecentMatchesProps {
  matches: Match[];
  players: Player[];
  isAdmin?: boolean;
  currentUserUid?: string;
  onDeleteMatch?: (matchId: string) => void;
  onEditMatch?: (matchId: string, data: { winners: string[]; losers: string[]; scoreWinner: number; scoreLoser: number }) => void;
}

const PAGE_SIZE = 15;

const RecentMatches: React.FC<RecentMatchesProps> = ({ matches, players, isAdmin, currentUserUid, onDeleteMatch, onEditMatch }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore1, setEditScore1] = useState('');
  const [editScore2, setEditScore2] = useState('');
  const [editWinners, setEditWinners] = useState<string[]>([]);
  const [editLosers, setEditLosers] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  // Force re-render every 10s so the 60s window buttons appear/disappear correctly
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const canModify = (match: Match) => {
    if (isAdmin) return true;
    if (match.loggedBy && match.loggedBy === currentUserUid && isWithin60s(match.timestamp)) return true;
    return false;
  };

  const handleDelete = (matchId: string) => {
    if (onDeleteMatch && window.confirm('Delete this match and reverse ELO changes?')) {
      onDeleteMatch(matchId);
    }
  };

  const startEdit = (match: Match) => {
    setEditingId(match.id);
    setEditScore1(match.scoreWinner.toString());
    setEditScore2(match.scoreLoser.toString());
    setEditWinners([...match.winners]);
    setEditLosers([...match.losers]);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSwapTeams = () => {
    const tmpW = [...editWinners];
    setEditWinners([...editLosers]);
    setEditLosers(tmpW);
  };

  const submitEdit = () => {
    if (!onEditMatch || !editingId) return;

    const s1 = parseInt(editScore1);
    const s2 = parseInt(editScore2);

    if (isNaN(s1) || isNaN(s2)) { setEditError('Scores must be numbers'); return; }
    if (s1 === s2) { setEditError('Draws are not allowed'); return; }
    if (Math.abs(s1 - s2) < 2) { setEditError('Must win by at least 2 points'); return; }
    if (s1 < 11 && s2 < 11) { setEditError('Minimum winning score is 11'); return; }

    const winners = s1 > s2 ? editWinners : editLosers;
    const losers = s1 > s2 ? editLosers : editWinners;
    const scoreWinner = Math.max(s1, s2);
    const scoreLoser = Math.min(s1, s2);

    onEditMatch(editingId, { winners, losers, scoreWinner, scoreLoser });
    setEditingId(null);
    setEditError(null);
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
        {visibleMatches.map(match => {
          const isEditing = editingId === match.id;
          const showActions = canModify(match);

          if (isEditing) {
            return (
              <div key={match.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-cyber-yellow space-y-3">
                <span className="text-[10px] font-mono text-cyber-yellow uppercase tracking-widest font-bold">Editing Match</span>

                {/* Team display with swap */}
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 1</div>
                    <span className="font-bold text-white">{editWinners.map(id => getPlayerName(id)).join(' & ')}</span>
                  </div>
                  <button
                    onClick={handleSwapTeams}
                    className="p-1.5 text-gray-400 hover:text-cyber-cyan hover:bg-white/5 rounded transition-colors"
                    title="Swap teams"
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 2</div>
                    <span className="text-gray-400">{editLosers.map(id => getPlayerName(id)).join(' & ')}</span>
                  </div>
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-3 justify-center">
                  <input
                    type="number"
                    value={editScore1}
                    onChange={e => setEditScore1(e.target.value)}
                    className="w-16 bg-black/50 border border-white/20 text-white text-center p-2 rounded-lg font-mono text-lg focus:border-cyber-cyan outline-none"
                    min="0"
                  />
                  <span className="text-gray-500 font-bold">-</span>
                  <input
                    type="number"
                    value={editScore2}
                    onChange={e => setEditScore2(e.target.value)}
                    className="w-16 bg-black/50 border border-white/20 text-white text-center p-2 rounded-lg font-mono text-lg focus:border-cyber-cyan outline-none"
                    min="0"
                  />
                </div>

                {editError && <p className="text-red-400 text-xs font-mono text-center">{editError}</p>}

                {/* Action buttons */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors font-bold flex items-center gap-1"
                  >
                    <X size={12} /> Cancel
                  </button>
                  <button
                    onClick={submitEdit}
                    className="px-3 py-1.5 text-xs text-black bg-cyber-cyan hover:bg-white rounded-lg transition-colors font-bold flex items-center gap-1"
                  >
                    <Check size={12} /> Save
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={match.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-cyber-cyan hover:translate-x-1 transition-transform group">
              <div className="flex items-center justify-between">
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
                  {showActions && onEditMatch && (
                    <button
                      onClick={() => startEdit(match)}
                      className="p-1.5 text-gray-600 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit match"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {showActions && onDeleteMatch && (
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
            </div>
          );
        })}
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
