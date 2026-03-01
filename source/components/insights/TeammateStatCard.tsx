import React from 'react';
import { TeammateStatistics } from '../../types';
import { Trophy, TrendingDown, Users, TrendingUp } from 'lucide-react';

interface TeammateStatCardProps {
  stat: TeammateStatistics;
  isBest: boolean;
  isWorst: boolean;
}

const TeammateStatCard: React.FC<TeammateStatCardProps> = ({ stat, isBest, isWorst }) => {
  const isQualified = stat.matchesPlayed >= 3;
  const eloChangeColor = stat.avgEloChange > 0 ? 'text-green-400' : stat.avgEloChange < 0 ? 'text-red-400' : 'text-gray-400';
  const winRateColor = stat.winRate >= 60 ? 'text-green-400' : stat.winRate >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div 
      className={`glass-panel p-4 rounded-lg border transition-all ${
        isBest 
          ? 'border-green-500/50 hover:border-green-500/70 shadow-neon-green/20' 
          : isWorst 
          ? 'border-red-500/50 hover:border-red-500/70 shadow-neon-red/20'
          : 'border-white/5 hover:border-cyber-pink/30'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left: Teammate Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              {stat.teammateName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">{stat.teammateName}</h3>
                {isBest && isQualified && (
                  <Trophy size={16} className="text-green-400" title="Best Partner" />
                )}
                {isWorst && isQualified && (
                  <TrendingDown size={16} className="text-red-400" title="Needs Work" />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {stat.teammateElo} ELO
                </span>
                <span className="text-gray-600">•</span>
                <span>{stat.matchesPlayed} {stat.matchesPlayed === 1 ? 'match' : 'matches'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Statistics */}
        <div className="text-right">
          {/* Win Rate */}
          <div className="mb-2">
            <div className={`font-bold text-2xl ${winRateColor}`}>
              {stat.winRate}%
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">win rate</div>
          </div>

          {/* Record & Avg ELO Change */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-end gap-3 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-green-400 font-bold">{stat.wins}W</span>
                <span className="text-gray-600">-</span>
                <span className="text-red-400 font-bold">{stat.losses}L</span>
              </div>
              <span className="text-gray-600">•</span>
              <div className="flex items-center gap-1">
                <TrendingUp size={14} className={eloChangeColor} />
                <span className={`font-bold ${eloChangeColor}`}>
                  {stat.avgEloChange > 0 ? '+' : ''}{stat.avgEloChange.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient Data Warning */}
      {!isQualified && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            Play {3 - stat.matchesPlayed} more {3 - stat.matchesPlayed === 1 ? 'match' : 'matches'} to qualify for rankings
          </div>
        </div>
      )}
    </div>
  );
};

export default TeammateStatCard;
