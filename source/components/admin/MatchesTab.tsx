import React from 'react';
import { Match } from '../../types';
import { Trash2, Search, Trophy, Users as UsersIcon } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface MatchesTabProps {
  matches: Match[];
  onRefresh: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const MatchesTab: React.FC<MatchesTabProps> = ({ matches, onRefresh, searchTerm, setSearchTerm }) => {
  const filteredMatches = matches.filter(m => 
    (m as any).winnerNames?.some((n: string) => n.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (m as any).loserNames?.some((n: string) => n.toLowerCase().includes(searchTerm.toLowerCase())) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This will affect player stats and ELO.')) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Failed to delete match:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search matches by player name or ID..."
            className="w-full bg-black/40 border border-white/10 text-white pl-10 pr-4 py-3 rounded-lg text-sm focus:border-cyber-purple outline-none"
          />
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {filteredMatches.length} / {matches.length} matches
        </div>
      </div>

      {/* Matches Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-4 text-left">Match ID</th>
                <th className="p-4 text-center">Type</th>
                <th className="p-4 text-left">Winners</th>
                <th className="p-4 text-left">Losers</th>
                <th className="p-4 text-center">Score</th>
                <th className="p-4 text-center">ELO Change</th>
                <th className="p-4 text-center">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredMatches.map(match => (
                <tr key={match.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-xs text-gray-500">{match.id}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      match.type === 'singles' ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'bg-cyber-pink/20 text-cyber-pink'
                    }`}>
                      {match.type === 'singles' ? <Trophy size={12} /> : <UsersIcon size={12} />}
                      {match.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-green-400 font-bold">
                    {(match as any).winnerNames?.join(', ') || match.winners.join(', ')}
                  </td>
                  <td className="p-4 text-sm text-red-400 font-bold">
                    {(match as any).loserNames?.join(', ') || match.losers.join(', ')}
                  </td>
                  <td className="p-4 text-center font-mono text-sm">
                    <span className="text-green-400">{match.scoreWinner}</span>
                    <span className="text-gray-600 mx-1">-</span>
                    <span className="text-red-400">{match.scoreLoser}</span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-cyber-purple">
                    ±{match.eloChange}
                  </td>
                  <td className="p-4 text-center text-xs text-gray-400 font-mono">
                    {new Date(match.timestamp).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
