import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  numeric,
  integer,
  date,
  jsonb,
  pgEnum,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "employee", "client"]);
export const employeeSubRoleEnum = pgEnum("employee_sub_role", [
  "sales",
  "script_writer",
  "shoot_manager",
  "editor",
]);
export const clientStatusEnum = pgEnum("client_status", [
  "lead",
  "new",
  "onboarding",
  "active",
  "on_hold",
  "completed",
  "inactive",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "onboarding",
  "in_production",
  "partially_delivered",
  "completed",
  "on_hold",
  "cancelled",
]);
export const scriptStatusEnum = pgEnum("script_status", [
  "draft",
  "assigned",
  "in_review",
  "approved",
  "sent_to_client",
  "revision_required",
  "ready_for_shoot",
]);
export const creatorAvailabilityStatusEnum = pgEnum("creator_availability_status", [
  "available",
  "booked",
  "unavailable",
  "on_hold",
]);
export const shootStatusEnum = pgEnum("shoot_status", [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "reshoot_required",
]);
export const videoPipelineStatusEnum = pgEnum("video_pipeline_status", [
  "script_approved",
  "shoot_pending",
  "raw_footage_received",
  "video_editing",
  "internal_qa",
  "client_review",
  "revision",
  "final_approved",
  "delivered",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "approved", "paid"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "salaries",
  "office",
  "studio",
  "equipment",
  "fuel",
  "payouts",
  "other",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["urgent", "high", "medium", "low"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved"]);

// ============================================================================
// 1. BETTER AUTH USERS & SESSIONS
// ============================================================================
export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("CLIENT"),
  clientId: uuid("client_id"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 2. AGENCY USERS & EMPLOYEES
// ============================================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  subRole: employeeSubRoleEnum("sub_role").notNull(),
  salary: numeric("salary", { precision: 12, scale: 2 }).notNull().default("0.00"),
  joiningDate: date("joining_date").notNull().defaultNow(),
  permissions: jsonb("permissions").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 3. CLIENTS
// ============================================================================
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .default("00000000-0000-0000-0000-000000000001"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 150 }).notNull(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  brandName: varchar("brand_name", { length: 150 }),
  industry: varchar("industry", { length: 100 }),
  gstTaxId: varchar("gst_tax_id", { length: 50 }),
  assignedEmployeeId: uuid("assigned_employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  source: varchar("source", { length: 100 }),
  brandKitAssets: jsonb("brand_kit_assets").default({}),
  notes: text("notes"),
  isArchived: boolean("is_archived").notNull().default(false),
  status: clientStatusEnum("status").notNull().default("lead"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 4. PACKAGES & ORDERS
// ============================================================================
export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .default("00000000-0000-0000-0000-000000000001"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  videoCount: integer("video_count").notNull().default(1),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("18.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .default("00000000-0000-0000-0000-000000000001"),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  packageName: varchar("package_name", { length: 150 }).notNull(),
  packageNameSnapshot: varchar("package_name_snapshot", { length: 255 }),
  contractedVideoCount: integer("contracted_video_count").notNull(),
  pricing: numeric("pricing", { precision: 12, scale: 2 }).notNull().default("0.00"),
  gstTax: numeric("gst_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).default("18.00"),
  totalInvoiceAmount: numeric("total_invoice_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  amountReceived: numeric("amount_received", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }),
  assignedTeamId: uuid("assigned_team_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  startDate: date("start_date").notNull().defaultNow(),
  dueDate: date("due_date"),
  status: orderStatusEnum("status").notNull().default("new"),
  notes: text("notes"),

  // Live Production Counters
  orderedVideosQuota: integer("ordered_videos_quota").notNull().default(0),
  assignedVideos: integer("assigned_videos").notNull().default(0),
  completedVideos: integer("completed_videos").notNull().default(0),
  deliveredVideos: integer("delivered_videos").notNull().default(0),
  remainingQuota: integer("remaining_quota").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 5. CREATORS & CREATOR AVAILABILITY
// ============================================================================
export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  photoUrl: text("photo_url"),
  gender: varchar("gender", { length: 30 }),
  ageGroup: varchar("age_group", { length: 30 }),
  languages: text("languages").array().default([]),
  location: varchar("location", { length: 150 }),
  niches: text("niches").array().default([]),
  demographics: jsonb("demographics").default({}),
  contactPhone: varchar("contact_phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  standardRate: numeric("standard_rate", { precision: 10, scale: 2 }).notNull().default("0.00"),
  bankUpiInfo: jsonb("bank_upi_info").default({}),
  portfolioLinks: text("portfolio_links").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorAvailability = pgTable("creator_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: creatorAvailabilityStatusEnum("status").notNull().default("available"),
  notes: text("notes"),
});

// ============================================================================
// 6. SCRIPTS
// ============================================================================
export const scripts = pgTable("scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  videoNumber: integer("video_number").notNull(),
  writerId: uuid("writer_id").references(() => employees.id, { onDelete: "set null" }),
  creatorId: uuid("creator_id").references(() => creators.id, { onDelete: "set null" }),
  language: varchar("language", { length: 50 }).notNull().default("English"),
  scriptText: text("script_text").notNull(),
  referenceLinks: text("reference_links").array().default([]),
  deadline: timestamp("deadline", { withTimezone: true }),
  revisionCount: integer("revision_count").notNull().default(0),
  status: scriptStatusEnum("status").notNull().default("draft"),
  clientComments: text("client_comments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 7. SHOOTS
// ============================================================================
export const shoots = pgTable("shoots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "restrict" }),
  cameramanId: uuid("cameraman_id").references(() => employees.id, { onDelete: "set null" }),
  shootManagerId: uuid("shoot_manager_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  shootingAssistantId: uuid("shooting_assistant_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  approvedScriptIds: uuid("approved_script_ids").array().default([]),
  specialNotes: text("special_notes"),
  status: shootStatusEnum("status").notNull().default("scheduled"),

  // Pre-Shoot Checklist
  preScriptApproved: boolean("pre_script_approved").notNull().default(false),
  preCreatorConfirmed: boolean("pre_creator_confirmed").notNull().default(false),
  preLocationPermissions: boolean("pre_location_permissions").notNull().default(false),
  preClientProductReceived: boolean("pre_client_product_received").notNull().default(false),
  preTeamBriefed: boolean("pre_team_briefed").notNull().default(false),

  // Post-Shoot Verification
  postFootageUploaded: boolean("post_footage_uploaded").notNull().default(false),
  postRawFileIntegrity: boolean("post_raw_file_integrity").notNull().default(false),
  postReshootFlagged: boolean("post_reshoot_flagged").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 8. VIDEOS & FEEDBACK
// ============================================================================
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  scriptId: uuid("script_id").references(() => scripts.id, { onDelete: "set null" }),
  creatorId: uuid("creator_id").references(() => creators.id, { onDelete: "set null" }),
  shootId: uuid("shoot_id").references(() => shoots.id, { onDelete: "set null" }),
  assignedEditorId: uuid("assigned_editor_id").references(() => employees.id, {
    onDelete: "set null",
  }),

  pipelineStatus: videoPipelineStatusEnum("pipeline_status").notNull().default("script_approved"),
  deadline: timestamp("deadline", { withTimezone: true }),
  videoDriveUrl: text("video_drive_url"),
  thumbnailUrl: text("thumbnail_url"),
  revisionCount: integer("revision_count").notNull().default(0),
  finalDeliveryLink: text("final_delivery_link"),
  approvedByClientAt: timestamp("approved_by_client_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoFeedback = pgTable("video_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  timestampSeconds: integer("timestamp_seconds"),
  feedbackText: text("feedback_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 9. FINANCIAL LEDGER
// ============================================================================
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  invoiceAmount: numeric("invoice_amount", { precision: 12, scale: 2 }).notNull(),
  amountReceived: numeric("amount_received", { precision: 12, scale: 2 }).notNull().default("0.00"),
  pendingBalance: numeric("pending_balance", { precision: 12, scale: 2 }),
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionRef: varchar("transaction_ref", { length: 100 }),
  status: paymentStatusEnum("status").notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: expenseCategoryEnum("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  loggedByUserId: uuid("logged_by_user_id").references(() => users.id, { onDelete: "set null" }),
  expenseDate: date("expense_date").notNull().defaultNow(),
  receiptFileUrl: text("receipt_file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorPayouts = pgTable("creator_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "restrict" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  shootId: uuid("shoot_id").references(() => shoots.id, { onDelete: "set null" }),
  videoId: uuid("video_id").references(() => videos.id, { onDelete: "set null" }),
  videoCount: integer("video_count").notNull().default(1),
  contractedRate: numeric("contracted_rate", { precision: 10, scale: 2 }).notNull(),
  totalPayout: numeric("total_payout", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  transactionReference: varchar("transaction_reference", { length: 100 }),
  status: payoutStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// 10. OPERATIONS, TASKS & LOGS
// ============================================================================
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  assignedToId: uuid("assigned_to_id").references(() => employees.id, { onDelete: "set null" }),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("todo"),
  deadline: timestamp("deadline", { withTimezone: true }),
  attachmentUrls: text("attachment_urls").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  assignedEmployeeId: uuid("assigned_employee_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }).notNull(),
  message: text("message").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .default("00000000-0000-0000-0000-000000000001"),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityName: varchar("entity_name", { length: 50 }),
  entityId: uuid("entity_id").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// DRIZZLE RELATIONS
// ============================================================================
export const clientsRelations = relations(clients, ({ many, one }) => ({
  orders: many(orders),
  scripts: many(scripts),
  shoots: many(shoots),
  videos: many(videos),
  assets: many(assets),
  assignedEmployee: one(employees, {
    fields: [clients.assignedEmployeeId],
    references: [employees.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  package: one(packages, {
    fields: [orders.packageId],
    references: [packages.id],
  }),
  scripts: many(scripts),
  shoots: many(shoots),
  videos: many(videos),
  payments: many(payments),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  orders: many(orders),
}));

export const creatorsRelations = relations(creators, ({ many }) => ({
  availability: many(creatorAvailability),
  scripts: many(scripts),
  shoots: many(shoots),
  videos: many(videos),
  payouts: many(creatorPayouts),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  order: one(orders, {
    fields: [videos.orderId],
    references: [orders.id],
  }),
  client: one(clients, {
    fields: [videos.clientId],
    references: [clients.id],
  }),
  creator: one(creators, {
    fields: [videos.creatorId],
    references: [creators.id],
  }),
  shoot: one(shoots, {
    fields: [videos.shootId],
    references: [shoots.id],
  }),
  feedback: many(videoFeedback),
}));
