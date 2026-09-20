import { pool } from "../lib/db";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

async function testClientFlow() {
  console.log("=== Testing Client Self-Service Flow ===");

  // 1. Get or create a mock client user
  const clientUserRes = await pool.query(
    `SELECT id, name, email, role, client_id FROM "user" WHERE role = 'CLIENT' LIMIT 1;`
  );

  if (clientUserRes.rows.length === 0) {
    console.log("No CLIENT user found in DB. Skipping mock test.");
    await pool.end();
    return;
  }

  const clientUser = clientUserRes.rows[0];
  console.log("Using CLIENT user:", clientUser.email, "ID:", clientUser.id);

  // 2. Test package existence
  const pkgRes = await pool.query(
    "SELECT id, name, video_count, base_price, tax_rate FROM packages WHERE is_active = true LIMIT 1;"
  );
  const pkg = pkgRes.rows[0];
  console.log("Selected Package:", pkg.name, "Quota:", pkg.video_count);

  // 3. Ensure client has a client record
  let clientId = clientUser.client_id;
  if (!clientId) {
    const existing = await pool.query(
      "SELECT id FROM clients WHERE email = $1 LIMIT 1;",
      [clientUser.email]
    );
    if (existing.rows.length > 0) {
      clientId = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO clients (organization_id, client_name, company_name, email, status)
         VALUES ($1, $2, $3, $4, 'new') RETURNING id;`,
        [DEFAULT_ORG_ID, clientUser.name, "Test Brand", clientUser.email]
      );
      clientId = ins.rows[0].id;
    }
    await pool.query('UPDATE "user" SET client_id = $1 WHERE id = $2;', [clientId, clientUser.id]);
  }
  console.log("Resolved clientId:", clientId);

  // 4. Simulate Order Application
  const pricing = parseFloat(pkg.base_price);
  const taxRate = parseFloat(pkg.tax_rate) || 18.0;
  const gstTax = (pricing * taxRate) / 100.0;
  const total = pricing + gstTax;
  const videoCount = parseInt(pkg.video_count, 10);

  const newOrderRes = await pool.query(
    `INSERT INTO orders (
      organization_id, client_id, package_id, package_name, package_name_snapshot,
      contracted_video_count, pricing, gst_tax, tax_rate, total_invoice_amount,
      start_date, status, ordered_videos_quota, remaining_quota
    ) VALUES (
      $1, $2, $3, $4, $4, $5, $6, $7, $8, $9, CURRENT_DATE, 'new', $5, $5
    ) RETURNING id, remaining_quota;`,
    [DEFAULT_ORG_ID, clientId, pkg.id, pkg.name, videoCount, pricing, gstTax, taxRate, total]
  );
  const testOrder = newOrderRes.rows[0];
  console.log("✅ Created Test Order:", testOrder.id, "Remaining Quota:", testOrder.remaining_quota);

  // 5. Simulate Video Deliverable Request Submission
  const reqRes = await pool.query(
    `INSERT INTO video_requests (
      organization_id, order_id, client_id, requested_by_user_id,
      title, hook_angle, core_message, target_audience, reference_links, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, 'SUBMITTED'
    ) RETURNING id, title, status;`,
    [
      DEFAULT_ORG_ID,
      testOrder.id,
      clientId,
      clientUser.id,
      "Test Hook Angle Concept",
      "Why standard UGC ads fail without strong 3s hooks",
      "Get 20% off your first test batch",
      "D2C founders aged 25-40",
      ["https://instagram.com/reel/test"],
    ]
  );
  console.log("✅ Created Video Request:", reqRes.rows[0]);

  // 6. Update order quota counters
  const updatedOrderRes = await pool.query(
    `UPDATE orders 
     SET assigned_videos = assigned_videos + 1,
         remaining_quota = remaining_quota - 1
     WHERE id = $1
     RETURNING assigned_videos, remaining_quota;`,
    [testOrder.id]
  );
  console.log("✅ Updated Order Quota:", updatedOrderRes.rows[0]);

  // Clean up test order & request to keep database clean
  await pool.query("DELETE FROM video_requests WHERE order_id = $1;", [testOrder.id]);
  await pool.query("DELETE FROM orders WHERE id = $1;", [testOrder.id]);
  console.log("✅ Test cleanup complete!");

  await pool.end();
}

testClientFlow().catch(console.error);
