import React from 'react';
import { Trophy, PlusCircle, Users, Settings, Sword, LogOut, ShieldCheck } from 'lucide-react';
import { AppUser } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: AppUser | null;
  onSignOut: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onSignOut }) => {
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

      <main className="relative z-10 max-w-7xl mx-auto px-4 pb-24 pt-8 md:pt-24 md:pb-12">
        {children}
      </main>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 flex-shrink-0 ${
      active 
        ? 'text-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_15px_rgba(0,243,255,0.2)]' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="text-xs md:text-sm font-bold tracking-wide">{label}</span>
  </button>
);

export default Layout;
