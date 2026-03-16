import React, { useState, useEffect } from 'react';
import { SinglesInsight, TeammateStatistics } from '../types';
import { fetchInsights } from '../services/storageService';
import { TrendingUp, Users, Loader2, AlertCircle } from 'lucide-react';
import SinglesInsightsPanel from './insights/SinglesInsightsPanel';
import DoublesTeammatePanel from './insights/DoublesTeammatePanel';
import LoadingSkeleton from './insights/LoadingSkeleton';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

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
        <Card className="p-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse"></div>
            <div className="h-10 w-40 bg-white/10 rounded-lg animate-pulse"></div>
          </div>
        </Card>

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
      <Card className="p-8 border-red-500/30">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-bold text-lg">Failed to Load Insights</h3>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-4 border-red-500/40 text-red-400 hover:bg-red-500/20"
        >
          Retry
        </Button>
      </Card>
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'singles' | 'doubles')}>
        <TabsList className="w-full">
          <TabsTrigger value="singles" className="flex-1 gap-2">
            <TrendingUp size={14} />
            SINGLES INSIGHTS
          </TabsTrigger>
          <TabsTrigger value="doubles" className="flex-1 gap-2">
            <Users size={14} />
            TEAMMATE STATS
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="animate-fade-in">
        {activeTab === 'singles' && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={24} className="text-cyber-cyan" />
              Singles ELO Insights
            </h2>
            <SinglesInsightsPanel 
              insights={data.singlesInsights} 
              playerElo={data.singlesInsights[0]?.playerElo || 1200}
            />
          </Card>
        )}

        {activeTab === 'doubles' && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users size={24} className="text-cyber-pink" />
              Doubles Teammate Statistics
            </h2>
            <DoublesTeammatePanel stats={data.doublesTeammateStats} />
          </Card>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
