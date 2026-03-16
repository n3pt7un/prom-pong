import React, { useState } from 'react';
import { Player, Challenge } from '../types';
import { Swords, Trophy, Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface LogChallengeMatchModalProps {
  challenge: Challenge;
  players: Player[];
  onSubmit: (challengeId: string, winnerId: string, loserId: string, scoreWinner: number, scoreLoser: number) => Promise<void>;
  onClose: () => void;
}

const LogChallengeMatchModal: React.FC<LogChallengeMatchModalProps> = ({
  challenge,
  players,
  onSubmit,
  onClose,
}) => {
  const challenger = players.find(p => p.id === challenge.challengerId);
  const challenged = players.find(p => p.id === challenge.challengedId);

  const [winnerId, setWinnerId] = useState<string>('');
  const [scoreWinner, setScoreWinner] = useState(11);
  const [scoreLoser, setScoreLoser] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const loserId = winnerId
    ? (winnerId === challenge.challengerId ? challenge.challengedId : challenge.challengerId)
    : '';

  const handleSubmit = async () => {
    if (!winnerId) return;
    setSubmitting(true);
    try {
      await onSubmit(challenge.id, winnerId, loserId, scoreWinner, scoreLoser);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const winner = players.find(p => p.id === winnerId);
  const loser = players.find(p => p.id === loserId);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-cyber-cyan/30 shadow-[0_0_40px_rgba(0,255,255,0.1)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords size={18} className="text-cyber-cyan" />
            LOG <span className="text-cyber-cyan ml-1">RESULT</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">

        {/* Challenge info */}
        <div className="flex items-center justify-center gap-4 bg-white/5 rounded-xl p-4">
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden mx-auto mb-1"
            >
              {challenger?.avatar ? (
                <img src={challenger.avatar} alt={challenger.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">?</div>
              )}
            </div>
            <span className="text-white font-bold text-sm">{challenger?.name}</span>
            <div className="text-[10px] text-gray-500 font-mono">{challenger?.eloSingles} ELO</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Swords size={20} className="text-cyber-yellow" />
            {challenge.wager > 0 && (
              <span className="text-[10px] font-mono font-bold text-cyber-yellow flex items-center gap-0.5">
                {challenge.wager > 30 && <Flame size={9} />}+{challenge.wager} ELO
              </span>
            )}
          </div>
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex-shrink-0 overflow-hidden mx-auto mb-1"
            >
              {challenged?.avatar ? (
                <img src={challenged.avatar} alt={challenged.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">?</div>
              )}
            </div>
            <span className="text-white font-bold text-sm">{challenged?.name}</span>
            <div className="text-[10px] text-gray-500 font-mono">{challenged?.eloSingles} ELO</div>
          </div>
        </div>

        {/* Winner selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-2 font-mono">Who won?</label>
          <div className="grid grid-cols-2 gap-3">
            {[challenger, challenged].filter(Boolean).map(p => (
              <button
                key={p!.id}
                onClick={() => setWinnerId(p!.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  winnerId === p!.id
                    ? 'border-cyber-cyan bg-cyber-cyan/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {winnerId === p!.id && <Trophy size={14} className="text-cyber-cyan" />}
                <span className="font-bold text-sm">{p!.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Score */}
        {winnerId && (
          <div className="space-y-3">
            <label className="block text-xs text-gray-500 font-mono">Score</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1 font-mono truncate">{winner?.name} (winner)</div>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={scoreWinner}
                  onChange={e => setScoreWinner(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center font-mono text-lg border-cyber-cyan/30 focus:border-cyber-cyan"
                />
              </div>
              <span className="text-gray-600 font-mono text-lg">–</span>
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1 font-mono truncate">{loser?.name} (loser)</div>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={scoreLoser}
                  onChange={e => setScoreLoser(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center font-mono text-lg"
                />
              </div>
            </div>
          </div>
        )}

          <Button
            onClick={handleSubmit}
            disabled={!winnerId || submitting}
            className="w-full bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-display font-bold hover:shadow-neon-cyan"
          >
            <Trophy size={16} className="mr-1" />
            {submitting ? 'LOGGING...' : 'LOG MATCH & CLOSE CHALLENGE'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogChallengeMatchModal;
