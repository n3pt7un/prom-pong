import React, { useState } from 'react';
import { League } from '../../types';
import { Plus, Edit2, Trash2, Database } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface LeaguesTabProps {
  leagues: League[];
  onRefresh: () => void;
}

export const LeaguesTab: React.FC<LeaguesTabProps> = ({ leagues, onRefresh }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '' });
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to create league:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingLeague) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/leagues/${editingLeague.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditingLeague(null);
        setFormData({ name: '', description: '' });
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update league:', err);
    }
  };

  const handleDelete = async (leagueId: string) => {
    if (!confirm('Are you sure? This will unassign all players from this league.')) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Failed to delete league:', err);
    }
  };

  const openEditModal = (league: League) => {
    setEditingLeague(league);
    setFormData({ name: league.name, description: league.description || '' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400 font-mono">
          {leagues.length} league{leagues.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-sm font-bold transition-all"
        >
          <Plus size={16} />
          Create League
        </button>
      </div>

      {/* Leagues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leagues.map(league => (
          <div key={league.id} className="glass-panel p-6 rounded-xl border border-white/10 hover:border-cyber-purple/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <Database className="text-cyber-purple" size={24} />
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(league)}
                  className="p-1.5 hover:bg-cyber-cyan/20 text-cyber-cyan rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(league.id)}
                  className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{league.name}</h3>
            {league.description && (
              <p className="text-xs text-gray-400 mb-3">{league.description}</p>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-mono">
                {(league as any).playerCount || 0} players
              </span>
              <span className="text-gray-600 font-mono">
                {new Date(league.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLeague) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyber-purple/30 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingLeague ? 'Edit League' : 'Create New League'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2">League Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., East Coast League"
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="League description..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingLeague(null);
                  setFormData({ name: '', description: '' });
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingLeague ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-sm font-bold transition-colors"
              >
                {editingLeague ? 'Save Changes' : 'Create League'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
