import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT || 8080;
export const GCS_BUCKET = process.env.GCS_BUCKET;
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);
export const DB_FILE = path.join(__dirname, '..', 'db.json');
export const STAT_BUDGET = 30;
