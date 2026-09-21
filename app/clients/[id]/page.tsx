import { notFound, redirect } from "next/navigation";
import { getCurrentUserWithRole, requirePermission, validateClientAccess } from "@/lib/rbac/authz";
import { db } from "@/lib/drizzle";
import { clients, orders, packages, activityLogs, employees, users } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { ClientProfileClient } from "./client-profile-client";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;

  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect(`/login?callbackUrl=/clients/${id}`);
  }

  try {
    await requirePermission("client:view");
  } catch {
    redirect("/dashboard");
  }

  // Client isolation check
  const hasAccess = await validateClientAccess(user, id);
  if (!hasAccess) {
    redirect("/dashboard");
  }

  const orgId = "00000000-0000-0000-0000-000000000001";

  // Fetch client details programmatically
  const clientRecord = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.organizationId, orgId)),
  });

  if (!clientRecord) {
    notFound();
  }

  let assignedEmployeeName = "Unassigned";
  if (clientRecord.assignedEmployeeId) {
    const emp = await db
      .select({ fullName: users.fullName })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(eq(employees.id, clientRecord.assignedEmployeeId))
      .limit(1);

    if (emp.length > 0) {
      assignedEmployeeName = emp[0].fullName;
    }
  }

  const client = {
    id: clientRecord.id,
    clientName: clientRecord.clientName,
    companyName: clientRecord.companyName,
    email: clientRecord.email,
    phone: clientRecord.phone,
    whatsapp: clientRecord.whatsapp,
    brandName: clientRecord.brandName,
    industry: clientRecord.industry,
    gstTaxId: clientRecord.gstTaxId,
    assignedEmployeeId: clientRecord.assignedEmployeeId,
    source: clientRecord.source,
    notes: clientRecord.notes,
    isArchived: clientRecord.isArchived,
    status: String(clientRecord.status).toUpperCase(),
    createdAt: clientRecord.createdAt ? clientRecord.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: clientRecord.updatedAt ? clientRecord.updatedAt.toISOString() : new Date().toISOString(),
    assignedEmployeeName,
  };

  // Fetch orders for this client
  const clientOrdersList = await db.query.orders.findMany({
    where: and(eq(orders.clientId, id), eq(orders.organizationId, orgId)),
    orderBy: [desc(orders.createdAt)],
  });

  const formattedOrders = clientOrdersList.map((o) => ({
    id: o.id,
    packageName: o.packageNameSnapshot || o.packageName,
    contractedVideoCount: o.contractedVideoCount,
    pricing: o.pricing,
    gstTax: o.gstTax,
    totalInvoiceAmount: o.totalInvoiceAmount,
    amountReceived: o.amountReceived,
    outstandingBalance: o.outstandingBalance,
    startDate: o.startDate,
    dueDate: o.dueDate,
    status: String(o.status).toUpperCase(),
    orderedVideosQuota: o.orderedVideosQuota,
    remainingQuota: o.remainingQuota,
    createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
  }));

  // Fetch active packages for quick order creation
  const activePackagesList = await db
    .select({
      id: packages.id,
      name: packages.name,
      videoCount: packages.videoCount,
      basePrice: packages.basePrice,
      taxRate: packages.taxRate,
    })
    .from(packages)
    .where(and(eq(packages.organizationId, orgId), eq(packages.isActive, true)))
    .orderBy(asc(packages.basePrice));

  const formattedPackages = activePackagesList.map((p) => ({
    id: p.id,
    name: p.name,
    videoCount: p.videoCount,
    basePrice: Number(p.basePrice),
    taxRate: Number(p.taxRate),
  }));

  // Fetch recent activity
  const recentActivities = await db.query.activityLogs.findMany({
    where: eq(activityLogs.entityId, id),
    orderBy: [desc(activityLogs.createdAt)],
    limit: 15,
  });

  const formattedActivity = recentActivities.map((a) => ({
    id: a.id,
    action: a.action,
    entityName: a.entityName,
    entityId: a.entityId,
    metadata: a.metadata,
    createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
  }));

  return (
    <ClientProfileClient
      user={user}
      client={client}
      orders={formattedOrders}
      packages={formattedPackages}
      activities={formattedActivity}
    />
  );
}
