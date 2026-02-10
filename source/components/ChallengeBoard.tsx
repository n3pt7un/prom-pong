import React, { useState, useMemo } from 'react';
import { Player } from '../types';
import {
  Swords, Zap, Send, Check, X, Clock, Flame, ChevronDown, ChevronUp,
  Trophy, AlertTriangle,
} from 'lucide-react';

// --- Local types ---
interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  wager: number;
  matchId?: string;
  createdAt: string;
  message?: string;
}

interface ChallengeBoardProps {
  challenges: Challenge[];
  players: Player[];
  currentPlayerId?: string;
  currentUserUid?: string;
  onCreateChallenge: (challengedId: string, wager: number, message?: string) => void;
  onRespondChallenge: (challengeId: string, accept: boolean) => void;
  onCompleteChallenge?: (challengeId: string, matchId: string) => void;
}

// --- Helpers ---
const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getPlayer = (players: Player[], id: string): Player | undefined =>
  players.find((p) => p.id === id);

// --- Sub-components ---

const WagerBadge: React.FC<{ wager: number; size?: 'sm' | 'md' }> = ({ wager, size = 'md' }) => {
  if (wager === 0) return null;
  const isHigh = wager > 30;
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold font-mono ${sizeClasses} ${
        isHigh
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
          : 'bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30'
      }`}
    >
      {isHigh && <Flame size={size === 'sm' ? 10 : 14} />}
      +{wager} ELO
    </span>
  );
};

const PlayerAvatar: React.FC<{ player: Player | undefined; size?: number }> = ({ player, size = 32 }) => (
  <div
    className="flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-lg flex-shrink-0"
    style={{ width: size, height: size, fontSize: size * 0.5 }}
  >
    {player?.avatar || '?'}
  </div>
);

// --- Main component ---
const ChallengeBoard: React.FC<ChallengeBoardProps> = ({
  challenges,
  players,
  currentPlayerId,
  onCreateChallenge,
  onRespondChallenge,
  onCompleteChallenge,
}) => {
  // Create challenge form state
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [wager, setWager] = useState(0);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Filter opponents (all players except self)
  const opponents = useMemo(
    () => players.filter((p) => p.id !== currentPlayerId),
    [players, currentPlayerId],
  );

  // Categorize challenges
  const incoming = useMemo(
    () => challenges.filter((c) => c.challengedId === currentPlayerId && c.status === 'pending'),
    [challenges, currentPlayerId],
  );

  const active = useMemo(
    () =>
      challenges.filter(
        (c) =>
          c.status === 'accepted' &&
          (c.challengerId === currentPlayerId || c.challengedId === currentPlayerId),
      ),
    [challenges, currentPlayerId],
  );

  const outgoing = useMemo(
    () => challenges.filter((c) => c.challengerId === currentPlayerId && c.status === 'pending'),
    [challenges, currentPlayerId],
  );

  const history = useMemo(
    () =>
      challenges
        .filter(
          (c) =>
            (c.status === 'completed' || c.status === 'declined' || c.status === 'expired') &&
            (c.challengerId === currentPlayerId || c.challengedId === currentPlayerId),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [challenges, currentPlayerId],
  );

  const handleSendChallenge = () => {
    if (!selectedOpponent) return;
    onCreateChallenge(selectedOpponent, wager, message.trim() || undefined);
    setSelectedOpponent('');
    setWager(0);
    setMessage('');
  };

  const selectedOpponentPlayer = getPlayer(players, selectedOpponent);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Swords className="text-cyber-pink" size={28} />
        <h2 className="text-3xl font-display font-bold text-white neon-text-pink">
          CHALLENGE <span className="text-cyber-cyan">BOARD</span>
        </h2>
        {incoming.length > 0 && (
          <span className="ml-2 bg-cyber-pink text-black text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
            {incoming.length}
          </span>
        )}
      </div>

      {/* Create Challenge */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-display font-bold text-gray-400 tracking-widest uppercase">
          Issue a Challenge
        </h3>

        {/* Opponent selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">Opponent</label>
          <select
            value={selectedOpponent}
            onChange={(e) => setSelectedOpponent(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyber-cyan/50 transition-colors"
          >
            <option value="">Select a player...</option>
            {opponents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.avatar} {p.name} — ELO {p.eloSingles}
              </option>
            ))}
          </select>
        </div>

        {/* Wager slider */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">
            Bonus ELO Wager:{' '}
            <span className={`font-bold ${wager > 30 ? 'text-orange-400' : wager > 0 ? 'text-cyber-yellow' : 'text-gray-400'}`}>
              {wager === 0 ? 'None' : `+${wager}`}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={wager}
            onChange={(e) => setWager(Number(e.target.value))}
            className="w-full accent-cyber-pink h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-mono">
            <span>0</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
            <span>40</span>
            <span>50</span>
          </div>
        </div>

        {/* Message input */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">
            Trash Talk <span className="text-gray-700">(optional, {100 - message.length} chars left)</span>
          </label>
          <input
            type="text"
            maxLength={100}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Think you can handle my spin?"
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-pink/50 placeholder:text-gray-600 transition-colors"
          />
        </div>

        {/* Preview */}
        {selectedOpponent && (
          <div className="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-3 text-sm text-gray-300">
            <Zap size={14} className="inline text-cyber-pink mr-1" />
            You challenge{' '}
            <span className="text-white font-bold">
              {selectedOpponentPlayer?.avatar} {selectedOpponentPlayer?.name}
            </span>
            {wager > 0 ? (
              <>
                {' '}for <WagerBadge wager={wager} size="sm" />
              </>
            ) : (
              ' — friendly match, no wager'
            )}
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSendChallenge}
          disabled={!selectedOpponent}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-pink to-cyber-purple text-white font-display font-bold py-3 rounded-lg transition-all hover:shadow-neon-pink disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          <Zap size={18} />
          SEND CHALLENGE
        </button>
      </div>

      {/* Incoming Challenges */}
      {incoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-display font-bold text-cyber-pink tracking-widest uppercase flex items-center gap-2">
            <AlertTriangle size={14} /> Incoming Challenges ({incoming.length})
          </h3>
          {incoming.map((c) => {
            const challenger = getPlayer(players, c.challengerId);
            return (
              <div
                key={c.id}
                className="glass-panel rounded-xl p-4 border-l-2 border-l-cyber-pink animate-fadeIn"
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={challenger} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{challenger?.name || 'Unknown'}</span>
                      <WagerBadge wager={c.wager} size="sm" />
                    </div>
                    {c.message && (
                      <p className="text-gray-500 text-xs italic mt-0.5 truncate">"{c.message}"</p>
                    )}
                    <span className="text-gray-600 text-[10px] font-mono flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onRespondChallenge(c.id, true)}
                      className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      <Check size={14} /> Accept
                    </button>
                    <button
                      onClick={() => onRespondChallenge(c.id, false)}
                      className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Challenges */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-display font-bold text-cyber-cyan tracking-widest uppercase flex items-center gap-2">
            <Swords size={14} /> Active Challenges ({active.length})
          </h3>
          {active.map((c) => {
            const challenger = getPlayer(players, c.challengerId);
            const challenged = getPlayer(players, c.challengedId);
            return (
              <div
                key={c.id}
                className="glass-panel rounded-xl p-4 border-l-2 border-l-cyber-cyan"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar player={challenger} size={28} />
                    <span className="text-white font-bold text-sm">{challenger?.name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Swords size={16} className="text-cyber-yellow" />
                    <WagerBadge wager={c.wager} size="sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{challenged?.name}</span>
                    <PlayerAvatar player={challenged} size={28} />
                  </div>
                  <div className="flex-1" />
                  {onCompleteChallenge && (
                    <button
                      onClick={() => onCompleteChallenge(c.id, '')}
                      className="flex items-center gap-1 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      <Send size={14} /> LOG MATCH
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Outgoing Challenges */}
      {outgoing.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-display font-bold text-gray-400 tracking-widest uppercase flex items-center gap-2">
            <Send size={14} /> Outgoing ({outgoing.length})
          </h3>
          {outgoing.map((c) => {
            const challenged = getPlayer(players, c.challengedId);
            return (
              <div
                key={c.id}
                className="glass-panel rounded-xl p-4 opacity-80"
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={challenged} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm">
                        Sent to <span className="font-bold">{challenged?.name}</span>
                      </span>
                      <WagerBadge wager={c.wager} size="sm" />
                    </div>
                    <span className="text-gray-600 text-[10px] font-mono flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyber-yellow/60 bg-cyber-yellow/5 border border-cyber-yellow/20 px-2 py-1 rounded-full">
                    PENDING
                  </span>
                  <button
                    onClick={() => onRespondChallenge(c.id, false)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Cancel challenge"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge History (collapsible) */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-display font-bold text-gray-500 tracking-widest uppercase hover:text-gray-300 transition-colors w-full"
          >
            <Trophy size={14} />
            History ({history.length})
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistory && (
            <div className="space-y-2 mt-3">
              {history.map((c) => {
                const challenger = getPlayer(players, c.challengerId);
                const challenged = getPlayer(players, c.challengedId);
                const isChallenger = c.challengerId === currentPlayerId;
                const otherPlayer = isChallenger ? challenged : challenger;

                let statusColor = 'text-gray-500';
                let statusLabel = c.status.toUpperCase();
                if (c.status === 'completed') {
                  statusColor = 'text-green-400';
                  statusLabel = 'COMPLETED';
                } else if (c.status === 'declined') {
                  statusColor = 'text-red-400';
                  statusLabel = 'DECLINED';
                } else if (c.status === 'expired') {
                  statusColor = 'text-gray-600';
                  statusLabel = 'EXPIRED';
                }

                return (
                  <div
                    key={c.id}
                    className="glass-panel rounded-lg p-3 flex items-center gap-3 opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <PlayerAvatar player={otherPlayer} size={24} />
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-400 text-xs">
                        {isChallenger ? 'vs' : 'from'}{' '}
                        <span className="text-white font-medium">{otherPlayer?.name}</span>
                      </span>
                      {c.wager > 0 && (
                        <span className="ml-2">
                          <WagerBadge wager={c.wager} size="sm" />
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <span className="text-gray-700 text-[10px] font-mono">{timeAgo(c.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {challenges.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <Swords size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-mono text-sm">No challenges yet.</p>
          <p className="text-xs text-gray-700 mt-1">Be the first to throw down the gauntlet!</p>
        </div>
      )}
    </div>
  );
};

export default ChallengeBoard;
