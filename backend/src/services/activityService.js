import { db } from '../db/index.js';

export async function logActivity(conn, {
  actorUserId,
  verb,
  entityType,
  entityId,
  targetUserId,
  visibility = 'public',
  payload
}) {
  const runner = conn || db;
  await runner.query(
    `INSERT INTO activity_feed (actor_id, verb, entity_type, entity_id, target_user_id, visibility, payload)
     VALUES (:actor_id, :verb, :entity_type, :entity_id, :target_user_id, :visibility, :payload)`,
    {
      actor_id: actorUserId || null,
      verb,
      entity_type: entityType || null,
      entity_id: entityId || null,
      target_user_id: targetUserId || null,
      visibility,
      payload: payload ? JSON.stringify(payload) : null
    }
  );
}
