import React, { useState } from 'react';
import { League, Player } from '../types';
import { Users, Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react';

interface LeagueManagerProps {
  leagues: League[];
  players: Player[];
  isAdmin: boolean;
  onCreateLeague: (name: string, description?: string) => Promise<void>;
  onUpdateLeague: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  onDeleteLeague: (id: string) => Promise<void>;
  onAssignPlayer: (playerId: string, leagueId: string | null) => Promise<void>;
}

const LeagueManager: React.FC<LeagueManagerProps> = ({
  leagues,
  players,
  isAdmin,
  onCreateLeague,
  onUpdateLeague,
  onDeleteLeague,
  onAssignPlayer,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateLeague(newName.trim(), newDesc.trim() || undefined);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateLeague(id, { name: editName.trim(), description: editDesc.trim() || undefined });
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this league? Players will be unassigned.')) return;
    await onDeleteLeague(id);
  };

  const startEdit = (league: League) => {
    setEditingId(league.id);
    setEditName(league.name);
    setEditDesc(league.description || '');
  };

  const getLeaguePlayerCount = (leagueId: string) => {
    return players.filter(p => p.leagueId === leagueId).length;
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="text-cyber-cyan w-6 h-6" />
          <h3 className="text-lg font-display font-bold text-white">LEAGUES</h3>
        </div>
        {leagues.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No leagues configured yet.</p>
        ) : (
          <div className="space-y-2">
            {leagues.map(league => (
              <div key={league.id} className="glass-panel p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{league.name}</span>
                  {league.description && <p className="text-xs text-gray-400 mt-0.5">{league.description}</p>}
                </div>
                <span className="text-xs font-mono text-gray-500">{getLeaguePlayerCount(league.id)} players</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="text-cyber-cyan w-6 h-6" />
          <h3 className="text-lg font-display font-bold text-white">LEAGUE <span className="text-cyber-cyan">MANAGER</span></h3>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 rounded-lg hover:bg-cyber-cyan/20 transition-colors"
        >
          <Plus size={14} /> New League
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 p-4 rounded-lg border border-cyber-cyan/30 bg-black/40 space-y-3">
          <input
            type="text"
            placeholder="League Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isSubmitting}
              className="px-3 py-1.5 text-xs text-black bg-cyber-cyan hover:bg-white rounded-lg transition-colors font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* League List */}
      <div className="space-y-3">
        {leagues.length === 0 && (
          <p className="text-gray-500 text-sm italic text-center py-4 border border-dashed border-white/10 rounded-lg">
            No leagues yet. Create one to organize players into groups.
          </p>
        )}

        {leagues.map(league => (
          <div key={league.id} className="glass-panel p-4 rounded-lg border-l-2 border-l-cyber-cyan">
            {editingId === league.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
                />
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description"
                  className="w-full bg-black/50 border border-white/10 text-white p-2 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-white"><X size={14} /></button>
                  <button onClick={() => handleUpdate(league.id)} disabled={isSubmitting} className="p-1.5 text-cyber-cyan hover:text-white"><Check size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{league.name}</span>
                  {league.description && <p className="text-xs text-gray-400 mt-0.5">{league.description}</p>}
                  <p className="text-xs text-gray-500 font-mono mt-1">{getLeaguePlayerCount(league.id)} players</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(league)} className="p-1.5 text-gray-600 hover:text-cyber-cyan transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(league.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Player Assignment */}
      {leagues.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users size={14} /> Player League Assignment
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {players.map(player => (
              <div key={player.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/20 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={player.avatar} className="w-6 h-6 rounded-full flex-shrink-0" />
                  <span className="text-sm text-white font-bold truncate">{player.name}</span>
                </div>
                <select
                  value={player.leagueId || ''}
                  onChange={e => onAssignPlayer(player.id, e.target.value || null)}
                  className="bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none min-w-[120px]"
                >
                  <option value="">No League</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueManager;
