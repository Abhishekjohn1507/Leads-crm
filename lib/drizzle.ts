import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import * as schema from "./db/schema";

/**
 * Type-safe Drizzle ORM client connected to Neon PostgreSQL.
 * Supports relational query builder `db.query.<table-name>.findMany(...)`
 * and standard SQL builder `db.select().from(...)`.
 */
export const db = drizzle(pool, { schema });
export type Database = typeof db;
