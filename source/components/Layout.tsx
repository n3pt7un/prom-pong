import React, { useState, useEffect } from 'react';
import {
  Trophy, Users, Settings, Sword, LogOut, ShieldCheck, Swords, Building2,
  TrendingUp, PlusCircle, ChevronLeft, ChevronRight, Zap,
  LayoutDashboard, History, Star, Calendar, MoreHorizontal, X,
} from 'lucide-react';
import { AppUser, League } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { thumbUrl } from '../utils/imageUtils';
import { cn } from '../lib/utils';
import { useHaptic } from '../context/HapticContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: AppUser | null;
  onSignOut: () => void;
  onLogMatch: () => void;
  onOpenChallenge?: () => void;
  onOpenAdminPanel?: () => void;
  pendingCount?: number;
  challengeCount?: number;
  leagues?: League[];
  activeLeagueId?: string | null;
  onLeagueChange?: (leagueId: string | null) => void;
}

const NAV_GROUPS = [
  {
    label: 'Play',
    items: [
      { tab: 'leaderboard', icon: Trophy, label: 'Rankings' },
      { tab: 'log', icon: PlusCircle, label: 'Log Match' },
    ],
  },
  {
    label: 'Community',
    items: [
      { tab: 'players', icon: Users, label: 'Players' },
      { tab: 'recent', icon: History, label: 'Recent' },
      { tab: 'hof', icon: Star, label: 'Hall of Fame' },
    ],
  },
  {
    label: 'Compete',
    items: [
      { tab: 'challenges', icon: Swords, label: 'Challenges' },
      { tab: 'weekly', icon: Calendar, label: 'Weekly' },
      { tab: 'tournaments', icon: Trophy, label: 'Tournaments' },
    ],
  },
  {
    label: 'Stats',
    items: [
      { tab: 'insights', icon: TrendingUp, label: 'Insights' },
      { tab: 'seasons', icon: LayoutDashboard, label: 'Seasons' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { tab: 'armory', icon: Sword, label: 'Armory' },
      { tab: 'leagues', icon: Building2, label: 'Leagues' },
      { tab: 'settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const BOTTOM_TABS = [
  { tab: 'leaderboard', icon: Trophy, label: 'Ranks', badge: false },
  { tab: 'players', icon: Users, label: 'Players', badge: false },
  { tab: 'challenges', icon: Swords, label: 'Compete', badge: true },
  { tab: 'insights', icon: TrendingUp, label: 'Stats', badge: false },
  { tab: '_more', icon: MoreHorizontal, label: 'More', badge: false },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  currentUser,
  onSignOut,
  onLogMatch,
  onOpenChallenge,
  onOpenAdminPanel,
  pendingCount = 0,
  challengeCount = 0,
  leagues = [],
  activeLeagueId,
  onLeagueChange,
}) => {
  const { trigger: hapticTrigger } = useHaptic();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const eventsBadge = pendingCount + challengeCount;

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const handleNav = (tab: string) => {
    hapticTrigger('nudge');
    if (tab === '_more') { setMoreOpen(true); return; }
    onTabChange(tab);
    setMoreOpen(false);
  };

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 font-sans selection:bg-cyber-cyan selection:text-black">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
      </div>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex fixed top-0 left-0 h-full z-40 flex-col',
          'bg-black/80 backdrop-blur-xl border-r border-white/8 transition-all duration-300',
          collapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-2 px-4 py-4 border-b border-white/8 flex-shrink-0',
          collapsed && 'justify-center px-0'
        )}>
          <Trophy className="text-cyber-cyan w-6 h-6 flex-shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold text-lg tracking-wider text-white leading-none">
              CYBER<span className="text-cyber-cyan">PONG</span>
            </span>
          )}
        </div>

        {/* League selector */}
        {!collapsed && leagues.length > 0 && onLeagueChange && (
          <div className="px-3 py-2 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 size={11} className="text-gray-500" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">League</span>
            </div>
            <select
              value={activeLeagueId || ''}
              onChange={e => onLeagueChange(e.target.value || null)}
              className="w-full bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none"
            >
              <option value="">🌐 Global</option>
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-4 mb-1 text-[10px] font-mono text-gray-600 uppercase tracking-widest">{group.label}</p>
              )}
              <div className="space-y-0.5 px-2">
                {group.items.map(({ tab, icon: Icon, label, badge }) => {
                  const badgeCount = badge ? eventsBadge : 0;
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => onTabChange(tab)}
                      title={collapsed ? label : undefined}
                      className={cn(
                        'relative w-full flex items-center gap-3 rounded-lg transition-all duration-200 text-left',
                        collapsed ? 'justify-center p-3' : 'px-3 py-2',
                        isActive
                          ? 'text-cyber-cyan bg-cyber-cyan/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyber-cyan rounded-full" />
                      )}
                      <Icon size={16} className="flex-shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{label}</span>}
                      {!collapsed && badgeCount > 0 && (
                        <span className="ml-auto bg-cyber-pink text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                      {collapsed && badgeCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-cyber-pink rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: admin + user + collapse toggle */}
        <div className="flex-shrink-0 border-t border-white/8 p-2 space-y-1">
          {currentUser?.isAdmin && (
            <button
              onClick={onOpenAdminPanel}
              title={collapsed ? 'Admin Panel' : undefined}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg text-cyber-purple hover:bg-cyber-purple/10 transition-colors',
                collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
              )}
            >
              <ShieldCheck size={16} className="flex-shrink-0" />
              {!collapsed && <span className="text-xs font-bold">Admin Panel</span>}
            </button>
          )}

          <button
            onClick={onSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            )}
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs font-medium">Sign Out</span>}
          </button>

          {!collapsed && currentUser && (
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src={thumbUrl(currentUser.photoURL || '', 48)} referrerPolicy="no-referrer" />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-400 font-medium truncate">{currentUser.displayName}</span>
            </div>
          )}

          <button
            onClick={() => setCollapsed(c => !c)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
            )}
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <><ChevronLeft size={14} /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ──────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-[calc(52px+env(safe-area-inset-top))] bg-black/80 backdrop-blur-xl border-b border-white/8 flex items-end justify-between px-4 pb-2 pt-[env(safe-area-inset-top)]">
        <button onClick={() => onTabChange('leaderboard')} className="flex items-center gap-2">
          <Trophy className="text-cyber-cyan w-5 h-5" />
          <span className="font-display font-bold text-base tracking-wider text-white">
            CYBER<span className="text-cyber-cyan">PONG</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {leagues.length > 0 && onLeagueChange && (
            <select
              value={activeLeagueId || ''}
              onChange={e => onLeagueChange(e.target.value || null)}
              className="bg-black/50 border border-white/10 text-gray-300 text-[11px] p-1 rounded-md font-mono focus:border-cyber-cyan outline-none max-w-[100px]"
            >
              <option value="">🌐 Global</option>
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          {currentUser && (
            <Avatar className="w-7 h-7">
              <AvatarImage src={thumbUrl(currentUser.photoURL || '', 48)} referrerPolicy="no-referrer" />
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="h-[60px] flex items-stretch">
        {BOTTOM_TABS.map(({ tab, icon: Icon, label, badge }) => {
          const badgeCount = badge ? eventsBadge : 0;
          const isActive = activeTab === tab || (tab === '_more' && moreOpen);
          return (
            <button
              key={tab}
              onClick={() => handleNav(tab)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative',
                isActive ? 'text-cyber-cyan' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyber-cyan rounded-full" />
              )}
              <Icon size={18} />
              <span className="text-[10px] font-medium">{label}</span>
              {badgeCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-18px)] w-2 h-2 bg-cyber-pink rounded-full" />
              )}
            </button>
          );
        })}
        </div>
      </nav>

      {/* ── MOBILE MORE SHEET ───────────────────────────────── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 transition-opacity duration-300',
          moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMoreOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className={cn(
            'absolute left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl transition-transform duration-300 max-h-[75vh] overflow-y-auto',
            moreOpen ? 'translate-y-0' : 'translate-y-full'
          )}
          style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">All Sections</span>
            <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {NAV_GROUPS.flatMap(g => g.items)
              .filter(item => !BOTTOM_TABS.some(b => b.tab === item.tab))
              .map(({ tab, icon: Icon, label }) => (
                <button
                  key={tab}
                  onClick={() => handleNav(tab)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors',
                    activeTab === tab
                      ? 'bg-cyber-cyan/10 text-cyber-cyan'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                </button>
              ))}
            {currentUser?.isAdmin && (
              <button
                onClick={() => { setMoreOpen(false); onOpenAdminPanel?.(); }}
                className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 text-cyber-purple hover:bg-cyber-purple/10 transition-colors"
              >
                <ShieldCheck size={20} />
                <span className="text-[10px] font-medium text-center leading-tight">Admin</span>
              </button>
            )}
            <button
              onClick={() => { setMoreOpen(false); onSignOut(); }}
              className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[10px] font-medium text-center leading-tight">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FABs ────────────────────────────────────────────── */}
      {/* FAB stack — bottom-right, above mobile bottom nav */}
      <div className="fab-stack fixed md:bottom-8 right-5 z-[45] flex flex-col items-center gap-3">
        {onOpenChallenge && currentUser?.player && (
          <button
            onClick={onOpenChallenge}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-purple to-cyber-pink shadow-[0_0_20px_rgba(180,0,255,0.4)] hover:scale-110 transition-all text-white"
            aria-label="Issue a challenge"
            title="Issue a challenge"
          >
            <Zap size={20} strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={onLogMatch}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-cyan to-cyber-purple shadow-[0_0_24px_rgba(0,243,255,0.5)] hover:scale-110 transition-all text-black"
          aria-label="Log a match"
          title="Log a match"
        >
          <PlusCircle size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main
        className={cn(
          'app-main relative z-10 px-4 md:pt-8 md:pb-8 transition-all duration-300',
          collapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'
        )}
      >
        <div className="w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
