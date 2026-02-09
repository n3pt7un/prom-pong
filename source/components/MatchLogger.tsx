import React, { useState, useEffect } from 'react';
import { Player, GameType } from '../types';
import { Swords, AlertCircle, Loader2 } from 'lucide-react';

interface MatchLoggerProps {
  players: Player[];
  onSubmit: (type: GameType, winners: string[], losers: string[], scoreW: number, scoreL: number) => void;
  prefill?: { type: GameType; team1: string[]; team2: string[] } | null;
  onPrefillConsumed?: () => void;
}

const MatchLogger: React.FC<MatchLoggerProps> = ({ players, onSubmit, prefill, onPrefillConsumed }) => {
  const [gameType, setGameType] = useState<GameType>('singles');
  const [team1, setTeam1] = useState<string[]>([]);
  const [team2, setTeam2] = useState<string[]>([]);
  const [score1, setScore1] = useState<string>('');
  const [score2, setScore2] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply prefill from matchmaker
  useEffect(() => {
    if (prefill) {
      setGameType(prefill.type);
      setTeam1(prefill.team1);
      setTeam2(prefill.team2);
      setScore1('');
      setScore2('');
      onPrefillConsumed?.();
    }
  }, [prefill]);

  const handlePlayerSelect = (playerId: string, team: 1 | 2) => {
    if (team1.includes(playerId)) setTeam1(team1.filter(id => id !== playerId));
    if (team2.includes(playerId)) setTeam2(team2.filter(id => id !== playerId));

    if (team === 1) {
      if (gameType === 'singles' && team1.length >= 1) setTeam1([playerId]);
      else if (gameType === 'doubles' && team1.length >= 2) return;
      else setTeam1([...team1, playerId]);
    } else {
      if (gameType === 'singles' && team2.length >= 1) setTeam2([playerId]);
      else if (gameType === 'doubles' && team2.length >= 2) return;
      else setTeam2([...team2, playerId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (isNaN(s1) || isNaN(s2)) return setError('Scores must be numbers');
    if (s1 === s2) return setError('Draws are not allowed');
    if (Math.abs(s1 - s2) < 2) return setError('Must win by at least 2 points');
    if (s1 < 11 && s2 < 11) return setError('Minimum winning score is 11');

    const requiredPlayers = gameType === 'singles' ? 1 : 2;
    if (team1.length !== requiredPlayers || team2.length !== requiredPlayers) {
      return setError(`Select ${requiredPlayers} player(s) per team`);
    }

    const winners = s1 > s2 ? team1 : team2;
    const losers = s1 > s2 ? team2 : team1;
    const wScore = Math.max(s1, s2);
    const lScore = Math.min(s1, s2);

    setIsSubmitting(true);
    try {
      await onSubmit(gameType, winners, losers, wScore, lScore);
    } finally {
      setIsSubmitting(false);
    }

    setScore1('');
    setScore2('');
    setTeam1([]);
    setTeam2([]);
  };

  const isSelected = (id: string) => team1.includes(id) || team2.includes(id);

  return (
    <div className="glass-panel p-6 md:p-8 rounded-xl max-w-2xl mx-auto shadow-neon-pink animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <Swords className="text-cyber-pink w-8 h-8" />
        <h2 className="text-2xl font-display font-bold text-white">LOG <span className="text-cyber-cyan">MATCH</span></h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded mb-6 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Toggle */}
        <div className="flex justify-center gap-4">
          <label className={`cursor-pointer px-6 py-3 rounded-lg border font-bold transition-all ${gameType === 'singles' ? 'bg-white text-black border-white' : 'border-white/20 text-gray-400'}`}>
            <input type="radio" className="hidden" checked={gameType === 'singles'} onChange={() => { setGameType('singles'); setTeam1([]); setTeam2([]); }} />
            1 vs 1
          </label>
          <label className={`cursor-pointer px-6 py-3 rounded-lg border font-bold transition-all ${gameType === 'doubles' ? 'bg-white text-black border-white' : 'border-white/20 text-gray-400'}`}>
            <input type="radio" className="hidden" checked={gameType === 'doubles'} onChange={() => { setGameType('doubles'); setTeam1([]); setTeam2([]); }} />
            2 vs 2
          </label>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team 1 */}
          <div className="space-y-3">
            <h3 className="text-cyber-cyan font-mono font-bold text-center">TEAM 1 (CYAN)</h3>
            <div className="bg-black/40 p-4 rounded-lg border border-cyber-cyan/30 min-h-[100px] flex flex-wrap gap-2 justify-center">
               {team1.map(id => {
                 const p = players.find(player => player.id === id);
                 return (
                   <div key={id} onClick={() => setTeam1(team1.filter(pid => pid !== id))} className="cursor-pointer flex items-center gap-2 bg-cyber-cyan text-black px-2 py-1 rounded font-bold text-sm">
                     {p?.name} <span className="text-[10px]">&#10005;</span>
                   </div>
                 )
               })}
               {team1.length === 0 && <span className="text-gray-600 text-sm italic self-center">Select players below</span>}
            </div>
            <input
              type="number"
              placeholder="Score"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              className="w-full bg-black/50 border border-white/10 text-white p-3 rounded text-center font-mono text-xl focus:border-cyber-cyan outline-none transition-colors"
            />
          </div>

          {/* Team 2 */}
          <div className="space-y-3">
            <h3 className="text-cyber-pink font-mono font-bold text-center">TEAM 2 (PINK)</h3>
            <div className="bg-black/40 p-4 rounded-lg border border-cyber-pink/30 min-h-[100px] flex flex-wrap gap-2 justify-center">
               {team2.map(id => {
                 const p = players.find(player => player.id === id);
                 return (
                   <div key={id} onClick={() => setTeam2(team2.filter(pid => pid !== id))} className="cursor-pointer flex items-center gap-2 bg-cyber-pink text-black px-2 py-1 rounded font-bold text-sm">
                     {p?.name} <span className="text-[10px]">&#10005;</span>
                   </div>
                 )
               })}
               {team2.length === 0 && <span className="text-gray-600 text-sm italic self-center">Select players below</span>}
            </div>
             <input
              type="number"
              placeholder="Score"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              className="w-full bg-black/50 border border-white/10 text-white p-3 rounded text-center font-mono text-xl focus:border-cyber-pink outline-none transition-colors"
            />
          </div>
        </div>

        {/* Roster Selection */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-widest text-center">Available Players</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {players.map(player => {
               const active = isSelected(player.id);
               return (
                 <button
                   key={player.id}
                   type="button"
                   disabled={active}
                   onClick={() => {
                     if (team1.length < (gameType === 'singles' ? 1 : 2)) handlePlayerSelect(player.id, 1);
                     else if (team2.length < (gameType === 'singles' ? 1 : 2)) handlePlayerSelect(player.id, 2);
                   }}
                   className={`p-3 rounded border text-sm font-bold flex items-center gap-2 transition-all ${
                     active
                      ? 'opacity-30 border-gray-700 bg-gray-900 cursor-not-allowed'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 text-gray-300'
                   }`}
                 >
                   <img src={player.avatar} className="w-6 h-6 rounded-full" />
                   <span className="truncate">{player.name}</span>
                 </button>
               )
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-cyber-cyan to-cyber-pink text-black font-display font-bold text-xl rounded-lg shadow-neon-cyan hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> SUBMITTING...
            </>
          ) : (
            'SUBMIT MATCH'
          )}
        </button>
      </form>
    </div>
  );
};

export default MatchLogger;
