import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

const sslCa =
  env.db.sslCa ??
  (env.db.sslCaBase64 ? Buffer.from(env.db.sslCaBase64, 'base64').toString('utf8') : undefined);

if (env.db.ssl && !sslCa) {
  console.warn('DB_SSL is true but no CA certificate was provided. Set DB_SSL_CA or DB_SSL_CA_BASE64.');
}

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  ssl: env.db.ssl
    ? {
        ca: sslCa,
        rejectUnauthorized: env.db.sslRejectUnauthorized
      }
    : false,
  max: 10
});

types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const namedParamRegex = /(?<!:):([a-zA-Z0-9_]+)/g;

function normalizeQuery(sql, params) {
  if (!params || Array.isArray(params)) {
    return { text: sql, values: params || [] };
  }
  const values = [];
  const text = sql.replace(namedParamRegex, (_, key) => {
    values.push(Object.prototype.hasOwnProperty.call(params, key) ? params[key] : null);
    return `$${values.length}`;
  });
  return { text, values };
}

function isSelectStatement(sql) {
  return /^\s*select/i.test(sql);
}

function shapeResult(result, sql) {
  if (isSelectStatement(sql)) {
    return [result.rows];
  }
  return [
    {
      insertId: result.rows?.[0]?.id ?? null,
      affectedRows: result.rowCount
    }
  ];
}

async function runQuery(client, sql, params) {
  const { text, values } = normalizeQuery(sql, params);
  const result = await client.query(text, values);
  return shapeResult(result, sql);
}

export const db = {
  query(sql, params = {}) {
    return runQuery(pool, sql, params);
  },
  async tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const conn = {
        query: (sql, params = {}) => runQuery(client, sql, params),
        execute: (sql, params = {}) => runQuery(client, sql, params)
      };
      const result = await fn(conn);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
