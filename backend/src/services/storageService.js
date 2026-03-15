import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const LOCAL_UPLOAD_DIR = path.resolve(env.uploadDir);
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

function ensureS3Configured() {
  if (!env.storage.bucket) {
    throw new Error('missing_s3_bucket');
  }
}

function normalizeExtension(filename, mimeType) {
  const ext = path.extname(filename || '').toLowerCase();
  if (ext) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function buildKey({ userId, side, filename, mimeType }) {
  const ext = normalizeExtension(filename, mimeType);
  const safeSide = side || 'document';
  return `kyc/${userId}/${safeSide}-${Date.now()}-${uuidv4()}${ext}`;
}

function resolvePublicBaseUrl() {
  ensureS3Configured();
  const explicit = env.storage.publicUrl;
  if (explicit) return explicit.replace(/\/$/, '');
  if (env.storage.endpoint) {
    return env.storage.endpoint.replace(/\/$/, '') + `/${env.storage.bucket}`;
  }
  return `https://${env.storage.bucket}.s3.${env.storage.region}.amazonaws.com`;
}

let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: env.storage.region,
    endpoint: env.storage.endpoint || undefined,
    forcePathStyle: env.storage.forcePathStyle,
    credentials: env.storage.accessKeyId && env.storage.secretAccessKey
      ? {
          accessKeyId: env.storage.accessKeyId,
          secretAccessKey: env.storage.secretAccessKey
        }
      : undefined
  });
  return s3Client;
}

export async function uploadKycFile({ file, userId, side }) {
  if (!file) {
    throw new Error('missing_file');
  }
  const key = buildKey({
    userId,
    side,
    filename: file.originalname,
    mimeType: file.mimetype
  });

  if (env.storage.provider === 's3') {
    ensureS3Configured();
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: env.storage.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/octet-stream'
    });
    await client.send(command);
    if (env.storage.publicUrl) {
      return `${resolvePublicBaseUrl()}/${key}`;
    }
    return `s3://${env.storage.bucket}/${key}`;
  }

  const localPath = path.join(LOCAL_UPLOAD_DIR, key.split('/').pop());
  await fs.promises.writeFile(localPath, file.buffer);
  return `${env.baseUrl}/uploads/${path.basename(localPath)}`;
}

export async function resolveKycUrl(value) {
  if (!value) return null;
  if (value.startsWith('http')) return value;
  if (!env.storage.provider || env.storage.provider !== 's3') return value;

  ensureS3Configured();
  let bucket = env.storage.bucket;
  let key = value;
  if (value.startsWith('s3://')) {
    const stripped = value.replace('s3://', '');
    const parts = stripped.split('/');
    bucket = parts.shift();
    key = parts.join('/');
  }
  if (!bucket || !key) return value;

  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const expiresIn = Number(env.storage.signedUrlExpires || 900);
  return getSignedUrl(client, command, { expiresIn });
}
