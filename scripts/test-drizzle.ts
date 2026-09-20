import { db } from "../lib/drizzle";
import { clients, orders, packages, creators, scripts, shoots, videos } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function verifyDrizzle() {
  console.log("Testing programmatic data fetching via Drizzle ORM...");

  // 1. Fetch clients with relation-style or standard select
  const allClients = await db
    .select({
      id: clients.id,
      clientName: clients.clientName,
      companyName: clients.companyName,
      status: clients.status,
    })
    .from(clients)
    .orderBy(desc(clients.createdAt))
    .limit(5);

  console.log(`✅ [Drizzle] Fetched ${allClients.length} clients programmatically:`);
  console.table(allClients);

  // 2. Fetch packages
  const allPackages = await db
    .select()
    .from(packages)
    .where(eq(packages.isActive, true));

  console.log(`✅ [Drizzle] Fetched ${allPackages.length} active packages:`);
  console.table(allPackages.map(p => ({ id: p.id, name: p.name, videos: p.videoCount, price: p.basePrice })));

  // 3. Relational query: fetch orders with joined client
  const allOrders = await db.query.orders.findMany({
    with: {
      client: true,
      package: true,
    },
    limit: 5,
  });

  console.log(`✅ [Drizzle Relational] Fetched ${allOrders.length} orders with client relations:`);
  allOrders.forEach(o => {
    console.log(` - Order #${o.id.slice(0, 8)} | Client: ${o.client?.clientName} (${o.client?.companyName}) | Package: ${o.packageName} | Quota: ${o.remainingQuota}/${o.orderedVideosQuota}`);
  });

  // 4. Fetch creators
  const allCreators = await db.select().from(creators).limit(4);
  console.log(`✅ [Drizzle] Fetched ${allCreators.length} creators:`);
  allCreators.forEach(c => {
    console.log(` - Creator: ${c.name} | Rate: ₹${c.standardRate} | Niches: ${c.niches?.join(", ")}`);
  });

  console.log("\nAll Drizzle ORM programmatic queries executed successfully against Neon!");
  process.exit(0);
}

verifyDrizzle().catch((err) => {
  console.error("Drizzle verification error:", err);
  process.exit(1);
});
