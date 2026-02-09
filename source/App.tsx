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
import {
  getLeagueData, recordMatch, createPlayer, createRacket, updateRacket, updatePlayer,
  deletePlayer, deleteRacket, resetLeagueData, deleteMatch,
  exportLeagueData, importLeagueData, getMe, setupProfile, updateMyProfile
} from './services/storageService';
import { onAuthStateChanged, signOut } from './services/authService';
import { LeagueState } from './services/storageService';
import { Player, Match, GameType, EloHistoryEntry, Racket, RacketStats, AppUser } from './types';
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
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

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
  };

  const handleProfileSetup = async (name: string, avatar: string, bio: string) => {
    const result = await setupProfile(name, avatar, bio);
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
      />
    );
  }

  const renderContent = () => {
    if (activeTab === 'leaderboard') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Leaderboard players={players} matches={matches} onPlayerClick={handleLeaderboardPlayerClick} />
          </div>
          <div className="lg:col-span-1">
             <RecentMatches matches={matches} players={players} onDeleteMatch={isAdmin ? handleDeleteMatch : undefined} />
          </div>
        </div>
      );
    }

    if (activeTab === 'log') {
      if (players.length < 2) return <div className="text-center text-gray-500 mt-10">Add at least 2 players to log matches.</div>;
      return (
        <div className="max-w-2xl mx-auto space-y-0">
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
      );
    }

    if (activeTab === 'armory') {
      return <RacketManager rackets={rackets} onCreateRacket={handleCreateRacket} onDeleteRacket={isAdmin ? handleDeleteRacket : undefined} onUpdateRacket={handleUpdateRacket} />
    }

    if (activeTab === 'settings') {
      return <Settings
        isAdmin={isAdmin}
        currentUser={currentUser}
        onResetSeason={handleSeasonReset}
        onFactoryReset={handleFactoryReset}
        onStartFresh={handleStartFresh}
        onExport={handleExport}
        onImport={handleImport}
        onUpdateProfile={handleUpdateProfile}
      />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} onSignOut={handleSignOut}>
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
