import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCw, AlertTriangle, Save, History, UserX, Download, Upload, ShieldCheck, ShieldOff, Users, Pencil, Camera, Check, X } from 'lucide-react';
import { getBackups, createBackup, Backup, LeagueState, listUsers, promoteUser, demoteUser } from '../services/storageService';
import { AppUser } from '../types';
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
}

interface UserEntry {
  uid: string;
  name: string;
  avatar: string;
  isAdmin: boolean;
}

const Settings: React.FC<SettingsProps> = ({ isAdmin, currentUser, onResetSeason, onFactoryReset, onStartFresh, onExport, onImport, onUpdateProfile }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
