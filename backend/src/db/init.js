import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'schema.sql');

const schema = fs.readFileSync(schemaPath, 'utf8');

const statements = [];
let buffer = '';
let inDollarBlock = false;

for (let i = 0; i < schema.length; i += 1) {
  const char = schema[i];
  const next = schema[i + 1];

  if (char === '$' && next === '$') {
    inDollarBlock = !inDollarBlock;
    buffer += '$$';
    i += 1;
    continue;
  }

  if (char === ';' && !inDollarBlock) {
    const stmt = buffer.trim();
    if (stmt) {
      statements.push(stmt);
    }
    buffer = '';
    continue;
  }

  buffer += char;
}

const tail = buffer.trim();
if (tail) {
  statements.push(tail);
}

for (const stmt of statements) {
  await db.query(stmt);
}

console.log('Database schema initialized.');
process.exit(0);
