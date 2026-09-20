import { z } from "zod";
import { CLIENT_STATUSES } from "@/lib/clients/status";
import { ORDER_STATUSES } from "@/lib/orders/status";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Helper: validates standard PostgreSQL UUID strings (including mock/seed UUIDs).
 */
export const uuidSchema = (fieldName = "ID") =>
  z.string().regex(UUID_PATTERN, `Invalid ${fieldName}.`);

/**
 * Helper: treats null, undefined, and empty/whitespace string as null,
 * then validates as a UUID or null.
 */
const nullableUuid = (fieldName = "ID") =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "string" && val.trim() === "") return null;
    return val;
  }, uuidSchema(fieldName).nullable().optional());

/**
 * Helper: treats whitespace string as null or trims.
 */
const nullableString = () =>
  z.preprocess((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "string" && val.trim() === "") return null;
    return typeof val === "string" ? val.trim() : val;
  }, z.string().nullable().optional());

// ==========================================
// CLIENT SCHEMAS
// ==========================================

export const createClientSchema = z.object({
  clientName: z.string().trim().min(2, "Client name must be at least 2 characters."),
  companyName: z.string().trim().min(1, "Company name is required."),
  email: z.string().trim().email("Please provide a valid email address."),
  phone: nullableString(),
  whatsapp: nullableString(),
  brandName: nullableString(),
  industry: nullableString(),
  gstTaxId: nullableString(),
  assignedEmployeeId: nullableUuid("Employee ID"),
  source: nullableString(),
  notes: nullableString(),
  status: z.enum(CLIENT_STATUSES as [string, ...string[]]).optional().default("LEAD"),
});

export const updateClientSchema = z.object({
  clientName: z.string().trim().min(2, "Client name must be at least 2 characters.").optional(),
  companyName: z.string().trim().min(1, "Company name cannot be empty.").optional(),
  email: z.string().trim().email("Please provide a valid email address.").optional(),
  phone: nullableString(),
  whatsapp: nullableString(),
  brandName: nullableString(),
  industry: nullableString(),
  gstTaxId: nullableString(),
  assignedEmployeeId: nullableUuid("Employee ID"),
  source: nullableString(),
  notes: nullableString(),
});

export const clientStatusSchema = z.object({
  status: z.enum(CLIENT_STATUSES as [string, ...string[]]),
  notes: nullableString(),
});

// ==========================================
// PACKAGE SCHEMAS
// ==========================================

export const createPackageSchema = z.object({
  name: z.string().trim().min(2, "Package name must be at least 2 characters."),
  description: nullableString(),
  videoCount: z.coerce.number().int().min(1, "Video count must be at least 1."),
  basePrice: z.coerce.number().min(0, "Base price cannot be negative."),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  isActive: z.boolean().default(true),
});

export const updatePackageSchema = z.object({
  name: z.string().trim().min(2, "Package name must be at least 2 characters.").optional(),
  description: nullableString(),
  videoCount: z.coerce.number().int().min(1).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// ORDER SCHEMAS
// ==========================================

export const createOrderSchema = z.object({
  clientId: uuidSchema("Client ID"),
  packageId: nullableUuid("Package ID"),
  contractedVideoCount: z.coerce.number().int().min(1, "Contracted videos must be at least 1."),
  pricing: z.coerce.number().min(0, "Pricing cannot be negative."),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  startDate: z.string().min(1, "Start date is required."),
  dueDate: nullableString(),
  assignedTeamId: nullableUuid("Team ID"),
  notes: nullableString(),
});

export const updateOrderSchema = z.object({
  contractedVideoCount: z.coerce.number().int().min(1).optional(),
  pricing: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  dueDate: nullableString(),
  assignedTeamId: nullableUuid("Team ID"),
  notes: nullableString(),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  notes: nullableString(),
});

// ==========================================
// CLIENT SELF-SERVICE SCHEMAS
// ==========================================

export const clientOrderApplySchema = z.object({
  packageId: uuidSchema("Package ID"),
  startDate: z.string().optional(),
  dueDate: nullableString(),
  notes: nullableString(),
});

export const videoRequestSchema = z.object({
  orderId: uuidSchema("Order ID"),
  title: z.string().trim().min(3, "Title or angle concept must be at least 3 characters."),
  hookAngle: z.string().trim().min(3, "Hook or opening angle description is required."),
  coreMessage: nullableString(),
  targetAudience: nullableString(),
  referenceLinks: z.array(z.string().trim()).optional().default([]),
  notes: nullableString(),
});


