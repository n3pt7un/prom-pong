import React, { useState, useMemo } from 'react';
import { Player, Match } from '../types';
import { Zap, Flame, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CreateChallengeModalProps {
  players: Player[];
  matches: Match[];
  currentPlayerId?: string;
  onCreateChallenge: (challengedId: string, wager: number, message?: string) => void;
  onClose: () => void;
}

const getH2H = (matches: Match[], myId: string, oppId: string) => {
  const relevant = matches.filter(
    m =>
      m.type === 'singles' &&
      (m.winners.includes(myId) || m.losers.includes(myId)) &&
      (m.winners.includes(oppId) || m.losers.includes(oppId))
  );
  return {
    wins: relevant.filter(m => m.winners.includes(myId)).length,
    losses: relevant.filter(m => m.losers.includes(myId)).length,
    total: relevant.length,
  };
};

const CreateChallengeModal: React.FC<CreateChallengeModalProps> = ({
  players,
  matches,
  currentPlayerId,
  onCreateChallenge,
  onClose,
}) => {
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [wager, setWager] = useState(0);
  const [message, setMessage] = useState('');

  const currentPlayer = useMemo(
    () => players.find(p => p.id === currentPlayerId),
    [players, currentPlayerId]
  );

  const opponents = useMemo(
    () => [...players.filter(p => p.id !== currentPlayerId)].sort(
      (a, b) => b.eloSingles - a.eloSingles
    ),
    [players, currentPlayerId]
  );

  const selectedOpponentPlayer = players.find(p => p.id === selectedOpponent);
  const h2h = currentPlayerId && selectedOpponent
    ? getH2H(matches, currentPlayerId, selectedOpponent)
    : null;
  const eloDiff = currentPlayer && selectedOpponentPlayer
    ? selectedOpponentPlayer.eloSingles - currentPlayer.eloSingles
    : null;

  const handleSend = () => {
    if (!selectedOpponent) return;
    onCreateChallenge(selectedOpponent, wager, message.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-panel rounded-2xl p-6 space-y-5 border border-cyber-pink/30 shadow-[0_0_40px_rgba(255,0,255,0.15)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-cyber-pink" />
            <h2 className="text-lg font-display font-bold text-white">
              ISSUE A <span className="text-cyber-pink">CHALLENGE</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Opponent selector */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">Opponent</label>
          <select
            value={selectedOpponent}
            onChange={e => setSelectedOpponent(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyber-cyan/50 transition-colors"
          >
            <option value="">Select a player...</option>
            {opponents.map(p => {
              const diff = currentPlayer ? p.eloSingles - currentPlayer.eloSingles : 0;
              const diffStr = diff > 0 ? ` ↑+${diff}` : diff < 0 ? ` ↓${diff}` : '';
              return (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.eloSingles} ELO{diffStr}
                </option>
              );
            })}
          </select>

          {selectedOpponent && currentPlayer && selectedOpponentPlayer && (
            <div className="flex items-center gap-3 mt-1.5 px-1">
              {eloDiff !== null && (
                eloDiff === 0
                  ? <span className="text-[10px] font-mono text-gray-500 flex items-center gap-0.5"><Minus size={9} /> even</span>
                  : eloDiff > 0
                  ? <span className="text-[10px] font-mono text-orange-400 flex items-center gap-0.5"><TrendingUp size={9} /> +{eloDiff} above you</span>
                  : <span className="text-[10px] font-mono text-green-400 flex items-center gap-0.5"><TrendingDown size={9} /> {eloDiff} below you</span>
              )}
              {h2h && h2h.total > 0 && (
                <span className="text-[10px] font-mono text-gray-500">
                  H2H: <span className="text-green-400">{h2h.wins}W</span>–<span className="text-red-400">{h2h.losses}L</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Wager */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">
            Bonus ELO Wager:{' '}
            <span className={`font-bold ${wager > 30 ? 'text-orange-400' : wager > 0 ? 'text-cyber-yellow' : 'text-gray-400'}`}>
              {wager === 0 ? 'None' : `+${wager}`}
            </span>
          </label>
          <input
            type="range" min={0} max={50} step={5} value={wager}
            onChange={e => setWager(Number(e.target.value))}
            className="w-full accent-cyber-pink h-2 rounded-lg appearance-none cursor-pointer bg-white/10"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-mono">
            <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
          </div>
        </div>

        {/* Trash talk */}
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-mono">
            Trash Talk <span className="text-gray-700">(optional, {100 - message.length} chars left)</span>
          </label>
          <input
            type="text" maxLength={100} value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Think you can handle my spin?"
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-pink/50 placeholder:text-gray-600 transition-colors"
          />
        </div>

        {/* Preview */}
        {selectedOpponent && selectedOpponentPlayer && (
          <div className="bg-cyber-pink/5 border border-cyber-pink/20 rounded-lg p-3 text-sm text-gray-300">
            <Zap size={13} className="inline text-cyber-pink mr-1" />
            You challenge <span className="text-white font-bold">{selectedOpponentPlayer.name}</span>
            {wager > 0 ? (
              <span className="ml-1 inline-flex items-center gap-1 font-bold font-mono text-xs px-1.5 py-0.5 rounded-full bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30">
                {wager > 30 && <Flame size={10} />}+{wager} ELO
              </span>
            ) : ' — friendly, no wager'}
          </div>
        )}

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!selectedOpponent}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-pink to-cyber-purple text-white font-display font-bold py-3 rounded-lg transition-all hover:shadow-neon-pink disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Zap size={18} />
          SEND CHALLENGE
        </button>
      </div>
    </div>
  );
};

export default CreateChallengeModal;
