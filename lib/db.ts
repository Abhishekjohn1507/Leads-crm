import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/leadify";

// In serverless / edge environments, we can reuse this pool
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export const pool =
  global._pgPool ||
  new Pool({
    connectionString,
    ssl:
      connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
