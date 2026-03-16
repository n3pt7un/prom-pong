import React, { useState, useEffect, useMemo } from 'react';
import { Match, Player, EloHistoryEntry } from '../types';
import {
  generateChallenges,
  getChallengeProgress,
  computeTierStatus,
  GeneratedChallenge,
} from '../utils/challengeUtils';
import {
  Zap,
  Target,
  Flame,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  Swords,
  Star,
  Users,
  Shield,
  Crosshair,
  Dumbbell,
  Repeat2,
} from 'lucide-react';
import { Card } from './ui/card';

const ICON_MAP: Record<string, any> = {
  Target, Flame, Trophy, TrendingUp, Swords, Zap,
  Star, Users, Shield, Crosshair, Dumbbell, Repeat2,
};

interface WeeklyChallengesProps {
  matches: Match[];
  players: Player[];
  history: EloHistoryEntry[];
  currentPlayerId?: string;
}

const formatTimeRemaining = (endsAt: string): string => {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const isUrgent = (endsAt: string): boolean => {
  const diff = new Date(endsAt).getTime() - Date.now();
  return diff > 0 && diff < 2 * 3600000;
};

// Tier colours
const TIER_COLORS = {
  Bronze: { bar: '#cd7f32', text: 'text-amber-600', bg: 'bg-amber-600/20', border: 'border-amber-600/40' },
  Silver: { bar: '#9ca3af', text: 'text-gray-300', bg: 'bg-gray-400/20', border: 'border-gray-400/40' },
  Gold:   { bar: '#eab308', text: 'text-cyber-yellow', bg: 'bg-cyber-yellow/20', border: 'border-cyber-yellow/40' },
};

const TIER_ICONS = { Bronze: '🥉', Silver: '🥈', Gold: '🥇' };

// ---- localStorage streak helpers ----

const STREAK_KEY = 'cyber_pong_challenge_streak';
interface StreakData { lastCompletedDay: string; streak: number; }

const loadStreak = (): StreakData => {
  try { const r = localStorage.getItem(STREAK_KEY); if (r) return JSON.parse(r); } catch {}
  return { lastCompletedDay: '', streak: 0 };
};
const saveStreak = (d: StreakData) => {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(d)); } catch {}
};
const updateStreak = (allDailyDone: boolean): number => {
  const today = new Date().toISOString().split('T')[0];
  const stored = loadStreak();
  if (!allDailyDone) return stored.streak;
  if (stored.lastCompletedDay === today) return stored.streak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newStreak = stored.lastCompletedDay === yesterday.toISOString().split('T')[0] ? stored.streak + 1 : 1;
  saveStreak({ lastCompletedDay: today, streak: newStreak });
  return newStreak;
};

// ---- Tiered progress bar ----

const TieredProgressBar: React.FC<{
  progress: number;
  tiers: GeneratedChallenge['tiers'];
  highestTier: number;
}> = ({ progress, tiers, highestTier }) => {
  const gold = tiers[2].target;

  return (
    <div className="space-y-1.5">
      {/* Segment bar */}
      <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
        {tiers.map((tier, i) => {
          const prevTarget = i === 0 ? 0 : tiers[i - 1].target;
          const segWidth = ((tier.target - prevTarget) / gold) * 100;
          const segProgress = Math.max(0, Math.min(progress - prevTarget, tier.target - prevTarget));
          const segFill = (segProgress / (tier.target - prevTarget)) * 100;
          const color = TIER_COLORS[tier.label].bar;
          return (
            <div key={tier.label} className="relative" style={{ width: `${segWidth}%` }}>
              {/* Segment background */}
              <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.03)' }} />
              {/* Fill */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
                style={{ width: `${segFill}%`, background: color, opacity: i > highestTier ? 0.35 : 1 }}
              />
              {/* Divider (not after last) */}
              {i < 2 && (
                <div className="absolute right-0 top-0 bottom-0 w-px bg-black/40" />
              )}
            </div>
          );
        })}
      </div>

      {/* Tier labels */}
      <div className="flex justify-between">
        {tiers.map((tier, i) => {
          const done = i <= highestTier;
          const tc = TIER_COLORS[tier.label];
          return (
            <div key={tier.label} className="flex items-center gap-1">
              <span className={`text-[9px] font-mono font-bold ${done ? tc.text : 'text-gray-700'}`}>
                {TIER_ICONS[tier.label]} {tier.label}
              </span>
              <span className={`text-[9px] font-mono ${done ? 'text-gray-500' : 'text-gray-700'}`}>
                {tier.target}
              </span>
              {done && (
                <span className={`text-[8px] font-mono font-bold ${tc.text}`}>+{tier.xp}XP</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- Component ----

const WeeklyChallenges: React.FC<WeeklyChallengesProps> = ({
  matches,
  players,
  history,
  currentPlayerId,
}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();

  const currentPlayer = useMemo(
    () => players.find(p => p.id === currentPlayerId),
    [players, currentPlayerId]
  );

  // Re-generate only when the day changes
  const todayKey = now.toISOString().slice(0, 10);
  const challenges = useMemo(() => generateChallenges(now), [todayKey]);

  const getProgress = (challenge: GeneratedChallenge): number => {
    if (!currentPlayerId || !currentPlayer) return 0;
    return getChallengeProgress(challenge, matches, players, history, currentPlayerId, currentPlayer.eloSingles);
  };

  // XP totals
  const { completedXP, totalPossibleXP, allDailyGoldDone } = useMemo(() => {
    let cxp = 0;
    let txp = 0;
    let dailyGold = false;
    for (const c of challenges) {
      const maxXP = c.tiers.reduce((s, t) => s + t.xp, 0);
      txp += maxXP;
      const progress = getProgress(c);
      const { earnedXP, highestTier } = computeTierStatus(progress, c.tiers);
      cxp += earnedXP;
      if (c.type === 'daily' && highestTier === 2) dailyGold = true;
    }
    return { completedXP: cxp, totalPossibleXP: txp, allDailyGoldDone: dailyGold };
  }, [challenges, matches, history, currentPlayerId]);

  const streak = useMemo(() => {
    if (!currentPlayerId) return 0;
    return updateStreak(allDailyGoldDone);
  }, [allDailyGoldDone, currentPlayerId]);

  const RIVAL_XP = 100;

  // Rival challenge
  const rivalChallenge = useMemo(() => {
    if (!currentPlayerId || matches.length === 0) return null;
    const losses = [...matches]
      .filter(m => m.losers.includes(currentPlayerId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (losses.length === 0) return null;
    const rivalId = losses[0].winners[0];
    const rival = players.find(p => p.id === rivalId);
    if (!rival) return null;
    const cutoff = Date.now() - 14 * 86400000;
    const recentLosses = losses.filter(
      m => m.winners.includes(rivalId) && new Date(m.timestamp).getTime() > cutoff
    ).length;
    // Week bounds inline
    const d = new Date(now);
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const winsThisWeek = matches.filter(
      m => m.winners.includes(currentPlayerId) && m.losers.includes(rivalId) &&
        new Date(m.timestamp).getTime() >= monday.getTime() &&
        new Date(m.timestamp).getTime() <= sunday.getTime()
    ).length;
    return { rival, recentLosses, done: winsThisWeek >= 1 };
  }, [matches, players, currentPlayerId]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-display font-bold text-white border-l-4 border-cyber-cyan pl-3">
            ACTIVE <span className="text-cyber-cyan">CHALLENGES</span>
          </h3>
          <Zap size={16} className="text-cyber-cyan" />
        </div>
        {currentPlayerId && (
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="flex items-center gap-1 text-xs font-mono">
                <Flame size={12} className={streak >= 7 ? 'text-orange-400' : 'text-cyber-pink'} />
                <span className={`font-bold ${streak >= 7 ? 'text-orange-400' : 'text-cyber-pink'}`}>{streak}d</span>
                <span className="text-gray-600">streak</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs font-mono">
              <Star size={12} className="text-cyber-yellow" />
              <span className="text-cyber-yellow font-bold">
                {completedXP + (rivalChallenge?.done ? RIVAL_XP : 0)}
              </span>
              <span className="text-gray-600">
                / {totalPossibleXP + (rivalChallenge ? RIVAL_XP : 0)} XP
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rival Challenge — hidden once completed */}
      {currentPlayerId && rivalChallenge && !rivalChallenge.done && (
        <Card className={`p-4 border border-dashed transition-all ${
          rivalChallenge.done ? 'border-green-500/40 bg-green-500/5' : 'border-cyber-pink/30 bg-cyber-pink/5'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 p-2 rounded-lg ${rivalChallenge.done ? 'bg-green-500/20 text-green-400' : 'bg-cyber-pink/10 text-cyber-pink'}`}>
              {rivalChallenge.done ? <CheckCircle size={18} /> : <Repeat2 size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-white text-sm">Revenge Match</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border bg-cyber-pink/15 text-cyber-pink border-cyber-pink/30">personal</span>
                {rivalChallenge.done && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-widest">✓ Done</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-2">
                Beat <span className="text-white font-semibold">{rivalChallenge.rival.name}</span>
                {rivalChallenge.recentLosses > 1 ? ` — they've beaten you ${rivalChallenge.recentLosses}x recently` : ' — they got you last time'}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: rivalChallenge.done ? '100%' : '0%', background: rivalChallenge.done ? '#22c55e' : 'linear-gradient(90deg, #ff00ff, #bc13fe)' }} />
                </div>
                <span className="text-[10px] font-mono text-gray-500 flex-shrink-0 flex items-center gap-1"><Star size={8} />100 XP</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Personal Challenges */}
      <div>
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-2 pl-1">Personal Challenges</p>
        <div className="grid gap-3">
          {challenges.map(challenge => {
            const progress = getProgress(challenge);
            const { highestTier, earnedXP, nextTier } = computeTierStatus(progress, challenge.tiers);
            const isGoldDone = highestTier === 2;
            const urgent = isUrgent(challenge.endsAt) && !isGoldDone;
            const remaining = nextTier ? nextTier.target - progress : 0;
            const IconComponent = ICON_MAP[challenge.icon] || Target;

            return (
            <Card
              key={challenge.id}
              className={`p-4 border-l-2 transition-all ${
                isGoldDone
                  ? 'border-l-cyber-yellow bg-cyber-yellow/5'
                  : highestTier >= 0
                  ? 'border-l-green-500'
                  : urgent
                  ? 'border-l-red-400 bg-red-500/5'
                  : challenge.type === 'daily'
                  ? 'border-l-cyber-cyan'
                  : 'border-l-cyber-pink'
              }`}
            >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${
                    isGoldDone ? 'bg-cyber-yellow/20 text-cyber-yellow'
                    : highestTier >= 0 ? 'bg-green-500/20 text-green-400'
                    : urgent ? 'bg-red-500/20 text-red-400'
                    : challenge.type === 'daily' ? 'bg-cyber-cyan/10 text-cyber-cyan'
                    : 'bg-cyber-pink/10 text-cyber-pink'
                  }`}>
                    {isGoldDone ? <Trophy size={18} /> : highestTier >= 0 ? <CheckCircle size={18} /> : <IconComponent size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-white text-sm truncate">{challenge.title}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0 ${
                        challenge.type === 'daily'
                          ? 'bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30'
                          : 'bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30'
                      }`}>{challenge.type}</span>
                      {/* Earned tier badges */}
                      {challenge.tiers.slice(0, highestTier + 1).map(t => (
                        <span key={t.label} className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${TIER_COLORS[t.label].text} ${TIER_COLORS[t.label].bg} ${TIER_COLORS[t.label].border}`}>
                          {TIER_ICONS[t.label]}
                        </span>
                      ))}
                      {isGoldDone && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/40 uppercase tracking-widest flex-shrink-0">MAX</span>}
                    </div>

                    <p className="text-xs text-gray-400 mb-2">{challenge.description}</p>

                    {currentPlayerId && (
                      <>
                        <TieredProgressBar progress={progress} tiers={challenge.tiers} highestTier={highestTier} />

                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-2">
                            {earnedXP > 0 && (
                              <span className="text-[10px] font-mono text-green-400 flex items-center gap-0.5">
                                <Star size={8} />+{earnedXP} XP earned
                              </span>
                            )}
                            {!isGoldDone && nextTier && remaining <= 2 && progress > 0 && (
                              <span className="text-[10px] font-mono text-cyber-yellow animate-pulse">
                                {remaining === 1 ? '1 more!' : `${remaining} to ${nextTier.label}!`}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-mono flex items-center gap-1 ${urgent ? 'text-red-400 animate-pulse' : 'text-gray-600'}`}>
                            <Clock size={8} />{formatTimeRemaining(challenge.endsAt)}
                          </span>
                        </div>
                      </>
                    )}

                    {!currentPlayerId && (
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1"><Clock size={8} />{formatTimeRemaining(challenge.endsAt)}</span>
                        <span className="text-[10px] font-mono text-gray-600 flex items-center gap-1"><Star size={8} />{challenge.tiers.reduce((s, t) => s + t.xp, 0)} XP</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {currentPlayerId && streak >= 3 && (
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyber-pink py-1">
          <Flame size={12} />
          <span>{streak >= 7 ? `${streak}-day streak — you're on FIRE! 🔥` : `${streak}-day streak — keep it going!`}</span>
        </div>
      )}
      <div className="text-center text-[10px] font-mono text-gray-700 pt-1">
        Daily resets at midnight · Weekly resets Monday · Earn XP tier by tier
      </div>
    </div>
  );
};

export default WeeklyChallenges;
