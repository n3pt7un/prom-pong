import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Camera, Check, X, User, Vibrate } from 'lucide-react';
import { AppUser } from '../types';
import { AVATARS } from '../constants';
import { resizeImage, thumbUrl } from '../utils/imageUtils';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useHaptic } from '../context/HapticContext';

interface SettingsProps {
  currentUser: AppUser | null;
  onExport: () => void;
  onUpdateProfile: (updates: { name?: string; avatar?: string; bio?: string }) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onExport, onUpdateProfile }) => {
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled, isTouchDevice } = useHaptic();
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
      const resized = await resizeImage(file);
      setEditAvatar(resized);
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-display font-bold text-white border-l-4 border-cyber-cyan pl-3">
          SETTINGS
        </h2>
      </div>

      {/* Profile Section */}
      {currentUser?.player && (
        <Card className="p-6 border-l-4 border-l-cyber-pink">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="text-cyber-pink" size={20} />
                Your Profile
              </h3>
              <p className="text-gray-400 mt-1 text-sm">Customize your player profile</p>
            </div>
            {!editingProfile && (
              <Button size="sm" variant="cyber-pink" onClick={() => setEditingProfile(true)}>
                <Camera size={14} className="mr-1" /> Edit Profile
              </Button>
            )}
          </div>

          {!editingProfile ? (
            <div className="flex items-start gap-4">
              <img
                src={thumbUrl(currentUser.player.avatar, 80)}
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
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                  <X size={13} className="mr-1" /> Cancel
                </Button>
                <Button size="sm" variant="cyber-pink" onClick={handleSaveProfile} disabled={profileSaving}>
                  <Check size={13} className="mr-1" /> {profileSaving ? 'Saving...' : 'Save'}
                </Button>
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
                <Label className="text-gray-400 mb-1 block">Username</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.substring(0, 20))}
                  className="border-cyber-pink/30 focus:border-cyber-pink"
                />
                <span className={`text-[10px] font-mono ${editName.length >= 18 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{editName.length}/20</span>
              </div>

              {/* Bio */}
              <div>
                <Label className="text-gray-400 mb-1 block">Bio</Label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.substring(0, 150))}
                  placeholder="Tell the league about yourself..."
                  rows={2}
                  className="w-full bg-black/50 border border-white/10 text-white p-2.5 rounded font-mono text-sm focus:border-cyber-pink outline-none resize-none focus:ring-1 focus:ring-cyber-pink focus:border-cyber-pink transition-colors"
                />
                <span className={`text-[10px] font-mono ${editBio.length >= 130 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{editBio.length}/150</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Export Data */}
      <Card className="p-6 border-l-4 border-l-cyber-cyan">
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
          <Button variant="cyber" onClick={onExport}>
            <Download size={14} className="mr-1" /> EXPORT
          </Button>
        </div>
      </Card>

      {/* Haptic Feedback */}
      {isTouchDevice && (
        <Card className="p-6 border-l-4 border-l-cyber-pink">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Vibrate className="text-cyber-pink" size={20} />
                Haptic Feedback
              </h3>
              <p className="text-gray-400 mt-1 text-sm">
                Vibration on key actions
              </p>
            </div>
            <button
              role="switch"
              aria-checked={hapticsEnabled}
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-cyber-pink focus:ring-offset-2 focus:ring-offset-black ${hapticsEnabled ? 'bg-cyber-pink border-cyber-pink' : 'bg-transparent border-gray-500'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${hapticsEnabled ? 'bg-white translate-x-5' : 'bg-gray-500 translate-x-0'}`}
              />
            </button>
          </div>
        </Card>
      )}

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
