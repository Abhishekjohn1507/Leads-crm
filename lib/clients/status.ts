export type ClientStatus =
  | "LEAD"
  | "NEW"
  | "ONBOARDING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "INACTIVE";

export const CLIENT_STATUSES: ClientStatus[] = [
  "LEAD",
  "NEW",
  "ONBOARDING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "INACTIVE",
];

/**
 * Strict Client Status Transition Matrix according to Leadyfy OS specifications:
 *
 * LEAD -> NEW
 * NEW -> ONBOARDING
 * ONBOARDING -> ACTIVE or ON_HOLD
 * ACTIVE -> ON_HOLD or COMPLETED
 * ON_HOLD -> ACTIVE or INACTIVE
 * COMPLETED -> INACTIVE or ACTIVE
 * Any state can transition to INACTIVE for safe archiving.
 */
const ALLOWED_CLIENT_TRANSITIONS: Record<ClientStatus, readonly ClientStatus[]> = {
  LEAD: ["NEW", "INACTIVE"],
  NEW: ["ONBOARDING", "INACTIVE"],
  ONBOARDING: ["ACTIVE", "ON_HOLD", "INACTIVE"],
  ACTIVE: ["ON_HOLD", "COMPLETED", "INACTIVE"],
  ON_HOLD: ["ACTIVE", "INACTIVE"],
  COMPLETED: ["INACTIVE", "ACTIVE"],
  INACTIVE: ["NEW", "ACTIVE"], // Allow reactivation if explicitly requested
};

export function canTransitionClientStatus(
  currentStatus: string,
  nextStatus: string
): { allowed: boolean; reason?: string } {
  const current = currentStatus.toUpperCase() as ClientStatus;
  const next = nextStatus.toUpperCase() as ClientStatus;

  if (!CLIENT_STATUSES.includes(current)) {
    return { allowed: false, reason: `Unknown current client status: '${currentStatus}'.` };
  }

  if (!CLIENT_STATUSES.includes(next)) {
    return { allowed: false, reason: `Unknown target client status: '${nextStatus}'.` };
  }

  if (current === next) {
    return { allowed: true };
  }

  const allowedNext = ALLOWED_CLIENT_TRANSITIONS[current] || [];
  if (!allowedNext.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid status transition: Cannot transition client from '${current}' to '${next}'. Allowed transitions: ${allowedNext.join(", ") || "none"}.`,
    };
  }

  return { allowed: true };
}
