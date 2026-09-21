import { redirect, notFound } from "next/navigation";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { db } from "@/lib/drizzle";
import { clients, employees, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { EditClientForm } from "./edit-client-form";

export default async function EditClientPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const user = await getCurrentUserWithRole();
  if (!user) {
    redirect(`/login?callbackUrl=/clients/${id}/edit`);
  }

  try {
    await requirePermission("client:update");
  } catch {
    redirect(`/clients/${id}`);
  }

  const orgId = "00000000-0000-0000-0000-000000000001";

  const clientRecord = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.organizationId, orgId)),
  });

  if (!clientRecord) {
    notFound();
  }

  const empList = await db
    .select({
      id: employees.id,
      full_name: users.fullName,
      email: users.email,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .orderBy(asc(users.fullName));

  const clientFormatted = {
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
    status: String(clientRecord.status).toUpperCase(),
  };

  return (
    <EditClientForm
      user={user}
      client={clientFormatted}
      employees={empList}
    />
  );
}
