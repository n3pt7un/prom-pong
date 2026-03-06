import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Camera, Check, X, User } from 'lucide-react';
import { AppUser } from '../types';
import { AVATARS } from '../constants';
import { resizeImage } from '../utils/imageUtils';

interface SettingsProps {
  currentUser: AppUser | null;
  onExport: () => void;
  onUpdateProfile: (updates: { name?: string; avatar?: string; bio?: string }) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onExport, onUpdateProfile }) => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.player?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.player?.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.player?.avatar || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 200, 200);
      setEditAvatar(resized);
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-display font-bold text-white border-l-4 border-cyber-cyan pl-3">
          SETTINGS
        </h2>
      </div>

      {/* Profile Section */}
      {currentUser?.player && (
        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-pink">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="text-cyber-pink" size={20} />
                Your Profile
              </h3>
              <p className="text-gray-400 mt-1 text-sm">Customize your player profile</p>
            </div>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-2 bg-cyber-pink/10 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-black px-4 py-2 rounded font-bold transition-all text-sm"
              >
                <Camera size={16} /> Edit Profile
              </button>
            )}
          </div>

          {!editingProfile ? (
            <div className="flex items-start gap-4">
              <img
                src={currentUser.player.avatar}
                alt={currentUser.player.name}
                className="w-20 h-20 rounded-full border-2 border-cyber-pink object-cover"
              />
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white">{currentUser.player.name}</h4>
                {currentUser.player.bio && (
                  <p className="text-sm text-gray-400 mt-1">{currentUser.player.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-mono">
                  <span>Singles ELO: <span className="text-cyber-cyan font-bold">{currentUser.player.eloSingles}</span></span>
                  <span>Doubles ELO: <span className="text-cyber-pink font-bold">{currentUser.player.eloDoubles}</span></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2 mb-4">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex items-center gap-1 bg-white/5 border border-white/20 text-gray-400 hover:bg-white/10 px-3 py-1.5 rounded font-bold transition-all text-sm"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-1 bg-cyber-pink/20 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-black px-3 py-1.5 rounded font-bold transition-all text-sm disabled:opacity-50"
                >
                  <Check size={14} /> {profileSaving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {/* Avatar */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={editAvatar}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full border-2 border-cyber-pink object-cover"
                    />
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
                  <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-3 animate-slideUp mt-3">
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
                    <div>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 px-3 py-1.5 rounded font-bold transition-all"
                      >
                        <Upload size={12} /> Upload Image
                      </button>
                      <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </div>
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
              </div>

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

      {/* Export Data */}
      <div className="glass-panel p-6 rounded-xl border-l-4 border-l-cyber-cyan">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Download className="text-cyber-cyan" size={20} />
              Export Data
            </h3>
            <p className="text-gray-400 mt-2 text-sm">
              Download your league data as JSON for backup purposes.
            </p>
          </div>
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black px-4 py-2 rounded font-bold transition-all text-sm"
          >
            <Download size={16} /> EXPORT
          </button>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs text-blue-400">
          <strong>Note:</strong> Admin users can access advanced management features through the Admin Panel button in the header.
        </p>
      </div>
    </div>
  );
};

export default Settings;
