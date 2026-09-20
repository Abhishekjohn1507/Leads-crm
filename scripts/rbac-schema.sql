-- Step 2: Role-Based Access Control (RBAC) Migration
-- 1. Add role to the "user" table (Better Auth user table)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'CLIENT';

-- 2. Add client_id linkage to support strict client isolation (each CLIENT user can be linked to a specific client record)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS client_id UUID;

-- 3. Create role_audit_logs to track role changes in the agency
CREATE TABLE IF NOT EXISTS role_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    changed_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    old_role TEXT,
    new_role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create index on role and client_id
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_user_client_id ON "user"(client_id);
