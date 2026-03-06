import React from 'react';
import { Season } from '../../types';
import { Trash2, Calendar, Trophy, Crown } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface SeasonsTabProps {
  seasons: Season[];
  onRefresh: () => void;
}

export const SeasonsTab: React.FC<SeasonsTabProps> = ({ seasons, onRefresh }) => {
  const handleDelete = async (seasonId: string) => {
    if (!confirm('Are you sure you want to delete this season? This action cannot be undone.')) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/seasons/${seasonId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Failed to delete season:', err);
    }
  };

  const sortedSeasons = [...seasons].sort((a, b) => b.number - a.number);

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 font-mono">
        {seasons.length} season{seasons.length !== 1 ? 's' : ''} total
      </div>

      <div className="space-y-3">
        {sortedSeasons.map(season => (
          <div key={season.id} className="glass-panel p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    season.status === 'active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {season.status}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">Season #{season.number}</span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{season.name}</h3>
                
                <div className="flex items-center gap-4 text-xs text-gray-400 font-mono mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(season.startedAt).toLocaleDateString()}
                  </span>
                  {season.endedAt && (
                    <>
                      <span className="text-gray-600">→</span>
                      <span>{new Date(season.endedAt).toLocaleDateString()}</span>
                    </>
                  )}
                  <span className="text-gray-600">|</span>
                  <span className="flex items-center gap-1">
                    <Trophy size={12} />
                    {season.matchCount} matches
                  </span>
                </div>

                {season.championId && season.finalStandings.length > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 w-fit">
                    <Crown size={14} className="text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">
                      Champion: {season.finalStandings[0]?.playerName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {season.status !== 'active' && (
                  <button
                    onClick={() => handleDelete(season.id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Top 3 Players */}
            {season.finalStandings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs text-gray-400 font-mono uppercase tracking-wider mb-2">
                  Final Standings (Top 3)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {season.finalStandings.slice(0, 3).map((standing, idx) => (
                    <div key={standing.playerId} className="bg-black/40 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="text-sm font-bold text-white mb-1">{standing.playerName}</div>
                      <div className="text-xs text-cyber-cyan font-mono">{standing.eloSingles} ELO</div>
                      <div className="text-xs text-gray-500 font-mono mt-1">
                        {standing.wins}W - {standing.losses}L
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
