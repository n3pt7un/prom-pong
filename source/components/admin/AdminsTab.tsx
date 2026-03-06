import React, { useState } from 'react';
import { Player } from '../../types';
import { Shield, Plus, Trash2, Search } from 'lucide-react';
import { getIdToken } from '../../services/authService';

interface AdminsTabProps {
  admins: any[];
  users: Player[];
  onRefresh: () => void;
}

export const AdminsTab: React.FC<AdminsTabProps> = ({ admins, users, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const availableUsers = users.filter(u => 
    u.uid && !admins.some(a => a.firebaseUid === u.uid)
  );

  const handleAdd = async () => {
    const user = users.find(u => u.id === selectedUserId);
    if (!user || !user.uid) return;

    try {
      const token = await getIdToken();
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ firebaseUid: user.uid }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setSelectedUserId('');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to add admin:', err);
    }
  };

  const handleRemove = async (firebaseUid: string) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/admin/admins/${firebaseUid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) onRefresh();
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400 font-mono">
          {admins.length} admin{admins.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-sm font-bold transition-all"
        >
          <Plus size={16} />
          Add Admin
        </button>
      </div>

      {/* Admins List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="divide-y divide-white/5">
          {admins.map(admin => (
            <div key={admin.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="text-cyber-purple" size={20} />
                {admin.playerAvatar && (
                  <img src={admin.playerAvatar} alt={admin.playerName} className="w-10 h-10 rounded-full border border-cyber-purple/40" />
                )}
                <div>
                  <div className="font-bold text-white text-sm">{admin.playerName || 'Unknown'}</div>
                  <div className="text-xs text-gray-500 font-mono">{admin.firebaseUid}</div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(admin.firebaseUid)}
                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyber-purple/30 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add New Admin</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm"
                >
                  <option value="">-- Select a user --</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.id})
                    </option>
                  ))}
                </select>
              </div>
              
              {availableUsers.length === 0 && (
                <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  All users with Firebase accounts are already admins.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId('');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-cyber-purple/20 hover:bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/40 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
