import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Save, History, UserX, Download, Upload, ShieldCheck, ShieldOff, Users, Pencil, Camera, Check, X, Trophy, Swords, Building2, Search, Filter, ChevronDown, ChevronUp, UserCog, Plus, Calculator } from 'lucide-react';
import { getBackups, createBackup, Backup, LeagueState, listUsers, promoteUser, demoteUser, getLeagueData, updatePlayer, deletePlayer, deleteMatch, createLeague, updateLeague, deleteLeague, assignPlayerLeague, recalculateStats } from '../services/storageService';
import { AppUser, Player, Match, League } from '../types';
import { AVATARS } from '../constants';
import { resizeImage } from '../utils/imageUtils';

interface SettingsProps {
  isAdmin: boolean;
  currentUser: AppUser | null;
  onResetSeason: () => void;
  onFactoryReset: () => void;
  onStartFresh: () => void;
  onExport: () => void;
  onImport: (data: LeagueState) => void;
  onUpdateProfile: (updates: { name?: string; avatar?: string; bio?: string }) => Promise<void>;
  players?: Player[];
  matches?: Match[];
  leagues?: League[];
  onRefreshData?: () => void;
}

interface UserEntry {
  uid: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isAdmin, currentUser, onResetSeason, onFactoryReset, onStartFresh, onExport, onImport, onUpdateProfile, players = [], matches = [], leagues = [], onRefreshData }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Player Management
  const [showPlayerManager, setShowPlayerManager] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerLeague, setEditPlayerLeague] = useState<string | null>(null);
  const [playerActionLoading, setPlayerActionLoading] = useState<string | null>(null);

  // Match Management
  const [showMatchManager, setShowMatchManager] = useState(false);
  const [matchFilter, setMatchFilter] = useState('');
  const [matchLeagueFilter, setMatchLeagueFilter] = useState<string | null>(null);
  const [matchActionLoading, setMatchActionLoading] = useState<string | null>(null);

  // League Management (inline in Settings)
  const [showLeagueManager, setShowLeagueManager] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDesc, setNewLeagueDesc] = useState('');
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editLeagueName, setEditLeagueName] = useState('');
  const [leagueActionLoading, setLeagueActionLoading] = useState<string | null>(null);

  // Recalculate Stats
  const [recalcLoading, setRecalcLoading] = useState(false);

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.player?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.player?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.player?.avatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBackups(getBackups());
  }, []);

  // Sync edit fields when currentUser changes
  useEffect(() => {
    if (currentUser?.player) {
      setEditName(currentUser.player.name);
      setEditBio(currentUser.player.bio || '');
      setEditAvatar(currentUser.player.avatar);
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const updates: { name?: string; avatar?: string; bio?: string } = {};
      if (editName.trim() !== currentUser?.player?.name) updates.name = editName.trim();
      if (editAvatar !== currentUser?.player?.avatar) updates.avatar = editAvatar;
      if (editBio.trim() !== (currentUser?.player?.bio || '')) updates.bio = editBio.trim();

      if (Object.keys(updates).length > 0) {
        await onUpdateProfile(updates);
      }
      setEditingProfile(false);
      setShowAvatarPicker(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setEditAvatar(resized);
      setShowAvatarPicker(false);
    } catch {
      alert('Failed to process image');
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCreateBackup = async () => {
    await createBackup(`Manual Backup ${new Date().toLocaleTimeString()}`);
    setBackups(getBackups());
  }

  const handleDownload = (backup: Backup) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `cyberpong_backup_${backup.timestamp}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.players && data.matches) {
          if (window.confirm('Import this league data? This will overwrite all current data.')) {
            onImport(data);
          }
        } else {
          alert('Invalid league data file. Must contain players and matches.');
        }
      } catch {
        alert('Failed to parse file. Must be valid JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadUsers = async () => {
    setUserLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setUserLoading(false);
    }
  };

  const handleToggleUsers = () => {
    if (!showUsers) {
      loadUsers();
    }
    setShowUsers(!showUsers);
  };

  const handlePromote = async (uid: string) => {
    try {
      await promoteUser(uid);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to promote user');
    }
  };

  const handleDemote = async (uid: string) => {
    if (!window.confirm('Remove admin access from this user?')) return;
    try {
      await demoteUser(uid);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to demote user');
    }
  };

  // --- Player Management Handlers ---
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditPlayerName(player.name);
    setEditPlayerLeague(player.leagueId || null);
  };

  const handleSavePlayer = async () => {
    if (!editingPlayer || !editPlayerName.trim()) return;
    setPlayerActionLoading(editingPlayer.id);
    try {
      await updatePlayer(editingPlayer.id, { name: editPlayerName.trim() });
      if (editPlayerLeague !== editingPlayer.leagueId) {
        await assignPlayerLeague(editingPlayer.id, editPlayerLeague);
      }
      setEditingPlayer(null);
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update player');
    } finally {
      setPlayerActionLoading(null);
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!window.confirm(`Delete player "${playerName}"? This cannot be undone.`)) return;
    setPlayerActionLoading(playerId);
    try {
      await deletePlayer(playerId);
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete player');
    } finally {
      setPlayerActionLoading(null);
    }
  };

  // --- Match Management Handlers ---
  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Delete this match and reverse ELO changes?')) return;
    setMatchActionLoading(matchId);
    try {
      await deleteMatch(matchId);
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete match');
    } finally {
      setMatchActionLoading(null);
    }
  };

  // --- League Management Handlers ---
  const handleCreateLeague = async () => {
    if (!newLeagueName.trim()) return;
    setLeagueActionLoading('create');
    try {
      await createLeague(newLeagueName.trim(), newLeagueDesc.trim() || undefined);
      setNewLeagueName('');
      setNewLeagueDesc('');
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to create league');
    } finally {
      setLeagueActionLoading(null);
    }
  };

  const handleEditLeague = (league: League) => {
    setEditingLeague(league);
    setEditLeagueName(league.name);
  };

  const handleSaveLeague = async () => {
    if (!editingLeague || !editLeagueName.trim()) return;
    setLeagueActionLoading(editingLeague.id);
    try {
      await updateLeague(editingLeague.id, { name: editLeagueName.trim() });
      setEditingLeague(null);
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update league');
    } finally {
      setLeagueActionLoading(null);
    }
  };

  const handleDeleteLeague = async (leagueId: string, leagueName: string) => {
    if (!window.confirm(`Delete league "${leagueName}"? Players will be unassigned.`)) return;
    setLeagueActionLoading(leagueId);
    try {
      await deleteLeague(leagueId);
      onRefreshData?.();
    } catch (err: any) {
      alert(err.message || 'Failed to delete league');
    } finally {
      setLeagueActionLoading(null);
    }
  };

  // --- Recalculate Stats Handler ---
  const handleRecalculateStats = async () => {
    if (!window.confirm('Recalculate all player stats from match history?\n\nThis will:\n- Reset all wins/losses/streaks to 0\n- Re-count every match\n- Fix any stat discrepancies\n\nThis action cannot be undone.')) return;
    setRecalcLoading(true);
    try {
      const result = await recalculateStats();
      onRefreshData?.();
      alert(`Stats recalculated!\n${result.message}`);
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate stats');
    } finally {
      setRecalcLoading(false);
    }
  };

  // Filtered data
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredMatches = matches.filter(m => {
    const playerNames = [...m.winners, ...m.losers].map(id => players.find(p => p.id === id)?.name || '').join(' ');
    const matchesSearch = playerNames.toLowerCase().includes(matchFilter.toLowerCase());
    const matchesLeague = matchLeagueFilter ? m.leagueId === matchLeagueFilter : true;
    return matchesSearch && matchesLeague;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Save className="text-cyber-cyan w-8 h-8" />
        <h2 className="text-2xl font-display font-bold text-white">SYSTEM <span className="text-cyber-cyan">SETTINGS</span></h2>
      </div>

      {/* Edit Profile */}
      {currentUser?.player && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-pink">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Pencil className="text-cyber-pink" size={20} />
              My Profile
            </h3>
            {!editingProfile ? (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-xs bg-cyber-pink/10 border border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink hover:text-black px-3 py-1.5 rounded font-bold transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving || !editName.trim()}
                  className="text-xs bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black px-3 py-1.5 rounded font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <Check size={12} /> Save
                </button>
                <button
                  onClick={() => {
                    setEditingProfile(false);
                    setShowAvatarPicker(false);
                    setEditName(currentUser.player!.name);
                    setEditBio(currentUser.player!.bio || '');
                    setEditAvatar(currentUser.player!.avatar);
                  }}
                  className="text-xs bg-white/5 border border-white/20 text-gray-400 hover:text-white px-3 py-1.5 rounded font-bold transition-all flex items-center gap-1"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            )}
          </div>

          {!editingProfile ? (
            // View mode
            <div className="flex items-center gap-4">
              <img
                src={currentUser.player.avatar}
                className="w-16 h-16 rounded-full border-2 border-white/10 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-lg">{currentUser.player.name}</div>
                {currentUser.player.bio ? (
                  <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{currentUser.player.bio}</p>
                ) : (
                  <p className="text-gray-600 text-sm italic mt-0.5">No bio set</p>
                )}
              </div>
            </div>
          ) : (
            // Edit mode
            <div className="space-y-4 animate-fadeIn">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                  <img
                    src={editAvatar}
                    className="w-16 h-16 rounded-full border-2 border-white/20 object-cover group-hover:border-cyber-pink transition-colors"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-cyber-pink" />
                  </div>
                </div>
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="text-xs text-cyber-pink hover:text-white transition-colors font-bold"
                >
                  {showAvatarPicker ? 'Hide Options' : 'Change Avatar'}
                </button>
              </div>

              {/* Avatar Picker */}
              {showAvatarPicker && (
                <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-3 animate-slideUp">
                  {/* Google photo */}
                  {currentUser.photoURL && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Google Photo</label>
                      <button
                        onClick={() => { setEditAvatar(currentUser.photoURL); setShowAvatarPicker(false); }}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-all hover:scale-110 ${editAvatar === currentUser.photoURL ? 'border-cyber-cyan' : 'border-white/20'}`}
                      >
                        <img src={currentUser.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    </div>
                  )}
                  {/* Upload */}
                  <div>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="flex items-center gap-1 text-xs bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 px-3 py-1.5 rounded font-bold transition-all"
                    >
                      <Upload size={12} /> Upload Image
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </div>
                  {/* Presets */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATARS.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => { setEditAvatar(url); setShowAvatarPicker(false); }}
                          className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all hover:scale-110 ${editAvatar === url ? 'border-cyber-pink' : 'border-white/20'}`}
                        >
                          <img src={url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Username</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.substring(0, 20))}
                  className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded font-mono focus:border-cyber-pink outline-none"
                />
                <span className={`text-[10px] font-mono ${editName.length >= 18 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{editName.length}/20</span>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.substring(0, 150))}
                  placeholder="Tell the league about yourself..."
                  rows={2}
                  className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded font-mono text-sm focus:border-cyber-pink outline-none resize-none"
                />
                <span className={`text-[10px] font-mono ${editBio.length >= 130 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{editBio.length}/150</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export / Import */}
      <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-cyan">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Download className="text-cyber-cyan" size={20} />
              Export / Import Data
            </h3>
            <p className="text-gray-400 mt-2 text-sm">
              Download your league data as JSON{isAdmin ? ' or import from a backup file' : ''}.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={onExport}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-4 py-2 rounded font-bold transition-all text-sm"
            >
              <Download size={16} /> EXPORT
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 hover:text-white px-4 py-2 rounded font-bold transition-all text-sm"
                >
                  <Upload size={16} /> IMPORT
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin-only: User Management */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-yellow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-cyber-yellow" size={20} />
              User Management
            </h3>
            <button
              onClick={handleToggleUsers}
              className="text-xs bg-cyber-yellow/10 border border-cyber-yellow/30 text-cyber-yellow hover:bg-cyber-yellow hover:text-black px-3 py-1.5 rounded font-bold transition-all"
            >
              {showUsers ? 'Hide' : 'Manage Users'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Promote or demote users. Admins can delete players, matches, and reset the league.
          </p>

          {showUsers && (
            <div className="space-y-3 animate-slideUp">
              {userLoading ? (
                <div className="text-gray-500 text-sm py-4 text-center">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-gray-500 text-sm py-4 text-center italic">No linked users found.</div>
              ) : (
                users.map(user => (
                  <div key={user.uid} className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} className="w-8 h-8 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <span className="text-sm font-bold text-white">{user.name}</span>
                        {user.isAdmin && (
                          <span className="ml-2 text-[9px] font-bold text-cyber-yellow bg-cyber-yellow/10 px-1.5 py-0.5 rounded uppercase">Admin</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {user.isAdmin ? (
                        <button
                          onClick={() => handleDemote(user.uid)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded font-bold transition-colors"
                        >
                          <ShieldOff size={12} /> Demote
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(user.uid)}
                          className="flex items-center gap-1 text-xs text-cyber-yellow hover:text-black bg-cyber-yellow/10 hover:bg-cyber-yellow px-3 py-1.5 rounded font-bold transition-colors"
                        >
                          <ShieldCheck size={12} /> Promote
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin-only: League Management */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-cyan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="text-cyber-cyan" size={20} />
              League Management
            </h3>
            <button
              onClick={() => setShowLeagueManager(!showLeagueManager)}
              className="text-xs bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-3 py-1.5 rounded font-bold transition-all"
            >
              {showLeagueManager ? 'Hide' : 'Manage Leagues'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Create, edit, and delete leagues. Players can be assigned to leagues in the Player Management section.
          </p>

          {showLeagueManager && (
            <div className="space-y-4 animate-slideUp">
              {/* Create New League */}
              <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Plus size={14} /> Create New League
                </h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="League name"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newLeagueDesc}
                    onChange={(e) => setNewLeagueDesc(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
                  />
                  <button
                    onClick={handleCreateLeague}
                    disabled={!newLeagueName.trim() || leagueActionLoading === 'create'}
                    className="w-full bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-4 py-2 rounded font-bold transition-all text-sm disabled:opacity-50"
                  >
                    {leagueActionLoading === 'create' ? 'Creating...' : 'Create League'}
                  </button>
                </div>
              </div>

              {/* League List */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Existing Leagues ({leagues.length})</h4>
                {leagues.length === 0 ? (
                  <div className="text-gray-500 text-sm py-4 text-center italic border border-dashed border-white/10 rounded-lg">
                    No leagues yet. Create one to organize players.
                  </div>
                ) : (
                  leagues.map(league => (
                    <div key={league.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-white/5">
                      {editingLeague?.id === league.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editLeagueName}
                            onChange={(e) => setEditLeagueName(e.target.value)}
                            className="flex-1 bg-black/50 border border-cyber-cyan/50 text-white p-2 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveLeague}
                            disabled={leagueActionLoading === league.id}
                            className="p-2 text-green-400 hover:bg-green-400/20 rounded-lg transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingLeague(null)}
                            className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Building2 size={16} className="text-cyber-cyan" />
                            <div>
                              <span className="text-sm font-bold text-white">{league.name}</span>
                              {league.description && (
                                <p className="text-xs text-gray-500">{league.description}</p>
                              )}
                              <p className="text-xs text-gray-600 font-mono">
                                {players.filter(p => p.leagueId === league.id).length} players
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditLeague(league)}
                              className="p-2 text-gray-400 hover:text-cyber-cyan hover:bg-cyber-cyan/10 rounded-lg transition-colors"
                              title="Edit league"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteLeague(league.id, league.name)}
                              disabled={leagueActionLoading === league.id}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete league"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin-only: Player Management */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-pink">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCog className="text-cyber-pink" size={20} />
              Player Management
            </h3>
            <button
              onClick={() => setShowPlayerManager(!showPlayerManager)}
              className="text-xs bg-cyber-pink/10 border border-cyber-pink/30 text-cyber-pink hover:bg-cyber-pink hover:text-black px-3 py-1.5 rounded font-bold transition-all"
            >
              {showPlayerManager ? 'Hide' : 'Manage Players'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Edit player names, assign to leagues, or delete players. Use with caution.
          </p>

          {showPlayerManager && (
            <div className="space-y-4 animate-slideUp">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 text-white pl-10 pr-4 py-2 rounded-lg font-mono text-sm focus:border-cyber-pink outline-none"
                />
              </div>

              {/* Player List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPlayers.length === 0 ? (
                  <div className="text-gray-500 text-sm py-4 text-center italic">
                    {playerSearch ? 'No players match your search.' : 'No players found.'}
                  </div>
                ) : (
                  filteredPlayers.map(player => (
                    <div key={player.id} className="bg-black/30 rounded-lg p-3 border border-white/5">
                      {editingPlayer?.id === player.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <img src={player.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={editPlayerName}
                                onChange={(e) => setEditPlayerName(e.target.value)}
                                className="w-full bg-black/50 border border-cyber-pink/50 text-white p-2 rounded-lg font-mono text-sm focus:border-cyber-pink outline-none"
                                autoFocus
                              />
                              <select
                                value={editPlayerLeague || ''}
                                onChange={(e) => setEditPlayerLeague(e.target.value || null)}
                                className="w-full bg-black/50 border border-white/10 text-gray-300 p-2 rounded-lg font-mono text-sm focus:border-cyber-pink outline-none"
                              >
                                <option value="">No League (Global)</option>
                                {leagues.map(l => (
                                  <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleSavePlayer}
                              disabled={playerActionLoading === player.id}
                              className="flex items-center gap-1 text-xs bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black px-3 py-1.5 rounded font-bold transition-all"
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              onClick={() => setEditingPlayer(null)}
                              className="flex items-center gap-1 text-xs bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 px-3 py-1.5 rounded font-bold transition-all"
                            >
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={player.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                            <div>
                              <span className="text-sm font-bold text-white">{player.name}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="font-mono">ELO: {player.eloSingles}</span>
                                <span>•</span>
                                <span>{player.wins}W/{player.losses}L</span>
                                {player.leagueId && (
                                  <>
                                    <span>•</span>
                                    <span className="text-cyber-cyan">
                                      {leagues.find(l => l.id === player.leagueId)?.name || 'Unknown League'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditPlayer(player)}
                              className="p-2 text-gray-400 hover:text-cyber-pink hover:bg-cyber-pink/10 rounded-lg transition-colors"
                              title="Edit player"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(player.id, player.name)}
                              disabled={playerActionLoading === player.id}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete player"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin-only: Recalculate Stats */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-cyan">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calculator className="text-cyber-cyan" size={20} />
                Recalculate Stats
              </h3>
              <p className="text-gray-400 mt-2 text-sm">
                Fix stat discrepancies by recalculating all player wins/losses/streaks from match history.
              </p>
            </div>
            <button
              onClick={handleRecalculateStats}
              disabled={recalcLoading}
              className="w-full md:w-auto flex-shrink-0 bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-4 py-2 rounded font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {recalcLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> RECALCULATING...
                </>
              ) : (
                <>
                  <Calculator size={16} /> RECALCULATE
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Admin-only: Match Management */}
      {isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-purple">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Swords className="text-cyber-purple" size={20} />
              Match Management
            </h3>
            <button
              onClick={() => setShowMatchManager(!showMatchManager)}
              className="text-xs bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple hover:bg-cyber-purple hover:text-white px-3 py-1.5 rounded font-bold transition-all"
            >
              {showMatchManager ? 'Hide' : 'Manage Matches'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            View and delete matches. Deleting a match reverses ELO changes and stats.
          </p>

          {showMatchManager && (
            <div className="space-y-4 animate-slideUp">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by player name..."
                    value={matchFilter}
                    onChange={(e) => setMatchFilter(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white pl-10 pr-4 py-2 rounded-lg font-mono text-sm focus:border-cyber-purple outline-none"
                  />
                </div>
                <select
                  value={matchLeagueFilter || ''}
                  onChange={(e) => setMatchLeagueFilter(e.target.value || null)}
                  className="bg-black/50 border border-white/10 text-gray-300 px-4 py-2 rounded-lg font-mono text-sm focus:border-cyber-purple outline-none"
                >
                  <option value="">All Leagues</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Match List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredMatches.length === 0 ? (
                  <div className="text-gray-500 text-sm py-4 text-center italic">
                    {matchFilter || matchLeagueFilter ? 'No matches match your filters.' : 'No matches found.'}
                  </div>
                ) : (
                  filteredMatches.slice(0, 50).map(match => {
                    const winnerNames = match.winners.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
                    const loserNames = match.losers.map(id => players.find(p => p.id === id)?.name || 'Unknown').join(' & ');
                    const leagueName = match.leagueId ? leagues.find(l => l.id === match.leagueId)?.name : null;
                    return (
                      <div key={match.id} className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-white truncate">{winnerNames}</span>
                              <span className="text-cyber-cyan font-mono">{match.scoreWinner}-{match.scoreLoser}</span>
                              <span className="text-gray-400 truncate">{loserNames}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span className="font-mono">{new Date(match.timestamp).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className={match.isFriendly ? 'text-amber-400' : 'text-cyber-cyan'}>
                                {match.isFriendly ? 'Friendly' : `ELO: ${match.eloChange > 0 ? '+' : ''}${match.eloChange}`}
                              </span>
                              {leagueName && (
                                <>
                                  <span>•</span>
                                  <span className="text-cyber-cyan">{leagueName}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            disabled={matchActionLoading === match.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                            title="Delete match and reverse ELO"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                {filteredMatches.length > 50 && (
                  <div className="text-center text-xs text-gray-500 py-2">
                    Showing 50 of {filteredMatches.length} matches. Refine filters to see more.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Season Reset */}
          <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-purple">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <RefreshCw className="text-cyber-purple" size={20} />
                  Start New Season
                </h3>
                <p className="text-gray-400 mt-2 text-sm">
                  Resets all stats (Elo, W/L, History) to defaults.
                  <span className="text-white font-bold ml-1">Keeps players.</span>
                </p>
              </div>
              <button
                onClick={onResetSeason}
                className="w-full md:w-auto flex-shrink-0 bg-cyber-purple/10 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white px-4 py-2 rounded font-bold transition-all text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> RESET SEASON
              </button>
            </div>
          </div>

          {/* Start Fresh (No Demo) */}
          <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-yellow">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserX className="text-cyber-yellow" size={20} />
                  Start Fresh Group
                </h3>
                <p className="text-gray-400 mt-2 text-sm">
                  <span className="text-cyber-yellow font-bold uppercase">Exit Demo Mode.</span> Deletes all players and data. Starts with an empty roster so you can add your own people.
                </p>
              </div>
              <button
                 onClick={onStartFresh}
                 className="w-full md:w-auto flex-shrink-0 bg-cyber-yellow/10 border border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black px-4 py-2 rounded font-bold transition-all text-sm flex items-center justify-center gap-2"
              >
                <UserX size={16} /> CLEAR ROSTER
              </button>
            </div>
          </div>

          {/* Factory Reset */}
          <div className="glass-panel p-6 rounded-xl border-l-4 border-l-red-500">
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={20} />
                  Factory Reset
                </h3>
                <p className="text-gray-400 mt-2 text-sm">
                  Wipes everything and <span className="text-white font-bold">restores the demo data</span> (Neo, Trinity, etc).
                </p>
              </div>
              <button
                 onClick={onFactoryReset}
                 className="w-full md:w-auto flex-shrink-0 bg-red-500/10 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded font-bold transition-all text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> RESTORE DEMO
              </button>
            </div>
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-gray-600">
          <p className="text-gray-400 text-sm">
            Season resets, data imports, and destructive actions are restricted to admins.
          </p>
        </div>
      )}

      {/* Backups Section */}
      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowBackups(!showBackups)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <History size={20} />
            <span className="font-bold">Client-Side Backups</span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{backups.length}</span>
          </button>

          <button onClick={handleCreateBackup} className="text-xs bg-white/5 border border-white/20 px-2 py-1 rounded text-white hover:bg-white/10">
            + Create Backup
          </button>
        </div>

        {showBackups && (
          <div className="mt-4 space-y-3 animate-slideUp">
            {backups.length === 0 && <div className="text-gray-500 italic text-sm">No backups found.</div>}
            {backups.map(b => (
              <div key={b.id} className="glass-panel p-4 rounded-lg flex items-center justify-between border-l-2 border-l-gray-500">
                <div>
                  <div className="font-bold text-white text-sm">{b.label}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {new Date(b.timestamp).toLocaleString()} &bull; {b.data.players.length} Players &bull; {b.data.matches.length} Matches
                  </div>
                </div>
                <div className="flex gap-2">
                    <button
                    onClick={() => handleDownload(b)}
                    className="bg-white/5 hover:bg-cyber-yellow hover:text-black text-cyber-yellow border border-cyber-yellow/30 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                    title="Download JSON"
                    >
                    <Download size={12} /> SAVE
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-600 font-mono mt-12">
        CyberPong System v3.0 &bull; Server Synced &bull; Auth Enabled &bull; Polling Interval: 5s
      </div>
    </div>
  );
};

export default Settings;
