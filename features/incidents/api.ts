import { request, requestPage } from "@/lib/api/client";

export type IncidentStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

export type Incident = {
  id: string;
  reservation_id: string | null;
  tour_day_id: string | null;
  guide_id: string | null;
  title: string | null;
  description: string | null;
  status: IncidentStatus;
  created_at: string;
};

export type IncidentStatusChange = {
  id: string;
  incident_id: string;
  previous_status: IncidentStatus | null;
  new_status: IncidentStatus;
  /** User id of who made the change. */
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

export type IncidentDetail = Incident & { history: IncidentStatusChange[] | null };

export const incidentStatuses: IncidentStatus[] = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];

// Same rules as the backend: a resolved incident can be reopened for review; a closed one is final.
const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ["IN_REVIEW", "RESOLVED", "CLOSED"],
  IN_REVIEW: ["RESOLVED", "CLOSED"],
  RESOLVED: ["IN_REVIEW", "CLOSED"],
  CLOSED: [],
};

export function nextIncidentStatuses(status: IncidentStatus) {
  return transitions[status] ?? [];
}

/** Open and in-review incidents keep their tour day from being completed. */
export function isIncidentActive(status: IncidentStatus) {
  return status === "OPEN" || status === "IN_REVIEW";
}

export type IncidentFilter = { status?: IncidentStatus[]; tourDayId?: string; reservationId?: string; guideId?: string };

function incidentsPath(filter: IncidentFilter) {
  const params = new URLSearchParams();
  if (filter.status?.length) params.set("status", filter.status.join(","));
  if (filter.tourDayId) params.set("tour_day_id", filter.tourDayId);
  if (filter.reservationId) params.set("reservation_id", filter.reservationId);
  if (filter.guideId) params.set("guide_id", filter.guideId);
  return params.size ? `/incidents?${params}` : "/incidents";
}

// A guide gets the incidents they opened and those of the days assigned to them.
export function listIncidents(filter: IncidentFilter = {}) {
  return request<Incident[] | null>(incidentsPath(filter)).then((items) => items ?? []);
}

export function listIncidentsPage(filter: IncidentFilter, page: { limit: number; offset: number }) {
  return requestPage<Incident>(incidentsPath(filter), page);
}

export function getIncident(id: string) {
  return request<IncidentDetail>(`/incidents/${encodeURIComponent(id)}`).then((detail) => ({ ...detail, history: detail.history ?? [] }));
}

export function listTourDayIncidents(tourDayId: string) {
  return request<Incident[] | null>(`/tour-days/${encodeURIComponent(tourDayId)}/incidents`).then((items) => items ?? []);
}

export function createIncident(tourDayId: string, input: { title: string; description: string }) {
  return request<Incident>(`/tour-days/${encodeURIComponent(tourDayId)}/incidents`, { method: "POST", body: JSON.stringify(input) });
}

export function changeIncidentStatus(id: string, status: IncidentStatus, reason: string) {
  return request<void>(`/incidents/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
}

export function formatIncidentStatus(status: string) {
  return status === "IN_REVIEW" ? "In review" : status.charAt(0) + status.slice(1).toLowerCase();
}

export function incidentStatusClass(status: string) {
  if (status === "OPEN") return "bg-[#f4e4df] text-[#8a3b2c]";
  if (status === "IN_REVIEW") return "bg-[#f2e8d8] text-[#9b6f37]";
  if (status === "RESOLVED") return "bg-[#eef0e9] text-[#68705d]";
  return "bg-[#ecebe5] text-[#77786f]";
}
