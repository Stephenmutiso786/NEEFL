import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');

const schema = fs.readFileSync(schemaPath, 'utf8');

const statements = schema
  .split(/;\s*\n/)
  .map((stmt) => stmt.trim())
  .filter(Boolean);

for (const stmt of statements) {
  await db.query(stmt);
}

console.log('Database schema initialized.');
process.exit(0);
