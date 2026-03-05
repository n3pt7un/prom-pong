import React, { useState } from 'react';
import { Player, Challenge } from '../types';
import { Swords, X, Trophy, Flame } from 'lucide-react';

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
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-panel rounded-2xl p-6 space-y-5 border border-cyber-cyan/30 shadow-[0_0_40px_rgba(0,255,255,0.1)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={20} className="text-cyber-cyan" />
            <h2 className="text-lg font-display font-bold text-white">
              LOG <span className="text-cyber-cyan">RESULT</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

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
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={scoreWinner}
                  onChange={e => setScoreWinner(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-black/60 border border-cyber-cyan/30 rounded-lg px-3 py-2 text-white text-center font-mono text-lg focus:outline-none focus:border-cyber-cyan/60"
                />
              </div>
              <span className="text-gray-600 font-mono text-lg">–</span>
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1 font-mono truncate">{loser?.name} (loser)</div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={scoreLoser}
                  onChange={e => setScoreLoser(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-mono text-lg focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!winnerId || submitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-black font-display font-bold py-3 rounded-lg transition-all hover:shadow-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trophy size={18} />
          {submitting ? 'LOGGING...' : 'LOG MATCH & CLOSE CHALLENGE'}
        </button>
      </div>
    </div>
  );
};

export default LogChallengeMatchModal;
