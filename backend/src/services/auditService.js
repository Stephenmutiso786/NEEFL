import { db } from '../db/index.js';

export async function logAudit(conn, { actorUserId, action, entityType, entityId, ip, userAgent }) {
  const runner = conn || db;
  await runner.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, ip, user_agent)
     VALUES (:actor_user_id, :action, :entity_type, :entity_id, :ip, :user_agent)`,
    {
      actor_user_id: actorUserId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      ip: ip || null,
      user_agent: userAgent || null
    }
  );
}
