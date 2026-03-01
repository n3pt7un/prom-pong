import React from 'react';

interface LoadingSkeletonProps {
  type: 'card' | 'controls';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type, count = 3 }) => {
  if (type === 'controls') {
    return (
      <div className="glass-panel p-3 rounded-lg border border-white/5 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-white/10 rounded"></div>
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-white/10 rounded-lg"></div>
              <div className="h-8 w-24 bg-white/10 rounded-lg"></div>
            </div>
          </div>
          <div className="h-8 w-32 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-4 rounded-lg border border-white/5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-white/10"></div>
              <div className="space-y-2">
                <div className="h-5 w-32 bg-white/10 rounded"></div>
                <div className="h-4 w-24 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="h-6 w-20 bg-white/10 rounded ml-auto"></div>
              <div className="h-4 w-16 bg-white/10 rounded ml-auto"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default LoadingSkeleton;
