export type GameType = 'singles' | 'doubles';
export type MatchFormat = 'standard11' | 'vintage21';

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
  // Singles stats
  winsSingles: number;
  lossesSingles: number;
  streakSingles: number;
  // Doubles stats  
  winsDoubles: number;
  lossesDoubles: number;
  streakDoubles: number;
  // Legacy combined stats (backward compatibility)
  wins?: number;
  losses?: number;
  streak?: number;
  joinedAt: string;
  mainRacketId?: string;
  uid?: string; // Firebase UID — links player to a logged-in user
  leagueId?: string; // League/group the player belongs to
  isAdmin?: boolean; // Populated by /api/admin/users endpoint
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
  isFriendly?: boolean; // Friendly matches skip ELO but still count in stats
  leagueId?: string; // League context the match was played in (null = global/cross-league)
  matchFormat?: MatchFormat; // undefined = legacy match, treat as standard11
  seasonId?: string; // Season the match belongs to
  // Populated by /api/admin/matches endpoint for display purposes
  winnerNames?: string[];
  loserNames?: string[];
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
  isFriendly?: boolean; // Friendly matches skip ELO but still count in stats
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

// --- Admin Dashboard ---
export interface AdminStats {
  totalPlayers: number;
  totalMatches: number;
  activeSeasons: number;
  completedSeasons: number;
  totalLeagues: number;
  pendingMatches: number;
  pendingCorrections: number;
  totalAdmins: number;
}

export interface AdminUser {
  id: string;
  firebaseUid: string;
  email?: string;
  displayName?: string;
  createdAt: string;
  // Enriched by /api/admin/admins endpoint via player lookup
  playerName?: string;
  playerAvatar?: string;
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
  source?: 'manual' | 'auto_generated' | 'tournament';
  gameType?: GameType;
  leagueId?: string | null;
  generatedAt?: string;
  expiresAt?: string;
  generationReason?: string;
  respondedAt?: string;
  completedAt?: string;
  challengerAcceptedAt?: string;
  challengedAcceptedAt?: string;
}

// --- Correction Requests ---
export interface CorrectionRequest {
  id: string;
  matchId: string;
  requestedBy: string;            // Firebase UID
  proposedWinners: string[];
  proposedLosers: string[];
  proposedScoreWinner: number;
  proposedScoreLoser: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
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

// --- Leagues ---
export interface League {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  // Enriched by /api/admin/leagues endpoint
  playerCount?: number;
}

// --- ELO Configuration ---
export interface EloConfig {
  kFactor: number;
  initialElo: number;
  dFactor: number;
  formulaPreset: 'standard' | 'score_weighted' | 'custom';
  customFormula: string;
  customConstants: Record<string, number>;
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

// --- ELO Insights and Teammate Statistics ---

export interface HeadToHeadRecord {
  wins: number;
  losses: number;
  totalMatches: number;
}

export interface SinglesInsight {
  opponentId: string;
  opponentName: string;
  opponentElo: number;
  playerElo: number;
  winsNeeded: number | null; // null if unreachable within 20 wins
  headToHead: HeadToHeadRecord;
}

export interface TeammateStatistics {
  teammateId: string;
  teammateName: string;
  teammateElo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number; // 0-100
  avgEloChange: number; // Can be negative
}

export type SinglesSortBy = 'winsNeeded' | 'opponentElo';
export type TeammateSortBy = 'winRate' | 'matchesPlayed' | 'avgEloChange';
export type SortOrder = 'asc' | 'desc';
