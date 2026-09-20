import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";
import { pool } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export const metadata = {
  title: "Agency Dashboard | Leadyfy OS",
  description: "Executive control panel for Leadyfy UGC agency operations, client pipelines, and order deliverables.",
};

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const userWithRole = await getCurrentUserWithRole();
  const user = userWithRole || { ...session.user, role: "CLIENT" as const, clientId: null };

  // Fetch operational agency metrics for the dashboard
  let stats = {
    totalClients: 0,
    activeClients: 0,
    totalOrders: 0,
    activeOrders: 0,
    totalCommittedRevenue: 0,
    outstandingRevenue: 0,
    contractedVideos: 0,
    remainingQuota: 0,
  };

  let recentClients: any[] = [];
  let recentOrders: any[] = [];

  try {
    if (user.role === "CLIENT") {
      // Client Portal Scoped Metrics (restricted to client's own orders/quota/balance)
      const clientOrderStatsRes = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status::text IN ('new', 'onboarding', 'in_production', 'partially_delivered')) as active,
          COALESCE(SUM(total_invoice_amount), 0) as total_revenue,
          COALESCE(SUM(outstanding_balance), 0) as outstanding_balance,
          COALESCE(SUM(contracted_video_count), 0) as total_videos,
          COALESCE(SUM(remaining_quota), 0) as remaining_quota
         FROM orders
         WHERE ($1::uuid IS NULL OR client_id = $1::uuid);`,
        [user.clientId || null]
      );

      stats = {
        totalClients: 1,
        activeClients: 1,
        totalOrders: parseInt(clientOrderStatsRes.rows[0]?.total || "0", 10),
        activeOrders: parseInt(clientOrderStatsRes.rows[0]?.active || "0", 10),
        totalCommittedRevenue: parseFloat(clientOrderStatsRes.rows[0]?.total_revenue || "0"),
        outstandingRevenue: parseFloat(clientOrderStatsRes.rows[0]?.outstanding_balance || "0"),
        contractedVideos: parseInt(clientOrderStatsRes.rows[0]?.total_videos || "0", 10),
        remainingQuota: parseInt(clientOrderStatsRes.rows[0]?.remaining_quota || "0", 10),
      };

      // Client does not view other agency clients
      recentClients = [];

      // Only client's own orders
      const clientOrdersRes = await pool.query(
        `SELECT o.id, o.client_id as "clientId", c.client_name as "clientName", c.company_name as "companyName",
                COALESCE(o.package_name_snapshot, o.package_name) as "packageName",
                o.contracted_video_count as "contractedVideoCount",
                o.total_invoice_amount as "totalInvoiceAmount",
                UPPER(o.status::text) as status,
                o.created_at as "createdAt"
         FROM orders o
         JOIN clients c ON c.id = o.client_id
         WHERE ($1::uuid IS NULL OR o.client_id = $1::uuid)
         ORDER BY o.created_at DESC
         LIMIT 5;`,
        [user.clientId || null]
      );
      recentOrders = clientOrdersRes.rows;
    } else {
      // Internal Agency Metrics (OWNER, ADMIN, SALES, etc.)
      const clientStatsRes = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status::text = 'active') as active
         FROM clients
         WHERE organization_id = $1 AND is_archived = false;`,
        [DEFAULT_ORG_ID]
      );

      const orderStatsRes = await pool.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status::text IN ('new', 'onboarding', 'in_production', 'partially_delivered')) as active,
          COALESCE(SUM(total_invoice_amount), 0) as total_revenue,
          COALESCE(SUM(outstanding_balance), 0) as outstanding_balance,
          COALESCE(SUM(contracted_video_count), 0) as total_videos,
          COALESCE(SUM(remaining_quota), 0) as remaining_quota
         FROM orders
         WHERE organization_id = $1;`,
        [DEFAULT_ORG_ID]
      );

      stats = {
        totalClients: parseInt(clientStatsRes.rows[0]?.total || "0", 10),
        activeClients: parseInt(clientStatsRes.rows[0]?.active || "0", 10),
        totalOrders: parseInt(orderStatsRes.rows[0]?.total || "0", 10),
        activeOrders: parseInt(orderStatsRes.rows[0]?.active || "0", 10),
        totalCommittedRevenue: parseFloat(orderStatsRes.rows[0]?.total_revenue || "0"),
        outstandingRevenue: parseFloat(orderStatsRes.rows[0]?.outstanding_balance || "0"),
        contractedVideos: parseInt(orderStatsRes.rows[0]?.total_videos || "0", 10),
        remainingQuota: parseInt(orderStatsRes.rows[0]?.remaining_quota || "0", 10),
      };

      // Recent Clients
      const recentClientsRes = await pool.query(
        `SELECT id, client_name as "clientName", company_name as "companyName", email, UPPER(status::text) as status, created_at as "createdAt"
         FROM clients
         WHERE organization_id = $1 AND is_archived = false
         ORDER BY created_at DESC
         LIMIT 5;`,
        [DEFAULT_ORG_ID]
      );
      recentClients = recentClientsRes.rows;

      // Recent Orders
      const recentOrdersRes = await pool.query(
        `SELECT o.id, o.client_id as "clientId", c.client_name as "clientName", c.company_name as "companyName",
                COALESCE(o.package_name_snapshot, o.package_name) as "packageName",
                o.contracted_video_count as "contractedVideoCount",
                o.total_invoice_amount as "totalInvoiceAmount",
                UPPER(o.status::text) as status,
                o.created_at as "createdAt"
         FROM orders o
         JOIN clients c ON c.id = o.client_id
         WHERE o.organization_id = $1
         ORDER BY o.created_at DESC
         LIMIT 5;`,
        [DEFAULT_ORG_ID]
      );
      recentOrders = recentOrdersRes.rows;
    }
  } catch (error) {
    console.error("Failed to load dashboard metrics:", error);
  }

  return (
    <DashboardClient
      user={user}
      session={session.session}
      stats={stats}
      recentClients={recentClients}
      recentOrders={recentOrders}
    />
  );
}
