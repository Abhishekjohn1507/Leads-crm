export type OrderStatus =
  | "NEW"
  | "ONBOARDING"
  | "IN_PRODUCTION"
  | "PARTIALLY_DELIVERED"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "ONBOARDING",
  "IN_PRODUCTION",
  "PARTIALLY_DELIVERED",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

/**
 * Strict Order Status Transition Matrix according to Leadyfy OS specifications:
 *
 * NEW -> ONBOARDING, CANCELLED
 * ONBOARDING -> IN_PRODUCTION, ON_HOLD, CANCELLED
 * IN_PRODUCTION -> PARTIALLY_DELIVERED, ON_HOLD, CANCELLED
 * PARTIALLY_DELIVERED -> COMPLETED, ON_HOLD
 * ON_HOLD -> IN_PRODUCTION, ONBOARDING, CANCELLED
 * COMPLETED / CANCELLED are terminal states
 */
const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ["ONBOARDING", "CANCELLED"],
  ONBOARDING: ["IN_PRODUCTION", "ON_HOLD", "CANCELLED"],
  IN_PRODUCTION: ["PARTIALLY_DELIVERED", "COMPLETED", "ON_HOLD", "CANCELLED"],
  PARTIALLY_DELIVERED: ["COMPLETED", "ON_HOLD"],
  ON_HOLD: ["IN_PRODUCTION", "ONBOARDING", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrderStatus(
  currentStatus: string,
  nextStatus: string
): { allowed: boolean; reason?: string } {
  const current = currentStatus.toUpperCase() as OrderStatus;
  const next = nextStatus.toUpperCase() as OrderStatus;

  if (!ORDER_STATUSES.includes(current)) {
    return { allowed: false, reason: `Unknown current order status: '${currentStatus}'.` };
  }

  if (!ORDER_STATUSES.includes(next)) {
    return { allowed: false, reason: `Unknown target order status: '${nextStatus}'.` };
  }

  if (current === next) {
    return { allowed: true };
  }

  const allowedNext = ALLOWED_ORDER_TRANSITIONS[current] || [];
  if (!allowedNext.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid status transition: Cannot transition order from '${current}' to '${next}'. Allowed transitions: ${allowedNext.join(", ") || "none (terminal state)"}.`,
    };
  }

  return { allowed: true };
}
