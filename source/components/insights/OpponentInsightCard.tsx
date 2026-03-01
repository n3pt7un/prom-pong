import React from 'react';
import { SinglesInsight } from '../../types';
import { Target, TrendingUp } from 'lucide-react';

interface OpponentInsightCardProps {
  insight: SinglesInsight;
}

const OpponentInsightCard: React.FC<OpponentInsightCardProps> = ({ insight }) => {
  const eloDifference = insight.opponentElo - insight.playerElo;
  const winPercentage = insight.headToHead.totalMatches > 0
    ? Math.round((insight.headToHead.wins / insight.headToHead.totalMatches) * 100)
    : 0;

  return (
    <div className="glass-panel p-4 rounded-lg border border-white/5 hover:border-cyber-cyan/30 transition-all hover:shadow-neon-cyan/20">
      <div className="flex items-center justify-between">
        {/* Left: Opponent Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-cyan to-cyber-pink flex items-center justify-center text-white font-bold text-lg">
              {insight.opponentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{insight.opponentName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {insight.opponentElo} ELO
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-red-400">+{eloDifference} ahead</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Wins Needed & H2H */}
        <div className="text-right">
          {insight.winsNeeded !== null ? (
            <div className="mb-2">
              <div className="flex items-center justify-end gap-2 text-cyber-cyan font-bold text-xl">
                <Target size={20} />
                <span>{insight.winsNeeded}</span>
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">
                {insight.winsNeeded === 1 ? 'win needed' : 'wins needed'}
              </div>
            </div>
          ) : (
            <div className="mb-2">
              <div className="text-gray-500 font-bold text-lg">20+</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">wins needed</div>
            </div>
          )}

          {/* Head to Head */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Head to Head</div>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-green-400 font-bold">{insight.headToHead.wins}W</span>
              <span className="text-gray-600">-</span>
              <span className="text-red-400 font-bold">{insight.headToHead.losses}L</span>
              {insight.headToHead.totalMatches > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className={`font-bold ${winPercentage >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {winPercentage}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentInsightCard;
