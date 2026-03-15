import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { env } from '../config/env.js';

export function runDatabaseBackup() {
  return new Promise((resolve, reject) => {
    const backupsDir = path.resolve('backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const filename = `neefl-backup-${Date.now()}.sql`;
    const filePath = path.join(backupsDir, filename);

    const args = [];
    args.push(`-h${env.db.host}`);
    args.push(`-P${env.db.port}`);
    args.push(`-u${env.db.user}`);
    if (env.db.password) {
      args.push(`-p${env.db.password}`);
    }
    args.push(env.db.name);

    const dump = spawn('mysqldump', args);
    const writeStream = fs.createWriteStream(filePath);

    let stderr = '';
    dump.stdout.pipe(writeStream);
    dump.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    dump.on('error', (err) => {
      reject(err);
    });

    dump.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'backup_failed'));
      } else {
        resolve({ filePath, filename });
      }
    });
  });
}
