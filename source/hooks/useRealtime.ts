/**
 * Supabase Realtime Hook
 *
 * Subscribes to database changes and updates local state in real-time.
 * Replaces polling with push-based updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, Match, EloHistoryEntry, PendingMatch, Season, Challenge, Tournament, Racket, League } from '../types';

// Realtime change event types
export type RealtimeChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeChange<T> {
  type: RealtimeChangeType;
  table: string;
  old: T | null;
  new: T | null;
}

// Callback type for handling changes
export type ChangeHandler<T> = (change: RealtimeChange<T>) => void;

// Subscription configuration for each table
interface TableSubscription {
  table: string;
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
}

// State updaters interface
export interface RealtimeStateUpdaters {
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  setHistory: React.Dispatch<React.SetStateAction<EloHistoryEntry[]>>;
  setPendingMatches: React.Dispatch<React.SetStateAction<PendingMatch[]>>;
  setSeasons: React.Dispatch<React.SetStateAction<Season[]>>;
  setChallenges: React.Dispatch<React.SetStateAction<Challenge[]>>;
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  setRackets: React.Dispatch<React.SetStateAction<Racket[]>>;
  setLeagues: React.Dispatch<React.SetStateAction<League[]>>;
}

/**
 * Hook to subscribe to Supabase Realtime changes
 * Returns subscription status and error state
 */
export function useRealtime(enabled: boolean, updaters: RealtimeStateUpdaters) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscriptionsRef = useRef<TableSubscription[]>([
    { table: 'players', event: '*' },
    { table: 'matches', event: '*' },
    { table: 'match_players', event: '*' },
    { table: 'elo_history', event: '*' },
    { table: 'pending_matches', event: '*' },
    { table: 'pending_match_players', event: '*' },
    { table: 'seasons', event: '*' },
    { table: 'challenges', event: '*' },
    { table: 'tournaments', event: '*' },
    { table: 'rackets', event: '*' },
    { table: 'leagues', event: '*' },
    { table: 'match_reactions', event: '*' },
  ]);

  const handleChange = useCallback(
    (payload: { table: string; eventType: RealtimeChangeType; old: unknown; new: unknown }) => {
      const { table, eventType, old, new: newRecord } = payload;

      // Helper to handle array state updates
      const updateArray = <T extends { id: string }>(
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        oldRecord: T | null,
        newRecord: T | null,
        eventType: RealtimeChangeType
      ) => {
        setter((prev) => {
          switch (eventType) {
            case 'INSERT':
              if (!newRecord) return prev;
              // Check if already exists to prevent duplicates
              if (prev.some((item) => item.id === newRecord.id)) {
                return prev.map((item) => (item.id === newRecord.id ? newRecord : item));
              }
              return [newRecord, ...prev];
            case 'UPDATE':
              if (!newRecord) return prev;
              return prev.map((item) => (item.id === newRecord.id ? newRecord : item));
            case 'DELETE':
              if (!oldRecord) return prev;
              return prev.filter((item) => item.id !== oldRecord.id);
            default:
              return prev;
          }
        });
      };

      // Route changes to the appropriate state updater
      switch (table) {
        case 'players':
          updateArray<Player>(updaters.setPlayers, old as Player, newRecord as Player, eventType);
          break;
        case 'matches':
          // Convert Supabase record format to legacy format
          if (newRecord || old) {
            // For matches, we need to fetch the full match with players
            // This is handled separately since match_players is a junction table
            updateArray<Match>(updaters.setMatches, old as Match, newRecord as Match, eventType);
          }
          break;
        case 'match_players':
          // Changes to match_players affect the matches state
          // We'll need to refresh the specific match when this changes
          break;
        case 'elo_history':
          updateArray<EloHistoryEntry>(updaters.setHistory, old as EloHistoryEntry, newRecord as EloHistoryEntry, eventType);
          break;
        case 'pending_matches':
        case 'pending_match_players':
          updateArray<PendingMatch>(updaters.setPendingMatches, old as PendingMatch, newRecord as PendingMatch, eventType);
          break;
        case 'seasons':
          updateArray<Season>(updaters.setSeasons, old as Season, newRecord as Season, eventType);
          break;
        case 'challenges':
          updateArray<Challenge>(updaters.setChallenges, old as Challenge, newRecord as Challenge, eventType);
          break;
        case 'tournaments':
          updateArray<Tournament>(updaters.setTournaments, old as Tournament, newRecord as Tournament, eventType);
          break;
        case 'rackets':
          updateArray<Racket>(updaters.setRackets, old as Racket, newRecord as Racket, eventType);
          break;
        case 'leagues':
          updateArray<League>(updaters.setLeagues, old as League, newRecord as League, eventType);
          break;
        default:
          console.log('Unhandled Realtime change:', { table, eventType, old, new: newRecord });
      }
    },
    [updaters]
  );

  useEffect(() => {
    if (!enabled || !supabase) {
      return;
    }

    // Create a single channel for all subscriptions
    const channel = supabase.channel('league-changes');
    channelRef.current = channel;

    // Subscribe to each table
    subscriptionsRef.current.forEach(({ table, event, schema = 'public' }) => {
      channel.on(
        'postgres_changes' as const,
        { event, schema, table },
        handleChange
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Supabase Realtime connected');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Supabase Realtime connection error');
      } else if (status === 'CLOSED') {
        console.log('🔌 Supabase Realtime disconnected');
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, handleChange]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
  };
}

export default useRealtime;
