import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getLeagueData, getCorrectionRequests, getEloConfig } from '../services/storageService';
import { Player, Match, EloHistoryEntry, Racket, PendingMatch, Season, Challenge, Tournament, League, CorrectionRequest, EloConfig } from '../types';
import { useAuth } from './AuthContext';
import { useRealtime } from '../hooks/useRealtime';

interface LeagueContextType {
  players: Player[];
  matches: Match[];
  history: EloHistoryEntry[];
  rackets: Racket[];
  pendingMatches: PendingMatch[];
  seasons: Season[];
  challenges: Challenge[];
  tournaments: Tournament[];
  leagues: League[];
  correctionRequests: CorrectionRequest[];
  eloConfig: EloConfig | null;
  activeLeagueId: string | null;
  setActiveLeagueId: (id: string | null) => void;
  isConnected: boolean;
  dataLoading: boolean;
  refreshData: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<EloHistoryEntry[]>([]);
  const [rackets, setRackets] = useState<Racket[]>([]);
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);
  const [eloConfig, setEloConfig] = useState<EloConfig | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!firebaseUser) return;
    const adminSnapshot = isAdmin;
    try {
      const data = await getLeagueData();
      setPlayers(data.players);
      setMatches(data.matches);
      setHistory(data.history);
      setRackets(data.rackets);
      setPendingMatches(data.pendingMatches || []);
      setSeasons(data.seasons || []);
      setChallenges(data.challenges || []);
      setTournaments(data.tournaments || []);
      setLeagues(data.leagues || []);
      // Only fetch correction requests for admins — avoids a 403 for regular users
      if (adminSnapshot) {
        try {
          const cr = await getCorrectionRequests();
          setCorrectionRequests(cr);
        } catch {
          setCorrectionRequests([]);
        }
      }
      // Fetch ELO config for all authenticated users (display in leaderboard)
      try {
        const cfg = await getEloConfig();
        setEloConfig(cfg);
      } catch {
        // Non-critical — fall back to defaults shown in the UI
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Connection lost:', err);
      setIsConnected(false);
    } finally {
      setDataLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  // Enable Realtime only when Supabase is configured and user is authenticated
  const isRealtimeEnabled = import.meta.env.VITE_USE_SUPABASE === 'true' && !!firebaseUser;

  // Subscribe to Supabase Realtime changes
  useRealtime(isRealtimeEnabled, {
    setPlayers,
    setMatches,
    setHistory,
    setPendingMatches,
    setSeasons,
    setChallenges,
    setTournaments,
    setRackets,
    setLeagues,
  });

  useEffect(() => {
    if (!firebaseUser) {
      setPlayers([]);
      setMatches([]);
      setHistory([]);
      setRackets([]);
      setPendingMatches([]);
      setSeasons([]);
      setChallenges([]);
      setTournaments([]);
      setLeagues([]);
      setCorrectionRequests([]);
      setEloConfig(null);
      setActiveLeagueId(null);
      setDataLoading(true);
      return;
    }
    // Initial data load - only once, no polling
    refreshData();
    // Polling removed - now using Supabase Realtime for live updates
  }, [firebaseUser, refreshData]);

  return (
    <LeagueContext.Provider
      value={{
        players,
        matches,
        history,
        rackets,
        pendingMatches,
        seasons,
        challenges,
        tournaments,
        leagues,
        correctionRequests,
        eloConfig,
        activeLeagueId,
        setActiveLeagueId,
        isConnected,
        dataLoading,
        refreshData,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within LeagueProvider');
  return ctx;
}
