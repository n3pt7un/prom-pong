import React from 'react';
import { CorrectionRequest, Match, Player } from '../types';
import { Flag, Check, X } from 'lucide-react';

interface Props {
  requests: CorrectionRequest[];
  matches: Match[];
  players: Player[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

const CorrectionRequests: React.FC<Props> = ({ requests, matches, players, onApprove, onReject }) => {
  const getName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  const renderRequest = (r: CorrectionRequest) => {
    const match = matches.find(m => m.id === r.matchId);
    return (
      <div key={r.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-amber-400 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">Correction Request</span>
          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
            r.status === 'pending' ? 'text-amber-300 border-amber-400/30 bg-amber-400/10' :
            r.status === 'approved' ? 'text-green-300 border-green-400/30 bg-green-400/10' :
            'text-red-300 border-red-400/30 bg-red-400/10'
          }`}>{r.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">ORIGINAL</p>
            {match && (
              <p className="text-white font-bold">
                {match.winners.map(getName).join(' & ')} {match.scoreWinner}-{match.scoreLoser} {match.losers.map(getName).join(' & ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">PROPOSED</p>
            <p className="text-amber-300 font-bold">
              {r.proposedWinners.map(getName).join(' & ')} {r.proposedScoreWinner}-{r.proposedScoreLoser} {r.proposedLosers.map(getName).join(' & ')}
            </p>
          </div>
        </div>

        {r.reason && (
          <p className="text-xs text-gray-400 italic">"{r.reason}"</p>
        )}

        {r.status === 'pending' && (
          <div className="flex gap-2 justify-end">
            <button onClick={() => onReject(r.id)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-lg border border-white/10 transition-colors font-bold flex items-center gap-1">
              <X size={12} /> Reject
            </button>
            <button onClick={() => onApprove(r.id)}
              className="px-3 py-1.5 text-xs text-black bg-green-400 hover:bg-green-300 rounded-lg transition-colors font-bold flex items-center gap-1">
              <Check size={12} /> Approve
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Flag className="text-amber-400 w-6 h-6" />
        <h3 className="text-xl font-display font-bold text-white border-l-4 border-amber-400 pl-3">
          CORRECTION <span className="text-amber-400">REQUESTS</span>
        </h3>
        {pending.length > 0 && (
          <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 && resolved.length === 0 && (
        <p className="text-gray-500 italic text-sm text-center py-6">No correction requests yet.</p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest">Pending</p>
          {pending.map(renderRequest)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mt-4">Resolved</p>
          {resolved.slice(0, 10).map(renderRequest)}
        </div>
      )}
    </div>
  );
};

export default CorrectionRequests;
