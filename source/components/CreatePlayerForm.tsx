import React, { useState, useRef } from 'react';
import { AVATARS } from '../constants';
import { Racket } from '../types';
import { UserPlus, Upload, Zap } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { formatRacketStats } from './RacketManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border-cyber-cyan/30 shadow-neon-cyan max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserPlus className="text-cyber-cyan w-5 h-5" />
            NEW <span className="text-cyber-cyan ml-1">PLAYER</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label className="text-cyber-cyan">Codename</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              autoFocus
            />
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label className="text-cyber-pink">Avatar Identity</Label>
            
            <div className="flex flex-col gap-4">
               {/* Upload Button */}
               <div className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-cyber-pink shadow-neon-pink">
                    <img src={avatar} alt="Current" className="w-full h-full object-cover" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} className="mr-1" /> Upload Custom
                  </Button>
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
            <Label className="text-cyber-yellow">Primary Racket</Label>
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

          <Button
            type="submit"
            disabled={!name.trim()}
            variant="cyber"
            className="w-full"
          >
            INITIALIZE AGENT
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlayerForm;