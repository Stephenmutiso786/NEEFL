import { db } from '../src/db/index.js';
import { hashPassword } from '../src/lib/crypto.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const phone = process.env.ADMIN_PHONE || null;
const baseTag = process.env.ADMIN_GAMER_TAG || `NEEFL_ADMIN_${Date.now().toString().slice(-5)}`;

if (!email || !password) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD.');
  process.exit(1);
}

async function uniqueGamerTag(conn, tag) {
  let nextTag = tag;
  let counter = 0;
  while (true) {
    const [rows] = await conn.query('SELECT user_id FROM players WHERE gamer_tag = :tag', { tag: nextTag });
    if (!rows.length) {
      return nextTag;
    }
    counter += 1;
    nextTag = `${tag}_${counter}`;
  }
}

async function ensureWallet(conn, userId) {
  const [wallets] = await conn.query('SELECT user_id FROM wallets WHERE user_id = :id', { id: userId });
  if (!wallets.length) {
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (:id, 0)', { id: userId });
  }
}

async function ensurePlayer(conn, userId, gamerTag) {
  const [players] = await conn.query('SELECT user_id FROM players WHERE user_id = :id', { id: userId });
  if (!players.length) {
    const tag = await uniqueGamerTag(conn, gamerTag);
    await conn.execute(
      'INSERT INTO players (user_id, gamer_tag) VALUES (:id, :gamer_tag)',
      { id: userId, gamer_tag: tag }
    );
  }
}

async function main() {
  const passwordHash = await hashPassword(password);

  await db.tx(async (conn) => {
    const [rows] = await conn.query('SELECT id FROM users WHERE email = :email', { email });
    if (rows.length) {
      const userId = rows[0].id;
      await conn.execute(
        `UPDATE users
         SET password_hash = :password_hash,
             role = 'admin',
             status = 'active',
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = :id`,
        { password_hash: passwordHash, id: userId }
      );
      await ensurePlayer(conn, userId, baseTag);
      await ensureWallet(conn, userId);
      return;
    }

    const [result] = await conn.execute(
      `INSERT INTO users (email, phone, password_hash, role, status)
       VALUES (:email, :phone, :password_hash, 'admin', 'active')
       RETURNING id`,
      { email, phone, password_hash: passwordHash }
    );

    const userId = result.insertId;
    const gamerTag = await uniqueGamerTag(conn, baseTag);

    await conn.execute(
      'INSERT INTO players (user_id, gamer_tag) VALUES (:id, :gamer_tag)',
      { id: userId, gamer_tag: gamerTag }
    );
    await conn.execute('INSERT INTO wallets (user_id, balance) VALUES (:id, 0)', { id: userId });
  });

  console.log(`Admin ready for ${email}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
