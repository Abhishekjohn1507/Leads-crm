import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUserWithRole } from "@/lib/rbac/authz";
import { db } from "@/lib/drizzle";
import { clients, orders } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
      // Client Portal Scoped Metrics (strictly programmatic Drizzle query)
      if (user.clientId) {
        const clientOrdersList = await db.query.orders.findMany({
          where: eq(orders.clientId, user.clientId),
          with: {
            client: true,
          },
          orderBy: [desc(orders.createdAt)],
        });

        const activeStatusList = ["new", "onboarding", "in_production", "partially_delivered"];
        const activeOrders = clientOrdersList.filter((o) =>
          activeStatusList.includes(String(o.status).toLowerCase())
        );

        const totalRevenue = clientOrdersList.reduce((acc, o) => acc + Number(o.totalInvoiceAmount || 0), 0);
        const outstanding = clientOrdersList.reduce((acc, o) => acc + Number(o.outstandingBalance || 0), 0);
        const totalVideos = clientOrdersList.reduce((acc, o) => acc + Number(o.contractedVideoCount || 0), 0);
        const remaining = clientOrdersList.reduce((acc, o) => acc + Number(o.remainingQuota || 0), 0);

        stats = {
          totalClients: 1,
          activeClients: 1,
          totalOrders: clientOrdersList.length,
          activeOrders: activeOrders.length,
          totalCommittedRevenue: totalRevenue,
          outstandingRevenue: outstanding,
          contractedVideos: totalVideos,
          remainingQuota: remaining,
        };

        recentOrders = clientOrdersList.slice(0, 5).map((o) => ({
          id: o.id,
          clientId: o.clientId,
          clientName: o.client?.clientName || "Client",
          companyName: o.client?.companyName || null,
          packageName: o.packageNameSnapshot || o.packageName,
          contractedVideoCount: o.contractedVideoCount,
          totalInvoiceAmount: Number(o.totalInvoiceAmount),
          status: String(o.status).toUpperCase(),
          createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
        }));
      }

      recentClients = [];
    } else {
      // Internal Agency Metrics (programmatic Drizzle queries)
      const allAgencyClients = await db.query.clients.findMany({
        where: and(eq(clients.organizationId, DEFAULT_ORG_ID), eq(clients.isArchived, false)),
        orderBy: [desc(clients.createdAt)],
      });

      const allAgencyOrders = await db.query.orders.findMany({
        where: eq(orders.organizationId, DEFAULT_ORG_ID),
        with: {
          client: true,
        },
        orderBy: [desc(orders.createdAt)],
      });

      const activeStatusList = ["new", "onboarding", "in_production", "partially_delivered"];
      const activeClientsCount = allAgencyClients.filter((c) => String(c.status).toLowerCase() === "active").length;
      const activeOrdersCount = allAgencyOrders.filter((o) =>
        activeStatusList.includes(String(o.status).toLowerCase())
      ).length;

      const totalRevenue = allAgencyOrders.reduce((acc, o) => acc + Number(o.totalInvoiceAmount || 0), 0);
      const outstanding = allAgencyOrders.reduce((acc, o) => acc + Number(o.outstandingBalance || 0), 0);
      const totalVideos = allAgencyOrders.reduce((acc, o) => acc + Number(o.contractedVideoCount || 0), 0);
      const remaining = allAgencyOrders.reduce((acc, o) => acc + Number(o.remainingQuota || 0), 0);

      stats = {
        totalClients: allAgencyClients.length,
        activeClients: activeClientsCount,
        totalOrders: allAgencyOrders.length,
        activeOrders: activeOrdersCount,
        totalCommittedRevenue: totalRevenue,
        outstandingRevenue: outstanding,
        contractedVideos: totalVideos,
        remainingQuota: remaining,
      };

      recentClients = allAgencyClients.slice(0, 5).map((c) => ({
        id: c.id,
        clientName: c.clientName,
        companyName: c.companyName,
        email: c.email,
        status: String(c.status).toUpperCase(),
        createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      }));

      recentOrders = allAgencyOrders.slice(0, 5).map((o) => ({
        id: o.id,
        clientId: o.clientId,
        clientName: o.client?.clientName || "Client",
        companyName: o.client?.companyName || null,
        packageName: o.packageNameSnapshot || o.packageName,
        contractedVideoCount: o.contractedVideoCount,
        totalInvoiceAmount: Number(o.totalInvoiceAmount),
        status: String(o.status).toUpperCase(),
        createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      }));
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
