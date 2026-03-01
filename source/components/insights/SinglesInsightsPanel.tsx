import React, { useState, useMemo } from 'react';
import { SinglesInsight, SinglesSortBy, SortOrder } from '../../types';
import OpponentInsightCard from './OpponentInsightCard';
import InsightsSortControls from './InsightsSortControls';
import EmptyState from './EmptyState';

interface SinglesInsightsPanelProps {
  insights: SinglesInsight[];
  playerElo: number;
}

const SinglesInsightsPanel: React.FC<SinglesInsightsPanelProps> = ({ insights, playerElo }) => {
  const [sortBy, setSortBy] = useState<SinglesSortBy>('winsNeeded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedInsights = useMemo(() => {
    const sorted = [...insights].sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'winsNeeded') {
        // Handle null values (unreachable targets) - push to end
        if (a.winsNeeded === null && b.winsNeeded === null) return 0;
        if (a.winsNeeded === null) return 1;
        if (b.winsNeeded === null) return -1;
        compareValue = a.winsNeeded - b.winsNeeded;
      } else if (sortBy === 'opponentElo') {
        compareValue = a.opponentElo - b.opponentElo;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [insights, sortBy, sortOrder]);

  if (insights.length === 0) {
    return (
      <EmptyState
        icon="trophy"
        title="You're at the top!"
        message="No one to chase in singles. Congratulations!"
        actionText="Keep defending your position"
      />
    );
  }

  return (
    <div className="space-y-4">
      <InsightsSortControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortBy}
        onOrderChange={setSortOrder}
      />
      
      <div className="space-y-3">
        {sortedInsights.map((insight) => (
          <OpponentInsightCard key={insight.opponentId} insight={insight} />
        ))}
      </div>
    </div>
  );
};

export default SinglesInsightsPanel;
