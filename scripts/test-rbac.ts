import { Role, Permission, ROLES, ALL_PERMISSIONS } from "../lib/rbac/permissions";
import { hasPermission, validateClientAccess, UserWithRole } from "../lib/rbac/authz";

interface TestCase {
  role: Role;
  permission: Permission;
  expected: boolean;
}

const matrixTestCases: TestCase[] = [
  // 1. OWNER: Full access wildcard
  { role: "OWNER", permission: "lead:create", expected: true },
  { role: "OWNER", permission: "user:delete", expected: true },
  { role: "OWNER", permission: "financial:update", expected: true },
  { role: "OWNER", permission: "video:revision", expected: true },

  // 2. ADMIN: Operational access
  { role: "ADMIN", permission: "lead:create", expected: true },
  { role: "ADMIN", permission: "user:delete", expected: true },
  { role: "ADMIN", permission: "order:create", expected: true },
  { role: "ADMIN", permission: "financial:create", expected: false }, // restricted to OWNER
  { role: "ADMIN", permission: "financial:update", expected: false },

  // 3. SALES: Leads, Clients, Onboarding, Orders
  { role: "SALES", permission: "lead:create", expected: true },
  { role: "SALES", permission: "lead:assign", expected: true },
  { role: "SALES", permission: "order:create", expected: true },
  { role: "SALES", permission: "video:revision", expected: false },
  { role: "SALES", permission: "user:delete", expected: false },

  // 4. SCRIPT_WRITER: Script workflow
  { role: "SCRIPT_WRITER", permission: "script:view", expected: true },
  { role: "SCRIPT_WRITER", permission: "script:create", expected: true },
  { role: "SCRIPT_WRITER", permission: "script:approve", expected: true },
  { role: "SCRIPT_WRITER", permission: "lead:create", expected: false },
  { role: "SCRIPT_WRITER", permission: "video:approve", expected: false },

  // 5. SHOOT_MANAGER: Shoots & Creators
  { role: "SHOOT_MANAGER", permission: "creator:view", expected: true },
  { role: "SHOOT_MANAGER", permission: "shoot:create", expected: true },
  { role: "SHOOT_MANAGER", permission: "script:approve", expected: false },
  { role: "SHOOT_MANAGER", permission: "video:approve", expected: false },

  // 6. EDITOR: Videos
  { role: "EDITOR", permission: "video:view", expected: true },
  { role: "EDITOR", permission: "video:update", expected: true },
  { role: "EDITOR", permission: "video:revision", expected: true },
  { role: "EDITOR", permission: "lead:create", expected: false },
  { role: "EDITOR", permission: "script:create", expected: false },

  // 7. CLIENT: Portal only
  { role: "CLIENT", permission: "portal:view", expected: true },
  { role: "CLIENT", permission: "own-order:view", expected: true },
  { role: "CLIENT", permission: "video:view", expected: true },
  { role: "CLIENT", permission: "lead:view", expected: false },
  { role: "CLIENT", permission: "user:view", expected: false },
  { role: "CLIENT", permission: "settings:view", expected: false },
];

async function runTests() {
  console.log("==================================================");
  console.log("LEADYFY OS — RBAC PERMISSION MATRIX TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  for (const tc of matrixTestCases) {
    const actual = hasPermission(tc.role, tc.permission);
    if (actual === tc.expected) {
      console.log(`✓ [PASS] Role '${tc.role}' -> Permission '${tc.permission}' === ${tc.expected}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] Role '${tc.role}' -> Permission '${tc.permission}' expected ${tc.expected}, got ${actual}`);
      failed++;
    }
  }

  console.log("\n==================================================");
  console.log("CLIENT DATA ISOLATION VERIFICATION");
  console.log("==================================================");

  const clientAUser: UserWithRole = {
    id: "user-client-a",
    name: "Client A User",
    email: "clienta@brand.com",
    role: "CLIENT",
    clientId: "client-uuid-1111",
    emailVerified: true,
  };

  const clientBUser: UserWithRole = {
    id: "user-client-b",
    name: "Client B User",
    email: "clientb@brand.com",
    role: "CLIENT",
    clientId: "client-uuid-2222",
    emailVerified: true,
  };

  const salesUser: UserWithRole = {
    id: "user-sales",
    name: "Sales Agent",
    email: "sales@agency.com",
    role: "SALES",
    clientId: null,
    emailVerified: true,
  };

  const editorUser: UserWithRole = {
    id: "user-editor",
    name: "Video Editor",
    email: "editor@agency.com",
    role: "EDITOR",
    clientId: null,
    emailVerified: true,
  };

  // 1. Client A accessing own record (client-uuid-1111) -> ALLOWED
  const c1 = await validateClientAccess(clientAUser, "client-uuid-1111");
  if (c1 === true) {
    console.log("✓ [PASS] Client A accessing own data ('client-uuid-1111') -> Allowed");
    passed++;
  } else {
    console.error("✗ [FAIL] Client A accessing own data -> Rejected");
    failed++;
  }

  // 2. Client A attempting to access Client B record (client-uuid-2222) -> BLOCKED (403)
  const c2 = await validateClientAccess(clientAUser, "client-uuid-2222");
  if (c2 === false) {
    console.log("✓ [PASS] Client A attempting to access Client B data ('client-uuid-2222') -> Blocked (Strict Isolation)");
    passed++;
  } else {
    console.error("✗ [FAIL] Client A accessed Client B data! Violation of client isolation");
    failed++;
  }

  // 3. Sales rep accessing Client A data for support -> ALLOWED
  const c3 = await validateClientAccess(salesUser, "client-uuid-1111");
  if (c3 === true) {
    console.log("✓ [PASS] Internal Sales role accessing client record -> Allowed");
    passed++;
  } else {
    console.error("✗ [FAIL] Internal Sales role blocked");
    failed++;
  }

  // 4. Video Editor attempting direct access to client confidential company record -> BLOCKED
  const c4 = await validateClientAccess(editorUser, "client-uuid-1111");
  if (c4 === false) {
    console.log("✓ [PASS] Video Editor accessing client confidential record directly -> Blocked");
    passed++;
  } else {
    console.error("✗ [FAIL] Video Editor accessed private client record directly");
    failed++;
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
