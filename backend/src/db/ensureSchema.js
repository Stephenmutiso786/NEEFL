import { db } from './index.js';

async function runSafe(statement) {
  try {
    await db.query(statement);
  } catch (err) {
    console.warn('Schema ensure failed:', err?.message || err);
  }
}

export async function ensureSchema() {
  await runSafe(`ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS document_front_url VARCHAR(1024) NULL`);
  await runSafe(`ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS document_back_url VARCHAR(1024) NULL`);

  await runSafe(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id BIGSERIAL PRIMARY KEY,
      sender_id BIGINT NOT NULL,
      receiver_id BIGINT NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_direct_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
      CONSTRAINT fk_direct_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at)`);

  await runSafe(`
    CREATE TABLE IF NOT EXISTS wallet_topups (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      method TEXT NOT NULL DEFAULT 'manual' CHECK (method IN ('manual','mpesa')),
      reference VARCHAR(128) NULL,
      sender_name VARCHAR(128) NULL,
      phone VARCHAR(32) NULL,
      receipt_url VARCHAR(1024) NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      reviewed_by BIGINT NULL,
      reviewed_at TIMESTAMP NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_wallet_topups_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_wallet_topups_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON wallet_topups(user_id)`);
  await runSafe(`CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON wallet_topups(status)`);
}
