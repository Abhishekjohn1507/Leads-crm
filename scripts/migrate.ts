import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { pool } from "../lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Migrating database schema for Leadyfy OS...");
  const sqlPath = path.join(process.cwd(), "scripts", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Error executing database migration:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
