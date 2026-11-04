import { requestPage } from "@/lib/api/client";

/** One change made through the API, newest first (GET /admin/audit-logs). */
export type AuditRecord = {
  id: string;
  entity: string;
  /** The entity's id, or its code for languages and reservations. Null when several were changed at once. */
  entity_id: string | null;
  action: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  route: string | null;
  /** The request body as sent, without passwords or tokens. Erased when the user it describes is deleted permanently. */
  changes: unknown;
  request_id: string | null;
  /** Address the request came from. */
  ip: string | null;
  /** HTTP status of the answer; null while PENDING. */
  status: number | null;
  outcome: AuditOutcome;
  created_at: string;
};

/**
 * PENDING: written before the change and never finished (the server stopped
 * mid-request), so the outcome is unknown. FAILED: a failed sign-in.
 * DENIED: tried without permission.
 */
export type AuditOutcome = "PENDING" | "SUCCEEDED" | "FAILED" | "DENIED";

export const auditOutcomes: AuditOutcome[] = ["SUCCEEDED", "FAILED", "DENIED", "PENDING"];

export function formatOutcome(outcome: AuditOutcome) {
  return outcome === "PENDING" ? "Outcome unknown" : outcome.charAt(0) + outcome.slice(1).toLowerCase();
}

export function outcomeClass(outcome: AuditOutcome) {
  switch (outcome) {
    case "SUCCEEDED": return "bg-[#e8efe7] text-[#4f6b4a]";
    case "FAILED": return "bg-[#f4e4df] text-[#8a3b2c]";
    case "DENIED": return "bg-[#fbf6ef] text-[#9b6f37]";
    default: return "bg-[#ebe7da] text-[#77786f]";
  }
}

/** Account security events, for the "Sign-ins & security" shortcut. */
export const securityActions = ["SIGNED_IN", "SIGNED_OUT", "SIGNED_OUT_EVERYWHERE", "PASSWORD_CHANGED", "PASSWORD_RESET_REQUESTED", "PASSWORD_RESET", "SESSIONS_REVOKED", "INVITATION_RESENT", "DEVICE_ADDED", "DEVICE_REMOVED"];

/** `from`/`to` are instants; the range is [from, to). */
export type AuditFilter = { entity?: string; entityId?: string; userId?: string; action?: string; outcome?: AuditOutcome; from?: string; to?: string };

export function listAuditLogPage(filter: AuditFilter, page: { limit: number; offset: number }) {
  const params = new URLSearchParams();
  if (filter.entity) params.set("entity", filter.entity);
  if (filter.entityId) params.set("entity_id", filter.entityId);
  if (filter.userId) params.set("user_id", filter.userId);
  if (filter.action) params.set("action", filter.action);
  if (filter.outcome) params.set("outcome", filter.outcome);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  return requestPage<AuditRecord>(params.size ? `/admin/audit-logs?${params}` : "/admin/audit-logs", page);
}

/** The kinds of entity the backend records (internal/modules/audit/routes.go). */
export const auditEntities = ["reservation", "tour_day", "incident", "guide", "user", "customer", "agency", "activity", "place", "zone", "language"];

export function formatEntity(entity: string) {
  return entity === "tour_day" ? "Tour day" : entity.charAt(0).toUpperCase() + entity.slice(1);
}

/** Where the entity can be seen in the workspace, when it has a screen. */
export function auditEntityHref(record: Pick<AuditRecord, "entity" | "entity_id">) {
  const id = record.entity_id ? encodeURIComponent(record.entity_id) : null;
  switch (record.entity) {
    case "reservation": return id && `/reservations/${id}`;
    case "tour_day": return id && `/tours/${id}`;
    case "incident": return id && `/incidents/${id}`;
    case "guide": return id && `/guides/${id}`;
    case "user": return "/users";
    case "customer": return "/customers";
    case "agency": return "/agencies";
    case "activity": return "/activities";
    case "place": return "/places";
    case "zone": return "/zones";
    case "language": return "/languages";
    default: return null;
  }
}
