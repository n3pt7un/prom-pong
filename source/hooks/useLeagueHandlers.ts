import { useCallback } from 'react';
import {
  recordMatch,
  createPlayer,
  createRacket,
  updateRacket,
  updatePlayer,
  deletePlayer,
  deleteRacket,
  resetLeagueData,
  deleteMatch,
  editMatch,
  exportLeagueData,
  importLeagueData,
  confirmPendingMatch,
  disputePendingMatch,
  forceConfirmPendingMatch,
  rejectPendingMatch,
  startSeason,
  endSeason,
  createChallenge,
  respondToChallenge,
  createTournament,
  submitTournamentResult,
  deleteTournament,
  createLeague as apiCreateLeague,
  updateLeague as apiUpdateLeague,
  deleteLeague as apiDeleteLeague,
  assignPlayerLeague as apiAssignPlayerLeague,
} from '../services/storageService';
import { LeagueState } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useLeague } from '../context/LeagueContext';
import { useToast } from '../context/ToastContext';
import { GameType, RacketStats, Tournament } from '../types';

export function useLeagueHandlers() {
  const { currentUser, isAdmin } = useAuth();
  const { refreshData, activeLeagueId, setActiveLeagueId } = useLeague();
  const { showToast } = useToast();

  const handleMatchSubmit = useCallback(
    async (type: GameType, winners: string[], losers: string[], scoreW: number, scoreL: number, isFriendly = false, leagueId?: string) => {
      try {
        const result = await recordMatch(type, winners, losers, scoreW, scoreL, isFriendly, leagueId || (activeLeagueId ?? undefined));
        await refreshData();
        showToast('Match logged!', 'success', {
          label: 'UNDO',
          onClick: async () => {
            try {
              await deleteMatch(result.id);
              await refreshData();
              showToast('Match undone', 'success');
            } catch (err: any) {
              showToast(err.message || 'Failed to undo match', 'error');
            }
          },
        });
        return result;
      } catch (err: any) {
        showToast(err.message || 'Failed to log match', 'error');
      }
    },
    [activeLeagueId, refreshData, showToast]
  );

  const handleDeleteMatch = useCallback(async (matchId: string) => {
    try {
      await deleteMatch(matchId);
      await refreshData();
      showToast('Match deleted & ELO reversed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete match', 'error');
    }
  }, [refreshData, showToast]);

  const handleEditMatch = useCallback(
    async (matchId: string, data: { winners: string[]; losers: string[]; scoreWinner: number; scoreLoser: number }) => {
      try {
        await editMatch(matchId, data);
        await refreshData();
        showToast('Match updated & ELO recalculated', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to edit match', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleCreatePlayer = useCallback(
    async (name: string, avatar: string, racketId?: string) => {
      try {
        await createPlayer(name, avatar, racketId);
        await refreshData();
        showToast(`${name} joined the league!`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create player', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleDeletePlayer = useCallback(
    async (id: string, name: string) => {
      if (window.confirm(`Delete ${name}? They will be removed from the roster. Historical match records will remain but link to 'Unknown'.`)) {
        try {
          await deletePlayer(id);
          await refreshData();
          showToast(`${name} removed`, 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete player', 'error');
        }
      }
    },
    [refreshData, showToast]
  );

  const handleCreateRacket = useCallback(
    async (name: string, icon: string, color: string, stats: RacketStats) => {
      try {
        await createRacket(name, icon, color, stats);
        await refreshData();
        showToast(`${name} forged!`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create racket', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleDeleteRacket = useCallback(
    async (id: string) => {
      try {
        await deleteRacket(id);
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete racket', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleUpdateRacket = useCallback(
    async (id: string, name: string, icon: string, color: string, stats: RacketStats) => {
      try {
        await updateRacket(id, { name, icon, color, stats });
        await refreshData();
        showToast('Racket updated!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to update racket', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleUpdatePlayerRacket = useCallback(
    async (playerId: string, racketId: string) => {
      try {
        await updatePlayer(playerId, { mainRacketId: racketId });
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to update racket', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleUpdatePlayerName = useCallback(
    async (playerId: string, newName: string) => {
      try {
        await updatePlayer(playerId, { name: newName });
        await refreshData();
        showToast(`Renamed to ${newName}`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to rename player', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleSeasonReset = useCallback(async () => {
    if (window.confirm("Are you sure? This will clear all match history and reset everyone's Elo to 1200.")) {
      await resetLeagueData('season');
      await refreshData();
      showToast('Season reset complete', 'success');
    }
  }, [refreshData, showToast]);

  const handleFactoryReset = useCallback(async () => {
    if (window.confirm('WARNING: Restore Demo Data? This deletes everything.')) {
      await resetLeagueData('wipe');
      await refreshData();
      showToast('Demo data restored', 'success');
    }
  }, [refreshData, showToast]);

  const handleStartFresh = useCallback(async () => {
    if (window.confirm('WARNING: Delete all players and data to start an empty group?')) {
      await resetLeagueData('fresh');
      await refreshData();
      showToast('Fresh start!', 'success');
    }
  }, [refreshData, showToast]);

  const handleExport = useCallback(async () => {
    try {
      const data = await exportLeagueData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyberpong_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('League data exported!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  }, [showToast]);

  const handleImport = useCallback(
    async (data: LeagueState) => {
      try {
        await importLeagueData(data);
        await refreshData();
        showToast('League data imported!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Import failed', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleConfirmPending = useCallback(async (matchId: string) => {
    try {
      await confirmPendingMatch(matchId);
      await refreshData();
      showToast('Match confirmed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm', 'error');
    }
  }, [refreshData, showToast]);

  const handleDisputePending = useCallback(async (matchId: string) => {
    try {
      await disputePendingMatch(matchId);
      await refreshData();
      showToast('Match disputed — admin will review', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispute', 'error');
    }
  }, [refreshData, showToast]);

  const handleForceConfirmPending = useCallback(async (matchId: string) => {
    try {
      await forceConfirmPendingMatch(matchId);
      await refreshData();
      showToast('Match force-confirmed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to force confirm', 'error');
    }
  }, [refreshData, showToast]);

  const handleRejectPending = useCallback(async (matchId: string) => {
    try {
      await rejectPendingMatch(matchId);
      await refreshData();
      showToast('Pending match rejected', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error');
    }
  }, [refreshData, showToast]);

  const handleStartSeason = useCallback(
    async (name: string) => {
      try {
        await startSeason(name);
        await refreshData();
        showToast('New season started!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to start season', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleEndSeason = useCallback(async () => {
    try {
      await endSeason();
      await refreshData();
      showToast('Season ended! Standings archived.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to end season', 'error');
    }
  }, [refreshData, showToast]);

  const handleCreateChallenge = useCallback(
    async (challengedId: string, wager: number, message?: string) => {
      try {
        await createChallenge(challengedId, wager, message);
        await refreshData();
        showToast('Challenge sent!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to send challenge', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleRespondChallenge = useCallback(
    async (challengeId: string, accept: boolean) => {
      try {
        await respondToChallenge(challengeId, accept);
        await refreshData();
        showToast(accept ? 'Challenge accepted!' : 'Challenge declined', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to respond', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleCreateTournament = useCallback(
    async (name: string, format: Tournament['format'], gameType: GameType, playerIds: string[]) => {
      try {
        await createTournament(name, format, gameType, playerIds);
        await refreshData();
        showToast('Tournament created!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create tournament', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleSubmitTournamentResult = useCallback(
    async (tournamentId: string, matchupId: string, winnerId: string, score1: number, score2: number) => {
      try {
        await submitTournamentResult(tournamentId, matchupId, winnerId, score1, score2);
        await refreshData();
        showToast('Result submitted!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to submit result', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleDeleteTournament = useCallback(
    async (tournamentId: string) => {
      try {
        await deleteTournament(tournamentId);
        await refreshData();
        showToast('Tournament deleted', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete tournament', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleCreateLeague = useCallback(
    async (name: string, description?: string) => {
      try {
        await apiCreateLeague(name, description);
        await refreshData();
        showToast(`League "${name}" created!`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to create league', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleUpdateLeague = useCallback(
    async (id: string, updates: { name?: string; description?: string }) => {
      try {
        await apiUpdateLeague(id, updates);
        await refreshData();
        showToast('League updated', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to update league', 'error');
      }
    },
    [refreshData, showToast]
  );

  const handleDeleteLeague = useCallback(
    async (id: string) => {
      try {
        await apiDeleteLeague(id);
        if (activeLeagueId === id) setActiveLeagueId(null);
        await refreshData();
        showToast('League deleted', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete league', 'error');
      }
    },
    [activeLeagueId, refreshData, setActiveLeagueId, showToast]
  );

  const handleAssignPlayerLeague = useCallback(
    async (playerId: string, leagueId: string | null) => {
      try {
        await apiAssignPlayerLeague(playerId, leagueId);
        await refreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to assign league', 'error');
      }
    },
    [refreshData, showToast]
  );

  return {
    handleMatchSubmit,
    handleDeleteMatch,
    handleEditMatch,
    handleCreatePlayer,
    handleDeletePlayer,
    handleCreateRacket,
    handleDeleteRacket,
    handleUpdateRacket,
    handleUpdatePlayerRacket,
    handleUpdatePlayerName,
    handleSeasonReset,
    handleFactoryReset,
    handleStartFresh,
    handleExport,
    handleImport,
    handleConfirmPending,
    handleDisputePending,
    handleForceConfirmPending,
    handleRejectPending,
    handleStartSeason,
    handleEndSeason,
    handleCreateChallenge,
    handleRespondChallenge,
    handleCreateTournament,
    handleSubmitTournamentResult,
    handleDeleteTournament,
    handleCreateLeague,
    handleUpdateLeague,
    handleDeleteLeague,
    handleAssignPlayerLeague,
  };
}
