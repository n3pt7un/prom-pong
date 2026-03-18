import React, { useState, useEffect } from 'react';
import { Match, Player, EloHistoryEntry } from '../types';
import { validateMatchScore } from '../utils/matchValidation';
import { shortName } from '../utils/playerRanking';
import { Trash2, ChevronDown, Pencil, Check, X, ArrowLeftRight, Flag } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import MatchDetailModal from './MatchDetailModal';
import { useHaptic } from '../context/HapticContext';

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
  history: EloHistoryEntry[];
  isAdmin?: boolean;
  currentUserUid?: string;
  currentPlayerIds?: string[];
  onDeleteMatch?: (matchId: string) => void;
  onEditMatch?: (matchId: string, data: { winners: string[]; losers: string[]; scoreWinner: number; scoreLoser: number }) => void;
  onRequestCorrection?: (matchId: string, data: {
    proposedWinners: string[];
    proposedLosers: string[];
    proposedScoreWinner: number;
    proposedScoreLoser: number;
    reason?: string;
  }) => void;
}

const PAGE_SIZE = 15;

const RecentMatches: React.FC<RecentMatchesProps> = ({ matches, players, history, isAdmin, currentUserUid, currentPlayerIds, onDeleteMatch, onEditMatch, onRequestCorrection }) => {
  const { trigger: hapticTrigger } = useHaptic();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore1, setEditScore1] = useState('');
  const [editScore2, setEditScore2] = useState('');
  const [editWinners, setEditWinners] = useState<string[]>([]);
  const [editLosers, setEditLosers] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [reqScore1, setReqScore1] = useState('');
  const [reqScore2, setReqScore2] = useState('');
  const [reqWinners, setReqWinners] = useState<string[]>([]);
  const [reqLosers, setReqLosers] = useState<string[]>([]);
  const [reqReason, setReqReason] = useState('');
  const [reqError, setReqError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  // Force re-render every 10s so the 60s window buttons appear/disappear correctly
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const getPlayerName = (id: string) => shortName(players.find(p => p.id === id)?.name || 'Unknown');

  const canModify = (match: Match) => {
    if (isAdmin) return true;
    if (match.loggedBy && match.loggedBy === currentUserUid && isWithin60s(match.timestamp)) return true;
    return false;
  };

  const handleDelete = (matchId: string) => {
    if (onDeleteMatch && window.confirm('Delete this match and reverse ELO changes?')) {
      hapticTrigger('buzz');
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

    const format = matches.find(m => m.id === editingId)?.matchFormat || 'vintage21';
    const error = validateMatchScore(s1, s2, format);
    if (error) { setEditError(error); return; }

    const winners = s1 > s2 ? editWinners : editLosers;
    const losers = s1 > s2 ? editLosers : editWinners;
    const scoreWinner = Math.max(s1, s2);
    const scoreLoser = Math.min(s1, s2);

    onEditMatch(editingId, { winners, losers, scoreWinner, scoreLoser });
    setEditingId(null);
    setEditError(null);
  };

  const canRequestCorrection = (match: Match) => {
    if (!currentPlayerIds || currentPlayerIds.length === 0) return false;
    if (isAdmin) return false;
    if (canModify(match)) return false;
    return currentPlayerIds.some(pid => match.winners.includes(pid) || match.losers.includes(pid));
  };

  const startRequest = (match: Match) => {
    setRequestingId(match.id);
    setReqScore1(match.scoreWinner.toString());
    setReqScore2(match.scoreLoser.toString());
    setReqWinners([...match.winners]);
    setReqLosers([...match.losers]);
    setReqReason('');
    setReqError(null);
  };

  const cancelRequest = () => {
    setRequestingId(null);
    setReqError(null);
  };

  const submitRequest = () => {
    if (!onRequestCorrection || !requestingId) return;
    const s1 = parseInt(reqScore1);
    const s2 = parseInt(reqScore2);
    const match = matches.find(m => m.id === requestingId);
    const format = match?.matchFormat || 'vintage21';
    const error = validateMatchScore(s1, s2, format);
    if (error) { setReqError(error); return; }

    const winners = s1 >= s2 ? reqWinners : reqLosers;
    const losers = s1 >= s2 ? reqLosers : reqWinners;

    onRequestCorrection(requestingId, {
      proposedWinners: winners,
      proposedLosers: losers,
      proposedScoreWinner: Math.max(s1, s2),
      proposedScoreLoser: Math.min(s1, s2),
      reason: reqReason || undefined,
    });
    setRequestingId(null);
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
          const isRequesting = requestingId === match.id;
          const showActions = canModify(match);

          if (isRequesting) {
            return (
              <Card key={match.id} className="p-4 border-l-2 border-l-amber-400 space-y-3 rounded-lg">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Request Score Correction</span>

                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 1</div>
                    <span className="font-bold text-white">{reqWinners.map(id => getPlayerName(id)).join(' & ')}</span>
                  </div>
                  <button
                    onClick={() => { const tmp = [...reqWinners]; setReqWinners([...reqLosers]); setReqLosers(tmp); }}
                    className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-white/5 rounded transition-colors"
                    title="Swap teams"
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-mono text-gray-500 mb-1">TEAM 2</div>
                    <span className="text-gray-400">{reqLosers.map(id => getPlayerName(id)).join(' & ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-center">
                  <Input type="number" value={reqScore1} onChange={e => setReqScore1(e.target.value)}
                    className="w-16 text-center font-mono text-lg border-amber-400/30 focus:border-amber-400" min={0} />
                  <span className="text-gray-500 font-bold">-</span>
                  <Input type="number" value={reqScore2} onChange={e => setReqScore2(e.target.value)}
                    className="w-16 text-center font-mono text-lg border-amber-400/30 focus:border-amber-400" min={0} />
                </div>

                <Input
                  type="text"
                  placeholder="Reason (optional)"
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                />

                {reqError && <p className="text-red-400 text-xs font-mono text-center">{reqError}</p>}

                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={cancelRequest}>
                    <X size={11} className="mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={submitRequest} className="bg-amber-400 text-black hover:bg-amber-300">
                    <Flag size={11} className="mr-1" /> Submit
                  </Button>
                </div>
              </Card>
            );
          }

          if (isEditing) {
            return (
              <Card key={match.id} className="p-4 border-l-2 border-l-cyber-yellow space-y-3 rounded-lg">
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
                  <Input
                    type="number"
                    value={editScore1}
                    onChange={e => setEditScore1(e.target.value)}
                    className="w-16 text-center font-mono text-lg border-cyber-cyan/30 focus:border-cyber-cyan"
                    min={0}
                  />
                  <span className="text-gray-500 font-bold">-</span>
                  <Input
                    type="number"
                    value={editScore2}
                    onChange={e => setEditScore2(e.target.value)}
                    className="w-16 text-center font-mono text-lg"
                    min={0}
                  />
                </div>

                {editError && <p className="text-red-400 text-xs font-mono text-center">{editError}</p>}

                {/* Action buttons */}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X size={11} className="mr-1" /> Cancel
                  </Button>
                  <Button size="sm" variant="cyber" onClick={submitEdit}>
                    <Check size={11} className="mr-1" /> Save
                  </Button>
                </div>
              </Card>
            );
          }

          return (
            <Card key={match.id} className="p-4 border-l-2 border-l-cyber-cyan hover:translate-x-1 transition-transform group rounded-lg cursor-pointer hover:bg-white/5 relative" onClick={() => setSelectedMatchId(match.id)}>
              {/* Header row: match type, time, and badges */}
              <div className="flex items-center gap-2 mb-3 pr-8 flex-wrap">
                <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${match.type === 'singles' ? 'bg-cyber-cyan' : 'bg-cyber-pink'}`}></span>
                  {match.type} • {timeAgo(match.timestamp)}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    match.matchFormat === 'vintage21'
                      ? 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/30'
                      : 'bg-white/5 text-gray-500 border-white/10'
                  }`}>
                    {match.matchFormat === 'vintage21' ? 'V-21' : 'S-11'}
                  </span>
                  {match.isFriendly ? (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                      FRIENDLY
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30">
                      +{match.eloChange}
                    </span>
                  )}
                </div>
              </div>

              {/* Match result: winner left, score center, loser right - with improved spacing */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-2">
                {/* Winner */}
                <div className="text-left min-w-0">
                  <div className="font-bold text-white text-base break-words leading-tight" title={match.winners.map(id => getPlayerName(id)).join(' & ')}>
                    {match.winners.map(id => getPlayerName(id)).join(' & ')}
                  </div>
                </div>

                {/* Score - Made much larger and more prominent */}
                <div className="text-center px-2">
                  <span className="text-cyber-cyan font-mono font-bold text-2xl">
                    {match.scoreWinner}
                  </span>
                  <span className="text-gray-600 mx-1 text-lg">-</span>
                  <span className="text-gray-400 font-mono text-2xl">
                    {match.scoreLoser}
                  </span>
                </div>

                {/* Loser */}
                <div className="text-right min-w-0">
                  <div className="text-gray-400 text-base break-words leading-tight" title={match.losers.map(id => getPlayerName(id)).join(' & ')}>
                    {match.losers.map(id => getPlayerName(id)).join(' & ')}
                  </div>
                </div>
              </div>

              {/* Compact action icons (no layout space reserved) */}
              {(showActions || canRequestCorrection(match)) && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {showActions && onEditMatch && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        startEdit(match);
                      }}
                      className="p-1 text-gray-500 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded transition-colors"
                      title="Edit match"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                  {showActions && onDeleteMatch && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(match.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete match"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  {canRequestCorrection(match) && onRequestCorrection && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        startRequest(match);
                      }}
                      className="p-1 text-gray-500 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                      title="Request correction"
                    >
                      <Flag size={12} />
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {matches.length === 0 && (
          <div className="text-gray-500 text-center py-8 italic border border-dashed border-white/10 rounded-lg">
            No recent activity.<br/>Log a match to start the feed.
          </div>
        )}
      </div>

      {hasMore && (
      <Button variant="outline" className="w-full" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
        <ChevronDown size={15} className="mr-1" /> Show More ({matches.length - visibleCount} remaining)
      </Button>
      )}

      <MatchDetailModal
        isOpen={selectedMatchId !== null}
        onClose={() => setSelectedMatchId(null)}
        match={matches.find(m => m.id === selectedMatchId) || null}
        players={players}
        allMatches={matches}
        history={history}
      />
    </div>
  );
};

export default RecentMatches;
