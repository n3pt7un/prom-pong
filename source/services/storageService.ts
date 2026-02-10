import { Player, Match, EloHistoryEntry, GameType, Racket, RacketStats, AppUser, PendingMatch, Season, Challenge, Tournament } from '../types';
import { getIdToken } from './authService';

export interface LeagueState {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
  rackets: Racket[];
  pendingMatches: PendingMatch[];
  seasons: Season[];
  challenges: Challenge[];
  tournaments: Tournament[];
}

export interface Backup {
  id: string;
  timestamp: string;
  label: string;
  data: LeagueState;
}

const API_URL = '/api';

// --- Helper for error handling (with auth token) ---
const apiRequest = async (url: string, options?: RequestInit) => {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return res.json();
};

// --- API Client ---

export const getLeagueData = async (): Promise<LeagueState> => {
  return apiRequest(`${API_URL}/state`);
};

export const getMe = async (): Promise<AppUser> => {
  return apiRequest(`${API_URL}/me`);
};

export const setupProfile = async (name: string, avatar: string, bio: string): Promise<AppUser> => {
  return apiRequest(`${API_URL}/me/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, avatar, bio })
  });
};

export const claimPlayer = async (playerId: string): Promise<AppUser> => {
  return apiRequest(`${API_URL}/me/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  });
};

export const updateMyProfile = async (updates: { name?: string; avatar?: string; bio?: string }): Promise<Player> => {
  return apiRequest(`${API_URL}/me/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
};

export const createPlayer = async (name: string, avatar: string, mainRacketId?: string) => {
  return apiRequest(`${API_URL}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, avatar, mainRacketId })
  });
};

export const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
  return apiRequest(`${API_URL}/players/${playerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
};

export const deletePlayer = async (playerId: string) => {
  return apiRequest(`${API_URL}/players/${playerId}`, { method: 'DELETE' });
};

export const createRacket = async (name: string, icon: string, color: string, stats: RacketStats) => {
  return apiRequest(`${API_URL}/rackets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, icon, color, stats })
  });
};

export const updateRacket = async (racketId: string, updates: Partial<Racket>) => {
  return apiRequest(`${API_URL}/rackets/${racketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
};

export const deleteRacket = async (racketId: string) => {
  return apiRequest(`${API_URL}/rackets/${racketId}`, { method: 'DELETE' });
};

export const recordMatch = async (
  type: GameType,
  winnerIds: string[],
  loserIds: string[],
  scoreWinner: number,
  scoreLoser: number
) => {
  return apiRequest(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, winners: winnerIds, losers: loserIds, scoreWinner, scoreLoser })
  });
};

export const editMatch = async (matchId: string, data: { winners: string[]; losers: string[]; scoreWinner: number; scoreLoser: number }) => {
  return apiRequest(`${API_URL}/matches/${matchId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const deleteMatch = async (matchId: string) => {
  return apiRequest(`${API_URL}/matches/${matchId}`, { method: 'DELETE' });
};

export const exportLeagueData = async (): Promise<LeagueState> => {
  return apiRequest(`${API_URL}/export`);
};

export const importLeagueData = async (data: LeagueState) => {
  return apiRequest(`${API_URL}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};

export const resetLeagueData = async (mode: 'season' | 'wipe' | 'fresh') => {
  return apiRequest(`${API_URL}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
};

// --- Admin API ---
export const listUsers = async (): Promise<{ uid: string; name: string; avatar: string; isAdmin: boolean }[]> => {
  return apiRequest(`${API_URL}/admin/users`);
};

export const promoteUser = async (uid: string) => {
  return apiRequest(`${API_URL}/admin/promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid })
  });
};

export const demoteUser = async (uid: string) => {
  return apiRequest(`${API_URL}/admin/demote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid })
  });
};

// --- Pending Matches (Match Confirmation) ---
export const createPendingMatch = async (type: GameType, winnerIds: string[], loserIds: string[], scoreWinner: number, scoreLoser: number): Promise<PendingMatch> => {
  return apiRequest(`${API_URL}/pending-matches`, {
    method: 'POST',
    body: JSON.stringify({ type, winners: winnerIds, losers: loserIds, scoreWinner, scoreLoser })
  });
};

export const confirmPendingMatch = async (matchId: string) => {
  return apiRequest(`${API_URL}/pending-matches/${matchId}/confirm`, { method: 'PUT' });
};

export const disputePendingMatch = async (matchId: string) => {
  return apiRequest(`${API_URL}/pending-matches/${matchId}/dispute`, { method: 'PUT' });
};

export const forceConfirmPendingMatch = async (matchId: string) => {
  return apiRequest(`${API_URL}/pending-matches/${matchId}/force-confirm`, { method: 'PUT' });
};

export const rejectPendingMatch = async (matchId: string) => {
  return apiRequest(`${API_URL}/pending-matches/${matchId}`, { method: 'DELETE' });
};

// --- Seasons ---
export const getSeasons = async (): Promise<Season[]> => {
  return apiRequest(`${API_URL}/seasons`);
};

export const startSeason = async (name: string): Promise<Season> => {
  return apiRequest(`${API_URL}/seasons/start`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
};

export const endSeason = async (): Promise<Season> => {
  return apiRequest(`${API_URL}/seasons/end`, { method: 'POST' });
};

// --- Challenges ---
export const getChallenges = async (): Promise<Challenge[]> => {
  return apiRequest(`${API_URL}/challenges`);
};

export const createChallenge = async (challengedId: string, wager: number, message?: string): Promise<Challenge> => {
  return apiRequest(`${API_URL}/challenges`, {
    method: 'POST',
    body: JSON.stringify({ challengedId, wager, message })
  });
};

export const respondToChallenge = async (challengeId: string, accept: boolean) => {
  return apiRequest(`${API_URL}/challenges/${challengeId}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ accept })
  });
};

export const completeChallenge = async (challengeId: string, matchId: string) => {
  return apiRequest(`${API_URL}/challenges/${challengeId}/complete`, {
    method: 'PUT',
    body: JSON.stringify({ matchId })
  });
};

export const cancelChallenge = async (challengeId: string) => {
  return apiRequest(`${API_URL}/challenges/${challengeId}`, { method: 'DELETE' });
};

// --- Tournaments ---
export const getTournaments = async (): Promise<Tournament[]> => {
  return apiRequest(`${API_URL}/tournaments`);
};

export const createTournament = async (name: string, format: Tournament['format'], gameType: GameType, playerIds: string[]): Promise<Tournament> => {
  return apiRequest(`${API_URL}/tournaments`, {
    method: 'POST',
    body: JSON.stringify({ name, format, gameType, playerIds })
  });
};

export const submitTournamentResult = async (tournamentId: string, matchupId: string, winnerId: string, score1: number, score2: number): Promise<Tournament> => {
  return apiRequest(`${API_URL}/tournaments/${tournamentId}/result`, {
    method: 'PUT',
    body: JSON.stringify({ matchupId, winnerId, score1, score2 })
  });
};

export const deleteTournament = async (tournamentId: string) => {
  return apiRequest(`${API_URL}/tournaments/${tournamentId}`, { method: 'DELETE' });
};

// --- Player of the Week ---
export const getPlayerOfWeek = async () => {
  return apiRequest(`${API_URL}/player-of-week`);
};

// --- Hall of Fame ---
export const getHallOfFame = async () => {
  return apiRequest(`${API_URL}/hall-of-fame`);
};

// --- Client-Side Backup ---
const STORAGE_KEYS = { BACKUPS: 'cyberpong_backups' };

export const getBackups = (): Backup[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.BACKUPS);
  return stored ? JSON.parse(stored) : [];
};

export const createBackup = async (label: string = 'Auto-Backup') => {
  const state = await getLeagueData();
  const backups = getBackups();
  const newBackup: Backup = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    label,
    data: state
  };
  const updatedBackups = [newBackup, ...backups].slice(0, 5);
  localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(updatedBackups));
  return newBackup;
};

export const restoreBackup = async (backupId: string) => {
  console.warn("Restore not fully supported in synced mode yet.");
};
