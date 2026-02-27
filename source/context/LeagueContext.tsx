import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getLeagueData, getCorrectionRequests } from '../services/storageService';
import { Player, Match, EloHistoryEntry, Racket, PendingMatch, Season, Challenge, Tournament, League, CorrectionRequest } from '../types';
import { useAuth } from './AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { isSupabaseEnabled } from '../lib/supabase';

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
  activeLeagueId: string | null;
  setActiveLeagueId: (id: string | null) => void;
  isConnected: boolean;
  refreshData: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
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
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const refreshData = useCallback(async () => {
    if (!firebaseUser) return;
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
      // Fetch correction requests — silently ignored for non-admins (403)
      try {
        const cr = await getCorrectionRequests();
        setCorrectionRequests(cr);
      } catch {
        setCorrectionRequests([]);
      }
      setIsConnected(true);
    } catch (err) {
      console.error('Connection lost:', err);
      setIsConnected(false);
    }
  }, [firebaseUser]);

  // Enable Realtime only when Supabase is enabled and user is authenticated
  const isRealtimeEnabled = isSupabaseEnabled() && !!firebaseUser;

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
      setActiveLeagueId(null);
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
        activeLeagueId,
        setActiveLeagueId,
        isConnected,
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
