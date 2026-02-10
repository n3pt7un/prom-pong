import React, { useState, useEffect } from 'react';
import { Player, GameType } from '../types';
import { Clock, CheckCircle, AlertTriangle, Shield, XCircle, Users, User } from 'lucide-react';

interface PendingMatch {
  id: string;
  type: GameType;
  winners: string[];
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  loggedBy: string;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmations: string[]; // UIDs who confirmed
  createdAt: string;
  expiresAt: string; // auto-confirm deadline (24h)
}

interface PendingMatchesProps {
  pendingMatches: PendingMatch[];
  players: Player[];
  currentUserUid?: string;
  isAdmin?: boolean;
  onConfirm: (matchId: string) => void;
  onDispute: (matchId: string) => void;
  onForceConfirm?: (matchId: string) => void; // admin only
  onReject?: (matchId: string) => void; // admin only
}

/** Return "Xh Ym" countdown string from now until the target date. */
const formatCountdown = (expiresAt: string): string => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Auto-confirming…';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const PendingMatches: React.FC<PendingMatchesProps> = ({
  pendingMatches,
  players,
  currentUserUid,
  isAdmin,
  onConfirm,
  onDispute,
  onForceConfirm,
  onReject,
}) => {
  // Re-render every 30s so countdowns stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getPlayerByUid = (uid: string) => players.find(p => p.uid === uid);

  // Count matches that need the current user's confirmation
  const waitingForMe = currentUserUid
    ? pendingMatches.filter(
        m =>
          m.status === 'pending' &&
          !m.confirmations.includes(currentUserUid) &&
          m.loggedBy !== currentUserUid
      ).length
    : 0;

  // Sort newest first
  const sorted = [...pendingMatches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // How many total confirmations are needed (all players minus the logger)
  const totalNeeded = (match: PendingMatch): number => {
    const allPlayerIds = [...match.winners, ...match.losers];
    const allUids = allPlayerIds
      .map(id => players.find(p => p.id === id)?.uid)
      .filter((uid): uid is string => !!uid && uid !== match.loggedBy);
    return allUids.length;
  };

  const hasCurrentUserConfirmed = (match: PendingMatch): boolean => {
    return !!currentUserUid && match.confirmations.includes(currentUserUid);
  };

  const isCurrentUserInvolved = (match: PendingMatch): boolean => {
    if (!currentUserUid) return false;
    const allPlayerIds = [...match.winners, ...match.losers];
    return allPlayerIds.some(id => players.find(p => p.id === id)?.uid === currentUserUid);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-display font-bold text-white border-l-4 border-cyber-yellow pl-3">
            PENDING <span className="text-cyber-yellow">CONFIRMATIONS</span>
          </h3>
          <Clock size={18} className="text-cyber-yellow" />
        </div>
        {waitingForMe > 0 && (
          <span className="bg-cyber-yellow/20 text-cyber-yellow text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-cyber-yellow/40 animate-pulse">
            {waitingForMe} awaiting you
          </span>
        )}
      </div>

      {/* Match Cards */}
      <div className="grid gap-3">
        {sorted.map(match => {
          const needed = totalNeeded(match);
          const confirmed = match.confirmations.length;
          const progressPct = needed > 0 ? Math.round((confirmed / needed) * 100) : 100;
          const isDisputed = match.status === 'disputed';
          const userConfirmed = hasCurrentUserConfirmed(match);
          const userInvolved = isCurrentUserInvolved(match);
          const loggedByPlayer = getPlayerByUid(match.loggedBy);
          const showConfirmBtn =
            currentUserUid &&
            match.status === 'pending' &&
            !userConfirmed &&
            match.loggedBy !== currentUserUid &&
            userInvolved;

          return (
            <div
              key={match.id}
              className={`glass-panel p-4 rounded-lg border-l-2 transition-all ${
                isDisputed
                  ? 'border-l-red-500'
                  : match.status === 'confirmed'
                  ? 'border-l-green-500'
                  : 'border-l-cyber-yellow'
              }`}
            >
              {/* Disputed Warning Banner */}
              {isDisputed && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400 font-bold">
                    DISPUTED — Flagged for admin review
                  </span>
                </div>
              )}

              {/* Match Type & Time */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      match.type === 'singles' ? 'bg-cyber-cyan' : 'bg-cyber-pink'
                    }`}
                  />
                  {match.type === 'singles' ? (
                    <User size={10} className="text-gray-500" />
                  ) : (
                    <Users size={10} className="text-gray-500" />
                  )}
                  {match.type} &bull; {timeAgo(match.createdAt)}
                </span>
                {match.status === 'pending' && (
                  <span className="text-[10px] font-mono text-cyber-yellow flex items-center gap-1">
                    <Clock size={10} />
                    Auto-confirms in {formatCountdown(match.expiresAt)}
                  </span>
                )}
                {match.status === 'confirmed' && (
                  <span className="text-[10px] font-mono text-green-400 flex items-center gap-1">
                    <CheckCircle size={10} />
                    CONFIRMED
                  </span>
                )}
              </div>

              {/* Teams & Score */}
              <div className="flex items-center gap-2 text-sm md:text-base mb-2">
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

              {/* Logged By */}
              <div className="text-[10px] text-gray-500 font-mono mb-3">
                Logged by{' '}
                <span className="text-gray-300 font-bold">
                  {loggedByPlayer?.name || 'Unknown'}
                </span>
              </div>

              {/* Confirmation Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Confirmations
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {confirmed} of {needed} confirmed
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        progressPct === 100
                          ? '#22c55e'
                          : 'linear-gradient(90deg, #fcee0a, #00f3ff)',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Confirm */}
                {showConfirmBtn && (
                  <button
                    onClick={() => onConfirm(match.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                  >
                    <CheckCircle size={14} />
                    Confirm
                  </button>
                )}

                {/* Already confirmed badge */}
                {userConfirmed && match.status === 'pending' && (
                  <span className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400/70 border border-green-500/20 rounded-lg text-xs font-bold">
                    <CheckCircle size={14} />
                    You confirmed
                  </span>
                )}

                {/* Dispute */}
                {currentUserUid &&
                  match.status === 'pending' &&
                  userInvolved &&
                  match.loggedBy !== currentUserUid && (
                    <button
                      onClick={() => onDispute(match.id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg text-xs font-bold transition-all"
                    >
                      <AlertTriangle size={14} />
                      Dispute
                    </button>
                  )}

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-auto">
                    {onForceConfirm && match.status !== 'confirmed' && (
                      <button
                        onClick={() => onForceConfirm(match.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-xs font-bold transition-all"
                      >
                        <Shield size={14} />
                        Force Confirm
                      </button>
                    )}
                    {onReject && match.status !== 'confirmed' && (
                      <button
                        onClick={() => onReject(match.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg text-xs font-bold transition-all"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {pendingMatches.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
            <CheckCircle size={32} className="text-green-400/40 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No pending matches</p>
            <p className="text-gray-600 text-xs mt-1">All matches have been confirmed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingMatches;
