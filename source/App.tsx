import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Leaderboard from './components/Leaderboard';
import MatchLogger from './components/MatchLogger';
import RecentMatches from './components/RecentMatches';
import CreatePlayerForm from './components/CreatePlayerForm';
import Settings from './components/Settings';
import RacketManager from './components/RacketManager';
import MatchMaker from './components/MatchMaker';
import PlayersHub from './components/PlayersHub';
import LoginScreen from './components/LoginScreen';
import ProfileSetup from './components/ProfileSetup';
import PlayerOfTheWeek from './components/PlayerOfTheWeek';
import WeeklyChallenges from './components/WeeklyChallenges';
import PendingMatches from './components/PendingMatches';
import HallOfFame from './components/HallOfFame';
import AdvancedStats from './components/AdvancedStats';
import ChallengeBoard from './components/ChallengeBoard';
import TournamentBracket from './components/TournamentBracket';
import SeasonManager from './components/SeasonManager';
import {
  getLeagueData, recordMatch, createPlayer, createRacket, updateRacket, updatePlayer,
  deletePlayer, deleteRacket, resetLeagueData, deleteMatch,
  exportLeagueData, importLeagueData, getMe, setupProfile, updateMyProfile, claimPlayer,
  editMatch,
  confirmPendingMatch, disputePendingMatch, forceConfirmPendingMatch, rejectPendingMatch,
  startSeason, endSeason,
  createChallenge, respondToChallenge, completeChallenge, cancelChallenge,
  createTournament, submitTournamentResult, deleteTournament,
  createPendingMatch,
} from './services/storageService';
import { onAuthStateChanged, signOut } from './services/authService';
import { LeagueState } from './services/storageService';
import { Player, Match, GameType, EloHistoryEntry, Racket, RacketStats, AppUser, PendingMatch as PendingMatchType, Season, Challenge, Tournament } from './types';
import { WifiOff, CheckCircle, AlertCircle, X, Undo2, Loader2 } from 'lucide-react';

// --- Toast System ---
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
  action?: { label: string; onClick: () => void };
}

function App() {
  // Auth state
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [activeTab, setActiveTab] = useState('leaderboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<EloHistoryEntry[]>([]);
  const [rackets, setRackets] = useState<Racket[]>([]);
  const [pendingMatches, setPendingMatches] = useState<PendingMatchType[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [unclaimedPlayers, setUnclaimedPlayers] = useState<Player[]>([]);

  const isAdmin = currentUser?.isAdmin || false;

  // Matchmaker prefill state
  const [matchPrefill, setMatchPrefill] = useState<{ type: GameType; team1: string[]; team2: string[] } | null>(null);

  const handleMatchmakerSelect = (type: GameType, team1: string[], team2: string[]) => {
    setMatchPrefill({ type, team1, team2 });
    setActiveTab('log');
  };

  // Players Hub state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handleLeaderboardPlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActiveTab('players');
  };

  const handleUpdatePlayerName = async (playerId: string, newName: string) => {
    try {
      await updatePlayer(playerId, { name: newName });
      refreshData();
      showToast(`Renamed to ${newName}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to rename player', 'error');
    }
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', action?: Toast['action']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, action ? 8000 : 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (!user) {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user profile when Firebase user is set
  useEffect(() => {
    if (!firebaseUser) return;
    const fetchMe = async () => {
      try {
        const me = await getMe();
        setCurrentUser(me);
        if ((me as any).unclaimedPlayers) {
          setUnclaimedPlayers((me as any).unclaimedPlayers);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchMe();
  }, [firebaseUser]);

  // Load data
  const refreshData = async () => {
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
      setIsConnected(true);
    } catch (err) {
      console.error("Connection lost:", err);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (!firebaseUser) return;
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    setPlayers([]);
    setMatches([]);
    setHistory([]);
    setRackets([]);
    setPendingMatches([]);
    setSeasons([]);
    setChallenges([]);
    setTournaments([]);
  };

  const handleProfileSetup = async (name: string, avatar: string, bio: string) => {
    const result = await setupProfile(name, avatar, bio);
    setCurrentUser(result);
  };

  const handleClaimPlayer = async (playerId: string) => {
    const result = await claimPlayer(playerId);
    setCurrentUser(result);
  };

  const handleUpdateProfile = async (updates: { name?: string; avatar?: string; bio?: string }) => {
    const updatedPlayer = await updateMyProfile(updates);
    if (currentUser) {
      setCurrentUser({ ...currentUser, player: updatedPlayer });
    }
    refreshData();
  };

  const handleMatchSubmit = async (type: GameType, winners: string[], losers: string[], scoreW: number, scoreL: number) => {
    try {
      const result = await recordMatch(type, winners, losers, scoreW, scoreL);
      refreshData();
      setActiveTab('leaderboard');
      showToast('Match logged!', 'success', {
        label: 'UNDO',
        onClick: async () => {
          try {
            await deleteMatch(result.id);
            refreshData();
            showToast('Match undone', 'success');
          } catch (err: any) {
            showToast(err.message || 'Failed to undo match', 'error');
          }
        }
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to log match', 'error');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      await deleteMatch(matchId);
      refreshData();
      showToast('Match deleted & ELO reversed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete match', 'error');
    }
  };

  const handleEditMatch = async (matchId: string, data: { winners: string[]; losers: string[]; scoreWinner: number; scoreLoser: number }) => {
    try {
      await editMatch(matchId, data);
      refreshData();
      showToast('Match updated & ELO recalculated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to edit match', 'error');
    }
  };

  const handleCreatePlayer = async (name: string, avatar: string, racketId?: string) => {
    try {
      await createPlayer(name, avatar, racketId);
      refreshData();
      setShowCreatePlayerModal(false);
      showToast(`${name} joined the league!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create player', 'error');
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (window.confirm(`Delete ${name}? They will be removed from the roster. Historical match records will remain but link to 'Unknown'.`)) {
      try {
        await deletePlayer(id);
        refreshData();
        showToast(`${name} removed`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete player', 'error');
      }
    }
  }

  const handleCreateRacket = async (name: string, icon: string, color: string, stats: RacketStats) => {
    try {
      await createRacket(name, icon, color, stats);
      refreshData();
      showToast(`${name} forged!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create racket', 'error');
    }
  };

  const handleDeleteRacket = async (id: string) => {
    try {
      await deleteRacket(id);
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete racket', 'error');
    }
  }

  const handleUpdateRacket = async (id: string, name: string, icon: string, color: string, stats: RacketStats) => {
    try {
      await updateRacket(id, { name, icon, color, stats });
      refreshData();
      showToast('Racket updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update racket', 'error');
    }
  };

  const handleUpdatePlayerRacket = async (playerId: string, racketId: string) => {
    try {
      await updatePlayer(playerId, { mainRacketId: racketId });
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update racket', 'error');
    }
  };

  const handleSeasonReset = async () => {
    if (window.confirm("Are you sure? This will clear all match history and reset everyone's Elo to 1200.")) {
      await resetLeagueData('season');
      refreshData();
      showToast('Season reset complete', 'success');
    }
  };

  const handleFactoryReset = async () => {
    if (window.confirm("WARNING: Restore Demo Data? This deletes everything.")) {
      await resetLeagueData('wipe');
      refreshData();
      showToast('Demo data restored', 'success');
    }
  }

  const handleStartFresh = async () => {
    if (window.confirm("WARNING: Delete all players and data to start an empty group?")) {
      await resetLeagueData('fresh');
      refreshData();
      showToast('Fresh start!', 'success');
    }
  }

  const handleExport = async () => {
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
  };

  const handleImport = async (data: LeagueState) => {
    try {
      await importLeagueData(data);
      refreshData();
      showToast('League data imported!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Import failed', 'error');
    }
  };

  // --- Pending Match Handlers ---
  const handleConfirmPending = async (matchId: string) => {
    try {
      await confirmPendingMatch(matchId);
      refreshData();
      showToast('Match confirmed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to confirm', 'error');
    }
  };

  const handleDisputePending = async (matchId: string) => {
    try {
      await disputePendingMatch(matchId);
      refreshData();
      showToast('Match disputed — admin will review', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispute', 'error');
    }
  };

  const handleForceConfirmPending = async (matchId: string) => {
    try {
      await forceConfirmPendingMatch(matchId);
      refreshData();
      showToast('Match force-confirmed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to force confirm', 'error');
    }
  };

  const handleRejectPending = async (matchId: string) => {
    try {
      await rejectPendingMatch(matchId);
      refreshData();
      showToast('Pending match rejected', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error');
    }
  };

  // --- Season Handlers ---
  const handleStartSeason = async (name: string) => {
    try {
      await startSeason(name);
      refreshData();
      showToast('New season started!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to start season', 'error');
    }
  };

  const handleEndSeason = async () => {
    try {
      await endSeason();
      refreshData();
      showToast('Season ended! Standings archived.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to end season', 'error');
    }
  };

  // --- Challenge Handlers ---
  const handleCreateChallenge = async (challengedId: string, wager: number, message?: string) => {
    try {
      await createChallenge(challengedId, wager, message);
      refreshData();
      showToast('Challenge sent!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send challenge', 'error');
    }
  };

  const handleRespondChallenge = async (challengeId: string, accept: boolean) => {
    try {
      await respondToChallenge(challengeId, accept);
      refreshData();
      showToast(accept ? 'Challenge accepted!' : 'Challenge declined', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to respond', 'error');
    }
  };

  // --- Tournament Handlers ---
  const handleCreateTournament = async (name: string, format: Tournament['format'], gameType: GameType, playerIds: string[]) => {
    try {
      await createTournament(name, format, gameType, playerIds);
      refreshData();
      showToast('Tournament created!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create tournament', 'error');
    }
  };

  const handleSubmitTournamentResult = async (tournamentId: string, matchupId: string, winnerId: string, score1: number, score2: number) => {
    try {
      await submitTournamentResult(tournamentId, matchupId, winnerId, score1, score2);
      refreshData();
      showToast('Result submitted!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit result', 'error');
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      await deleteTournament(tournamentId);
      refreshData();
      showToast('Tournament deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tournament', 'error');
    }
  };

  // --- Loading / Auth Gate ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-cyber-bg flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="text-cyber-cyan animate-spin" size={40} />
          <span className="text-gray-500 text-sm font-mono">Initializing...</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  if (currentUser?.needsSetup) {
    return (
      <ProfileSetup
        googleName={currentUser.displayName || firebaseUser.displayName || ''}
        googlePhoto={currentUser.photoURL || firebaseUser.photoURL || ''}
        onComplete={handleProfileSetup}
        unclaimedPlayers={unclaimedPlayers}
        onClaim={handleClaimPlayer}
      />
    );
  }

  const currentSeason = seasons.find(s => s.status === 'active');

  const renderContent = () => {
    if (activeTab === 'leaderboard') {
      return (
        <div className="space-y-8">
          {/* Player of the Week + Weekly Challenges row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlayerOfTheWeek players={players} matches={matches} history={history} />
            <WeeklyChallenges matches={matches} players={players} history={history} currentPlayerId={currentUser?.player?.id} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Leaderboard players={players} matches={matches} onPlayerClick={handleLeaderboardPlayerClick} />
            </div>
            <div className="lg:col-span-1 space-y-6">
              {pendingMatches.length > 0 && (
                <PendingMatches
                  pendingMatches={pendingMatches}
                  players={players}
                  currentUserUid={currentUser?.uid}
                  isAdmin={isAdmin}
                  onConfirm={handleConfirmPending}
                  onDispute={handleDisputePending}
                  onForceConfirm={isAdmin ? handleForceConfirmPending : undefined}
                  onReject={isAdmin ? handleRejectPending : undefined}
                />
              )}
              <RecentMatches
                matches={matches}
                players={players}
                isAdmin={isAdmin}
                currentUserUid={currentUser?.uid}
                onDeleteMatch={handleDeleteMatch}
                onEditMatch={handleEditMatch}
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'log') {
      if (players.length < 2) return <div className="text-center text-gray-500 mt-10">Add at least 2 players to log matches.</div>;
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <MatchMaker players={players} onSelectMatch={handleMatchmakerSelect} />
          <MatchLogger
            players={players}
            onSubmit={handleMatchSubmit}
            prefill={matchPrefill}
            onPrefillConsumed={() => setMatchPrefill(null)}
          />
        </div>
      );
    }

    if (activeTab === 'players') {
      return (
        <div className="space-y-8">
          <PlayersHub
            players={players}
            matches={matches}
            history={history}
            rackets={rackets}
            isAdmin={isAdmin}
            currentUserId={currentUser?.player?.id}
            initialSelectedId={selectedPlayerId}
            onUpdateRacket={handleUpdatePlayerRacket}
            onDeletePlayer={handleDeletePlayer}
            onAddPlayer={() => setShowCreatePlayerModal(true)}
            onNavigateToArmory={() => setActiveTab('armory')}
            onUpdatePlayerName={handleUpdatePlayerName}
            onClearInitialSelection={() => setSelectedPlayerId(null)}
          />
          <AdvancedStats players={players} matches={matches} history={history} />
        </div>
      );
    }

    if (activeTab === 'armory') {
      return <RacketManager rackets={rackets} onCreateRacket={handleCreateRacket} onDeleteRacket={isAdmin ? handleDeleteRacket : undefined} onUpdateRacket={handleUpdateRacket} />
    }

    if (activeTab === 'events') {
      return (
        <div className="space-y-8">
          <TournamentBracket
            tournaments={tournaments}
            players={players}
            isAdmin={isAdmin}
            currentUserUid={currentUser?.uid}
            onCreateTournament={handleCreateTournament}
            onSubmitResult={handleSubmitTournamentResult}
            onDeleteTournament={isAdmin ? handleDeleteTournament : undefined}
          />
          <ChallengeBoard
            challenges={challenges}
            players={players}
            currentPlayerId={currentUser?.player?.id}
            currentUserUid={currentUser?.uid}
            onCreateChallenge={handleCreateChallenge}
            onRespondChallenge={handleRespondChallenge}
          />
          <HallOfFame players={players} matches={matches} history={history} />
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="space-y-8">
          <Settings
            isAdmin={isAdmin}
            currentUser={currentUser}
            onResetSeason={handleSeasonReset}
            onFactoryReset={handleFactoryReset}
            onStartFresh={handleStartFresh}
            onExport={handleExport}
            onImport={handleImport}
            onUpdateProfile={handleUpdateProfile}
          />
          <SeasonManager
            seasons={seasons}
            players={players}
            currentSeason={currentSeason}
            isAdmin={isAdmin}
            onStartSeason={handleStartSeason}
            onEndSeason={handleEndSeason}
          />
        </div>
      );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} onSignOut={handleSignOut} pendingCount={pendingMatches.filter(pm => {
      const involvedIds = [...pm.winners, ...pm.losers];
      const myPlayer = players.find(p => p.uid === currentUser?.uid);
      return myPlayer && involvedIds.includes(myPlayer.id) && !pm.confirmations.includes(currentUser?.uid || '');
    }).length} challengeCount={challenges.filter(c => {
      const myPlayer = players.find(p => p.uid === currentUser?.uid);
      return myPlayer && c.challengedId === myPlayer.id && c.status === 'pending';
    }).length}>
      {!isConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center text-xs py-1 z-[100] font-bold flex items-center justify-center gap-2">
           <WifiOff size={12} /> CONNECTION LOST - ATTEMPTING RECONNECT
        </div>
      )}
      {renderContent()}

      {showCreatePlayerModal && (
        <CreatePlayerForm
          rackets={rackets}
          onClose={() => setShowCreatePlayerModal(false)}
          onSubmit={handleCreatePlayer}
        />
      )}

      {/* Toast Container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slideUp ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-500/50 text-green-100'
                : 'bg-red-900/90 border-red-500/50 text-red-100'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => { toast.action!.onClick(); dismissToast(toast.id); }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
              >
                <Undo2 size={12} /> {toast.action.label}
              </button>
            )}
            <button onClick={() => dismissToast(toast.id)} className="text-white/50 hover:text-white">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default App;
