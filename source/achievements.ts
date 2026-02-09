import { Player, Match } from './types';
import { Flame, Zap, Target, Award, Crown, TrendingUp, RotateCcw, Swords } from 'lucide-react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any; // Lucide icon component
  color: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Play your first match', icon: Swords, color: '#00f3ff' },
  { id: 'on_fire', name: 'On Fire', description: '5-win streak', icon: Flame, color: '#ff6600' },
  { id: 'unstoppable', name: 'Unstoppable', description: '10-win streak', icon: Zap, color: '#ffcc00' },
  { id: 'century', name: 'Century', description: '100 matches played', icon: Target, color: '#00ff88' },
  { id: 'elo_climber', name: 'Elo Climber', description: 'Reach 1400 ELO', icon: TrendingUp, color: '#00f3ff' },
  { id: 'master', name: 'Master', description: 'Reach 1600 ELO', icon: Crown, color: '#ff00ff' },
  { id: 'comeback_kid', name: 'Comeback Kid', description: 'Win after 3+ loss streak', icon: RotateCcw, color: '#ff3366' },
  { id: 'veteran', name: 'Veteran', description: '50 matches played', icon: Award, color: '#8b5cf6' },
];

export function getPlayerAchievements(player: Player, matches: Match[]): Achievement[] {
  const earned: Achievement[] = [];
  const totalGames = player.wins + player.losses;

  // First Blood - played at least 1 match
  if (totalGames >= 1) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'first_blood')!);
  }

  // On Fire - current streak >= 5
  if (player.streak >= 5) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'on_fire')!);
  }

  // Unstoppable - current streak >= 10
  if (player.streak >= 10) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'unstoppable')!);
  }

  // Veteran - 50+ matches
  if (totalGames >= 50) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'veteran')!);
  }

  // Century - 100+ matches
  if (totalGames >= 100) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'century')!);
  }

  // Elo Climber - singles ELO >= 1400
  if (player.eloSingles >= 1400) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'elo_climber')!);
  }

  // Master - singles ELO >= 1600
  if (player.eloSingles >= 1600) {
    earned.push(ACHIEVEMENTS.find(a => a.id === 'master')!);
  }

  // Comeback Kid - check match history for a win after 3+ losses in a row
  const playerMatches = matches
    .filter(m => m.winners.includes(player.id) || m.losers.includes(player.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let lossStreak = 0;
  for (const m of playerMatches) {
    if (m.losers.includes(player.id)) {
      lossStreak++;
    } else {
      if (lossStreak >= 3) {
        earned.push(ACHIEVEMENTS.find(a => a.id === 'comeback_kid')!);
        break;
      }
      lossStreak = 0;
    }
  }

  return earned;
}
