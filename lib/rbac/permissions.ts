export type Role =
  | "OWNER"
  | "ADMIN"
  | "SALES"
  | "SCRIPT_WRITER"
  | "SHOOT_MANAGER"
  | "EDITOR"
  | "CLIENT";

export const ROLES: Role[] = [
  "OWNER",
  "ADMIN",
  "SALES",
  "SCRIPT_WRITER",
  "SHOOT_MANAGER",
  "EDITOR",
  "CLIENT",
];

export type Permission =
  // Leads
  | "lead:view"
  | "lead:create"
  | "lead:update"
  | "lead:delete"
  | "lead:assign"
  | "lead:convert"
  // Clients
  | "client:view"
  | "client:create"
  | "client:update"
  | "client:delete"
  // Onboarding
  | "onboarding:view"
  | "onboarding:create"
  | "onboarding:update"
  // Orders
  | "order:view"
  | "order:create"
  | "order:apply"
  | "order:update"
  | "order:delete"
  | "video-request:create"
  | "video-request:view"
  // Packages
  | "package:view"
  | "package:create"
  | "package:update"
  | "package:delete"
  // Scripts
  | "script:view"
  | "script:create"
  | "script:update"
  | "script:approve"
  // Creators
  | "creator:view"
  | "creator:create"
  | "creator:update"
  // Shoots
  | "shoot:view"
  | "shoot:create"
  | "shoot:update"
  // Videos
  | "video:view"
  | "video:update"
  | "video:approve"
  | "video:revision"
  // Financial
  | "financial:view"
  | "financial:create"
  | "financial:update"
  // Users & Team
  | "user:view"
  | "user:create"
  | "user:update"
  | "user:delete"
  // Settings & Roles
  | "settings:view"
  | "settings:update"
  // Client Portal Exclusive
  | "portal:view"
  | "own-order:view"
  | "own-script:view"
  | "invoice:view"
  | "support-ticket:create";

/**
 * Explicit Role-to-Permission mapping table.
 * OWNER uses wildcard "*" server-side, but is also explicitly listed for type checking and UI visualization.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[] | ["*"]> = {
  OWNER: ["*"],

  ADMIN: [
    "user:view",
    "user:create",
    "user:update",
    "user:delete",
    "client:view",
    "client:create",
    "client:update",
    "client:delete",
    "lead:view",
    "lead:create",
    "lead:update",
    "lead:delete",
    "lead:assign",
    "lead:convert",
    "onboarding:view",
    "onboarding:create",
    "onboarding:update",
    "order:view",
    "order:create",
    "order:apply",
    "order:update",
    "order:delete",
    "video-request:create",
    "video-request:view",
    "package:view",
    "package:create",
    "package:update",
    "package:delete",
    "script:view",
    "script:create",
    "script:update",
    "script:approve",
    "creator:view",
    "creator:create",
    "creator:update",
    "shoot:view",
    "shoot:create",
    "shoot:update",
    "video:view",
    "video:update",
    "video:approve",
    "video:revision",
    "financial:view",
    "settings:view",
    "settings:update",
  ],

  SALES: [
    "lead:view",
    "lead:create",
    "lead:update",
    "lead:assign",
    "lead:convert",
    "client:view",
    "client:create",
    "client:update",
    "order:view",
    "order:create",
    "order:apply",
    "video-request:create",
    "video-request:view",
  ],

  SCRIPT_WRITER: [
    "script:view",
    "script:create",
    "script:update",
    "script:approve",
  ],

  SHOOT_MANAGER: [
    "creator:view",
    "creator:update",
    "shoot:view",
    "shoot:create",
    "shoot:update",
  ],

  EDITOR: [
    "video:view",
    "video:update",
    "video:revision",
  ],

  CLIENT: [
    "portal:view",
    "package:view",
    "own-order:view",
    "order:apply",
    "video-request:create",
    "video-request:view",
    "own-script:view",
    "script:approve",
    "video:view",
    "video:revision",
    "invoice:view",
    "support-ticket:create",
  ],
};

export const ALL_PERMISSIONS: Permission[] = [
  "lead:view",
  "lead:create",
  "lead:update",
  "lead:delete",
  "lead:assign",
  "lead:convert",
  "client:view",
  "client:create",
  "client:update",
  "client:delete",
  "onboarding:view",
  "onboarding:create",
  "onboarding:update",
  "order:view",
  "order:create",
  "order:apply",
  "order:update",
  "order:delete",
  "video-request:create",
  "video-request:view",
  "package:view",
  "package:create",
  "package:update",
  "package:delete",
  "script:view",
  "script:create",
  "script:update",
  "script:approve",
  "creator:view",
  "creator:create",
  "creator:update",
  "shoot:view",
  "shoot:create",
  "shoot:update",
  "video:view",
  "video:update",
  "video:approve",
  "video:revision",
  "financial:view",
  "financial:create",
  "financial:update",
  "user:view",
  "user:create",
  "user:update",
  "user:delete",
  "settings:view",
  "settings:update",
  "portal:view",
  "own-order:view",
  "own-script:view",
  "invoice:view",
  "support-ticket:create",
];
