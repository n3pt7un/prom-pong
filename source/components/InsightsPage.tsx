import React, { useState, useEffect } from 'react';
import { SinglesInsight, TeammateStatistics } from '../types';
import { fetchInsights } from '../services/storageService';
import { TrendingUp, Users, Loader2, AlertCircle } from 'lucide-react';
import SinglesInsightsPanel from './insights/SinglesInsightsPanel';
import DoublesTeammatePanel from './insights/DoublesTeammatePanel';
import LoadingSkeleton from './insights/LoadingSkeleton';

interface InsightsPageProps {
  playerId: string;
}

interface InsightsData {
  singlesInsights: SinglesInsight[];
  doublesTeammateStats: TeammateStatistics[];
}

const InsightsPage: React.FC<InsightsPageProps> = ({ playerId }) => {
  const [activeTab, setActiveTab] = useState<'singles' | 'doubles'>('singles');
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      if (!playerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const insights = await fetchInsights(playerId);
        setData(insights);
      } catch (err: any) {
        console.error('Failed to fetch insights:', err);
        setError(err.message || 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Tab Navigation Skeleton */}
        <div className="glass-panel rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse"></div>
            <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <LoadingSkeleton type="controls" />
          <LoadingSkeleton type="card" count={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 rounded-xl border border-red-500/30">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold text-lg">Failed to Load Insights</h3>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">
        No insights available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="glass-panel rounded-xl border border-white/5 p-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab('singles')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
              activeTab === 'singles'
                ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <TrendingUp size={16} />
            SINGLES INSIGHTS
          </button>
          <button
            onClick={() => setActiveTab('doubles')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
              activeTab === 'doubles'
                ? 'bg-cyber-pink text-black shadow-neon-pink'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Users size={16} />
            TEAMMATE STATS
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-fadeIn">
        {activeTab === 'singles' && (
          <div className="glass-panel p-6 rounded-xl border border-white/5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={24} className="text-cyber-cyan" />
              Singles ELO Insights
            </h2>
            <SinglesInsightsPanel 
              insights={data.singlesInsights} 
              playerElo={data.singlesInsights[0]?.playerElo || 1200}
            />
          </div>
        )}

        {activeTab === 'doubles' && (
          <div className="glass-panel p-6 rounded-xl border border-white/5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-cyber-pink" />
              Doubles Teammate Statistics
            </h2>
            <DoublesTeammatePanel stats={data.doublesTeammateStats} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
