import React, { useMemo } from 'react';
import { Match, Player, EloHistoryEntry } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { shortName } from '../utils/playerRanking';
import HeadToHeadChart from './HeadToHeadChart';
import {
  getMatchupHistory,
  getMatchupSummary,
  getRecentMatchupEloDeltas,
  getPairGeneralRecord,
} from '../services/headToHeadService';
import { computeSoS } from '../utils/sosUtils';

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  players: Player[];
  allMatches: Match[];
  history: EloHistoryEntry[];
}

const getPlayerName = (id: string, players: Player[]) => 
  shortName(players.find(p => p.id === id)?.name || 'Unknown');

const getEloAfterMatch = (
  playerId: string,
  matchId: string,
  gameType: 'singles' | 'doubles',
  history: EloHistoryEntry[],
  players: Player[]
) => {
  const entry = history.find(h => h.playerId === playerId && h.matchId === matchId && h.gameType === gameType);
  if (entry) return entry.newElo;
  const player = players.find(p => p.id === playerId);
  return gameType === 'singles' ? player?.eloSingles ?? 1200 : player?.eloDoubles ?? 1200;
};

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  match,
  players = [],
  allMatches = [],
  history = [],
}) => {
  const safeMatches = allMatches ?? [];
  const safeHistory = history ?? [];

  const matchupHistory = useMemo(() => match ? getMatchupHistory(match, safeMatches) : [], [match, safeMatches]);
  const h2hData = useMemo(() => match ? getMatchupSummary(match, safeMatches) : null, [match, safeMatches]);
  const recentH2HMatches = useMemo(() => match ? getRecentMatchupEloDeltas(match, safeMatches, 10) : [], [match, safeMatches]);

  const matchesUpToDate = useMemo(
    () => match ? safeMatches.filter(m => new Date(m.timestamp).getTime() <= new Date(match.timestamp).getTime()) : [],
    [safeMatches, match]
  );
  const historyUpToDate = useMemo(
    () => match ? safeHistory.filter(h => new Date(h.timestamp).getTime() <= new Date(match.timestamp).getTime()) : [],
    [safeHistory, match]
  );
  const matchPlayers = useMemo(
    () => match ? players.filter(p => [...match.winners, ...match.losers].includes(p.id)) : [],
    [players, match]
  );
  const sosMap = useMemo(
    () => match ? computeSoS(players, matchPlayers, matchesUpToDate, historyUpToDate, match.type, match.leagueId) : new Map(),
    [players, matchPlayers, matchesUpToDate, historyUpToDate, match]
  );

  if (!match) return null;

  const winnerNames = match.winners.map(id => getPlayerName(id, players)).join(' & ');
  const loserNames = match.losers.map(id => getPlayerName(id, players)).join(' & ');

  const winnerEloAfter = match.winners.map(id => getEloAfterMatch(id, match.id, match.type, history, players));
  const loserEloAfter = match.losers.map(id => getEloAfterMatch(id, match.id, match.type, history, players));

  const winnerEloBefore = winnerEloAfter.map(v => (match.isFriendly ? v : v - match.eloChange));
  const loserEloBefore = loserEloAfter.map(v => (match.isFriendly ? v : v + match.eloChange));

  const winnerRows = match.winners.map((id, index) => ({
    id,
    name: getPlayerName(id, players),
    before: winnerEloBefore[index],
    after: winnerEloAfter[index],
    delta: match.isFriendly ? 0 : match.eloChange,
    sos: sosMap.get(id)?.sos ?? null,
  }));

  const loserRows = match.losers.map((id, index) => ({
    id,
    name: getPlayerName(id, players),
    before: loserEloBefore[index],
    after: loserEloAfter[index],
    delta: match.isFriendly ? 0 : -match.eloChange,
    sos: sosMap.get(id)?.sos ?? null,
  }));

  const winnerPairRecord = match.type === 'doubles' ? getPairGeneralRecord(match.winners, allMatches) : null;
  const loserPairRecord = match.type === 'doubles' ? getPairGeneralRecord(match.losers, allMatches) : null;

  // Format date nicely
  const matchDate = new Date(match.timestamp);
  const formattedDate = matchDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = matchDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="mx-0 sm:mx-4 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] h-[92vh] max-h-[92vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:w-full overflow-y-auto no-scrollbar border-cyber-cyan/25 !bg-[#06070b] backdrop-blur-none p-4 sm:p-6 shadow-[0_0_30px_rgba(0,217,255,0.15)]">
        <DialogHeader className="sticky top-0 z-10 bg-[#06070b]/95 backdrop-blur-sm pb-1">
          <DialogTitle className="text-xl font-bold">Match Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5 bg-[#05060a] rounded-lg p-3 sm:p-4">
          {/* Match Header */}
          <div className="border-b border-cyber-cyan/20 pb-3 sm:pb-4">
            <div className="flex items-start sm:items-center justify-between gap-2 mb-3 flex-wrap">
              <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${
                match.matchFormat === 'vintage21'
                  ? 'bg-cyber-purple/12 text-cyber-purple border-cyber-purple/40'
                  : 'bg-black/60 text-gray-400 border-cyber-cyan/20'
              }`}>
                {match.matchFormat === 'vintage21' ? 'VINTAGE 21' : 'SPEED 11'}
              </span>
              <span className="text-xs text-gray-400">
                {formattedDate} at {formattedTime}
              </span>
            </div>

            {/* Match Result */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-center py-2 sm:py-3">
              <div className="text-center sm:text-center">
                <h3 className="font-bold text-base text-white mb-1">{winnerNames}</h3>
                <div className="text-xs text-gray-500 uppercase tracking-widest">
                  {match.type === 'singles' ? 'Singles' : 'Doubles'}
                </div>
              </div>
              
              <div className="text-center px-0 sm:px-3 sm:border-x sm:border-cyber-cyan/15">
                <div className="text-2xl sm:text-3xl font-bold font-mono">
                  <span className="text-cyber-cyan">{match.scoreWinner}</span>
                  <span className="text-gray-600 mx-2">-</span>
                  <span className="text-gray-400">{match.scoreLoser}</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">FINAL</div>
              </div>

              <div className="text-center sm:text-center">
                <h3 className="font-bold text-base text-gray-400 mb-1">{loserNames}</h3>
                <div className="text-xs text-gray-500 uppercase tracking-widest">
                  {match.type === 'singles' ? 'Singles' : 'Doubles'}
                </div>
              </div>
            </div>

            {match.isFriendly && (
              <div className="mt-3 p-2 bg-black/70 border border-amber-500/40 rounded text-center text-sm text-amber-300">
                Friendly Match (ELO not awarded)
              </div>
            )}
          </div>

          {/* ELO & SOS Context Section */}
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs border-b border-cyber-cyan/30 pb-2">
              ELO & Rating Context
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Winners ELO */}
              <div className="bg-black/70 border border-cyber-cyan/35 rounded p-3">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  {winnerNames}
                </div>
                <div className="space-y-1.5">
                  {winnerRows.map(row => (
                    <div key={row.id} className="rounded border border-cyber-cyan/15 bg-[#0a0c12] px-2 py-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="font-semibold text-white">{row.name}</span>
                        {!match.isFriendly && <span className="font-mono text-green-400">+{row.delta}</span>}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-gray-400">
                        <span className="font-mono">{row.before} -&gt; {row.after}</span>
                        <span className="font-mono text-cyber-cyan">SoS {row.sos ?? '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Losers ELO */}
              <div className="bg-black/70 border border-cyber-pink/30 rounded p-3">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  {loserNames}
                </div>
                <div className="space-y-1.5">
                  {loserRows.map(row => (
                    <div key={row.id} className="rounded border border-cyber-pink/15 bg-[#0a0c12] px-2 py-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-gray-300">
                        <span className="font-semibold text-white">{row.name}</span>
                        {!match.isFriendly && <span className="font-mono text-red-400">{row.delta}</span>}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-gray-400">
                        <span className="font-mono">{row.before} -&gt; {row.after}</span>
                        <span className="font-mono text-cyber-cyan">SoS {row.sos ?? '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {match.type === 'doubles' && winnerPairRecord && loserPairRecord && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                <div className="rounded border border-cyber-cyan/20 bg-black/70 p-2 text-gray-300">
                  <span className="text-gray-500">Winner pair overall:</span>{' '}
                  <span className="text-white font-mono">{winnerPairRecord.wins}-{winnerPairRecord.losses}</span>
                </div>
                <div className="rounded border border-cyber-pink/20 bg-black/70 p-2 text-gray-300">
                  <span className="text-gray-500">Loser pair overall:</span>{' '}
                  <span className="text-white font-mono">{loserPairRecord.wins}-{loserPairRecord.losses}</span>
                </div>
              </div>
            )}
          </div>

          {/* Head-to-Head Record */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs border-b border-cyber-pink/30 pb-2">
              Head-to-Head Record
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-black/70 border border-cyber-cyan/25 rounded p-3 text-center">
                <div className="text-2xl font-bold text-cyber-cyan mb-1">
                  {h2hData.teamAWins}-{h2hData.teamBWins}
                </div>
                <div className="text-xs text-gray-500">
                  {h2hData.teamAWinRate.toFixed(1)}% Win Rate
                </div>
              </div>
              
              <div className="bg-black/70 border border-white/12 rounded p-3 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {h2hData.totalMatches}
                </div>
                <div className="text-xs text-gray-500">
                  Total Matches
                </div>
              </div>
              
              <div className="bg-black/70 border border-cyber-pink/20 rounded p-3 text-center">
                <div className="text-2xl font-bold text-gray-400 mb-1">
                  {h2hData.avgScoreMargin.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">
                  Avg Point Margin
                </div>
              </div>
            </div>
          </div>

          {/* Recent Performance */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs border-b border-white/20 pb-2">
              Recent Matchup History (Last 10)
            </h4>
            
            {recentH2HMatches.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
                {recentH2HMatches.map((item) => {
                  const m = item.match;
                  const matchDate = new Date(m.timestamp);
                  const dateStr = matchDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: m.timestamp.split('-')[0] !== new Date().getFullYear().toString() ? 'numeric' : undefined,
                  });

                  return (
                    <div key={m.id} className="bg-[#090b11] border border-white/10 rounded p-2 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-gray-300">
                          <span className="font-semibold">{m.scoreWinner}-{m.scoreLoser}</span>
                          <span className="text-gray-600 mx-1">•</span>
                          <span className="text-gray-400">{dateStr}</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5 truncate" title={`${m.winners.map(id => getPlayerName(id, players)).join(' & ')} vs ${m.losers.map(id => getPlayerName(id, players)).join(' & ')}`}>
                          {m.winners.map(id => getPlayerName(id, players)).join(' & ')} vs{' '}
                          {m.losers.map(id => getPlayerName(id, players)).join(' & ')}
                        </div>
                      </div>
                      {!m.isFriendly && (
                        <div className="text-right shrink-0">
                          <div className={`font-mono font-bold ${item.teamAEloDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.teamAEloDelta >= 0 ? '+' : ''}{item.teamAEloDelta}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic text-center py-4">
                No previous matches between these players
              </p>
            )}
          </div>

          {/* Historical Chart Placeholder */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs border-b border-white/20 pb-2">
              Head-to-Head Timeline
            </h4>
            <HeadToHeadChart
              matches={matchupHistory}
              teamAIds={match.winners}
              teamBIds={match.losers}
              teamALabel={winnerNames}
              teamBLabel={loserNames}
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchDetailModal;
