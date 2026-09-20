import { pool } from "../lib/db";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function inspectSchema() {
  const clientCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'clients'
    ORDER BY ordinal_position;
  `);
  console.log("CLIENTS COLUMNS:", clientCols.rows.map(c => `${c.column_name} (${c.data_type})`));

  const orderCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'orders'
    ORDER BY ordinal_position;
  `);
  console.log("ORDERS COLUMNS:", orderCols.rows.map(c => `${c.column_name} (${c.data_type})`));

  const userCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'user'
    ORDER BY ordinal_position;
  `);
  console.log("BETTER AUTH 'user' COLUMNS:", userCols.rows.map(c => `${c.column_name} (${c.data_type})`));

  const existingClients = await pool.query('SELECT * FROM clients;');
  console.log("EXISTING CLIENTS IN DB:", existingClients.rows);

  await pool.end();
}

inspectSchema().catch(console.error);
