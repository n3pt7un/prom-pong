import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Match } from '../types';

interface HeadToHeadChartProps {
  matches: Match[];
  teamAIds: string[];
  teamBIds: string[];
  teamALabel: string;
  teamBLabel: string;
}

const didTeamWin = (match: Match, teamIds: string[]): boolean | null => {
  if (teamIds.every(id => match.winners.includes(id))) return true;
  if (teamIds.every(id => match.losers.includes(id))) return false;
  return null;
};

const HeadToHeadChart: React.FC<HeadToHeadChartProps> = ({
  matches,
  teamAIds,
  teamBIds,
  teamALabel,
  teamBLabel,
}) => {
  const data = useMemo(() => {
    let teamAWins = 0;
    let teamBWins = 0;

    return matches.map((match, index) => {
      const teamAWon = didTeamWin(match, teamAIds) === true;
      if (teamAWon) {
        teamAWins += 1;
      } else {
        teamBWins += 1;
      }

      return {
        match: index + 1,
        date: new Date(match.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        teamA: teamAWins,
        teamB: teamBWins,
      };
    });
  }, [matches, teamAIds]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-cyber-cyan/20 bg-[#090b11] py-6 text-center text-xs text-gray-400">
        No previous direct matchups
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cyber-cyan/20 bg-[#090b11] p-3">
      <div className="mb-2 text-[11px] font-mono text-gray-400">Cumulative Record Progression</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.12)" />
          <XAxis dataKey="match" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.45)" />
          <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.45)" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'rgba(10, 10, 14, 0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => [value, name === 'teamA' ? teamALabel : teamBLabel]}
            labelFormatter={(label) => `Match #${label}`}
          />
          <Line type="monotone" dataKey="teamA" stroke="#00d9ff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="teamB" stroke="#ff4d8d" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HeadToHeadChart;
