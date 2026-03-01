import React from 'react';
import { AlertCircle } from 'lucide-react';

const InsufficientDataState: React.FC = () => {
  return (
    <div className="glass-panel p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-yellow-400 mb-1">Insufficient Data for Rankings</h4>
          <p className="text-xs text-gray-400">
            Play at least 3 matches with a teammate to qualify for best/worst partner rankings. 
            Keep playing to unlock more insights!
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsufficientDataState;
