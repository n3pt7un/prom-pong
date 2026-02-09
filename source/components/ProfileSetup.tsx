import React, { useState, useRef } from 'react';
import { Trophy, Upload, Camera, User, Loader2, Sparkles } from 'lucide-react';
import { AVATARS } from '../constants';
import { resizeImage } from '../utils/imageUtils';

interface ProfileSetupProps {
  googleName: string;
  googlePhoto: string;
  onComplete: (name: string, avatar: string, bio: string) => Promise<void>;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ googleName, googlePhoto, onComplete }) => {
  const [name, setName] = useState(googleName.substring(0, 20));
  const [avatar, setAvatar] = useState(googlePhoto);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'profile' | 'avatar'>('profile');
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

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] bg-cyber-pink/10 blur-[100px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 glass-panel p-8 md:p-10 rounded-2xl border border-white/10 max-w-lg w-full mx-4">
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

        {step === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Avatar Preview + Change */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => setStep('avatar')}>
                <img
                  src={avatar || 'https://picsum.photos/id/64/200/200'}
                  className="w-24 h-24 rounded-full border-2 border-white/20 object-cover group-hover:border-cyber-cyan transition-colors"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-cyber-cyan" />
                </div>
              </div>
              <button
                onClick={() => setStep('avatar')}
                className="text-xs text-cyber-cyan hover:text-white transition-colors font-bold"
              >
                Change Avatar
              </button>
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
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
              className="w-full bg-cyber-cyan text-black font-bold px-6 py-4 rounded-xl text-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  <User size={20} /> JOIN THE LEAGUE
                </>
              )}
            </button>
          </div>
        )}

        {step === 'avatar' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Choose Your Avatar</h3>

            {/* Current avatar */}
            <div className="flex justify-center">
              <img
                src={avatar || 'https://picsum.photos/id/64/200/200'}
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 hover:text-white px-4 py-2 rounded-lg font-bold transition-all text-sm"
              >
                <Upload size={14} /> Upload Image
              </button>
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
            <button
              onClick={() => setStep('profile')}
              className="w-full bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 hover:text-white px-4 py-3 rounded-lg font-bold transition-all text-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
