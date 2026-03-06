import React, { useState } from 'react';
import { Player } from '../../types';
import { Edit2, Trash2, Search, Shield, Mail } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface UsersTabProps {
  users: Player[];
  onRefresh: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({ users, onRefresh, searchTerm, setSearchTerm }) => {
  const [editingUser, setEditingUser] = useState<Player | null>(null);
  const [editForm, setEditForm] = useState<Partial<Player>>({});

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: Player) => {
    setEditingUser(user);
    setEditForm(user);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingUser(null);
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Failed to delete user:', err);
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
            placeholder="Search users by name or ID..."
            className="w-full bg-black/40 border border-white/10 text-white pl-10 pr-4 py-3 rounded-lg text-sm focus:border-cyber-purple outline-none"
          />
        </div>
        <div className="text-sm text-gray-400 font-mono">
          {filteredUsers.length} / {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-4 text-left">Player</th>
                <th className="p-4 text-center">Singles ELO</th>
                <th className="p-4 text-center">Doubles ELO</th>
                <th className="p-4 text-center">W/L</th>
                <th className="p-4 text-center">League</th>
                <th className="p-4 text-center">Admin</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-white/20" />
                      <div>
                        <div className="font-bold text-white text-sm">{user.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-cyber-cyan">{user.eloSingles}</td>
                  <td className="p-4 text-center font-mono font-bold text-cyber-pink">{user.eloDoubles}</td>
                  <td className="p-4 text-center font-mono text-xs">
                    <span className="text-green-400">{(user.winsSingles || 0) + (user.winsDoubles || 0)}</span>
                    <span className="text-gray-600 mx-1">-</span>
                    <span className="text-red-400">{(user.lossesSingles || 0) + (user.lossesDoubles || 0)}</span>
                  </td>
                  <td className="p-4 text-center text-xs text-gray-400">{user.leagueId || '-'}</td>
                  <td className="p-4 text-center">
                    {(user as any).isAdmin && <Shield className="text-cyber-purple mx-auto" size={16} />}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-cyber-cyan/20 text-cyber-cyan rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
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

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyber-purple/30 rounded-xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit User: {editingUser.name}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Avatar URL</label>
                <input
                  type="text"
                  value={editForm.avatar || ''}
                  onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Singles ELO</label>
                <input
                  type="number"
                  value={editForm.eloSingles || 1200}
                  onChange={(e) => setEditForm({ ...editForm, eloSingles: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Doubles ELO</label>
                <input
                  type="number"
                  value={editForm.eloDoubles || 1200}
                  onChange={(e) => setEditForm({ ...editForm, eloDoubles: parseInt(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-sm font-bold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
