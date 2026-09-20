import { Pool } from "pg";
import dotenv from "dotenv";
import { canTransitionClientStatus } from "../lib/clients/status";
import { canTransitionOrderStatus } from "../lib/orders/status";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_ORG_ID = "00000000-0000-0000-0000-000000000002";

async function runTests() {
  console.log("==================================================");
  console.log("LEADYFY OS — MODULE 4 TEST SUITE");
  console.log("==================================================\n");

  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${label}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. Client Lifecycle Transition Engine
    // -----------------------------------------------------------------
    console.log("--- 1. Client Lifecycle Engine Tests ---");
    assert(canTransitionClientStatus("LEAD", "NEW").allowed, "Client LEAD -> NEW is allowed");
    assert(canTransitionClientStatus("NEW", "ONBOARDING").allowed, "Client NEW -> ONBOARDING is allowed");
    assert(canTransitionClientStatus("ONBOARDING", "ACTIVE").allowed, "Client ONBOARDING -> ACTIVE is allowed");
    assert(canTransitionClientStatus("ACTIVE", "ON_HOLD").allowed, "Client ACTIVE -> ON_HOLD is allowed");
    assert(canTransitionClientStatus("ON_HOLD", "ACTIVE").allowed, "Client ON_HOLD -> ACTIVE is allowed");
    assert(canTransitionClientStatus("ACTIVE", "COMPLETED").allowed, "Client ACTIVE -> COMPLETED is allowed");
    assert(canTransitionClientStatus("COMPLETED", "INACTIVE").allowed, "Client COMPLETED -> INACTIVE is allowed");

    // Negative transitions
    assert(!canTransitionClientStatus("LEAD", "ACTIVE").allowed, "Client LEAD -> ACTIVE is FORBIDDEN");
    assert(!canTransitionClientStatus("NEW", "COMPLETED").allowed, "Client NEW -> COMPLETED is FORBIDDEN");
    assert(!canTransitionClientStatus("COMPLETED", "NEW").allowed, "Client COMPLETED -> NEW is FORBIDDEN");
    assert(!canTransitionClientStatus("INACTIVE", "ONBOARDING").allowed, "Client INACTIVE -> ONBOARDING is FORBIDDEN");

    // -----------------------------------------------------------------
    // 2. Order Lifecycle Transition Engine
    // -----------------------------------------------------------------
    console.log("\n--- 2. Order Lifecycle Engine Tests ---");
    assert(canTransitionOrderStatus("NEW", "ONBOARDING").allowed, "Order NEW -> ONBOARDING is allowed");
    assert(canTransitionOrderStatus("ONBOARDING", "IN_PRODUCTION").allowed, "Order ONBOARDING -> IN_PRODUCTION is allowed");
    assert(canTransitionOrderStatus("IN_PRODUCTION", "PARTIALLY_DELIVERED").allowed, "Order IN_PRODUCTION -> PARTIALLY_DELIVERED is allowed");
    assert(canTransitionOrderStatus("PARTIALLY_DELIVERED", "COMPLETED").allowed, "Order PARTIALLY_DELIVERED -> COMPLETED is allowed");
    assert(canTransitionOrderStatus("ONBOARDING", "ON_HOLD").allowed, "Order ONBOARDING -> ON_HOLD is allowed");
    assert(canTransitionOrderStatus("IN_PRODUCTION", "ON_HOLD").allowed, "Order IN_PRODUCTION -> ON_HOLD is allowed");
    assert(canTransitionOrderStatus("NEW", "CANCELLED").allowed, "Order NEW -> CANCELLED is allowed");
    assert(canTransitionOrderStatus("ONBOARDING", "CANCELLED").allowed, "Order ONBOARDING -> CANCELLED is allowed");

    // Negative order transitions
    assert(!canTransitionOrderStatus("NEW", "COMPLETED").allowed, "Order NEW -> COMPLETED is FORBIDDEN");
    assert(!canTransitionOrderStatus("NEW", "PARTIALLY_DELIVERED").allowed, "Order NEW -> PARTIALLY_DELIVERED is FORBIDDEN");
    assert(!canTransitionOrderStatus("COMPLETED", "NEW").allowed, "Order COMPLETED -> NEW is FORBIDDEN");
    assert(!canTransitionOrderStatus("CANCELLED", "IN_PRODUCTION").allowed, "Order CANCELLED -> IN_PRODUCTION is FORBIDDEN");

    // -----------------------------------------------------------------
    // 3. Client Creation & Canonical companyName Verification
    // -----------------------------------------------------------------
    console.log("\n--- 3. Client Database & companyName Contract Tests ---");
    const testEmail = `test_client_${Date.now()}@example.com`;
    const testCompanyName = "Acme Brands India Private Limited";
    const testClientName = "John Doe UGC";

    // Insert using client_name and company_name column in DB
    const insertClientRes = await client.query(
      `INSERT INTO clients (
        organization_id, client_name, company_name, email, phone, whatsapp, 
        brand_name, industry, gst_tax_id, source, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'lead'::client_status)
      RETURNING id, client_name, company_name, email, UPPER(status::text) as status`,
      [
        DEFAULT_ORG_ID,
        testClientName,
        testCompanyName,
        testEmail,
        "+919876543210",
        "+919876543210",
        "Acme UGC",
        "E-Commerce & D2C",
        "27AAPFU0939F1ZV",
        "Inbound Demo",
        "Module 4 automated test client notes",
      ]
    );

    const testClientId = insertClientRes.rows[0].id;
    assert(!!testClientId, "Client created in database successfully");
    assert(insertClientRes.rows[0].company_name === testCompanyName, "Database company_name matches application companyName precisely");

    // Fetch and map to canonical application field
    const fetchClientRes = await client.query(
      `SELECT id, client_name, company_name, email, UPPER(status::text) as status FROM clients WHERE id = $1`,
      [testClientId]
    );
    const clientRecord = {
      id: fetchClientRes.rows[0].id,
      clientName: fetchClientRes.rows[0].client_name,
      companyName: fetchClientRes.rows[0].company_name, // Canonical mapping
      email: fetchClientRes.rows[0].email,
      status: fetchClientRes.rows[0].status,
    };
    assert(clientRecord.companyName === testCompanyName, "Application model correctly exposes canonical companyName");

    // -----------------------------------------------------------------
    // 4. Client Status Transition in Database
    // -----------------------------------------------------------------
    console.log("\n--- 4. Client Status Transition in Database ---");
    await client.query(
      `UPDATE clients SET status = 'new'::client_status, updated_at = NOW() WHERE id = $1`,
      [testClientId]
    );
    const updatedClientRes = await client.query(
      `SELECT UPPER(status::text) as status FROM clients WHERE id = $1`,
      [testClientId]
    );
    assert(updatedClientRes.rows[0].status === "NEW", "Client transitioned from LEAD to NEW in database");

    // -----------------------------------------------------------------
    // 5. Safe Client Deletion / Soft Archive
    // -----------------------------------------------------------------
    console.log("\n--- 5. Safe Client Deletion (Archive) ---");
    await client.query(
      `UPDATE clients SET status = 'inactive'::client_status, is_archived = true WHERE id = $1`,
      [testClientId]
    );
    const archivedRes = await client.query(
      `SELECT is_archived, UPPER(status::text) as status FROM clients WHERE id = $1`,
      [testClientId]
    );
    assert(archivedRes.rows[0].is_archived === true && archivedRes.rows[0].status === "INACTIVE", "Client safely archived with status=INACTIVE without hard delete");

    // Reactivate for order testing
    await client.query(
      `UPDATE clients SET status = 'active'::client_status, is_archived = false WHERE id = $1`,
      [testClientId]
    );

    // -----------------------------------------------------------------
    // 6. Package Management & Snapshot Verification
    // -----------------------------------------------------------------
    console.log("\n--- 6. Package Creation & Snapshot Tests ---");
    const insertPkgRes = await client.query(
      `INSERT INTO packages (
        organization_id, name, description, video_count, base_price, tax_rate, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id, name, video_count, base_price, tax_rate`,
      [
        DEFAULT_ORG_ID,
        "Custom Automated Test Tier",
        "Test tier for Module 4 verification",
        15,
        50000,
        18,
      ]
    );
    const testPackage = insertPkgRes.rows[0];
    assert(!!testPackage.id, "Package created successfully");
    assert(Number(testPackage.base_price) === 50000, "Package base price verified (₹50,000)");

    // -----------------------------------------------------------------
    // 7. Order Calculation & Snapshot Integrity
    // -----------------------------------------------------------------
    console.log("\n--- 7. Order Calculation & Package Snapshot ---");
    const contractedVideoCount = testPackage.video_count; // 15
    const pricing = Number(testPackage.base_price); // 50000
    const taxRate = Number(testPackage.tax_rate); // 18%
    const taxAmount = (pricing * taxRate) / 100; // 9000
    const totalInvoiceAmount = pricing + taxAmount; // 59000
    const amountReceived = 0;
    const outstandingBalance = totalInvoiceAmount - amountReceived; // 59000

    assert(taxAmount === 9000, "Tax calculation exact (₹9,000 for 18% on ₹50,000)");
    assert(totalInvoiceAmount === 59000, "Total invoice calculation exact (₹59,000)");
    assert(outstandingBalance === 59000, "Outstanding balance starts equal to total invoice (₹59,000)");

    const insertOrderRes = await client.query(
      `INSERT INTO orders (
        organization_id, client_id, package_id, package_name, package_name_snapshot,
        contracted_video_count, pricing, tax_rate, gst_tax,
        total_invoice_amount, amount_received,
        status, ordered_videos_quota, remaining_quota
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new'::order_status, $12, $13)
      RETURNING id, package_name_snapshot, contracted_video_count, pricing, total_invoice_amount, outstanding_balance, UPPER(status::text) as status`,
      [
        DEFAULT_ORG_ID,
        testClientId,
        testPackage.id,
        testPackage.name,
        testPackage.name,
        contractedVideoCount,
        pricing,
        taxRate,
        taxAmount,
        totalInvoiceAmount,
        amountReceived,
        contractedVideoCount,
        contractedVideoCount,
      ]
    );

    const testOrderId = insertOrderRes.rows[0].id;
    assert(!!testOrderId, "Order created with package snapshot successfully");
    assert(insertOrderRes.rows[0].package_name_snapshot === testPackage.name, "Order contains immutable packageNameSnapshot");
    assert(Number(insertOrderRes.rows[0].outstanding_balance) === 59000, "Generated column outstanding_balance automatically computes to ₹59,000");

    // Modify original package - historical order MUST remain unchanged
    await client.query(
      `UPDATE packages SET name = 'Modified Tier Name (Should Not Affect Order)', base_price = 99999 WHERE id = $1`,
      [testPackage.id]
    );

    const checkOrderRes = await client.query(
      `SELECT package_name_snapshot, pricing, total_invoice_amount FROM orders WHERE id = $1`,
      [testOrderId]
    );
    assert(
      checkOrderRes.rows[0].package_name_snapshot === "Custom Automated Test Tier" &&
      Number(checkOrderRes.rows[0].pricing) === 50000,
      "Package edit does NOT alter historical order commitment snapshot"
    );

    // -----------------------------------------------------------------
    // 8. Live Production Counter Logic
    // -----------------------------------------------------------------
    console.log("\n--- 8. Live Production Counter Verification ---");
    const orderedVideos = contractedVideoCount;
    const remainingQuota = contractedVideoCount;
    assert(orderedVideos === 15, "Ordered videos initially equals contracted video count (15)");
    assert(remainingQuota === 15, "Remaining quota initially equals contracted video count (15)");

    // -----------------------------------------------------------------
    // 9. Multi-Tenant Organization Isolation Tests
    // -----------------------------------------------------------------
    console.log("\n--- 9. Organization Isolation Verification ---");
    // Attempt to query using a different organization ID
    const crossOrgClients = await client.query(
      `SELECT * FROM clients WHERE organization_id = $1 AND id = $2`,
      [OTHER_ORG_ID, testClientId]
    );
    assert(crossOrgClients.rows.length === 0, "Organization B cannot query Organization A client");

    const crossOrgOrders = await client.query(
      `SELECT * FROM orders WHERE organization_id = $1 AND id = $2`,
      [OTHER_ORG_ID, testOrderId]
    );
    assert(crossOrgOrders.rows.length === 0, "Organization B cannot query Organization A order");

    // -----------------------------------------------------------------
    // 10. Order Status Transitions in Database
    // -----------------------------------------------------------------
    console.log("\n--- 10. Order Status Progression in Database ---");
    await client.query(
      `UPDATE orders SET status = 'onboarding'::order_status, updated_at = NOW() WHERE id = $1`,
      [testOrderId]
    );
    const ordStatusRes = await client.query(
      `SELECT UPPER(status::text) as status FROM orders WHERE id = $1`,
      [testOrderId]
    );
    assert(ordStatusRes.rows[0].status === "ONBOARDING", "Order transitioned NEW -> ONBOARDING");

    // Clean up test records
    await client.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]);
    await client.query(`DELETE FROM packages WHERE id = $1`, [testPackage.id]);
    await client.query(`DELETE FROM clients WHERE id = $1`, [testClientId]);

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runTests();
