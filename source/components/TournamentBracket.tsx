import React, { useState, useMemo, useCallback } from 'react';
import { Player, GameType } from '../types';
import {
  Trophy, Crown, Swords, Plus, Trash2, Check, X,
  ChevronDown, ChevronUp, Search, Users, Filter,
} from 'lucide-react';

// --- Local types ---
interface TournamentMatchup {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId?: string;
  matchId?: string;
  scorePlayer1?: number;
  scorePlayer2?: number;
}

interface TournamentRound {
  roundNumber: number;
  matchups: TournamentMatchup[];
}

interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination' | 'round_robin';
  status: 'registration' | 'in_progress' | 'completed';
  gameType: GameType;
  playerIds: string[];
  rounds: TournamentRound[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  winnerId?: string;
}

interface TournamentBracketProps {
  tournaments: Tournament[];
  players: Player[];
  isAdmin: boolean;
  currentUserUid?: string;
  onCreateTournament: (name: string, format: Tournament['format'], gameType: GameType, playerIds: string[]) => void;
  onSubmitResult: (tournamentId: string, matchupId: string, winnerId: string, score1: number, score2: number) => void;
  onDeleteTournament?: (tournamentId: string) => void;
}

// --- Helpers ---
const getPlayer = (players: Player[], id: string | null): Player | undefined =>
  id ? players.find((p) => p.id === id) : undefined;

const getRoundLabel = (roundNum: number, totalRounds: number): string => {
  const fromEnd = totalRounds - roundNum;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semi-Finals';
  if (fromEnd === 2) return 'Quarter-Finals';
  return `Round ${roundNum}`;
};

const nextPowerOf2 = (n: number): number => {
  let v = 1;
  while (v < n) v *= 2;
  return v;
};

/** Generate single elimination bracket seeded by ELO */
const generateSingleEliminationRounds = (playerIds: string[], players: Player[]): TournamentRound[] => {
  const sorted = [...playerIds].sort((a, b) => {
    const pA = getPlayer(players, a);
    const pB = getPlayer(players, b);
    return (pB?.eloSingles ?? 1200) - (pA?.eloSingles ?? 1200);
  });

  const size = nextPowerOf2(sorted.length);
  const seeded: (string | null)[] = [];
  for (let i = 0; i < size; i++) {
    seeded.push(i < sorted.length ? sorted[i] : null);
  }

  // Pair top seed vs bottom seed etc.
  const paired: (string | null)[] = new Array(size);
  const fillBracket = (slots: number[], seeds: (string | null)[]) => {
    if (slots.length === 1) {
      paired[slots[0]] = seeds[0];
      return;
    }
    const top: (string | null)[] = [];
    const bottom: (string | null)[] = [];
    const topSlots: number[] = [];
    const bottomSlots: number[] = [];
    for (let i = 0; i < seeds.length; i++) {
      if (i % 2 === 0) {
        top.push(seeds[i]);
        topSlots.push(slots[i]);
      } else {
        bottom.push(seeds[seeds.length - 1 - Math.floor(i / 2)] ?? null);
        bottomSlots.push(slots[i]);
      }
    }
    // simple seeding: 1v last, 2v second-last ...
    for (let i = 0; i < seeds.length / 2; i++) {
      paired[i * 2] = seeds[i];
      paired[i * 2 + 1] = seeds[seeds.length - 1 - i];
    }
  };

  // Simple seeding: pair first with last
  for (let i = 0; i < size / 2; i++) {
    paired[i * 2] = seeded[i];
    paired[i * 2 + 1] = seeded[size - 1 - i];
  }

  const rounds: TournamentRound[] = [];
  let numMatchups = size / 2;
  let roundNum = 1;
  let matchIdCounter = 0;

  // Round 1
  const round1: TournamentMatchup[] = [];
  for (let i = 0; i < numMatchups; i++) {
    const p1 = paired[i * 2];
    const p2 = paired[i * 2 + 1];
    const matchup: TournamentMatchup = {
      id: `m-${matchIdCounter++}`,
      player1Id: p1,
      player2Id: p2,
    };
    // Auto-advance BYEs
    if (p1 && !p2) {
      matchup.winnerId = p1;
    } else if (!p1 && p2) {
      matchup.winnerId = p2;
    }
    round1.push(matchup);
  }
  rounds.push({ roundNumber: roundNum++, matchups: round1 });

  // Subsequent rounds
  numMatchups = numMatchups / 2;
  while (numMatchups >= 1) {
    const roundMatchups: TournamentMatchup[] = [];
    for (let i = 0; i < numMatchups; i++) {
      roundMatchups.push({
        id: `m-${matchIdCounter++}`,
        player1Id: null,
        player2Id: null,
      });
    }
    rounds.push({ roundNumber: roundNum++, matchups: roundMatchups });
    numMatchups = numMatchups / 2;
  }

  return rounds;
};

/** Generate round robin schedule */
const generateRoundRobinRounds = (playerIds: string[]): TournamentRound[] => {
  const ids = [...playerIds];
  // For odd number of players, add a BYE placeholder
  if (ids.length % 2 !== 0) ids.push('__BYE__');

  const n = ids.length;
  const rounds: TournamentRound[] = [];
  let matchIdCounter = 0;

  for (let round = 0; round < n - 1; round++) {
    const matchups: TournamentMatchup[] = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = ids[i];
      const p2 = ids[n - 1 - i];
      if (p1 === '__BYE__' || p2 === '__BYE__') continue;
      matchups.push({
        id: `m-${matchIdCounter++}`,
        player1Id: p1,
        player2Id: p2,
      });
    }
    rounds.push({ roundNumber: round + 1, matchups });
    // Rotate: fix first player, rotate rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  return rounds;
};

// --- Sub-components ---

const PlayerCard: React.FC<{
  player: Player | undefined;
  selected: boolean;
  onToggle: () => void;
}> = ({ player, selected, onToggle }) => {
  if (!player) return null;
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left w-full ${
        selected
          ? 'bg-cyber-cyan/10 border-cyber-cyan/50 shadow-neon-cyan'
          : 'bg-black/30 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="relative">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-lg flex-shrink-0">
          {player.avatar}
        </div>
        {selected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyber-cyan rounded-full flex items-center justify-center">
            <Check size={10} className="text-black" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{player.name}</div>
        <div className="text-gray-500 text-[10px] font-mono">ELO {player.eloSingles}</div>
      </div>
    </button>
  );
};

const ScoreInput: React.FC<{
  matchup: TournamentMatchup;
  players: Player[];
  onSubmit: (winnerId: string, s1: number, s2: number) => void;
  onCancel: () => void;
}> = ({ matchup, players, onSubmit, onCancel }) => {
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const p1 = getPlayer(players, matchup.player1Id);
  const p2 = getPlayer(players, matchup.player2Id);

  const handleSubmit = () => {
    if (s1 === s2) return; // no draws
    const winnerId = s1 > s2 ? matchup.player1Id! : matchup.player2Id!;
    onSubmit(winnerId, s1, s2);
  };

  return (
    <div className="bg-black/80 border border-cyber-cyan/30 rounded-lg p-3 space-y-3 animate-fadeIn">
      <div className="grid grid-cols-3 gap-2 items-center text-center">
        <div className="text-xs text-white font-medium">
          <span className="text-lg">{p1?.avatar}</span>
          <div className="truncate mt-0.5">{p1?.name}</div>
        </div>
        <div className="text-gray-600 text-xs font-display">VS</div>
        <div className="text-xs text-white font-medium">
          <span className="text-lg">{p2?.avatar}</span>
          <div className="truncate mt-0.5">{p2?.name}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <input
          type="number"
          min={0}
          max={99}
          value={s1}
          onChange={(e) => setS1(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-center text-white text-lg font-mono focus:outline-none focus:border-cyber-cyan/50"
        />
        <div className="text-gray-600 text-center">-</div>
        <input
          type="number"
          min={0}
          max={99}
          value={s2}
          onChange={(e) => setS2(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-center text-white text-lg font-mono focus:outline-none focus:border-cyber-cyan/50"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={s1 === s2}
          className="flex-1 flex items-center justify-center gap-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
        >
          <Check size={14} /> Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// --- Bracket Display: Single Elimination ---
const SingleEliminationView: React.FC<{
  tournament: Tournament;
  players: Player[];
  isAdmin: boolean;
  onSubmitResult: (matchupId: string, winnerId: string, s1: number, s2: number) => void;
}> = ({ tournament, players, isAdmin, onSubmitResult }) => {
  const [scoringMatchupId, setScoringMatchupId] = useState<string | null>(null);
  const totalRounds = tournament.rounds.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max items-start">
        {tournament.rounds.map((round) => (
          <div key={round.roundNumber} className="flex flex-col gap-2" style={{ minWidth: 200 }}>
            <div className="text-xs font-display font-bold text-gray-500 text-center tracking-widest uppercase mb-2">
              {getRoundLabel(round.roundNumber, totalRounds)}
            </div>
            <div
              className="flex flex-col justify-around gap-4"
              style={{ minHeight: round.matchups.length > 1 ? round.matchups.length * 90 : 90 }}
            >
              {round.matchups.map((mu) => {
                const p1 = getPlayer(players, mu.player1Id);
                const p2 = getPlayer(players, mu.player2Id);
                const isBye = !mu.player1Id || !mu.player2Id;
                const hasResult = !!mu.winnerId;
                const isScoring = scoringMatchupId === mu.id;
                const canScore =
                  isAdmin &&
                  mu.player1Id &&
                  mu.player2Id &&
                  !mu.winnerId &&
                  tournament.status === 'in_progress';

                if (isScoring) {
                  return (
                    <ScoreInput
                      key={mu.id}
                      matchup={mu}
                      players={players}
                      onSubmit={(winnerId, s1, s2) => {
                        onSubmitResult(mu.id, winnerId, s1, s2);
                        setScoringMatchupId(null);
                      }}
                      onCancel={() => setScoringMatchupId(null)}
                    />
                  );
                }

                return (
                  <div
                    key={mu.id}
                    onClick={() => canScore && setScoringMatchupId(mu.id)}
                    className={`glass-panel rounded-lg overflow-hidden transition-all ${
                      canScore ? 'cursor-pointer hover:border-cyber-cyan/40' : ''
                    } ${isBye && !hasResult ? 'opacity-40 border-dashed' : ''}`}
                  >
                    {/* Player 1 */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 border-b border-white/5 ${
                        hasResult && mu.winnerId === mu.player1Id
                          ? 'bg-green-900/20'
                          : ''
                      }`}
                    >
                      {p1 ? (
                        <>
                          <span className="text-sm">{p1.avatar}</span>
                          <span className="text-xs text-white font-medium truncate flex-1">
                            {p1.name}
                          </span>
                          {mu.scorePlayer1 !== undefined && (
                            <span className="text-xs font-mono text-gray-400">{mu.scorePlayer1}</span>
                          )}
                          {hasResult && mu.winnerId === mu.player1Id && (
                            <Crown size={12} className="text-cyber-yellow flex-shrink-0" />
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-600 italic">
                          {isBye ? 'BYE' : 'TBD'}
                        </span>
                      )}
                    </div>
                    {/* Player 2 */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 ${
                        hasResult && mu.winnerId === mu.player2Id
                          ? 'bg-green-900/20'
                          : ''
                      }`}
                    >
                      {p2 ? (
                        <>
                          <span className="text-sm">{p2.avatar}</span>
                          <span className="text-xs text-white font-medium truncate flex-1">
                            {p2.name}
                          </span>
                          {mu.scorePlayer2 !== undefined && (
                            <span className="text-xs font-mono text-gray-400">{mu.scorePlayer2}</span>
                          )}
                          {hasResult && mu.winnerId === mu.player2Id && (
                            <Crown size={12} className="text-cyber-yellow flex-shrink-0" />
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-600 italic">
                          {isBye ? 'BYE' : 'TBD'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Champion display */}
        {tournament.winnerId && (
          <div className="flex flex-col items-center justify-center gap-2 min-w-[140px]">
            <Crown size={32} className="text-cyber-yellow" />
            <div className="text-center">
              <div className="text-2xl">{getPlayer(players, tournament.winnerId)?.avatar}</div>
              <div className="text-white font-display font-bold text-sm mt-1">
                {getPlayer(players, tournament.winnerId)?.name}
              </div>
              <div className="text-cyber-yellow text-[10px] font-mono mt-0.5">CHAMPION</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Round Robin View ---
const RoundRobinView: React.FC<{
  tournament: Tournament;
  players: Player[];
  isAdmin: boolean;
  onSubmitResult: (matchupId: string, winnerId: string, s1: number, s2: number) => void;
}> = ({ tournament, players, isAdmin, onSubmitResult }) => {
  const [scoringMatchupId, setScoringMatchupId] = useState<string | null>(null);

  // Build standings
  const standings = useMemo(() => {
    const stats: Record<string, { wins: number; losses: number; points: number; gamesPlayed: number; scoreDiff: number }> = {};
    tournament.playerIds.forEach((id) => {
      stats[id] = { wins: 0, losses: 0, points: 0, gamesPlayed: 0, scoreDiff: 0 };
    });

    tournament.rounds.forEach((round) => {
      round.matchups.forEach((mu) => {
        if (!mu.winnerId || !mu.player1Id || !mu.player2Id) return;
        const loserId = mu.winnerId === mu.player1Id ? mu.player2Id : mu.player1Id;
        const winnerScore = mu.winnerId === mu.player1Id ? (mu.scorePlayer1 ?? 0) : (mu.scorePlayer2 ?? 0);
        const loserScore = mu.winnerId === mu.player1Id ? (mu.scorePlayer2 ?? 0) : (mu.scorePlayer1 ?? 0);

        if (stats[mu.winnerId]) {
          stats[mu.winnerId].wins++;
          stats[mu.winnerId].points += 3;
          stats[mu.winnerId].gamesPlayed++;
          stats[mu.winnerId].scoreDiff += winnerScore - loserScore;
        }
        if (stats[loserId]) {
          stats[loserId].losses++;
          stats[loserId].gamesPlayed++;
          stats[loserId].scoreDiff -= winnerScore - loserScore;
        }
      });
    });

    return Object.entries(stats)
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.points - a.points || b.scoreDiff - a.scoreDiff);
  }, [tournament]);

  const allMatchups = tournament.rounds.flatMap((r) => r.matchups);

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <div>
        <h4 className="text-xs font-display font-bold text-gray-400 tracking-widest uppercase mb-3">
          Standings
        </h4>
        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-xs font-mono">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-center">W</th>
                <th className="px-3 py-2 text-center">L</th>
                <th className="px-3 py-2 text-center">Pts</th>
                <th className="px-3 py-2 text-center">GP</th>
                <th className="px-3 py-2 text-center">+/-</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const p = getPlayer(players, s.id);
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-white/5 ${
                      i === 0 && s.points > 0 ? 'bg-cyber-yellow/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 font-mono">
                      {i === 0 && s.points > 0 ? (
                        <Crown size={14} className="text-cyber-yellow inline" />
                      ) : (
                        i + 1
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{p?.avatar}</span>
                        <span className="text-white font-medium">{p?.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-green-400 font-mono">{s.wins}</td>
                    <td className="px-3 py-2 text-center text-red-400 font-mono">{s.losses}</td>
                    <td className="px-3 py-2 text-center text-cyber-cyan font-bold font-mono">{s.points}</td>
                    <td className="px-3 py-2 text-center text-gray-400 font-mono">{s.gamesPlayed}</td>
                    <td className={`px-3 py-2 text-center font-mono ${s.scoreDiff > 0 ? 'text-green-400' : s.scoreDiff < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule grid */}
      <div>
        <h4 className="text-xs font-display font-bold text-gray-400 tracking-widest uppercase mb-3">
          Schedule
        </h4>
        <div className="space-y-3">
          {tournament.rounds.map((round) => (
            <div key={round.roundNumber}>
              <div className="text-[10px] font-mono text-gray-600 mb-1.5">Round {round.roundNumber}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {round.matchups.map((mu) => {
                  const p1 = getPlayer(players, mu.player1Id);
                  const p2 = getPlayer(players, mu.player2Id);
                  const hasResult = !!mu.winnerId;
                  const isScoring = scoringMatchupId === mu.id;
                  const canScore =
                    isAdmin &&
                    mu.player1Id &&
                    mu.player2Id &&
                    !mu.winnerId &&
                    tournament.status === 'in_progress';

                  if (isScoring) {
                    return (
                      <ScoreInput
                        key={mu.id}
                        matchup={mu}
                        players={players}
                        onSubmit={(winnerId, s1, s2) => {
                          onSubmitResult(mu.id, winnerId, s1, s2);
                          setScoringMatchupId(null);
                        }}
                        onCancel={() => setScoringMatchupId(null)}
                      />
                    );
                  }

                  return (
                    <div
                      key={mu.id}
                      onClick={() => canScore && setScoringMatchupId(mu.id)}
                      className={`glass-panel rounded-lg p-3 flex items-center gap-2 ${
                        canScore ? 'cursor-pointer hover:border-cyber-cyan/40' : ''
                      } ${hasResult ? 'opacity-90' : ''}`}
                    >
                      <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${hasResult && mu.winnerId === mu.player1Id ? 'text-white' : 'text-gray-400'}`}>
                        <span className="text-sm">{p1?.avatar}</span>
                        <span className="text-xs font-medium truncate">{p1?.name}</span>
                      </div>
                      {hasResult ? (
                        <div className="text-xs font-mono text-gray-400 flex-shrink-0">
                          <span className={mu.winnerId === mu.player1Id ? 'text-green-400' : ''}>{mu.scorePlayer1}</span>
                          {' - '}
                          <span className={mu.winnerId === mu.player2Id ? 'text-green-400' : ''}>{mu.scorePlayer2}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-gray-600 flex-shrink-0">
                          {canScore ? 'Enter Score' : 'vs'}
                        </div>
                      )}
                      <div className={`flex items-center gap-1.5 flex-1 min-w-0 justify-end ${hasResult && mu.winnerId === mu.player2Id ? 'text-white' : 'text-gray-400'}`}>
                        <span className="text-xs font-medium truncate">{p2?.name}</span>
                        <span className="text-sm">{p2?.avatar}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Create Tournament Form ---
const CreateTournamentForm: React.FC<{
  players: Player[];
  onCreate: TournamentBracketProps['onCreateTournament'];
  onCancel: () => void;
}> = ({ players, onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<Tournament['format']>('single_elimination');
  const [gameType, setGameType] = useState<GameType>('singles');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => b.eloSingles - a.eloSingles),
    [players],
  );

  const filteredPlayers = useMemo(
    () =>
      sortedPlayers.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [sortedPlayers, searchQuery],
  );

  const togglePlayer = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(players.map((p) => p.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const minPlayers = format === 'round_robin' ? 3 : 2;
  const canCreate = name.trim().length > 0 && selectedIds.size >= minPlayers;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate(name.trim(), format, gameType, Array.from(selectedIds));
  };

  // Preview bracket structure
  const bracketPreview = useMemo(() => {
    if (selectedIds.size < minPlayers) return null;
    if (format === 'single_elimination') {
      const size = nextPowerOf2(selectedIds.size);
      const byes = size - selectedIds.size;
      const rounds = Math.log2(size);
      return `${selectedIds.size} players → ${byes > 0 ? `${byes} BYE${byes > 1 ? 's' : ''}, ` : ''}${rounds} round${rounds > 1 ? 's' : ''}`;
    }
    const totalGames = (selectedIds.size * (selectedIds.size - 1)) / 2;
    return `${selectedIds.size} players → ${totalGames} matches across ${selectedIds.size - 1} rounds`;
  }, [selectedIds.size, format, minPlayers]);

  return (
    <div className="glass-panel rounded-xl p-5 space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-gray-400 tracking-widest uppercase">
          New Tournament
        </h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-mono">Tournament Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neon Showdown 2026"
          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyber-cyan/50 placeholder:text-gray-600 transition-colors"
        />
      </div>

      {/* Format */}
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-mono">Format</label>
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setFormat('single_elimination')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              format === 'single_elimination'
                ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Single Elimination
          </button>
          <button
            onClick={() => setFormat('round_robin')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              format === 'round_robin'
                ? 'bg-cyber-cyan text-black shadow-neon-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Round Robin
          </button>
        </div>
      </div>

      {/* Game type */}
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-mono">Game Type</label>
        <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setGameType('singles')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              gameType === 'singles'
                ? 'bg-cyber-pink text-white shadow-neon-pink'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Singles
          </button>
          <button
            onClick={() => setGameType('doubles')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${
              gameType === 'doubles'
                ? 'bg-cyber-pink text-white shadow-neon-pink'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Doubles
          </button>
        </div>
      </div>

      {/* Player selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500 font-mono flex items-center gap-1">
            <Users size={12} /> Players
          </label>
          <span className="text-xs font-mono text-cyber-cyan">
            {selectedIds.size} of {players.length} selected
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-cyber-cyan/50 placeholder:text-gray-600 transition-colors"
          />
        </div>

        {/* Select all / Deselect all */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={selectAll}
            className="text-[10px] font-mono text-cyber-cyan hover:underline"
          >
            Select All
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={deselectAll}
            className="text-[10px] font-mono text-gray-500 hover:underline"
          >
            Deselect All
          </button>
        </div>

        {/* Player grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
          {filteredPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              selected={selectedIds.has(p.id)}
              onToggle={() => togglePlayer(p.id)}
            />
          ))}
        </div>

        {selectedIds.size < minPlayers && selectedIds.size > 0 && (
          <p className="text-red-400 text-[10px] font-mono mt-2">
            Minimum {minPlayers} players required for {format === 'round_robin' ? 'Round Robin' : 'Single Elimination'}
          </p>
        )}
      </div>

      {/* Preview */}
      {bracketPreview && (
        <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg p-3 text-xs text-gray-300 font-mono">
          <Filter size={12} className="inline text-cyber-cyan mr-1" />
          {bracketPreview}
        </div>
      )}

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white font-display font-bold py-3 rounded-lg transition-all hover:shadow-neon-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
      >
        <Trophy size={18} />
        CREATE TOURNAMENT
      </button>
    </div>
  );
};

// --- Main Component ---
const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournaments,
  players,
  isAdmin,
  currentUserUid,
  onCreateTournament,
  onSubmitResult,
  onDeleteTournament,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) => {
        const statusOrder: Record<string, number> = { in_progress: 0, registration: 1, completed: 2 };
        const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [tournaments],
  );

  const statusBadge = (status: Tournament['status']) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            IN PROGRESS
          </span>
        );
      case 'registration':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30">
            REGISTRATION
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/30">
            COMPLETED
          </span>
        );
    }
  };

  const handleCreate = (name: string, format: Tournament['format'], gameType: GameType, playerIds: string[]) => {
    onCreateTournament(name, format, gameType, playerIds);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Trophy className="text-cyber-yellow" size={28} />
          <h2 className="text-3xl font-display font-bold text-white neon-text-cyan">
            TOURNA<span className="text-cyber-pink">MENTS</span>
          </h2>
        </div>
        {isAdmin && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-cyber-cyan/10 hover:bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          >
            <Plus size={14} /> New Tournament
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && isAdmin && (
        <CreateTournamentForm
          players={players}
          onCreate={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tournament list */}
      {sortedTournaments.length === 0 && !showCreate && (
        <div className="text-center py-12 text-gray-600">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-mono text-sm">No tournaments yet.</p>
          {isAdmin && (
            <p className="text-xs text-gray-700 mt-1">Create one to get started!</p>
          )}
        </div>
      )}

      {sortedTournaments.map((t) => {
        const isExpanded = expandedId === t.id;
        const winner = t.winnerId ? getPlayer(players, t.winnerId) : undefined;

        return (
          <div key={t.id} className="glass-panel rounded-xl overflow-hidden">
            {/* Tournament header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : t.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <Swords size={18} className="text-cyber-purple flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-display font-bold text-sm">{t.name}</span>
                  {statusBadge(t.status)}
                  <span className="text-[10px] font-mono text-gray-600">
                    {t.format === 'single_elimination' ? 'Single Elim' : 'Round Robin'} • {t.gameType}
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                  {t.playerIds.length} players
                  {winner && (
                    <span className="ml-2 text-cyber-yellow">
                      🏆 {winner.avatar} {winner.name}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp size={16} className="text-gray-500" />
              ) : (
                <ChevronDown size={16} className="text-gray-500" />
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-white/5 p-4">
                {t.format === 'single_elimination' ? (
                  <SingleEliminationView
                    tournament={t}
                    players={players}
                    isAdmin={isAdmin}
                    onSubmitResult={(matchupId, winnerId, s1, s2) =>
                      onSubmitResult(t.id, matchupId, winnerId, s1, s2)
                    }
                  />
                ) : (
                  <RoundRobinView
                    tournament={t}
                    players={players}
                    isAdmin={isAdmin}
                    onSubmitResult={(matchupId, winnerId, s1, s2) =>
                      onSubmitResult(t.id, matchupId, winnerId, s1, s2)
                    }
                  />
                )}

                {/* Delete button */}
                {isAdmin && onDeleteTournament && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete tournament "${t.name}"?`)) {
                          onDeleteTournament(t.id);
                        }
                      }}
                      className="flex items-center gap-1 text-red-500/60 hover:text-red-400 text-xs font-mono transition-colors"
                    >
                      <Trash2 size={12} /> Delete Tournament
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TournamentBracket;

// Export helpers for use by App or server integration
export { generateSingleEliminationRounds, generateRoundRobinRounds };
export type { Tournament, TournamentMatchup, TournamentRound, TournamentBracketProps };
