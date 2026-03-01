import React from 'react';
import { Trophy, Users, TrendingUp, Target } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'trophy' | 'users' | 'trending' | 'target';
  title: string;
  message: string;
  actionText?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'trophy', 
  title, 
  message, 
  actionText 
}) => {
  const IconComponent = {
    trophy: Trophy,
    users: Users,
    trending: TrendingUp,
    target: Target,
  }[icon];

  return (
    <div className="glass-panel p-12 rounded-xl border border-white/5 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          <IconComponent size={40} className="text-gray-500 opacity-50" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">{message}</p>
        </div>
        {actionText && (
          <div className="mt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider">
              <Target size={14} />
              {actionText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
