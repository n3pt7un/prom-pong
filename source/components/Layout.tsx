import React, { useState, useEffect } from 'react';
import { Trophy, Users, Settings, Sword, LogOut, ShieldCheck, Swords, Building2, Github, TrendingUp, Menu, X, PlusCircle } from 'lucide-react';
import { AppUser, League } from '../types';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const eventsBadge = pendingCount + challengeCount;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  const navItems = [
    { tab: 'leaderboard', icon: <Trophy size={20} />, label: 'Rankings' },
    { tab: 'players', icon: <Users size={20} />, label: 'Players' },
    { tab: 'insights', icon: <TrendingUp size={20} />, label: 'Insights' },
    { tab: 'events', icon: <Swords size={20} />, label: 'Events', badge: eventsBadge > 0 ? eventsBadge : undefined },
    { tab: 'armory', icon: <Sword size={20} />, label: 'Armory' },
    { tab: 'settings', icon: <Settings size={20} />, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 font-sans selection:bg-cyber-cyan selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
      </div>

      {/* Top Bar — z-50 */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/10 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          {/* Hamburger button — left */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="text-gray-300 hover:text-cyber-cyan transition-colors p-2 rounded-lg hover:bg-white/5 flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Logo — clicking goes home */}
          <button
            onClick={() => onTabChange('leaderboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
            aria-label="Go to rankings"
          >
            <Trophy className="text-cyber-cyan w-7 h-7" />
            <span className="font-display font-bold text-xl tracking-wider text-white">
              CYBER<span className="text-cyber-cyan">PONG</span>
            </span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* League Selector — desktop */}
          {leagues.length > 0 && onLeagueChange && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Building2 size={13} className="text-gray-500" />
              <select
                value={activeLeagueId || ''}
                onChange={e => onLeagueChange(e.target.value || null)}
                className="bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none cursor-pointer hover:border-white/30 transition-colors"
              >
                <option value="">🌐 Global</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {/* User avatar */}
          {currentUser && (
            <div className="flex items-center gap-2">
              {currentUser.isAdmin && (
                <>
                  <button
                    onClick={onOpenAdminPanel}
                    className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-cyber-purple bg-cyber-purple/10 border border-cyber-purple/30 px-2 py-1 rounded-lg uppercase tracking-widest hover:bg-cyber-purple/20 transition-colors"
                    title="Open Admin Panel"
                  >
                    <ShieldCheck size={12} /> Admin Panel
                  </button>
                  <span className="sm:hidden flex items-center gap-1 text-[10px] font-bold text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                    <ShieldCheck size={10} /> Admin
                  </span>
                </>
              )}
              <img
                src={currentUser.photoURL || ''}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="hidden md:block text-sm text-gray-300 font-bold max-w-[100px] truncate">
                {currentUser.displayName}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/*
        Hamburger menu drawer — always in the DOM so CSS transitions work.
        z-[100] places it above the nav (z-50) and FAB (z-[60]).
        When closed: opacity-0 + pointer-events-none = invisible & non-interactive.
        Drawer slides in from right via translate-x.
      */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Drawer panel — slides in from left */}
        <div
          className={`absolute top-0 left-0 h-full w-72 glass-panel border-r border-white/10 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Trophy className="text-cyber-cyan w-6 h-6" />
              <span className="font-display font-bold text-lg tracking-wider text-white">
                CYBER<span className="text-cyber-cyan">PONG</span>
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <X size={20} />
            </button>
          </div>

          {/* User info */}
          {currentUser && (
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
              <img
                src={currentUser.photoURL || ''}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser.displayName}</p>
                {currentUser.isAdmin && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-cyber-yellow mt-0.5">
                    <ShieldCheck size={9} /> Admin
                  </span>
                )}
              </div>
            </div>
          )}

          {/* League selector — mobile only */}
          {leagues.length > 0 && onLeagueChange && (
            <div className="sm:hidden px-5 py-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
              <Building2 size={14} className="text-gray-500" />
              <select
                value={activeLeagueId || ''}
                onChange={e => onLeagueChange(e.target.value || null)}
                className="bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none flex-1"
              >
                <option value="">🌐 Global</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {navItems.map(({ tab, icon, label, badge }) => (
              <button
                key={tab}
                onClick={() => handleNavClick(tab)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                  activeTab === tab
                    ? 'text-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_12px_rgba(0,243,255,0.15)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {icon}
                <span className="font-bold tracking-wide text-sm">{label}</span>
                {badge !== undefined && (
                  <span className="ml-auto bg-cyber-pink text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-neon-pink">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
            <button
              onClick={() => { onSignOut(); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut size={20} />
              <span className="font-bold tracking-wide text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Challenge FAB — only shown when user has a player profile */}
      {onOpenChallenge && currentUser?.player && (
        <button
          onClick={onOpenChallenge}
          className="fixed bottom-24 right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-cyan to-cyber-pink shadow-[0_0_20px_rgba(0,243,255,0.5)] hover:shadow-[0_0_30px_rgba(0,243,255,0.7)] hover:scale-110 transition-all duration-200 text-black"
          aria-label="Issue a challenge"
          title="Issue a challenge"
        >
          <Swords size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Log Match FAB — z-[60]: above nav, hidden behind menu overlay when open */}
      <button
        onClick={onLogMatch}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-cyber-cyan to-cyber-pink shadow-[0_0_20px_rgba(0,243,255,0.5)] hover:shadow-[0_0_30px_rgba(0,243,255,0.7)] hover:scale-110 transition-all duration-200 text-black"
        aria-label="Log a match"
        title="Log a match"
      >
        <PlusCircle size={26} strokeWidth={2.5} />
      </button>

      {/*
        Main content — NO z-index here.
        Adding z-index would create a stacking context that traps child modals,
        preventing them from layering correctly above the nav.
      */}
      <main className="max-w-7xl mx-auto px-4 pb-12 pt-20">
        {children}
      </main>

      <footer className="py-6 text-center border-t border-white/10 mt-8">
        <a
          href="https://github.com/n3pt7un/prom-pong/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-cyber-cyan transition-colors text-sm"
        >
          <Github size={16} />
          <span>Report an Issue</span>
        </a>
      </footer>
    </div>
  );
};

export default Layout;
