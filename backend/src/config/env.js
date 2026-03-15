import dotenv from 'dotenv';

dotenv.config();

function getEnv(key, fallback = undefined) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function requireEnv(key) {
  const value = getEnv(key);
  if (value === undefined) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function parseDatabaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname ? parsed.pathname.replace('/', '') : undefined;
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      name: dbName,
      ssl: parsed.searchParams.get('sslmode') === 'require'
    };
  } catch (err) {
    return null;
  }
}

const databaseUrl = getEnv('DATABASE_URL');
const parsedDbUrl = parseDatabaseUrl(databaseUrl);

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', '8080')),
  baseUrl: getEnv('BASE_URL', 'http://localhost:8080'),

  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  jwtRememberExpiresIn: getEnv('JWT_REMEMBER_EXPIRES_IN', '30d'),
  adminSecurityCode: getEnv('ADMIN_SECURITY_CODE'),
  loginMaxAttempts: Number(getEnv('LOGIN_MAX_ATTEMPTS', '5')),
  loginLockMinutes: Number(getEnv('LOGIN_LOCK_MINUTES', '15')),

  db: {
    host: parsedDbUrl?.host || getEnv('DB_HOST', '127.0.0.1'),
    port: Number(parsedDbUrl?.port || getEnv('DB_PORT', '5432')),
    user: parsedDbUrl?.user || getEnv('DB_USER', 'neefl'),
    password: parsedDbUrl?.password || getEnv('DB_PASSWORD', 'neefl'),
    name: parsedDbUrl?.name || getEnv('DB_NAME', 'neefl'),
    ssl: parsedDbUrl?.ssl ?? getEnv('DB_SSL', 'false') === 'true',
    sslCa: getEnv('DB_SSL_CA'),
    sslCaBase64: getEnv('DB_SSL_CA_BASE64'),
    sslRejectUnauthorized: getEnv('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true'
  },

  uploadDir: getEnv('UPLOAD_DIR', 'uploads'),
  storage: {
    provider: getEnv('STORAGE_PROVIDER', 'local'),
    bucket: getEnv('S3_BUCKET'),
    region: getEnv('S3_REGION', 'us-east-1'),
    accessKeyId: getEnv('S3_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('S3_SECRET_ACCESS_KEY'),
    endpoint: getEnv('S3_ENDPOINT'),
    publicUrl: getEnv('S3_PUBLIC_URL'),
    forcePathStyle: getEnv('S3_FORCE_PATH_STYLE', 'false') === 'true',
    signedUrlExpires: Number(getEnv('S3_SIGNED_URL_EXPIRES', '900'))
  },

  smtp: {
    host: getEnv('SMTP_HOST'),
    port: Number(getEnv('SMTP_PORT', '587')),
    user: getEnv('SMTP_USER'),
    pass: getEnv('SMTP_PASS'),
    from: getEnv('SMTP_FROM', 'no-reply@neefl.local')
  },

  sms: {
    webhookUrl: getEnv('SMS_WEBHOOK_URL'),
    token: getEnv('SMS_WEBHOOK_TOKEN')
  },

  mpesa: {
    env: getEnv('MPESA_ENV', 'production'),
    baseUrl: getEnv('MPESA_BASE_URL'),
    oauthUrl: getEnv('MPESA_OAUTH_URL'),
    stkPushUrl: getEnv('MPESA_STK_PUSH_URL'),
    b2cUrl: getEnv('MPESA_B2C_URL'),
    consumerKey: getEnv('MPESA_CONSUMER_KEY'),
    consumerSecret: getEnv('MPESA_CONSUMER_SECRET'),
    shortcode: getEnv('MPESA_SHORTCODE'),
    passkey: getEnv('MPESA_PASSKEY'),
    callbackUrl: getEnv('MPESA_CALLBACK_URL'),
    accountReference: getEnv('MPESA_ACCOUNT_REFERENCE', 'NEEFL'),
    transactionDesc: getEnv('MPESA_TRANSACTION_DESC', 'NEEFL Entry Fee'),
    b2cShortcode: getEnv('MPESA_B2C_SHORTCODE'),
    b2cInitiatorName: getEnv('MPESA_B2C_INITIATOR_NAME'),
    b2cSecurityCredential: getEnv('MPESA_B2C_SECURITY_CREDENTIAL'),
    timeoutUrl: getEnv('MPESA_TIMEOUT_URL'),
    resultUrl: getEnv('MPESA_RESULT_URL')
  }
};
