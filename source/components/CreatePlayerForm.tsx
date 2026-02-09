import React, { useState, useRef } from 'react';
import { AVATARS } from '../constants';
import { Racket } from '../types';
import { UserPlus, X, Upload, Zap } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { formatRacketStats } from './RacketManager';

interface CreatePlayerFormProps {
  rackets: Racket[];
  onClose: () => void;
  onSubmit: (name: string, avatar: string, racketId?: string) => void;
}

const CreatePlayerForm: React.FC<CreatePlayerFormProps> = ({ rackets, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [selectedRacketId, setSelectedRacketId] = useState<string>('');
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name, avatar, selectedRacketId || undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resized = await resizeImage(file);
        setAvatar(resized);
        setIsCustomUpload(true);
      } catch (err) {
        console.error("Failed to process image", err);
        alert("Image upload failed. Try a smaller file.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg glass-panel p-6 rounded-xl border border-cyber-cyan/30 shadow-neon-cyan animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="text-cyber-cyan w-6 h-6" />
          <h2 className="text-xl font-display font-bold text-white">NEW <span className="text-cyber-cyan">PLAYER</span></h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-cyber-cyan uppercase tracking-widest">Codename</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="w-full bg-black/50 border border-white/10 text-white p-3 rounded font-mono focus:border-cyber-cyan focus:outline-none focus:ring-1 focus:ring-cyber-cyan transition-all"
              autoFocus
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-cyber-pink uppercase tracking-widest">Avatar Identity</label>
            
            <div className="flex flex-col gap-4">
               {/* Upload Button */}
               <div className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cyber-pink shadow-neon-pink">
                    <img src={avatar} alt="Current" className="w-full h-full object-cover" />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/20 rounded hover:bg-white/10 text-sm text-gray-300 transition-colors"
                  >
                    <Upload size={16} /> Upload Custom
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
               </div>

               {/* Preset Grid */}
               <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setAvatar(img); setIsCustomUpload(false); }}
                    className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all ${
                      avatar === img && !isCustomUpload
                        ? 'border-cyber-pink scale-110 shadow-neon-pink' 
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Racket Selection */}
          <div className="space-y-2">
             <label className="text-xs font-mono text-cyber-yellow uppercase tracking-widest">Primary Racket</label>
             <div className="relative">
                <select
                  value={selectedRacketId}
                  onChange={(e) => setSelectedRacketId(e.target.value)}
                  className="w-full appearance-none bg-black/50 border border-white/10 text-white p-3 rounded font-mono focus:border-cyber-yellow outline-none"
                >
                  <option value="">-- No Racket Equipped --</option>
                  {rackets.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({formatRacketStats(r.stats)})</option>
                  ))}
                </select>
                <Zap className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={16} />
             </div>
          </div>

          <button 
            type="submit" 
            disabled={!name.trim()}
            className="w-full py-3 bg-cyber-cyan/10 border border-cyber-cyan text-cyber-cyan font-bold font-display rounded hover:bg-cyber-cyan hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            INITIALIZE AGENT
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePlayerForm;