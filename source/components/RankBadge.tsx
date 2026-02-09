import React from 'react';
import { RANKS } from '../constants';

interface RankBadgeProps {
  elo: number;
}

const RankBadge: React.FC<RankBadgeProps> = ({ elo }) => {
  const rank = [...RANKS].reverse().find(r => elo >= r.threshold) || RANKS[0];
  
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-mono font-bold border border-current ${rank.color} bg-opacity-10 bg-black`}>
      {rank.name}
    </span>
  );
};

export default RankBadge;