import React, { useMemo } from 'react';
import { Challenge, Match, Player, GameType } from '../types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import MatchMaker from './MatchMaker';
import { Flame, Swords, Sparkles, Clock3, Trophy, Inbox, Send } from 'lucide-react';
import { shortName } from '../utils/playerRanking';

interface MatchupsHubProps {
  challenges: Challenge[];
  players: Player[];
  matches: Match[];
  isAdmin: boolean;
  activeLeagueId?: string | null;
  currentPlayerId?: string;
  onSelectMatch: (type: GameType, team1: string[], team2: string[]) => void;
  onGenerateChallenges: (gameType: 'singles' | 'doubles', maxPerPlayer?: number) => void;
  onRespondChallenge: (challengeId: string, accept: boolean) => void;
  onOpenChallengeLog: (challengeId: string) => void;
}

const formatTimeLeft = (expiresAt?: string, createdAt?: string) => {
  const expires = expiresAt
    ? new Date(expiresAt).getTime()
    : createdAt
      ? new Date(createdAt).getTime() + 24 * 60 * 60 * 1000
      : Date.now();
  const diff = expires - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / (60 * 60 * 1000));
  const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const MatchupsHub: React.FC<MatchupsHubProps> = ({
  challenges,
  players,
  matches,
  isAdmin,
  activeLeagueId,
  currentPlayerId,
  onSelectMatch,
  onGenerateChallenges,
  onRespondChallenge,
  onOpenChallengeLog,
}) => {
  const incomingGenerated = useMemo(
    () => challenges
      .filter((c) => {
        if (c.status !== 'pending' || c.source !== 'auto_generated' || !currentPlayerId) return false;
        const isChallenger = c.challengerId === currentPlayerId;
        const isChallenged = c.challengedId === currentPlayerId;
        if (!isChallenger && !isChallenged) return false;

        // Auto-generated challenges require both players to approve.
        if (isChallenger) return !c.challengerAcceptedAt;
        if (isChallenged) return !c.challengedAcceptedAt;
        return false;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [challenges, currentPlayerId]
  );

  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.status === 'accepted' && [c.challengerId, c.challengedId].includes(currentPlayerId || '')),
    [challenges, currentPlayerId]
  );

  const myPending = useMemo(
    () => challenges.filter((c) => c.status === 'pending' && [c.challengerId, c.challengedId].includes(currentPlayerId || '')),
    [challenges, currentPlayerId]
  );

  const incomingManual = useMemo(
    () => challenges
      .filter((c) => c.status === 'pending' && c.challengedId === currentPlayerId && c.source !== 'auto_generated')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [challenges, currentPlayerId]
  );

  const outgoingPending = useMemo(
    () => challenges
      .filter((c) => c.status === 'pending' && c.challengerId === currentPlayerId && c.source !== 'auto_generated')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [challenges, currentPlayerId]
  );

  const idToPlayer = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-4 border-cyber-cyan/20 bg-gradient-to-r from-cyber-cyan/10 via-black/20 to-cyber-pink/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-mono text-cyber-cyan uppercase tracking-widest">Matchups Hub</p>
            <h2 className="text-2xl font-display font-bold text-white">Daily Challenges and Smart Pairings</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 rounded-full border border-white/15 text-gray-300">{incomingGenerated.length} daily</span>
            <span className="px-2 py-1 rounded-full border border-white/15 text-gray-300">{activeChallenges.length} active</span>
            <span className="px-2 py-1 rounded-full border border-white/15 text-gray-300">{myPending.length} pending</span>
            <span className="px-2 py-1 rounded-full border border-white/15 text-gray-300">{incomingManual.length + outgoingPending.length} requests</span>
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Card className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-mono text-gray-400">Admin generation controls</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onGenerateChallenges('singles', 1)}>
                <Sparkles size={13} /> Generate Singles
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                disabled
                title="Doubles challenges require 4-player team structure (not yet implemented)"
                className="opacity-50 cursor-not-allowed"
              >
                <Sparkles size={13} /> Generate Doubles (Soon)
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="text-cyber-yellow" size={16} />
            <h3 className="font-display text-lg text-white">Today&apos;s Generated Matchups</h3>
          </div>
          {incomingGenerated.length === 0 && (
            <p className="text-sm text-gray-500 font-mono">No daily matchup waiting for you right now.</p>
          )}
          {incomingGenerated.slice(0, 4).map((c) => {
            const challenger = idToPlayer.get(c.challengerId);
            const challenged = idToPlayer.get(c.challengedId);
            const iAmChallenger = c.challengerId === currentPlayerId;
            const opponent = iAmChallenger ? challenged : challenger;
            const waitingOnOther = iAmChallenger ? Boolean(c.challengerAcceptedAt) : Boolean(c.challengedAcceptedAt);
            return (
              <div key={c.id} className="rounded-lg border border-white/10 p-3 bg-black/20">
                <div className="flex justify-between items-center gap-2">
                  <div>
                    <p className="text-sm text-white font-bold">{shortName(opponent?.name || 'Unknown')}</p>
                    <p className="text-xs text-gray-500 font-mono">{c.generationReason || 'Daily balanced matchup'}</p>
                    {waitingOnOther && (
                      <p className="text-[10px] text-cyber-cyan font-mono">You approved. Waiting for opponent.</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-cyber-yellow font-mono">+{c.wager} ELO</p>
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 justify-end"><Clock3 size={10} /> {formatTimeLeft(c.expiresAt, c.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500/40 text-green-400"
                    onClick={() => onRespondChallenge(c.id, true)}
                    disabled={waitingOnOther}
                  >
                    {waitingOnOther ? 'Approved' : 'Accept'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-500/40 text-red-400" onClick={() => onRespondChallenge(c.id, false)}>
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Swords className="text-cyber-cyan" size={16} />
            <h3 className="font-display text-lg text-white">Active Challenge Matches</h3>
          </div>
          {activeChallenges.length === 0 && (
            <p className="text-sm text-gray-500 font-mono">No active challenges. Accept a daily matchup to get started.</p>
          )}
          {activeChallenges.slice(0, 4).map((c) => {
            const challenger = idToPlayer.get(c.challengerId);
            const challenged = idToPlayer.get(c.challengedId);
            const opponent = c.challengerId === currentPlayerId ? challenged : challenger;
            return (
              <div key={c.id} className="rounded-lg border border-white/10 p-3 bg-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">vs {shortName(opponent?.name || 'Unknown')}</p>
                    <p className="text-xs text-gray-500 font-mono">Challenge accepted</p>
                  </div>
                  <p className="text-xs text-cyber-yellow font-mono">+{c.wager} ELO</p>
                </div>
                <Button size="sm" className="mt-2" onClick={() => onOpenChallengeLog(c.id)}>
                  <Trophy size={13} /> Log Result
                </Button>
              </div>
            );
          })}
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="text-cyber-pink" size={16} />
          <h3 className="font-display text-lg text-white">Challenge Requests</h3>
        </div>

        {incomingManual.length === 0 && outgoingPending.length === 0 && (
          <p className="text-sm text-gray-500 font-mono">No manual challenge requests right now.</p>
        )}

        {incomingManual.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-cyber-cyan">Incoming ({incomingManual.length})</p>
            {incomingManual.slice(0, 5).map((c) => {
              const challenger = idToPlayer.get(c.challengerId);
              return (
                <div key={c.id} className="rounded-lg border border-white/10 p-3 bg-black/20">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <p className="text-sm text-white font-bold">{shortName(challenger?.name || 'Unknown')}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.message || 'Manual challenge request'}</p>
                    </div>
                    <p className="text-xs text-cyber-yellow font-mono">+{c.wager} ELO</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="border-green-500/40 text-green-400" onClick={() => onRespondChallenge(c.id, true)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/40 text-red-400" onClick={() => onRespondChallenge(c.id, false)}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {outgoingPending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 flex items-center gap-1">
              <Send size={12} /> Sent ({outgoingPending.length})
            </p>
            {outgoingPending.slice(0, 5).map((c) => {
              const challenged = idToPlayer.get(c.challengedId);
              return (
                <div key={c.id} className="rounded-lg border border-white/10 p-3 bg-black/20">
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <p className="text-sm text-white font-bold">to {shortName(challenged?.name || 'Unknown')}</p>
                      <p className="text-xs text-gray-500 font-mono">Waiting for response</p>
                    </div>
                    <p className="text-xs text-cyber-yellow font-mono">+{c.wager} ELO</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <MatchMaker
        players={players}
        onSelectMatch={onSelectMatch}
        activeLeagueId={activeLeagueId}
        initialExpanded
      />

      <p className="text-xs text-gray-600 font-mono">
        Match suggestions use league-filtered players ({activeLeagueId ? 'current league' : 'global'}) and are sorted by smallest ELO gap.
      </p>
    </div>
  );
};

export default MatchupsHub;
