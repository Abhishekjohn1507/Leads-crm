import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { pool } from "../lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Applying Module 4: Client & Package/Order Management Schema to Neon...");
  const sqlPath = path.join(process.cwd(), "scripts", "module4-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Module 4 schema successfully applied.");
  } catch (err) {
    console.error("Error executing Module 4 migration:", err);
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
