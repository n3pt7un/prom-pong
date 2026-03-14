import React, { useState, useRef } from 'react';
import { Trophy, Upload, Camera, User, Loader2, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AVATARS } from '../constants';
import { resizeImage, thumbUrl } from '../utils/imageUtils';
import { Player } from '../types';

interface ProfileSetupProps {
  googleName: string;
  googlePhoto: string;
  onComplete: (name: string, avatar: string, bio: string) => Promise<void>;
  unclaimedPlayers?: Player[];
  onClaim?: (playerId: string) => Promise<void>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ googleName, googlePhoto, onComplete, unclaimedPlayers = [], onClaim }) => {
  const [name, setName] = useState(googleName.substring(0, 20));
  const [avatar, setAvatar] = useState(googlePhoto);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'profile' | 'avatar'>('profile');
  const [mode, setMode] = useState<'choose' | 'create'>( unclaimedPlayers.length > 0 ? 'choose' : 'create');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file);
      setAvatar(resized);
    } catch {
      setError('Failed to process image');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Username is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onComplete(name.trim(), avatar, bio.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      setLoading(false);
    }
  };

  const handleClaim = async (playerId: string) => {
    if (!onClaim) return;
    setClaimingId(playerId);
    setError(null);
    try {
      await onClaim(playerId);
    } catch (err: any) {
      setError(err.message || 'Failed to claim account');
      setClaimingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] bg-cyber-pink/10 blur-[100px] rounded-full animate-pulse" />
      </div>

      <Card className="relative z-10 p-8 md:p-10 rounded-2xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="text-cyber-cyan" size={24} />
            <h1 className="font-display font-bold text-2xl tracking-wider text-white">
              INITIALIZE <span className="text-cyber-cyan">AGENT</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-mono">Set up your player profile to join the league</p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-cyber-cyan/30 to-transparent mb-8" />

        {/* Claim existing account section */}
        {mode === 'choose' && unclaimedPlayers.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Claim Your Account</h3>
              <p className="text-xs text-gray-500 font-mono">An admin already created a player for you? Claim it to keep your stats.</p>
            </div>

            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1">
              {unclaimedPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => handleClaim(player.id)}
                  disabled={claimingId !== null}
                  className="glass-card p-4 rounded-lg border border-white/10 hover:border-cyber-cyan/50 transition-all flex items-center gap-4 text-left group disabled:opacity-50 w-full bg-transparent cursor-pointer"
                >
                  <img
                    src={thumbUrl(player.avatar || 'https://picsum.photos/id/64/200/200', 48)}
                    className="w-12 h-12 rounded-full border-2 border-white/20 object-cover group-hover:border-cyber-cyan transition-colors flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm truncate">{player.name}</div>
                    <div className="text-[10px] font-mono text-gray-500 flex gap-3 mt-1">
                      <span>ELO {player.eloSingles}</span>
                      <span>{player.winsSingles + player.winsDoubles}W / {player.lossesSingles + player.lossesDoubles}L</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {claimingId === player.id ? (
                      <Loader2 className="text-cyber-cyan animate-spin" size={18} />
                    ) : (
                      <UserCheck size={18} className="text-gray-600 group-hover:text-cyber-cyan transition-colors" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-sm font-mono text-center">{error}</p>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <Button
              variant="outline"
              onClick={() => { setMode('create'); setError(null); }}
              className="w-full flex items-center justify-center gap-2"
            >
              <User size={16} /> Create New Profile Instead <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {(mode === 'create' || unclaimedPlayers.length === 0) && step === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            {/* Avatar Preview + Change */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => setStep('avatar')}>
                <img
                  src={thumbUrl(avatar || 'https://picsum.photos/id/64/200/200', 96)}
                  className="w-24 h-24 rounded-full border-2 border-white/20 object-cover group-hover:border-cyber-cyan transition-colors"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-cyber-cyan" />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('avatar')}
                className="text-cyber-cyan hover:text-white"
              >
                Change Avatar
              </Button>
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.substring(0, 20))}
                placeholder="Choose your codename..."
                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-lg font-mono text-lg focus:border-cyber-cyan outline-none transition-colors"
                autoFocus
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-600">This is how other players see you</span>
                <span className={`text-[10px] font-mono ${name.length >= 18 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{name.length}/20</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Bio <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.substring(0, 150))}
                placeholder="Fear my backhand spin..."
                rows={3}
                className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-lg font-mono text-sm focus:border-cyber-cyan outline-none resize-none transition-colors"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] font-mono ${bio.length >= 130 ? 'text-cyber-yellow' : 'text-gray-600'}`}>{bio.length}/150</span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm font-mono text-center">{error}</p>
            )}

            {/* Submit */}
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="w-full bg-cyber-cyan text-black hover:bg-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  <User size={20} /> JOIN THE LEAGUE
                </>
              )}
            </Button>

            {unclaimedPlayers.length > 0 && mode === 'create' && (
              <Button
                variant="outline"
                onClick={() => { setMode('choose'); setError(null); }}
                className="w-full flex items-center justify-center gap-2"
              >
                <UserCheck size={16} /> Claim Existing Account Instead
              </Button>
            )}
          </div>
        )}

        {step === 'avatar' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Choose Your Avatar</h3>

            {/* Current avatar */}
            <div className="flex justify-center">
              <img
                src={thumbUrl(avatar || 'https://picsum.photos/id/64/200/200', 80)}
                className="w-20 h-20 rounded-full border-2 border-cyber-cyan object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Google Photo option */}
            {googlePhoto && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Your Google Photo</label>
                <button
                  onClick={() => { setAvatar(googlePhoto); setStep('profile'); }}
                  className={`w-16 h-16 rounded-full border-2 overflow-hidden transition-all hover:scale-110 ${
                    avatar === googlePhoto ? 'border-cyber-cyan scale-110' : 'border-white/20'
                  }`}
                >
                  <img src={googlePhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              </div>
            )}

            {/* Upload */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Upload Custom</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload size={14} /> Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Presets */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Preset Avatars</label>
              <div className="grid grid-cols-5 gap-3">
                {AVATARS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => { setAvatar(url); setStep('profile'); }}
                    className={`w-14 h-14 rounded-full border-2 overflow-hidden transition-all hover:scale-110 ${
                      avatar === url ? 'border-cyber-pink scale-110 shadow-neon-pink' : 'border-white/20'
                    }`}
                  >
                    <img src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Back */}
            <Button
              variant="outline"
              onClick={() => setStep('profile')}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProfileSetup;
