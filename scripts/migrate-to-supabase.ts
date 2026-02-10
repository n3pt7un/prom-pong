#!/usr/bin/env tsx
/**
 * CyberPong Database Migration Script
 * 
 * This script migrates data from the legacy JSON file format to Supabase PostgreSQL.
 * 
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 * 
 * Required environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key (NOT the anon key)
 * 
 * Optional:
 *   DB_FILE_PATH - Path to the JSON file (defaults to ../source/db.json)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types matching the old JSON structure
interface LegacyPlayer {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  eloSingles: number;
  eloDoubles: number;
  wins: number;
  losses: number;
  streak: number;
  joinedAt: string;
  mainRacketId?: string;
  uid?: string;
}

interface LegacyMatch {
  id: string;
  type: 'singles' | 'doubles';
  winners: string[];
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  timestamp: string;
  eloChange: number;
  loggedBy?: string;
}

interface LegacyEloHistory {
  playerId: string;
  matchId: string;
  newElo: number;
  timestamp: string;
  gameType: 'singles' | 'doubles';
}

interface LegacyRacket {
  id: string;
  name: string;
  icon: string;
  color: string;
  stats: {
    speed: number;
    spin: number;
    power: number;
    control: number;
    defense: number;
    chaos: number;
  };
  createdBy?: string;
}

interface LegacyPendingMatch {
  id: string;
  type: 'singles' | 'doubles';
  winners: string[];
  losers: string[];
  scoreWinner: number;
  scoreLoser: number;
  loggedBy: string;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmations: string[];
  createdAt: string;
  expiresAt: string;
}

interface LegacySeason {
  id: string;
  name: string;
  number: number;
  status: 'active' | 'completed';
  startedAt: string;
  endedAt?: string;
  finalStandings: any[];
  matchCount: number;
  championId?: string;
}

interface LegacyChallenge {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  wager: number;
  message?: string;
  matchId?: string;
  createdAt: string;
}

interface LegacyTournament {
  id: string;
  name: string;
  format: 'single_elimination' | 'round_robin';
  status: 'registration' | 'in_progress' | 'completed';
  gameType: 'singles' | 'doubles';
  playerIds: string[];
  rounds: any[];
  createdBy: string;
  winnerId?: string;
  createdAt: string;
  completedAt?: string;
}

interface LegacyReaction {
  id?: string;
  matchId: string;
  playerId: string;
  emoji: string;
  comment?: string;
  createdAt?: string;
}

interface LegacyDatabase {
  players: LegacyPlayer[];
  matches: LegacyMatch[];
  history: LegacyEloHistory[];
  rackets: LegacyRacket[];
  backups: any[];
  admins: string[];
  pendingMatches: LegacyPendingMatch[];
  seasons: LegacySeason[];
  challenges: LegacyChallenge[];
  tournaments: LegacyTournament[];
  reactions: LegacyReaction[];
}

// Migration class
class Migrator {
  private supabase: SupabaseClient;
  private data: LegacyDatabase;
  private stats = {
    players: 0,
    rackets: 0,
    matches: 0,
    eloHistory: 0,
    admins: 0,
    pendingMatches: 0,
    seasons: 0,
    challenges: 0,
    tournaments: 0,
    reactions: 0,
    errors: [] as string[]
  };

  constructor(supabaseUrl: string, supabaseKey: string, data: LegacyDatabase) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    this.data = data;
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting migration...\n');

    // Clear existing data in reverse order of dependencies
    await this.clearTables();

    // Migrate in order of dependencies
    await this.migrateRackets();
    await this.migratePlayers();
    await this.migrateMatches();
    await this.migrateEloHistory();
    await this.migrateAdmins();
    await this.migratePendingMatches();
    await this.migrateSeasons();
    await this.migrateChallenges();
    await this.migrateTournaments();
    await this.migrateReactions();

    this.printStats();
  }

  private async clearTables(): Promise<void> {
    console.log('🧹 Clearing existing data...');
    
    const tables = [
      'match_reactions',
      'tournaments',
      'challenges',
      'seasons',
      'pending_match_players',
      'pending_matches',
      'admins',
      'elo_history',
      'match_players',
      'matches',
      'players',
      'rackets'
    ];

    for (const table of tables) {
      const { error } = await this.supabase.from(table).delete().neq('id', '');
      if (error && !error.message.includes('no rows')) {
        console.warn(`  ⚠️ Could not clear ${table}: ${error.message}`);
      }
    }
    
    console.log('  ✓ Tables cleared\n');
  }

  private async migrateRackets(): Promise<void> {
    console.log('🏓 Migrating rackets...');
    
    if (!this.data.rackets || this.data.rackets.length === 0) {
      console.log('  ℹ️ No rackets to migrate\n');
      return;
    }

    const rackets = this.data.rackets.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      stats: r.stats,
      created_by: r.createdBy || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase.from('rackets').insert(rackets);
    
    if (error) {
      this.stats.errors.push(`Rackets: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.rackets = rackets.length;
      console.log(`  ✓ Migrated ${rackets.length} rackets`);
    }
    console.log();
  }

  private async migratePlayers(): Promise<void> {
    console.log('👤 Migrating players...');
    
    if (!this.data.players || this.data.players.length === 0) {
      console.log('  ℹ️ No players to migrate\n');
      return;
    }

    const players = this.data.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar || null,
      bio: p.bio || null,
      elo_singles: p.eloSingles,
      elo_doubles: p.eloDoubles,
      wins: p.wins,
      losses: p.losses,
      streak: p.streak,
      joined_at: p.joinedAt,
      main_racket_id: p.mainRacketId || null,
      firebase_uid: p.uid || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase.from('players').insert(players);
    
    if (error) {
      this.stats.errors.push(`Players: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.players = players.length;
      console.log(`  ✓ Migrated ${players.length} players`);
    }
    console.log();
  }

  private async migrateMatches(): Promise<void> {
    console.log('🏆 Migrating matches...');
    
    if (!this.data.matches || this.data.matches.length === 0) {
      console.log('  ℹ️ No matches to migrate\n');
      return;
    }

    const matches = this.data.matches.map(m => ({
      id: m.id,
      type: m.type,
      score_winner: m.scoreWinner,
      score_loser: m.scoreLoser,
      timestamp: m.timestamp,
      elo_change: m.eloChange,
      logged_by: m.loggedBy || null,
      created_at: m.timestamp
    }));

    const { error: matchError } = await this.supabase.from('matches').insert(matches);
    
    if (matchError) {
      this.stats.errors.push(`Matches: ${matchError.message}`);
      console.error(`  ❌ Error inserting matches: ${matchError.message}`);
      console.log();
      return;
    }

    // Migrate match_players junction table
    const matchPlayers: any[] = [];
    for (const match of this.data.matches) {
      // Winners
      for (const playerId of match.winners) {
        matchPlayers.push({
          match_id: match.id,
          player_id: playerId,
          is_winner: true
        });
      }
      // Losers
      for (const playerId of match.losers) {
        matchPlayers.push({
          match_id: match.id,
          player_id: playerId,
          is_winner: false
        });
      }
    }

    if (matchPlayers.length > 0) {
      const { error: mpError } = await this.supabase.from('match_players').insert(matchPlayers);
      if (mpError) {
        this.stats.errors.push(`MatchPlayers: ${mpError.message}`);
        console.error(`  ❌ Error inserting match players: ${mpError.message}`);
      }
    }

    this.stats.matches = matches.length;
    console.log(`  ✓ Migrated ${matches.length} matches with ${matchPlayers.length} player associations`);
    console.log();
  }

  private async migrateEloHistory(): Promise<void> {
    console.log('📊 Migrating ELO history...');
    
    if (!this.data.history || this.data.history.length === 0) {
      console.log('  ℹ️ No ELO history to migrate\n');
      return;
    }

    const history = this.data.history.map(h => ({
      player_id: h.playerId,
      match_id: h.matchId,
      new_elo: h.newElo,
      timestamp: h.timestamp,
      game_type: h.gameType
    }));

    const { error } = await this.supabase.from('elo_history').insert(history);
    
    if (error) {
      this.stats.errors.push(`ELO History: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.eloHistory = history.length;
      console.log(`  ✓ Migrated ${history.length} ELO history entries`);
    }
    console.log();
  }

  private async migrateAdmins(): Promise<void> {
    console.log('👑 Migrating admins...');
    
    if (!this.data.admins || this.data.admins.length === 0) {
      console.log('  ℹ️ No admins to migrate\n');
      return;
    }

    const admins = this.data.admins.map(uid => ({
      firebase_uid: uid
    }));

    const { error } = await this.supabase.from('admins').insert(admins);
    
    if (error) {
      this.stats.errors.push(`Admins: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.admins = admins.length;
      console.log(`  ✓ Migrated ${admins.length} admins`);
    }
    console.log();
  }

  private async migratePendingMatches(): Promise<void> {
    console.log('⏳ Migrating pending matches...');
    
    if (!this.data.pendingMatches || this.data.pendingMatches.length === 0) {
      console.log('  ℹ️ No pending matches to migrate\n');
      return;
    }

    const pendingMatches = this.data.pendingMatches.map(pm => ({
      id: pm.id,
      type: pm.type,
      score_winner: pm.scoreWinner,
      score_loser: pm.scoreLoser,
      logged_by: pm.loggedBy,
      status: pm.status,
      confirmations: pm.confirmations,
      created_at: pm.createdAt,
      expires_at: pm.expiresAt
    }));

    const { error: pmError } = await this.supabase.from('pending_matches').insert(pendingMatches);
    
    if (pmError) {
      this.stats.errors.push(`PendingMatches: ${pmError.message}`);
      console.error(`  ❌ Error inserting pending matches: ${pmError.message}`);
      console.log();
      return;
    }

    // Migrate pending match players
    const pendingMatchPlayers: any[] = [];
    for (const pm of this.data.pendingMatches) {
      for (const playerId of pm.winners) {
        pendingMatchPlayers.push({
          pending_match_id: pm.id,
          player_id: playerId,
          is_winner: true
        });
      }
      for (const playerId of pm.losers) {
        pendingMatchPlayers.push({
          pending_match_id: pm.id,
          player_id: playerId,
          is_winner: false
        });
      }
    }

    if (pendingMatchPlayers.length > 0) {
      const { error: pmpError } = await this.supabase.from('pending_match_players').insert(pendingMatchPlayers);
      if (pmpError) {
        this.stats.errors.push(`PendingMatchPlayers: ${pmpError.message}`);
        console.error(`  ❌ Error inserting pending match players: ${pmpError.message}`);
      }
    }

    this.stats.pendingMatches = pendingMatches.length;
    console.log(`  ✓ Migrated ${pendingMatches.length} pending matches`);
    console.log();
  }

  private async migrateSeasons(): Promise<void> {
    console.log('🗓️  Migrating seasons...');
    
    if (!this.data.seasons || this.data.seasons.length === 0) {
      console.log('  ℹ️ No seasons to migrate\n');
      return;
    }

    const seasons = this.data.seasons.map(s => ({
      id: s.id,
      name: s.name,
      number: s.number,
      status: s.status,
      started_at: s.startedAt,
      ended_at: s.endedAt || null,
      final_standings: s.finalStandings,
      match_count: s.matchCount,
      champion_id: s.championId || null
    }));

    const { error } = await this.supabase.from('seasons').insert(seasons);
    
    if (error) {
      this.stats.errors.push(`Seasons: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.seasons = seasons.length;
      console.log(`  ✓ Migrated ${seasons.length} seasons`);
    }
    console.log();
  }

  private async migrateChallenges(): Promise<void> {
    console.log('⚔️  Migrating challenges...');
    
    if (!this.data.challenges || this.data.challenges.length === 0) {
      console.log('  ℹ️ No challenges to migrate\n');
      return;
    }

    const challenges = this.data.challenges.map(c => ({
      id: c.id,
      challenger_id: c.challengerId,
      challenged_id: c.challengedId,
      status: c.status,
      wager: c.wager,
      message: c.message || null,
      match_id: c.matchId || null,
      created_at: c.createdAt,
      updated_at: c.createdAt
    }));

    const { error } = await this.supabase.from('challenges').insert(challenges);
    
    if (error) {
      this.stats.errors.push(`Challenges: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.challenges = challenges.length;
      console.log(`  ✓ Migrated ${challenges.length} challenges`);
    }
    console.log();
  }

  private async migrateTournaments(): Promise<void> {
    console.log('🏅 Migrating tournaments...');
    
    if (!this.data.tournaments || this.data.tournaments.length === 0) {
      console.log('  ℹ️ No tournaments to migrate\n');
      return;
    }

    const tournaments = this.data.tournaments.map(t => ({
      id: t.id,
      name: t.name,
      format: t.format,
      status: t.status,
      game_type: t.gameType,
      player_ids: t.playerIds,
      rounds: t.rounds,
      created_by: t.createdBy,
      winner_id: t.winnerId || null,
      created_at: t.createdAt,
      completed_at: t.completedAt || null
    }));

    const { error } = await this.supabase.from('tournaments').insert(tournaments);
    
    if (error) {
      this.stats.errors.push(`Tournaments: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.tournaments = tournaments.length;
      console.log(`  ✓ Migrated ${tournaments.length} tournaments`);
    }
    console.log();
  }

  private async migrateReactions(): Promise<void> {
    console.log('😀 Migrating reactions...');
    
    if (!this.data.reactions || this.data.reactions.length === 0) {
      console.log('  ℹ️ No reactions to migrate\n');
      return;
    }

    const reactions = this.data.reactions.map(r => ({
      match_id: r.matchId,
      player_id: r.playerId,
      emoji: r.emoji,
      comment: r.comment || null,
      created_at: r.createdAt || new Date().toISOString(),
      updated_at: r.createdAt || new Date().toISOString()
    }));

    const { error } = await this.supabase.from('match_reactions').insert(reactions);
    
    if (error) {
      this.stats.errors.push(`Reactions: ${error.message}`);
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      this.stats.reactions = reactions.length;
      console.log(`  ✓ Migrated ${reactions.length} reactions`);
    }
    console.log();
  }

  private printStats(): void {
    console.log('='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`  Rackets:        ${this.stats.rackets}`);
    console.log(`  Players:        ${this.stats.players}`);
    console.log(`  Matches:        ${this.stats.matches}`);
    console.log(`  ELO History:    ${this.stats.eloHistory}`);
    console.log(`  Admins:         ${this.stats.admins}`);
    console.log(`  Pending Matches:${this.stats.pendingMatches}`);
    console.log(`  Seasons:        ${this.stats.seasons}`);
    console.log(`  Challenges:     ${this.stats.challenges}`);
    console.log(`  Tournaments:    ${this.stats.tournaments}`);
    console.log(`  Reactions:      ${this.stats.reactions}`);
    console.log('='.repeat(50));
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach(e => console.log(`  - ${e}`));
      process.exit(1);
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  }
}

// Main execution
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const dbFilePath = process.env.DB_FILE_PATH || path.join(__dirname, '..', 'source', 'db.json');

  if (!supabaseUrl) {
    console.error('❌ Error: SUPABASE_URL environment variable is required');
    console.error('   Set it with: export SUPABASE_URL=https://your-project.supabase.co');
    process.exit(1);
  }

  if (!supabaseKey) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
    console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key');
    console.error('   Set it with: export SUPABASE_SERVICE_KEY=your-service-key');
    process.exit(1);
  }

  console.log('📁 Loading data from:', dbFilePath);
  
  if (!fs.existsSync(dbFilePath)) {
    console.error(`❌ Error: Database file not found at ${dbFilePath}`);
    process.exit(1);
  }

  let data: LegacyDatabase;
  try {
    const content = fs.readFileSync(dbFilePath, 'utf8');
    data = JSON.parse(content);
  } catch (err: any) {
    console.error('❌ Error parsing JSON:', err.message);
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase:', supabaseUrl);
  console.log();

  const migrator = new Migrator(supabaseUrl, supabaseKey, data);
  await migrator.migrate();
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
