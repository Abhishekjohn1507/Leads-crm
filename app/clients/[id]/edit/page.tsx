import { redirect, notFound } from "next/navigation";
import { getCurrentUserWithRole, requirePermission } from "@/lib/rbac/authz";
import { pool } from "@/lib/db";
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

  const clientRes = await pool.query(
    `SELECT 
      id,
      client_name as "clientName",
      company_name as "companyName",
      email,
      phone,
      whatsapp,
      brand_name as "brandName",
      industry,
      gst_tax_id as "gstTaxId",
      assigned_employee_id as "assignedEmployeeId",
      source,
      notes,
      UPPER(status::text) as "status"
    FROM clients
    WHERE id = $1 AND organization_id = $2;`,
    [id, orgId]
  );

  if (clientRes.rows.length === 0) {
    notFound();
  }

  const empRes = await pool.query(
    `SELECT e.id, u.full_name, u.email 
     FROM employees e 
     JOIN users u ON u.id = e.user_id 
     ORDER BY u.full_name ASC;`
  );

  return (
    <EditClientForm
      user={user}
      client={clientRes.rows[0]}
      employees={empRes.rows}
    />
  );
}
