import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { pool } from "../lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Applying Step 2: RBAC Schema Migration to Neon Database...");
  const sqlPath = path.join(process.cwd(), "scripts", "rbac-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("RBAC Schema applied successfully.");

    // Check existing users and ensure at least one user is assigned OWNER if present
    const usersRes = await client.query('SELECT id, email, role FROM "user" ORDER BY "createdAt" ASC LIMIT 1;');
    if (usersRes.rows.length > 0 && usersRes.rows[0].role === 'CLIENT') {
      await client.query('UPDATE "user" SET role = $1 WHERE id = $2;', ['OWNER', usersRes.rows[0].id]);
      console.log(`Promoted first user (${usersRes.rows[0].email}) to OWNER.`);
    }
  } catch (err) {
    console.error("Error executing RBAC migration:", err);
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
