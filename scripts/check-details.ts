import { pool } from "../lib/db";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const clients = await pool.query('SELECT id, client_name, company_name, email, status, assigned_employee_id FROM clients;');
  console.log("CLIENTS COUNT:", clients.rows.length, clients.rows);

  const orders = await pool.query('SELECT id, client_id, package_id, status, contracted_video_count, remaining_quota FROM orders;');
  console.log("ORDERS COUNT:", orders.rows.length, orders.rows);

  const packages = await pool.query('SELECT id, name, video_count, base_price, is_active FROM packages;');
  console.log("PACKAGES COUNT:", packages.rows.length, packages.rows);

  // 1. Ensure user SKILL ZEE is linked to client
  await pool.query(`UPDATE "user" SET client_id = '57b21d3b-e7ad-4759-8dba-42893071e92d' WHERE email = 'info@skillzee.co.in';`);
  
  // 2. Set an assigned employee for clients that don't have one (e.g. Priya Sharma: e0000001-0000-0000-0000-000000000001)
  await pool.query(`
    UPDATE clients 
    SET assigned_employee_id = 'e0000001-0000-0000-0000-000000000001'
    WHERE id = 'b0000001-0000-0000-0000-000000000001' AND assigned_employee_id IS NULL;
  `);

  // 3. Ensure SKILL ZEE has proper company name and active order
  await pool.query(`
    UPDATE clients
    SET company_name = 'SkillZee EdTech Media Ltd',
        brand_name = 'SkillZee',
        industry = 'EdTech & E-Learning',
        status = 'active',
        phone = '+91 98765 43210',
        whatsapp = '+91 98765 43210'
    WHERE id = '57b21d3b-e7ad-4759-8dba-42893071e92d';
  `);

  // 4. Check if SKILL ZEE has an order, if not create one
  const skillOrders = await pool.query(`SELECT id FROM orders WHERE client_id = '57b21d3b-e7ad-4759-8dba-42893071e92d';`);
  if (skillOrders.rows.length === 0) {
    const pkg = (await pool.query(`SELECT * FROM packages WHERE is_active = true LIMIT 1;`)).rows[0];
    const basePrice = parseFloat(pkg.base_price);
    const tax = (basePrice * 18) / 100;
    const total = basePrice + tax;
    const vCount = parseInt(pkg.video_count, 10);

    const insOrder = await pool.query(`
      INSERT INTO orders (
        organization_id, client_id, package_id, package_name, package_name_snapshot,
        contracted_video_count, pricing, gst_tax, tax_rate, total_invoice_amount,
        start_date, status, ordered_videos_quota, remaining_quota, assigned_videos, completed_videos, delivered_videos
      ) VALUES (
        '00000000-0000-0000-0000-000000000001', '57b21d3b-e7ad-4759-8dba-42893071e92d',
        $1, $2, $2, $3, $4, $5, 18.00, $6, CURRENT_DATE, 'in_production', $3, $3, 0, 0, 0
      ) RETURNING id;
    `, [pkg.id, pkg.name, vCount, basePrice, tax, total]);
    console.log("Created order for SKILL ZEE:", insOrder.rows[0].id);
  }

  // 5. Query final state of all clients & orders
  const finalClients = await pool.query(`
    SELECT c.id, c.client_name, c.company_name, c.email, c.status, 
           COALESCE(u.full_name, 'Unassigned') as assigned_employee
    FROM clients c
    LEFT JOIN employees emp ON emp.id = c.assigned_employee_id
    LEFT JOIN users u ON u.id = emp.user_id
    ORDER BY c.client_name ASC;
  `);
  console.log("FINAL CLIENTS IN DB:", finalClients.rows);

  const finalOrders = await pool.query(`
    SELECT o.id, c.client_name, o.package_name, o.status, o.contracted_video_count, o.remaining_quota
    FROM orders o
    JOIN clients c ON c.id = o.client_id;
  `);
  console.log("FINAL ORDERS IN DB:", finalOrders.rows);

  await pool.end();
}

run().catch(console.error);
