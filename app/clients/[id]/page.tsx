import { redirect, notFound } from "next/navigation";
import { getCurrentUserWithRole, requirePermission, validateClientAccess } from "@/lib/rbac/authz";
import { pool } from "@/lib/db";
import { ClientProfileClient } from "./client-profile-client";


export default async function ClientProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

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

  // Fetch client details
  const clientRes = await pool.query(
    `SELECT 
      c.id,
      c.client_name as "clientName",
      c.company_name as "companyName",
      c.email,
      c.phone,
      c.whatsapp,
      c.brand_name as "brandName",
      c.industry,
      c.gst_tax_id as "gstTaxId",
      c.assigned_employee_id as "assignedEmployeeId",
      c.source,
      c.notes,
      c.is_archived as "isArchived",
      UPPER(c.status::text) as "status",
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      COALESCE(e.full_name, 'Unassigned') as "assignedEmployeeName"
    FROM clients c
    LEFT JOIN employees emp ON emp.id = c.assigned_employee_id
    LEFT JOIN users e ON e.id = emp.user_id
    WHERE c.id = $1 AND c.organization_id = $2;`,
    [id, orgId]
  );

  if (clientRes.rows.length === 0) {
    notFound();
  }

  const client = clientRes.rows[0];

  // Fetch orders for this client
  const ordersRes = await pool.query(
    `SELECT 
      o.id,
      COALESCE(o.package_name_snapshot, o.package_name) as "packageName",
      o.contracted_video_count as "contractedVideoCount",
      o.pricing,
      o.gst_tax as "gstTax",
      o.total_invoice_amount as "totalInvoiceAmount",
      o.amount_received as "amountReceived",
      o.outstanding_balance as "outstandingBalance",
      o.start_date as "startDate",
      o.due_date as "dueDate",
      UPPER(o.status::text) as "status",
      o.ordered_videos_quota as "orderedVideosQuota",
      o.remaining_quota as "remainingQuota",
      o.created_at as "createdAt"
    FROM orders o
    WHERE o.client_id = $1 AND o.organization_id = $2
    ORDER BY o.created_at DESC;`,
    [id, orgId]
  );

  // Fetch active packages for quick order creation
  const pkgRes = await pool.query(
    `SELECT 
       id, 
       name, 
       video_count as "videoCount", 
       base_price::float as "basePrice", 
       tax_rate::float as "taxRate" 
     FROM packages 
     WHERE organization_id = $1 AND is_active = true 
     ORDER BY base_price ASC;`,
    [orgId]
  );

  // Fetch recent activity
  const activityRes = await pool.query(
    `SELECT 
      a.id,
      a.action,
      a.entity_name as "entityName",
      a.entity_id as "entityId",
      a.metadata,
      a.created_at as "createdAt"
    FROM activity_logs a
    WHERE a.entity_id = $1 OR (a.metadata->>'clientId' = $1::text)
    ORDER BY a.created_at DESC
    LIMIT 15;`,
    [id]
  );

  return (
    <ClientProfileClient
      user={user}
      client={client}
      orders={ordersRes.rows}
      packages={pkgRes.rows}
      activities={activityRes.rows}
    />
  );
}
