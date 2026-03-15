import { db } from '../db/index.js';

export async function notifyUsers(conn, userIds, type, payload) {
  const targetIds = Array.from(new Set(userIds)).filter(Boolean);
  if (!targetIds.length) return;

  const runner = conn || db;

  for (const userId of targetIds) {
    await runner.query(
      `INSERT INTO notifications (user_id, type, payload)
       VALUES (:user_id, :type, :payload)`,
      {
        user_id: userId,
        type,
        payload: JSON.stringify(payload)
      }
    );
  }
}
