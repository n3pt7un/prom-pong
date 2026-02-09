export type GameType = 'singles' | 'doubles';

export interface RacketStats {
  speed: number;
  spin: number;
  power: number;
  control: number;
  defense: number;
  chaos: number;
}

export interface Racket {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color
  stats: RacketStats | string; // RacketStats (new) or string (legacy)
  createdBy?: string; // UID of creator
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  eloSingles: number;
  eloDoubles: number;
  wins: number;
  losses: number;
  streak: number;
  joinedAt: string;
  mainRacketId?: string;
  uid?: string; // Firebase UID — links player to a logged-in user
}

export interface Match {
  id: string;
  type: GameType;
  winners: string[]; // Player IDs
  losers: string[];  // Player IDs
  scoreWinner: number;
  scoreLoser: number;
  timestamp: string;
  eloChange: number; // How much the winners gained (and losers lost)
}

export interface EloHistoryEntry {
  playerId: string;
  matchId: string;
  newElo: number;
  timestamp: string;
  gameType: GameType;
}

export enum RankTier {
  ROOKIE = 'NOOB',
  PADDLER = 'PADDLER',
  HUSTLER = 'HUSTLER',
  MASTER = 'MASTER',
  GOD = 'GOD OF SPIN'
}

// Auth types
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin: boolean;
  player: Player | null;
  needsSetup: boolean; // true when user has no player profile yet
}
