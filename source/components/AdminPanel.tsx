import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Trophy, Calendar, Database,
  Settings, TrendingUp, AlertCircle, Edit2, Trash2,
  Plus, X, Check, Search, Filter, RefreshCw, Zap
} from 'lucide-react';
import { Player, Season, League, Match, AdminStats } from '../types';
import { getIdToken } from '../services/authService';
import { UsersTab } from './admin/UsersTab';
import { MatchesTab } from './admin/MatchesTab';
import { LeaguesTab } from './admin/LeaguesTab';
import { SeasonsTab } from './admin/SeasonsTab';
import { AdminsTab } from './admin/AdminsTab';
import { EloConfigTab } from './admin/EloConfigTab';
import { ChallengeSettingsTab } from './admin/ChallengeSettingsTab';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface AdminPanelProps {
  onClose: () => void;
}

type TabType = 'overview' | 'users' | 'matches' | 'leagues' | 'seasons' | 'admins' | 'elo' | 'challenges';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/stats', { headers });
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (activeTab === 'matches') {
        const res = await fetch('/api/admin/matches', { headers });
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      } else if (activeTab === 'leagues') {
        const res = await fetch('/api/admin/leagues', { headers });
        const data = await res.json();
        setLeagues(Array.isArray(data) ? data : []);
      } else if (activeTab === 'seasons') {
        const res = await fetch('/api/admin/seasons', { headers });
        const data = await res.json();
        setSeasons(Array.isArray(data) ? data : []);
      } else if (activeTab === 'admins') {
        const res = await fetch('/api/admin/admins', { headers });
        const data = await res.json();
        setAdmins(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'matches', label: 'Matches', icon: Trophy },
    { id: 'leagues', label: 'Leagues', icon: Database },
    { id: 'seasons', label: 'Seasons', icon: Calendar },
    { id: 'admins', label: 'Admins', icon: Shield },
    { id: 'elo', label: 'ELO Config', icon: Settings },
    { id: 'challenges', label: 'Auto Challenges', icon: Zap },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-cyber-purple/30 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyber-purple/20 to-cyber-cyan/20 border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-cyber-purple" size={28} />
              <div>
                <h2 className="text-2xl font-display font-bold text-white">
                  ADMIN <span className="text-cyber-purple">PANEL</span>
                </h2>
                <p className="text-xs text-gray-400 font-mono">System Management & Configuration</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="text-gray-400" size={24} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 bg-black/40">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-cyber-purple text-cyber-purple bg-cyber-purple/10'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-purple"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab stats={stats} />}
              {activeTab === 'users' && <UsersTab users={users} onRefresh={loadData} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
              {activeTab === 'matches' && <MatchesTab matches={matches} onRefresh={loadData} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
              {activeTab === 'leagues' && <LeaguesTab leagues={leagues} onRefresh={loadData} />}
              {activeTab === 'seasons' && <SeasonsTab seasons={seasons} onRefresh={loadData} />}
              {activeTab === 'admins' && <AdminsTab admins={admins} users={users} onRefresh={loadData} />}
              {activeTab === 'elo' && <EloConfigTab />}
              {activeTab === 'challenges' && <ChallengeSettingsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ stats: AdminStats | null }> = ({ stats }) => {
  const [recalculating, setRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{ playersUpdated: number; matchesReplayed: number } | null>(null);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcResult(null);
    setRecalcError(null);
    setConfirming(false);
    try {
      const { getIdToken } = await import('../services/authService');
      const token = await getIdToken();
      const res = await fetch('/api/admin/recalculate-elo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recalculation failed');
      setRecalcResult(data);
    } catch (err: any) {
      setRecalcError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  if (!stats) return null;

  const statCards = [
    { label: 'Total Players', value: stats.totalPlayers, icon: Users, color: 'cyber-cyan' },
    { label: 'Total Matches', value: stats.totalMatches, icon: Trophy, color: 'cyber-purple' },
    { label: 'Active Seasons', value: stats.activeSeasons, icon: Calendar, color: 'green-400' },
    { label: 'Completed Seasons', value: stats.completedSeasons, icon: Calendar, color: 'gray-400' },
    { label: 'Total Leagues', value: stats.totalLeagues, icon: Database, color: 'cyber-pink' },
    { label: 'Pending Matches', value: stats.pendingMatches, icon: AlertCircle, color: 'yellow-400' },
    { label: 'Pending Corrections', value: stats.pendingCorrections, icon: AlertCircle, color: 'orange-400' },
    { label: 'Total Admins', value: stats.totalAdmins, icon: Shield, color: 'cyber-purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="p-6 border-white/10 hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <Icon className={`text-${card.color}`} size={24} />
                <span className={`text-3xl font-display font-bold text-${card.color}`}>
                  {card.value}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">{card.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Danger Zone */}
      <Card className="p-6 border-red-500/20 space-y-4">
        <h3 className="text-sm font-display font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
          <AlertCircle size={16} /> Danger Zone
        </h3>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-bold text-white">Recalculate ELO from Match History</p>
            <p className="text-xs text-gray-400 mt-1">
              Resets all player ratings to 1200 and replays every non-friendly match in chronological order using the current K-factor (32).
              Use this after changing the K-factor.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {!confirming ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirming(true)}
                className="border-red-500/40 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              >
                <RefreshCw size={14} />
                Recalculate ELO
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-mono">Are you sure?</span>
                <Button
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {recalculating ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                  {recalculating ? 'Recalculating...' : 'Confirm'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {recalcResult && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-xs font-mono text-green-400">
            Done — {recalcResult.matchesReplayed} matches replayed, {recalcResult.playersUpdated} players updated.
          </div>
        )}
        {recalcError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-xs font-mono text-red-400">
            Error: {recalcError}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminPanel;
