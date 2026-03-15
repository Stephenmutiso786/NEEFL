import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';

const uploadDir = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, filename);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});
