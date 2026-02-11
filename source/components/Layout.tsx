import React from 'react';
import { Trophy, PlusCircle, Users, Settings, Sword, LogOut, ShieldCheck, Swords, Building2 } from 'lucide-react';
import { AppUser, League } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: AppUser | null;
  onSignOut: () => void;
  pendingCount?: number;
  challengeCount?: number;
  leagues?: League[];
  activeLeagueId?: string | null;
  onLeagueChange?: (leagueId: string | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onSignOut, pendingCount = 0, challengeCount = 0, leagues = [], activeLeagueId, onLeagueChange }) => {
  const eventsBadge = pendingCount + challengeCount;

  return (
    <div className="min-h-screen bg-cyber-bg text-gray-200 font-sans selection:bg-cyber-cyan selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyber-cyan/10 blur-[120px] rounded-full" />
      </div>

      <nav className="fixed bottom-0 md:top-0 md:bottom-auto w-full z-50 glass-panel border-t md:border-b md:border-t-0 border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="hidden md:flex items-center gap-2">
            <Trophy className="text-cyber-cyan w-8 h-8" />
            <span className="font-display font-bold text-2xl tracking-wider text-white">
              CYBER<span className="text-cyber-cyan">PONG</span>
            </span>
          </div>

          {/* League Selector - Desktop */}
          {leagues.length > 0 && onLeagueChange && (
            <div className="hidden md:flex items-center gap-2">
              <Building2 size={14} className="text-gray-500" />
              <select
                value={activeLeagueId || ''}
                onChange={e => onLeagueChange(e.target.value || null)}
                className="bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none cursor-pointer hover:border-white/30 transition-colors"
              >
                <option value="">🌐 Global</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex w-full md:w-auto justify-around md:gap-4 lg:gap-8 overflow-x-auto">
            <NavButton 
              icon={<Trophy size={20} />} 
              label="Rankings" 
              active={activeTab === 'leaderboard'} 
              onClick={() => onTabChange('leaderboard')} 
            />
            <NavButton 
              icon={<PlusCircle size={20} />} 
              label="Log Match" 
              active={activeTab === 'log'} 
              onClick={() => onTabChange('log')} 
            />
            <NavButton 
              icon={<Users size={20} />} 
              label="Players" 
              active={activeTab === 'players'} 
              onClick={() => onTabChange('players')} 
            />
            <NavButton 
              icon={<Swords size={20} />} 
              label="Events" 
              active={activeTab === 'events'} 
              onClick={() => onTabChange('events')}
              badge={eventsBadge > 0 ? eventsBadge : undefined}
            />
             <NavButton 
              icon={<Sword size={20} />} 
              label="Armory" 
              active={activeTab === 'armory'} 
              onClick={() => onTabChange('armory')} 
            />
             <NavButton 
              icon={<Settings size={20} />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              onClick={() => onTabChange('settings')} 
            />
            {/* Logout - mobile only */}
            <button
              onClick={onSignOut}
              className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 flex-shrink-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 md:hidden"
            >
              <LogOut size={20} />
              <span className="text-xs font-bold tracking-wide">Logout</span>
            </button>
          </div>

          {/* User Info - Desktop only */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-3">
              {currentUser.isAdmin && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-cyber-yellow bg-cyber-yellow/10 border border-cyber-yellow/30 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  <ShieldCheck size={10} /> Admin
                </span>
              )}
              <img
                src={currentUser.photoURL || ''}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="text-sm text-gray-300 font-bold max-w-[100px] truncate">
                {currentUser.displayName}
              </span>
              <button
                onClick={onSignOut}
                className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* League Selector - Mobile (above content) */}
      {leagues.length > 0 && onLeagueChange && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass-panel border-b border-white/10 px-4 py-2 flex items-center justify-center gap-2">
          <Building2 size={14} className="text-gray-500" />
          <select
            value={activeLeagueId || ''}
            onChange={e => onLeagueChange(e.target.value || null)}
            className="bg-black/50 border border-white/10 text-gray-300 text-xs p-1.5 rounded-lg font-mono focus:border-cyber-cyan outline-none flex-1 max-w-[200px]"
          >
            <option value="">🌐 Global</option>
            {leagues.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      <main className={`relative z-10 max-w-7xl mx-auto px-4 pb-24 md:pb-12 ${leagues.length > 0 ? 'pt-14 md:pt-24' : 'pt-8 md:pt-24'}`}>
        {children}
      </main>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number }) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col md:flex-row items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 flex-shrink-0 ${
      active 
        ? 'text-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_15px_rgba(0,243,255,0.2)]' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="text-xs md:text-sm font-bold tracking-wide">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-cyber-pink text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-neon-pink">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

export default Layout;
