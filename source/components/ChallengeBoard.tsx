import React, { useState, useMemo } from 'react';
import { Player, Match } from '../types';
import {
  Swords, Send, Check, X, Clock, Flame, ChevronDown, ChevronUp,
  Trophy, AlertTriangle, TrendingUp, TrendingDown, Minus,
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
  matches: Match[];
  currentPlayerId?: string;
  currentUserUid?: string;
  onRespondChallenge: (challengeId: string, accept: boolean) => void;
  onCancelChallenge?: (challengeId: string) => void;
  onCompleteChallenge?: (challengeId: string) => void;
}

// --- Helpers ---

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/** Time until challenge expires (assumed 24h TTL from createdAt). */
const expiresIn = (createdAt: string): string => {
  const expiresAt = new Date(createdAt).getTime() + 24 * 3600000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expiring';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m to accept`;
  return `${mins}m to accept`;
};

const isExpiringSoon = (createdAt: string): boolean => {
  const expiresAt = new Date(createdAt).getTime() + 24 * 3600000;
  return expiresAt - Date.now() < 4 * 3600000 && expiresAt > Date.now();
};

const getPlayer = (players: Player[], id: string): Player | undefined =>
  players.find((p) => p.id === id);

/** Head-to-head record between two players (singles). */
const getH2H = (matches: Match[], myId: string, oppId: string) => {
  const relevant = matches.filter(
    m =>
      m.type === 'singles' &&
      (m.winners.includes(myId) || m.losers.includes(myId)) &&
      (m.winners.includes(oppId) || m.losers.includes(oppId))
  );
  const wins = relevant.filter(m => m.winners.includes(myId)).length;
  const losses = relevant.filter(m => m.losers.includes(myId)).length;
  return { wins, losses, total: relevant.length };
};

/** Current win streak for a player. */
const getCurrentStreak = (matches: Match[], playerId: string): { type: 'W' | 'L' | null; count: number } => {
  const playerMatches = [...matches]
    .filter(m => m.winners.includes(playerId) || m.losers.includes(playerId))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (playerMatches.length === 0) return { type: null, count: 0 };

  const firstResult = playerMatches[0].winners.includes(playerId) ? 'W' : 'L';
  let count = 0;
  for (const m of playerMatches) {
    const result = m.winners.includes(playerId) ? 'W' : 'L';
    if (result !== firstResult) break;
    count++;
  }
  return { type: firstResult, count };
};

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
    className="rounded-full bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden"
    style={{ width: size, height: size }}
  >
    {player?.avatar ? (
      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-gray-500" style={{ fontSize: size * 0.4 }}>?</div>
    )}
  </div>
);

const EloDiffBadge: React.FC<{ myElo: number; oppElo: number }> = ({ myElo, oppElo }) => {
  const diff = oppElo - myElo;
  if (diff === 0) return <span className="text-[10px] font-mono text-gray-500 flex items-center gap-0.5"><Minus size={9} /> even</span>;
  if (diff > 0) return (
    <span className="text-[10px] font-mono text-orange-400 flex items-center gap-0.5">
      <TrendingUp size={9} /> +{diff} above you
    </span>
  );
  return (
    <span className="text-[10px] font-mono text-green-400 flex items-center gap-0.5">
      <TrendingDown size={9} /> {diff} below you
    </span>
  );
};

const StreakBadge: React.FC<{ streak: { type: 'W' | 'L' | null; count: number } }> = ({ streak }) => {
  if (!streak.type || streak.count < 2) return null;
  return (
    <span
      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
        streak.type === 'W'
          ? 'text-green-400 bg-green-500/10 border-green-500/30'
          : 'text-red-400 bg-red-500/10 border-red-500/30'
      }`}
    >
      {streak.count}{streak.type} streak
    </span>
  );
};

// --- Main component ---
const ChallengeBoard: React.FC<ChallengeBoardProps> = ({
  challenges,
  players,
  matches,
  currentPlayerId,
  onRespondChallenge,
  onCancelChallenge,
  onCompleteChallenge,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const currentPlayer = useMemo(
    () => players.find(p => p.id === currentPlayerId),
    [players, currentPlayerId]
  );

  const incoming = useMemo(
    () => challenges.filter((c) => c.challengedId === currentPlayerId && c.status === 'pending'),
    [challenges, currentPlayerId],
  );

  const active = useMemo(
    () => challenges.filter(
      (c) => c.status === 'accepted' &&
        (c.challengerId === currentPlayerId || c.challengedId === currentPlayerId),
    ),
    [challenges, currentPlayerId],
  );

  const outgoing = useMemo(
    () => challenges.filter((c) => c.challengerId === currentPlayerId && c.status === 'pending'),
    [challenges, currentPlayerId],
  );

  const history = useMemo(
    () => challenges
      .filter(
        (c) =>
          (c.status === 'completed' || c.status === 'declined' || c.status === 'expired') &&
          (c.challengerId === currentPlayerId || c.challengedId === currentPlayerId),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [challenges, currentPlayerId],
  );

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

      {/* Incoming Challenges */}
      {incoming.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-display font-bold text-cyber-pink tracking-widest uppercase flex items-center gap-2">
            <AlertTriangle size={14} /> Incoming Challenges ({incoming.length})
          </h3>
          {incoming.map((c) => {
            const challenger = getPlayer(players, c.challengerId);
            const streak = challenger ? getCurrentStreak(matches, challenger.id) : { type: null, count: 0 };
            const expiring = isExpiringSoon(c.createdAt);
            const myH2H = currentPlayerId && challenger ? getH2H(matches, currentPlayerId, challenger.id) : null;
            return (
              <div
                key={c.id}
                className={`glass-panel rounded-xl p-4 border-l-2 animate-fadeIn ${expiring ? 'border-l-red-400' : 'border-l-cyber-pink'}`}
              >
                <div className="flex items-start gap-3">
                  <PlayerAvatar player={challenger} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{challenger?.name || 'Unknown'}</span>
                      <WagerBadge wager={c.wager} size="sm" />
                      <StreakBadge streak={streak as any} />
                    </div>
                    {challenger && currentPlayer && (
                      <EloDiffBadge myElo={currentPlayer.eloSingles} oppElo={challenger.eloSingles} />
                    )}
                    {myH2H && myH2H.total > 0 && (
                      <span className="text-[10px] font-mono text-gray-500">
                        Your H2H: <span className="text-green-400">{myH2H.wins}W</span>–<span className="text-red-400">{myH2H.losses}L</span>
                      </span>
                    )}
                    {c.message && (
                      <p className="text-gray-500 text-xs italic mt-0.5 truncate">"{c.message}"</p>
                    )}
                    <span className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${expiring ? 'text-red-400 animate-pulse' : 'text-gray-600'}`}>
                      <Clock size={10} /> {expiresIn(c.createdAt)}
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
              <div key={c.id} className="glass-panel rounded-xl p-4 border-l-2 border-l-cyber-cyan">
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
                      onClick={() => onCompleteChallenge(c.id)}
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
            const expiring = isExpiringSoon(c.createdAt);
            return (
              <div key={c.id} className="glass-panel rounded-xl p-4 opacity-80">
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={challenged} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm">
                        Sent to <span className="font-bold">{challenged?.name}</span>
                      </span>
                      <WagerBadge wager={c.wager} size="sm" />
                    </div>
                    <span className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${expiring ? 'text-red-400 animate-pulse' : 'text-gray-600'}`}>
                      <Clock size={10} /> {expiresIn(c.createdAt)}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-cyber-yellow/60 bg-cyber-yellow/5 border border-cyber-yellow/20 px-2 py-1 rounded-full">
                    PENDING
                  </span>
                  {onCancelChallenge && (
                    <button
                      onClick={() => onCancelChallenge(c.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      title="Withdraw challenge"
                    >
                      <X size={16} />
                    </button>
                  )}
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
                if (c.status === 'completed') { statusColor = 'text-green-400'; statusLabel = 'COMPLETED'; }
                else if (c.status === 'declined') { statusColor = 'text-red-400'; statusLabel = 'DECLINED'; }
                else if (c.status === 'expired') { statusColor = 'text-gray-600'; statusLabel = 'EXPIRED'; }

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
                      {c.wager > 0 && <span className="ml-2"><WagerBadge wager={c.wager} size="sm" /></span>}
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${statusColor}`}>{statusLabel}</span>
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
