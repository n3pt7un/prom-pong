import React, { useState } from 'react';
import { Racket, RacketStats } from '../types';
import { STAT_BUDGET, STAT_NAMES, STAT_LABELS, NEON_COLORS, RACKET_ICON_NAMES, RACKET_PRESETS, DEFAULT_STATS } from '../constants';
import {
  Zap, Shield, Target, Crosshair, Hexagon, Component, Sword, Hammer,
  Flame, Snowflake, Star, Moon, Sun, Gem, Crown, Skull, Heart, Wind, Atom, Bolt,
  Plus, Trash2, ChevronDown, ChevronUp, Pencil, X, Info
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface RacketManagerProps {
  rackets: Racket[];
  onCreateRacket: (name: string, icon: string, color: string, stats: RacketStats) => void;
  onDeleteRacket?: (id: string) => void;
  onUpdateRacket?: (id: string, name: string, icon: string, color: string, stats: RacketStats) => void;
}

// Icon dictionary for rendering
export const RACKET_ICONS: Record<string, any> = {
  Zap, Shield, Target, Crosshair, Hexagon, Component, Sword, Hammer,
  Flame, Snowflake, Star, Moon, Sun, Gem, Crown, Skull, Heart, Wind, Atom, Bolt,
};

// Helper: format stats for display
export const formatRacketStats = (stats: RacketStats | string): string => {
  if (typeof stats === 'string') return stats;
  const entries = Object.entries(stats)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3);
  return entries.map(([k, v]) => `${STAT_LABELS[k as keyof RacketStats]} ${v}`).join(' / ');
};

const STAT_DESCRIPTIONS: Record<string, string> = {
  speed: 'How fast you can swing and recover. High speed = quick exchanges and fast serves.',
  spin: 'Your ability to put spin on the ball. High spin = tricky curves and deceptive returns.',
  power: 'Raw hitting force. High power = smashes that are hard to return.',
  control: 'Precision and placement accuracy. High control = consistent shots right where you want them.',
  defense: 'Your ability to block, return, and survive rallies. High defense = wall-like resilience.',
  chaos: 'Unpredictability factor. High chaos = wild, unorthodox shots that confuse opponents.',
};

const RacketManager: React.FC<RacketManagerProps> = ({ rackets, onCreateRacket, onDeleteRacket, onUpdateRacket }) => {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRacketId, setEditingRacketId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Zap');
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[0]);
  const [stats, setStats] = useState<RacketStats>({ ...DEFAULT_STATS });
  const [showInfo, setShowInfo] = useState(false);

  const isEditMode = editingRacketId !== null;

  const totalPoints = STAT_NAMES.reduce((sum, key) => sum + stats[key], 0);
  const remaining = STAT_BUDGET - totalPoints;

  const handleStatChange = (key: keyof RacketStats, value: number) => {
    const clamped = Math.max(0, Math.min(20, value));
    const newStats = { ...stats, [key]: clamped };
    const newTotal = STAT_NAMES.reduce((sum, k) => sum + newStats[k], 0);
    if (newTotal <= STAT_BUDGET) {
      setStats(newStats);
    } else {
      // Clamp to budget
      const diff = newTotal - STAT_BUDGET;
      newStats[key] = Math.max(0, clamped - diff);
      setStats(newStats);
    }
  };

  const applyPreset = (preset: typeof RACKET_PRESETS[0]) => {
    setNewName(preset.name);
    setSelectedIcon(preset.icon);
    setSelectedColor(preset.color);
    setStats({ ...preset.stats });
  };

  const resetBuilder = () => {
    setNewName('');
    setStats({ ...DEFAULT_STATS });
    setSelectedIcon('Zap');
    setSelectedColor(NEON_COLORS[0]);
    setEditingRacketId(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateRacket(newName, selectedIcon, selectedColor, stats);
    resetBuilder();
    setShowBuilder(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !editingRacketId || !onUpdateRacket) return;
    onUpdateRacket(editingRacketId, newName, selectedIcon, selectedColor, stats);
    resetBuilder();
    setShowBuilder(false);
  };

  const handleEdit = (racket: Racket) => {
    setEditingRacketId(racket.id);
    setNewName(racket.name);
    setSelectedIcon(racket.icon);
    setSelectedColor(racket.color);
    if (typeof racket.stats === 'object') {
      setStats({ ...racket.stats });
    } else {
      setStats({ ...DEFAULT_STATS });
    }
    setShowBuilder(true);
  };

  const handleCancelEdit = () => {
    resetBuilder();
    setShowBuilder(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? Players using this will be unequipped.`)) {
      onDeleteRacket?.(id);
    }
  };

  const radarData = STAT_NAMES.map(key => ({
    stat: STAT_LABELS[key],
    value: stats[key],
    fullMark: 20,
  }));

  const SelectedIconComponent = RACKET_ICONS[selectedIcon] || Zap;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center gap-3">
        <Sword className="text-cyber-yellow w-8 h-8" />
        <h2 className="text-2xl font-display font-bold text-white">THE <span className="text-cyber-yellow">ARMORY</span></h2>
      </div>

      {/* Toggle Builder */}
      <button
        onClick={() => {
          if (showBuilder && isEditMode) {
            handleCancelEdit();
          } else {
            if (isEditMode) resetBuilder();
            setShowBuilder(!showBuilder);
          }
        }}
        className="w-full glass-panel p-4 rounded-xl border border-white/10 hover:border-cyber-yellow/50 transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          {isEditMode ? <Pencil size={20} className="text-cyber-yellow" /> : <Plus size={20} className="text-cyber-yellow" />}
          <span className="font-bold text-white text-lg">{isEditMode ? `EDITING: ${newName || 'Racket'}` : 'FORGE NEW RACKET'}</span>
        </div>
        {showBuilder ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </button>

      {/* Builder Panel */}
      {showBuilder && (
        <div className="glass-panel p-6 rounded-xl border border-cyber-yellow/20 space-y-6 animate-slideUp">

          {/* Edit mode banner */}
          {isEditMode && (
            <div className="flex items-center justify-between bg-cyber-yellow/5 border border-cyber-yellow/20 rounded-lg p-3">
              <span className="text-xs font-bold text-cyber-yellow uppercase tracking-widest flex items-center gap-2">
                <Pencil size={14} /> Editing Racket
              </span>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}

          {/* Presets */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Presets</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {RACKET_PRESETS.map(preset => {
                const PresetIcon = RACKET_ICONS[preset.icon] || Zap;
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="flex flex-col items-center gap-1 bg-black/30 border border-white/10 hover:border-white/30 rounded-lg p-3 transition-all hover:scale-105 group"
                  >
                    <PresetIcon size={18} style={{ color: preset.color }} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-gray-300 text-center leading-tight">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Name Input */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Racket Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. 'The Widowmaker'"
              className="w-full bg-black/50 border border-white/10 text-white p-3 rounded font-mono focus:border-cyber-yellow outline-none"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {RACKET_ICON_NAMES.map(iconName => {
                const Icon = RACKET_ICONS[iconName];
                if (!Icon) return null;
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
                      isSelected
                        ? 'border-cyber-yellow bg-cyber-yellow/20 scale-110 shadow-[0_0_10px_rgba(252,238,10,0.3)]'
                        : 'border-white/10 bg-black/30 hover:border-white/30 hover:bg-white/5'
                    }`}
                    title={iconName}
                  >
                    <Icon size={18} style={{ color: isSelected ? selectedColor : '#888' }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Color</label>
            <div className="flex flex-wrap gap-2 items-center">
              {NEON_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? 'border-white scale-110 shadow-[0_0_12px_var(--glow)]'
                      : 'border-white/20 hover:border-white/50'
                  }`}
                  style={{
                    backgroundColor: color,
                    '--glow': `${color}80`,
                  } as any}
                  title={color}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-9 h-9 rounded-full cursor-pointer bg-transparent border border-white/20"
                title="Custom color"
              />
            </div>
          </div>

          {/* Stats Sliders + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sliders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stats</label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  remaining === 0 ? 'text-cyber-yellow bg-cyber-yellow/10' :
                  remaining < 0 ? 'text-red-400 bg-red-500/10' :
                  'text-gray-400 bg-white/5'
                }`}>
                  {remaining} pts remaining
                </span>
              </div>
              <div className="space-y-3">
                {STAT_NAMES.map(key => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-16 text-right">{STAT_LABELS[key]}</span>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={stats[key]}
                      onChange={(e) => handleStatChange(key, parseInt(e.target.value))}
                      className="flex-1 h-2 appearance-none bg-white/10 rounded-full cursor-pointer accent-cyber-yellow"
                      style={{
                        background: `linear-gradient(to right, ${selectedColor} 0%, ${selectedColor} ${(stats[key] / 20) * 100}%, rgba(255,255,255,0.1) ${(stats[key] / 20) * 100}%)`,
                      }}
                    />
                    <span className="text-xs font-mono text-white w-6 text-center font-bold">{stats[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar Chart Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full h-[200px] lg:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#888', fontSize: 10 }} />
                    <Radar
                      dataKey="value"
                      stroke={selectedColor}
                      fill={selectedColor}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Preview Card */}
              <div className="flex items-center gap-3 bg-black/40 rounded-lg p-3 border border-white/10 mt-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/50 border border-white/10"
                  style={{ color: selectedColor, boxShadow: `0 0 10px ${selectedColor}40` }}
                >
                  <SelectedIconComponent size={22} />
                </div>
                <div>
                  <div className="font-display font-bold text-white text-sm">{newName || 'Unnamed Racket'}</div>
                  <div className="text-[10px] font-mono text-gray-400" style={{ color: selectedColor }}>
                    {formatRacketStats(stats)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          {isEditMode ? (
            <div className="flex gap-3">
              <button
                onClick={handleUpdate}
                disabled={!newName.trim() || remaining < 0}
                className="flex-1 bg-cyber-yellow text-black font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                <Pencil size={20} /> UPDATE RACKET
              </button>
              <button
                onClick={handleCancelEdit}
                className="bg-white/5 text-gray-400 hover:text-white font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 border border-white/10 hover:border-white/30 transition-colors"
              >
                <X size={20} /> CANCEL
              </button>
            </div>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || remaining < 0}
              className="w-full bg-cyber-yellow text-black font-bold px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              <Plus size={20} /> FABRICATE RACKET
            </button>
          )}
        </div>
      )}

      {/* Racket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rackets.map(racket => {
          const Icon = RACKET_ICONS[racket.icon] || Zap;
          const displayStats = typeof racket.stats === 'string' ? racket.stats : formatRacketStats(racket.stats);
          return (
            <div key={racket.id} className="relative glass-panel p-4 rounded-xl border border-white/5 flex items-center gap-4 hover:border-white/20 transition-colors group">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center bg-black/40 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform"
                style={{ color: racket.color, boxShadow: `0 0 10px ${racket.color}40` }}
              >
                <Icon size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-white text-lg truncate">{racket.name}</div>
                <div className="text-xs font-mono text-gray-400" style={{ color: racket.color }}>{displayStats}</div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {/* Edit Button */}
                {onUpdateRacket && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(racket); }}
                    className="p-1.5 text-gray-400 bg-black/50 hover:text-cyber-yellow hover:bg-cyber-yellow/20 rounded-full transition-colors"
                    title="Edit Racket"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {/* Delete Button - Admin only */}
                {onDeleteRacket && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(racket.id, racket.name); }}
                    className="p-1.5 text-gray-400 bg-black/50 hover:text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
                    title="Delete Racket"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {rackets.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 italic border border-dashed border-white/10 rounded-xl">
            Armory is empty. Fabricate a weapon.
          </div>
        )}
      </div>

      {/* Stats Info Guide */}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Info size={20} className="text-cyber-yellow" />
            <span className="font-bold text-white text-lg">HOW RACKETS WORK</span>
          </div>
          {showInfo ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </button>

        {showInfo && (
          <div className="px-6 pb-6 space-y-5 animate-slideUp">
            {/* Budget */}
            <div className="bg-black/30 rounded-lg p-4 border border-white/5 space-y-2">
              <h4 className="text-xs font-bold text-cyber-yellow uppercase tracking-widest">Stat Budget System</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Each racket has a total budget of <span className="text-cyber-yellow font-mono font-bold">{STAT_BUDGET} points</span> to distribute across 6 stats.
                Individual stats range from <span className="font-mono text-white">0</span> to <span className="font-mono text-white">20</span>.
                Choose your build wisely — you can't max everything!
              </p>
              <p className="text-xs text-gray-500">
                Note: Racket stats are cosmetic and for fun. They don't affect ELO calculations.
              </p>
            </div>

            {/* Stat Descriptions */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Stat Breakdown</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STAT_NAMES.map(key => (
                  <div key={key} className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white uppercase">{STAT_LABELS[key]}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{STAT_DESCRIPTIONS[key]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets Reference */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Available Presets</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {RACKET_PRESETS.map(preset => {
                  const PresetIcon = RACKET_ICONS[preset.icon] || Zap;
                  const topStats = Object.entries(preset.stats)
                    .filter(([_, v]) => v > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 2);
                  return (
                    <div key={preset.name} className="bg-black/20 rounded-lg p-3 border border-white/5 flex items-start gap-2">
                      <PresetIcon size={16} style={{ color: preset.color }} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white">{preset.name}</div>
                        <div className="text-[10px] font-mono text-gray-500" style={{ color: preset.color }}>
                          {topStats.map(([k, v]) => `${STAT_LABELS[k as keyof RacketStats]} ${v}`).join(' / ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RacketManager;
