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
  loggedBy?: string; // Firebase UID of the user who logged the match
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

// --- Pending Match Confirmation ---
export interface PendingMatch {
  id: string;
  type: GameType;
  winners: string[];
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  loggedBy: string;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmations: string[]; // UIDs who confirmed
  createdAt: string;
  expiresAt: string; // auto-confirm deadline (24h)
}

// --- Seasons ---
export interface SeasonStanding {
  playerId: string;
  playerName: string;
  rank: number;
  eloSingles: number;
  eloDoubles: number;
  wins: number;
  losses: number;
}

export interface Season {
  id: string;
  name: string;
  number: number;
  status: 'active' | 'completed';
  startedAt: string;
  endedAt?: string;
  finalStandings: SeasonStanding[];
  matchCount: number;
  championId?: string;
}

// --- Challenges ---
export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
  wager: number; // bonus ELO points at stake (0 = no wager, max 50)
  matchId?: string;
  createdAt: string;
  message?: string;
}

// --- Tournaments ---
export interface TournamentMatchup {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId?: string;
  matchId?: string;
  scorePlayer1?: number;
  scorePlayer2?: number;
}

export interface TournamentRound {
  roundNumber: number;
  matchups: TournamentMatchup[];
}

export interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination' | 'round_robin';
  status: 'registration' | 'in_progress' | 'completed';
  gameType: GameType;
  playerIds: string[];
  rounds: TournamentRound[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

// --- Weekly Challenges ---
export interface WeeklyChallenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  icon: string;
  condition: {
    metric: 'wins' | 'matches_played' | 'streak' | 'elo_gain';
    target: number;
  };
  startsAt: string;
  endsAt: string;
  completedBy: string[];
}
