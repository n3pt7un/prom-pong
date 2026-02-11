import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { DB_FILE, GCS_BUCKET } from '../config.js';

let bucket = null;
if (GCS_BUCKET) {
  const storage = new Storage();
  bucket = storage.bucket(GCS_BUCKET);
}

let db = {
  players: [],
  matches: [],
  history: [],
  rackets: [],
  backups: [],
  admins: [],
  pendingMatches: [],
  seasons: [],
  challenges: [],
  tournaments: [],
  reactions: [],
  leagues: [],
};

export const getDB = () => db;

export const ensureArrayFields = () => {
  if (!Array.isArray(db.admins)) db.admins = [];
  if (!Array.isArray(db.pendingMatches)) db.pendingMatches = [];
  if (!Array.isArray(db.seasons)) db.seasons = [];
  if (!Array.isArray(db.challenges)) db.challenges = [];
  if (!Array.isArray(db.tournaments)) db.tournaments = [];
  if (!Array.isArray(db.reactions)) db.reactions = [];
  if (!Array.isArray(db.leagues)) db.leagues = [];
};

export const seedData = () => {
  db.rackets = [
    { id: 'r1', name: 'Neon Striker', icon: 'Zap', color: '#fcee0a', stats: { speed: 18, spin: 5, power: 3, control: 2, defense: 1, chaos: 1 } },
    { id: 'r2', name: 'Cyber Wall', icon: 'Shield', color: '#00f3ff', stats: { speed: 2, spin: 3, power: 2, control: 5, defense: 18, chaos: 0 } },
    { id: 'r3', name: 'Void Smasher', icon: 'Target', color: '#ff00ff', stats: { speed: 3, spin: 2, power: 18, control: 3, defense: 3, chaos: 1 } },
  ];
  db.players = [
    { id: '1', name: 'Neo', avatar: 'https://picsum.photos/id/64/200/200', eloSingles: 1450, eloDoubles: 1200, winsSingles: 10, lossesSingles: 1, streakSingles: 3, winsDoubles: 5, lossesDoubles: 1, streakDoubles: 2, joinedAt: new Date().toISOString(), mainRacketId: 'r1' },
    { id: '2', name: 'Trinity', avatar: 'https://picsum.photos/id/65/200/200', eloSingles: 1380, eloDoubles: 1250, winsSingles: 8, lossesSingles: 3, streakSingles: 1, winsDoubles: 4, lossesDoubles: 2, streakDoubles: -1, joinedAt: new Date().toISOString(), mainRacketId: 'r2' },
  ];
  db.matches = [];
  db.history = [];
  db.backups = [];
  db.admins = [];
  db.pendingMatches = [];
  db.seasons = [];
  db.challenges = [];
  db.tournaments = [];
  db.reactions = [];
};

export const saveDB = async () => {
  try {
    const data = JSON.stringify(db, null, 2);
    if (bucket) {
      await bucket.file('db.json').save(data, { contentType: 'application/json', resumable: false });
    } else {
      fs.writeFileSync(DB_FILE, data);
    }
  } catch (err) {
    console.error('❌ Error saving DB:', err);
  }
};

export const loadDB = async () => {
  try {
    if (bucket) {
      const file = bucket.file('db.json');
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        db = { ...db, ...JSON.parse(contents.toString()) };
        ensureArrayFields();
        console.log('✅ Database loaded from Cloud Storage');
      } else {
        seedData();
        await saveDB();
      }
    } else {
      if (fs.existsSync(DB_FILE)) {
        db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
        ensureArrayFields();
        if (db.players.length === 0) seedData();
        console.log('✅ Database loaded from local disk');
      } else {
        seedData();
        await saveDB();
      }
    }
  } catch (err) {
    console.error('❌ Error loading DB:', err);
    seedData();
  }
};
