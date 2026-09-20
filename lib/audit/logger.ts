import { pool } from "@/lib/db";

export interface LogActivityParams {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  userId,
  action,
  entityName,
  entityId,
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    // Check if user_id is a UUID or TEXT. The existing activity_logs has user_id as uuid.
    // If userId is string from Better Auth, we check if it matches UUID format. If not, pass null or metadata.
    const isUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    const validUserId = isUuid ? userId : null;
    const finalMetadata = isUuid ? metadata : { ...metadata, authUserId: userId };

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_name, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5);`,
      [validUserId, action, entityName, entityId, JSON.stringify(finalMetadata)]
    );
  } catch (error) {
    console.error("Failed to write to activity_logs:", error);
    // Non-blocking: audit logging failure should not abort the primary business transaction
  }
}
