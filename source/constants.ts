import { RacketStats } from './types';

export const K_FACTOR = 32;
export const INITIAL_ELO = 1200;

export const RANKS = [
  { threshold: 0, name: 'NOOB', color: 'text-gray-400' },
  { threshold: 1200, name: 'PADDLER', color: 'text-blue-400' },
  { threshold: 1400, name: 'HUSTLER', color: 'text-purple-400' },
  { threshold: 1600, name: 'MASTER', color: 'text-pink-400' },
  { threshold: 2000, name: 'GOD OF SPIN', color: 'text-yellow-400' },
];

export const AVATARS = [
  "https://picsum.photos/id/64/200/200",
  "https://picsum.photos/id/65/200/200",
  "https://picsum.photos/id/177/200/200",
  "https://picsum.photos/id/91/200/200",
  "https://picsum.photos/id/129/200/200",
  "https://picsum.photos/id/237/200/200",
  "https://picsum.photos/id/338/200/200",
  "https://picsum.photos/id/433/200/200",
  "https://picsum.photos/id/551/200/200",
  "https://picsum.photos/id/669/200/200"
];

// --- Racket System ---

export const STAT_BUDGET = 30;

export const STAT_NAMES: (keyof RacketStats)[] = ['speed', 'spin', 'power', 'control', 'defense', 'chaos'];

export const STAT_LABELS: Record<keyof RacketStats, string> = {
  speed: 'Speed',
  spin: 'Spin',
  power: 'Power',
  control: 'Control',
  defense: 'Defense',
  chaos: 'Chaos',
};

export const NEON_COLORS = [
  '#fcee0a', // yellow
  '#00f3ff', // cyan
  '#ff00ff', // pink
  '#bc13fe', // purple
  '#ff4d4d', // red
  '#4dff4d', // green
  '#ff8c00', // orange
  '#00ff88', // mint
];

export const RACKET_ICON_NAMES = [
  'Zap', 'Shield', 'Target', 'Crosshair', 'Hexagon', 'Component', 'Sword', 'Hammer',
  'Flame', 'Snowflake', 'Star', 'Moon', 'Sun', 'Gem', 'Crown', 'Skull', 'Heart', 'Wind', 'Atom', 'Bolt',
];

export interface RacketPreset {
  name: string;
  icon: string;
  color: string;
  stats: RacketStats;
}

export const RACKET_PRESETS: RacketPreset[] = [
  {
    name: 'Speed Demon',
    icon: 'Zap',
    color: '#fcee0a',
    stats: { speed: 18, spin: 5, power: 3, control: 2, defense: 1, chaos: 1 },
  },
  {
    name: 'The Wall',
    icon: 'Shield',
    color: '#00f3ff',
    stats: { speed: 2, spin: 3, power: 2, control: 5, defense: 18, chaos: 0 },
  },
  {
    name: 'Spin Doctor',
    icon: 'Wind',
    color: '#bc13fe',
    stats: { speed: 5, spin: 18, power: 2, control: 3, defense: 1, chaos: 1 },
  },
  {
    name: 'Power Hitter',
    icon: 'Hammer',
    color: '#ff4d4d',
    stats: { speed: 3, spin: 2, power: 18, control: 3, defense: 3, chaos: 1 },
  },
  {
    name: 'All-Rounder',
    icon: 'Target',
    color: '#4dff4d',
    stats: { speed: 5, spin: 5, power: 5, control: 5, defense: 5, chaos: 5 },
  },
  {
    name: 'Chaos Agent',
    icon: 'Skull',
    color: '#ff00ff',
    stats: { speed: 3, spin: 3, power: 3, control: 3, defense: 3, chaos: 15 },
  },
];

export const DEFAULT_STATS: RacketStats = { speed: 5, spin: 5, power: 5, control: 5, defense: 5, chaos: 5 };
