import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const sslCa =
  env.db.sslCa ??
  (env.db.sslCaBase64 ? Buffer.from(env.db.sslCaBase64, 'base64').toString('utf8') : undefined);

const ssl =
  env.db.ssl
    ? {
        ca: sslCa,
        rejectUnauthorized: env.db.sslRejectUnauthorized
      }
    : undefined;

if (env.db.ssl && !sslCa) {
  console.warn('DB_SSL is true but no CA certificate was provided. Set DB_SSL_CA or DB_SSL_CA_BASE64.');
}

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  decimalNumbers: true,
  ssl
});

export const db = {
  query(sql, params = {}) {
    return pool.execute(sql, params);
  },
  async tx(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};
