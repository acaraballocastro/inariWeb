// Tour days and reservations share their statuses (the reservation's is derived from its days).

export const cancelledStatuses = ["CANCELLED", "FORCE_MAJEURE_CANCELLED"];

/** Statuses a day or reservation never leaves. */
export const finalStatuses = ["COMPLETED", ...cancelledStatuses];

/** Every status still in progress, for filtering the API by "not closed". */
export const openStatuses = [
  "PENDING_ASSIGNMENT",
  "GUIDE_PREASSIGNED",
  "GUIDE_CONFIRMED",
  "PAYMENT_PENDING",
  "VOUCHER_PENDING",
  "SIGNATURE_PENDING",
  "PARTIALLY_CONFIRMED",
  "CONFIRMED",
];

/** Every status but the cancelled ones: days that happen or happened. */
export const activeStatuses = [...openStatuses, "COMPLETED"];

/** Waiting on operations: a guide, the guide's answer, payment, voucher or signature. */
export const pendingStatuses = ["PENDING_ASSIGNMENT", "GUIDE_PREASSIGNED", "PAYMENT_PENDING", "VOUCHER_PENDING", "SIGNATURE_PENDING"];

/** Days whose reservation is paid: they keep their status when the guide changes. */
export const paidStatuses = ["VOUCHER_PENDING", "SIGNATURE_PENDING", "CONFIRMED"];

export function isCancelled(status: string) {
  return cancelledStatuses.includes(status);
}

export function isFinal(status: string) {
  return finalStatuses.includes(status);
}

/** "PAYMENT_PENDING" → "Payment Pending". */
export function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
