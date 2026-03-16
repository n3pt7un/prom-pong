import React from 'react';
import { RANKS } from '../constants';

interface RankBadgeProps {
  elo: number;
}

const RankBadge: React.FC<RankBadgeProps> = ({ elo }) => {
  const rank = [...RANKS].reverse().find(r => elo >= r.threshold) || RANKS[0];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border border-current/30 bg-current/5 ${rank.color}`}>
      {rank.name}
    </span>
  );
};

export default RankBadge;