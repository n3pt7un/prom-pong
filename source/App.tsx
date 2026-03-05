import React, { useState, useEffect } from 'react';
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
import CreateChallengeModal from './components/CreateChallengeModal';
import LogChallengeMatchModal from './components/LogChallengeMatchModal';

import ChallengeBoard from './components/ChallengeBoard';
import TournamentBracket from './components/TournamentBracket';
import SeasonManager from './components/SeasonManager';
import LeagueManager from './components/LeagueManager';
import InsightsPage from './components/InsightsPage';
import MatchHistory from './components/MatchHistory';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeagueProvider, useLeague } from './context/LeagueContext';
import { useLeagueHandlers } from './hooks/useLeagueHandlers';
import { useChallengeToasts } from './hooks/useChallengeToasts';
import { GameType, MatchFormat, Challenge } from './types';
import { createCorrectionRequest } from './services/storageService';
import { WifiOff, CheckCircle, AlertCircle, X, Undo2, Loader2 } from 'lucide-react';

function AppContent() {
  const {
    authLoading,
    firebaseUser,
    currentUser,
    isAdmin,
    unclaimedPlayers,
    handleSignOut,
    handleProfileSetup,
    handleClaimPlayer,
    handleUpdateProfile,
  } = useAuth();
  const {
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
  } = useLeague();
  const { toasts, dismissToast, showToast } = useToast();
  const handlers = useLeagueHandlers();

  useChallengeToasts({
    matches,
    players,
    history,
    currentPlayerId: currentUser?.player?.id,
    showToast,
  });

  const [activeTab, setActiveTab] = useState('leaderboard');

  const VALID_TABS = new Set([
    'leaderboard', 'log', 'recent', 'players', 'matchmaker',
    'challenges', 'tournaments', 'seasons', 'settings', 'leagues',
    'rackets', 'weekly', 'hof', 'insights', 'events', 'armory',
  ]);

  // On mount: restore tab from hash (supports bookmarks / hard refresh)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && VALID_TABS.has(hash)) {
      setActiveTab(hash);
    } else {
      window.history.replaceState({ tab: 'leaderboard' }, '', '#leaderboard');
    }
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const tab = e.state?.tab;
      if (tab && VALID_TABS.has(tab)) setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Replace setActiveTab calls with navigateTo
  const navigateTo = (tab: string) => {
    window.history.pushState({ tab }, '', `#${tab}`);
    setActiveTab(tab);
  };

  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [showLogMatchModal, setShowLogMatchModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [activeChallengeForLog, setActiveChallengeForLog] = useState<Challenge | null>(null);

const [matchPrefill, setMatchPrefill] = useState<{ type: GameType; team1: string[]; team2: string[] } | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const currentPlayerIds = currentUser?.player ? [currentUser.player.id] : [];

  const handleRequestCorrection = async (matchId: string, data: {
    proposedWinners: string[];
    proposedLosers: string[];
    proposedScoreWinner: number;
    proposedScoreLoser: number;
    reason?: string;
  }) => {
    try {
      await createCorrectionRequest({ matchId, ...data });
      showToast('Correction request submitted — admin will review', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit request', 'error');
    }
  };

  const handleMatchmakerSelect = (type: GameType, team1: string[], team2: string[]) => {
    setMatchPrefill({ type, team1, team2 });
    navigateTo('log');
  };

  const handleLeaderboardPlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    navigateTo('players');
  };

  const handleMatchSubmitWithTab = async (
    type: GameType,
    winners: string[],
    losers: string[],
    scoreW: number,
    scoreL: number,
    isFriendly = false,
    leagueId?: string,
    matchFormat?: MatchFormat
  ) => {
    const result = await handlers.handleMatchSubmit(type, winners, losers, scoreW, scoreL, isFriendly, leagueId, matchFormat);
    if (result) navigateTo('leaderboard');
  };

  const currentSeason = seasons.find((s) => s.status === 'active');

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
    return <LoginScreen onLoginSuccess={() => { }} />;
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

  const renderContent = () => {
    if (activeTab === 'leaderboard') {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PlayerOfTheWeek players={players} matches={matches} history={history} onPlayerClick={handleLeaderboardPlayerClick} />
            <WeeklyChallenges matches={matches} players={players} history={history} currentPlayerId={currentUser?.player?.id} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Leaderboard
                players={players}
                matches={matches}
                history={history}
                onPlayerClick={handleLeaderboardPlayerClick}
                activeLeagueId={activeLeagueId}
                leagues={leagues}
              />
            </div>
            <div className="lg:col-span-1 space-y-6">
              {pendingMatches.length > 0 && (
                <PendingMatches
                  pendingMatches={pendingMatches}
                  players={players}
                  currentUserUid={currentUser?.uid}
                  isAdmin={isAdmin}
                  onConfirm={handlers.handleConfirmPending}
                  onDispute={handlers.handleDisputePending}
                  onForceConfirm={isAdmin ? handlers.handleForceConfirmPending : undefined}
                  onReject={isAdmin ? handlers.handleRejectPending : undefined}
                />
              )}
              <RecentMatches
                matches={matches}
                players={players}
                isAdmin={isAdmin}
                currentUserUid={currentUser?.uid}
                currentPlayerIds={currentPlayerIds}
                onDeleteMatch={handlers.handleDeleteMatch}
                onEditMatch={handlers.handleEditMatch}
                onRequestCorrection={handleRequestCorrection}
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
          <MatchMaker players={players} onSelectMatch={handleMatchmakerSelect} activeLeagueId={activeLeagueId} />
          <MatchLogger
            players={players}
            onSubmit={handleMatchSubmitWithTab}
            prefill={matchPrefill}
            onPrefillConsumed={() => setMatchPrefill(null)}
            currentPlayerId={currentUser?.player?.id}
            isAdmin={isAdmin}
            activeLeagueId={activeLeagueId}
            leagues={leagues}
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
            onUpdateRacket={handlers.handleUpdatePlayerRacket}
            onDeletePlayer={handlers.handleDeletePlayer}
            onAddPlayer={() => setShowCreatePlayerModal(true)}
            onNavigateToArmory={() => navigateTo('armory')}
            onUpdatePlayerName={handlers.handleUpdatePlayerName}
            onClearInitialSelection={() => setSelectedPlayerId(null)}
            activeLeagueId={activeLeagueId}
            leagues={leagues}
          />
        </div>
      );
    }

    if (activeTab === 'armory') {
      return (
        <RacketManager
          rackets={rackets}
          onCreateRacket={handlers.handleCreateRacket}
          onDeleteRacket={isAdmin ? handlers.handleDeleteRacket : undefined}
          onUpdateRacket={handlers.handleUpdateRacket}
        />
      );
    }

    if (activeTab === 'events') {
      return (
        <div className="space-y-10">
          <MatchHistory
            matches={matches}
            players={players}
            onPlayerClick={handleLeaderboardPlayerClick}
          />
          <TournamentBracket
            tournaments={tournaments}
            players={players}
            isAdmin={isAdmin}
            currentUserUid={currentUser?.uid}
            onCreateTournament={handlers.handleCreateTournament}
            onSubmitResult={handlers.handleSubmitTournamentResult}
            onDeleteTournament={isAdmin ? handlers.handleDeleteTournament : undefined}
          />
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="space-y-8">
          <Settings
            isAdmin={isAdmin}
            currentUser={currentUser}
            onResetSeason={handlers.handleSeasonReset}
            onFactoryReset={handlers.handleFactoryReset}
            onStartFresh={handlers.handleStartFresh}
            onExport={handlers.handleExport}
            onImport={handlers.handleImport}
            onUpdateProfile={handleUpdateProfile}
            players={players}
            matches={matches}
            leagues={leagues}
            correctionRequests={correctionRequests}
            onRefreshData={refreshData}
            onApproveCorrection={handlers.handleApproveCorrection}
            onRejectCorrection={handlers.handleRejectCorrection}
          />
          <LeagueManager
            leagues={leagues}
            players={players}
            isAdmin={isAdmin}
            onCreateLeague={handlers.handleCreateLeague}
            onUpdateLeague={handlers.handleUpdateLeague}
            onDeleteLeague={handlers.handleDeleteLeague}
            onAssignPlayer={handlers.handleAssignPlayerLeague}
          />
          <SeasonManager
            seasons={seasons}
            players={players}
            currentSeason={currentSeason}
            isAdmin={isAdmin}
            onStartSeason={handlers.handleStartSeason}
            onEndSeason={handlers.handleEndSeason}
          />
        </div>
      );
    }

    if (activeTab === 'insights') {
      return (
        <div className="space-y-8">
          {currentUser?.player?.id ? (
            <InsightsPage playerId={currentUser.player.id} />
          ) : (
            <div className="text-center text-gray-500 py-8 font-mono text-sm">
              Set up a player profile to see personal insights.
            </div>
          )}
          <HallOfFame players={players} matches={matches} history={history} onPlayerClick={handleLeaderboardPlayerClick} />
          <ChallengeBoard
            challenges={challenges}
            players={players}
            matches={matches}
            currentPlayerId={currentUser?.player?.id}
            currentUserUid={currentUser?.uid}
            onRespondChallenge={handlers.handleRespondChallenge}
            onCancelChallenge={handlers.handleCancelChallenge}
            onCompleteChallenge={(challengeId) => {
              const c = challenges.find(ch => ch.id === challengeId);
              if (c) setActiveChallengeForLog(c);
            }}
          />
        </div>
      );
    }

    return null;
  };

  const pendingCount = pendingMatches.filter((pm) => {
    const involvedIds = [...pm.winners, ...pm.losers];
    const myPlayer = players.find((p) => p.uid === currentUser?.uid);
    return myPlayer && involvedIds.includes(myPlayer.id) && !pm.confirmations.includes(currentUser?.uid || '');
  }).length;

  const challengeCount = challenges.filter((c) => {
    const myPlayer = players.find((p) => p.uid === currentUser?.uid);
    return myPlayer && c.challengedId === myPlayer.id && c.status === 'pending';
  }).length;

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={navigateTo}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onLogMatch={() => setShowLogMatchModal(true)}
        onOpenChallenge={currentUser?.player ? () => setShowChallengeModal(true) : undefined}
        leagues={leagues}
        activeLeagueId={activeLeagueId}
        onLeagueChange={setActiveLeagueId}
        pendingCount={pendingCount}
        challengeCount={challengeCount}
      >
        {renderContent()}

        {showCreatePlayerModal && (
          <CreatePlayerForm
            rackets={rackets}
            onClose={() => setShowCreatePlayerModal(false)}
            onSubmit={(name, avatar, racketId) => {
              handlers.handleCreatePlayer(name, avatar, racketId);
              setShowCreatePlayerModal(false);
            }}
          />
        )}
      </Layout>

      {/* Connection lost — z-[150]: above hamburger overlay (z-[100]) */}
      {!isConnected && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-center text-xs py-1 z-[150] font-bold flex items-center justify-center gap-2">
          <WifiOff size={12} /> CONNECTION LOST - ATTEMPTING RECONNECT
        </div>
      )}

      {/* Log match modal — z-[300] */}
      {showLogMatchModal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowLogMatchModal(false); }}
        >
          {/* Column layout: sticky close button on top, scrollable content below */}
          <div className="w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex justify-end pb-2 flex-shrink-0">
              <button
                onClick={() => setShowLogMatchModal(false)}
                className="text-gray-400 hover:text-white bg-black/60 border border-white/10 rounded-full p-1.5 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto">
              {players.length < 2 ? (
                <div className="text-center text-gray-500 mt-10">Add at least 2 players to log matches.</div>
              ) : (
                <MatchLogger
                  players={players}
                  onSubmit={async (type, winners, losers, scoreW, scoreL, isFriendly, leagueId, matchFormat) => {
                    const result = await handlers.handleMatchSubmit(type, winners, losers, scoreW, scoreL, isFriendly, leagueId, matchFormat);
                    if (result) setShowLogMatchModal(false);
                  }}
                  currentPlayerId={currentUser?.player?.id}
                  isAdmin={isAdmin}
                  activeLeagueId={activeLeagueId}
                  leagues={leagues}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Challenge creation modal — z-[200] */}
      {showChallengeModal && currentUser?.player && (
        <CreateChallengeModal
          players={players}
          matches={matches}
          currentPlayerId={currentUser.player.id}
          onCreateChallenge={handlers.handleCreateChallenge}
          onClose={() => setShowChallengeModal(false)}
        />
      )}

      {/* Log challenge match modal — z-[400] */}
      {activeChallengeForLog && (
        <LogChallengeMatchModal
          challenge={activeChallengeForLog}
          players={players}
          onSubmit={handlers.handleCompleteChallenge}
          onClose={() => setActiveChallengeForLog(null)}
        />
      )}

      {/* Toasts — z-[200] */}
      <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slideUp ${toast.type === 'success'
                ? 'bg-green-900/90 border-green-500/50 text-green-100'
                : 'bg-red-900/90 border-red-500/50 text-red-100'
              }`}
          >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismissToast(toast.id);
                }}
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

    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LeagueProvider>
          <AppContent />
        </LeagueProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
