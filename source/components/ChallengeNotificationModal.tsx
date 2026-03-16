import React from 'react';
import { Zap, X, Check, XCircle } from 'lucide-react';
import { Challenge, Player } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface ChallengeNotificationModalProps {
  challenges: Challenge[];
  players: Player[];
  currentPlayerId: string;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
  onClose: () => void;
}

const ChallengeNotificationModal: React.FC<ChallengeNotificationModalProps> = ({
  challenges,
  players,
  currentPlayerId,
  onAccept,
  onDecline,
  onClose,
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border-cyber-yellow/30 shadow-[0_0_50px_rgba(255,215,0,0.2)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={20} className="text-cyber-yellow animate-pulse" />
            <span className="text-cyber-yellow">NEW CHALLENGE{challenges.length > 1 ? 'S' : ''}!</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-gray-300 font-mono">
            You've been matched with {challenges.length === 1 ? 'an opponent' : `${challenges.length} opponents`} based on your ELO ranking. 
            Accept or decline below.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {challenges.map((challenge) => {
              const isChallenger = challenge.challengerId === currentPlayerId;
              const opponentId = isChallenger ? challenge.challengedId : challenge.challengerId;
              const opponent = getPlayer(opponentId);
              const currentPlayer = getPlayer(currentPlayerId);

              if (!opponent || !currentPlayer) return null;

              const eloDiff = opponent.eloSingles - currentPlayer.eloSingles;

              return (
                <div
                  key={challenge.id}
                  className="rounded-lg border border-white/10 p-4 bg-gradient-to-br from-cyber-yellow/5 to-transparent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={opponent.avatar}
                          alt={opponent.name}
                          className="w-10 h-10 rounded-full border border-white/20"
                        />
                        <div>
                          <p className="font-display font-bold text-white">{opponent.name}</p>
                          <p className="text-xs font-mono text-gray-400">
                            {opponent.eloSingles} ELO
                            {eloDiff !== 0 && (
                              <span className={eloDiff > 0 ? 'text-red-400' : 'text-green-400'}>
                                {' '}({eloDiff > 0 ? '+' : ''}{eloDiff})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {challenge.generationReason && (
                        <p className="text-xs text-gray-500 font-mono mb-2">
                          {challenge.generationReason}
                        </p>
                      )}

                      {challenge.wager > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono text-gray-400">Wager:</span>
                          <span className="font-bold text-cyber-yellow">{challenge.wager} ELO</span>
                        </div>
                      )}

                      {challenge.gameType && (
                        <div className="flex items-center gap-1.5 text-xs mt-1">
                          <span className="font-mono text-gray-400">Type:</span>
                          <span className="font-bold text-cyber-cyan capitalize">{challenge.gameType}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          onAccept(challenge.id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check size={14} />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onDecline(challenge.id);
                        }}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle size={14} />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-gray-400 hover:text-white"
            >
              I'll decide later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChallengeNotificationModal;
