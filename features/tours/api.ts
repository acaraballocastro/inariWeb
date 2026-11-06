import { listAllActivities } from "@/features/catalogs/api";
import { listPlacesWithZone } from "@/features/places/api";
import { request, requestPage } from "@/lib/api/client";
import { toDayKey } from "@/lib/datetime";
import { checkInStatuses, isFinal } from "@/lib/status";

export type TourDay = {
  id: string;
  reservation_id: string;
  code: string | null;
  title: string | null;
  start_datetime: string;
  /** Whole hours. */
  duration: number | null;
  zone_id: string | null;
  guide_id: string | null;
  status: string;
  people_count: number | null;
  remuneration: number | null;
  meeting_point: string | null;
  guide_hotel_id: string | null;
  customer_hotel_id: string | null;
  guide_liability_notes: string | null;
  customer_liability_notes: string | null;
  voucher_status: string;
  created_at: string;
  updated_at: string;
  /** When the guide checked in (the tour started); null until then. */
  checked_in_at: string | null;
};

export type ItineraryItem = {
  id: string;
  tour_day_id: string;
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  type: string | null;
  place_id: string | null;
  activity_id: string | null;
  notes: string | null;
};

export type TourDayFormInput = {
  title: string | null;
  start_datetime: string;
  /** Whole hours. */
  duration: number | null;
  zone_id: string | null;
  people_count: number | null;
  meeting_point: string | null;
  remuneration: number | null;
  guide_liability_notes: string | null;
  customer_liability_notes: string | null;
};

export type UpdateTourDayInput = TourDayFormInput & {
  status?: string;
  voucher_status?: string;
};

/** `unassigned` keeps only the days without guide, whatever their status (paid days keep theirs when left without guide). */
export type TourDayFilter = { from?: string; to?: string; status?: string[]; guideId?: string; zoneId?: string; reservationId?: string; unassigned?: boolean; inProgress?: boolean };

// `from` / `to` accept RFC3339 timestamps or YYYY-MM-DD dates; `to` is exclusive.
// A guide only gets their own days: the API forces `guide_id`. Ordered by start.
function tourDaysPath(filter: TourDayFilter) {
  const params = new URLSearchParams();
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.status?.length) params.set("status", filter.status.join(","));
  if (filter.guideId) params.set("guide_id", filter.guideId);
  if (filter.zoneId) params.set("zone_id", filter.zoneId);
  if (filter.reservationId) params.set("reservation_id", filter.reservationId);
  if (filter.unassigned) params.set("unassigned", "true");
  // Checked in and not finished or cancelled yet.
  if (filter.inProgress) params.set("in_progress", "true");
  return params.size ? `/tour-days?${params}` : "/tour-days";
}

export function listTourDays(filter: TourDayFilter = {}) {
  return request<TourDay[] | null>(tourDaysPath(filter)).then((items) => items ?? []);
}

export function listTourDaysPage(filter: TourDayFilter, page: { limit: number; offset: number }) {
  return requestPage<TourDay>(tourDaysPath(filter), page);
}

/** How many tour days match, without loading them. */
export function countTourDays(filter: TourDayFilter) {
  return listTourDaysPage(filter, { limit: 1, offset: 0 }).then((result) => result.total);
}

export function getTourDay(id: string) {
  return request<TourDay>(`/tour-days/${encodeURIComponent(id)}`);
}

export function listTourDaysByReservation(reservationId: string) {
  return request<TourDay[] | null>(`/tour-days/by-reservation/${encodeURIComponent(reservationId)}`).then((items) => items ?? []);
}

export function listTourDaysAvailableForGuide(guideId: string) {
  return request<TourDay[] | null>(`/tour-days/available-for-guide/${encodeURIComponent(guideId)}`).then((items) => items ?? []);
}

export function createTourDay(reservationId: string, input: TourDayFormInput) {
  return request<void>("/tour-days", { method: "POST", body: JSON.stringify({ ...input, reservation_id: reservationId }) });
}

export function updateTourDay(tourDay: Pick<TourDay, "id" | "reservation_id">, input: UpdateTourDayInput) {
  return request<void>(`/tour-days/${encodeURIComponent(tourDay.id)}`, { method: "PATCH", body: JSON.stringify({ ...input, id: tourDay.id, reservation_id: tourDay.reservation_id }) });
}

export function cancelTourDay(id: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function confirmTourDay(id: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}/confirm`, { method: "PATCH" });
}

/** The assigned guide turns down a preassignment: the day goes back to PENDING_ASSIGNMENT. */
export function rejectTourDay(id: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}/reject`, { method: "PATCH" });
}

export function completeTourDay(id: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}/complete`, { method: "PATCH" });
}

export function forceMajeureTourDay(id: string, reason: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}/force-majeure`, { method: "PATCH", body: JSON.stringify({ reason }) });
}

/**
 * The guide starts the tour (an ADMIN can on their behalf). The backend allows
 * it from 2 hours before the start until the end of the tour's day, once the
 * guide accepted it: CHECK_IN_NOT_OPEN, ALREADY_CHECKED_IN or
 * INVALID_TOUR_DAY_STATUS otherwise. Afterwards the guide cannot change.
 */
export function checkInTourDay(id: string) {
  return request<TourDay>(`/tour-days/${encodeURIComponent(id)}/check-in`, { method: "POST" });
}

/** ADMIN: clears a check-in made by mistake (not on finished days). */
export function undoCheckIn(id: string) {
  return request<void>(`/tour-days/${encodeURIComponent(id)}/check-in`, { method: "DELETE" });
}

/** Checked in and not finished or cancelled: the tour is happening. */
export function isInProgress(day: Pick<TourDay, "checked_in_at" | "status">) {
  return day.checked_in_at !== null && !isFinal(day.status);
}

/**
 * Whether to offer the check-in button: the guide accepted the day, it is not
 * checked in and it is today in Japan. The backend has the final word (it
 * opens 2 hours before the start), so a too-early tap explains when it opens.
 */
export function offersCheckIn(day: Pick<TourDay, "checked_in_at" | "status" | "start_datetime">, now: Date) {
  return day.checked_in_at === null && checkInStatuses.includes(day.status) && toDayKey(new Date(day.start_datetime)) === toDayKey(now);
}

/** What the guide of a day needs to run it: its reservation and customers (no private data). */
export type TourDayBriefing = {
  reservation: { code: string | null; title: string | null; description: string | null; total_people_count: number | null; start_date: string; end_date: string };
  customers: { full_name: string; phone: string | null; age: number | null }[];
};

/** For the day's guide and the ADMINs; a guide reading a day only offered to them gets 403. */
export function getTourDayBriefing(id: string) {
  return request<TourDayBriefing>(`/tour-days/${encodeURIComponent(id)}/briefing`);
}

/** One change in the timeline of a reservation or tour day, most recent first. */
export type HistoryEntry = {
  type: "RESERVATION_STATUS" | "TOUR_DAY_STATUS" | "TOUR_DAY_ASSIGNMENT";
  tour_day_id: string | null;
  tour_day_code: string | null;
  previous_status: string | null;
  new_status: string | null;
  /** ASSIGNED, TAKEN (the guide took a free day), UNASSIGNED, REJECTED, CHECKED_IN or CHECK_IN_UNDONE, in assignment entries. */
  action: string | null;
  guide_id: string | null;
  guide_name: string | null;
  /** ADMIN, GUIDE or SYSTEM. */
  changed_by: string | null;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  reason: string | null;
  created_at: string;
};

export function getTourDayHistory(id: string) {
  return request<HistoryEntry[] | null>(`/tour-days/${encodeURIComponent(id)}/history`).then((items) => items ?? []);
}


/**
 * A compatibility problem that does not stop an assignment: the day is outside
 * the guide's zones (OUTSIDE_ZONE) or overlaps another of their days
 * (SCHEDULE_OVERLAP, only days with a duration). It is also kept in the reason
 * of the assignment history.
 */
export type AssignmentWarning = { tour_day_id: string; code: string; message: string };

export type AssignmentResult = { warnings: AssignmentWarning[] };

function toAssignmentResult(body: Partial<AssignmentResult> | null | undefined): AssignmentResult {
  return { warnings: body?.warnings ?? [] };
}

/** The ADMIN assigns; the answer says what to follow up (zone, overlaps). */
export function assignGuide(tourDayIds: string[], guideId: string) {
  return request<AssignmentResult | null>("/tour-days/assign-guide", { method: "PATCH", body: JSON.stringify({ tour_day_ids: tourDayIds, guide_id: guideId }) }).then(toAssignmentResult);
}

/**
 * A guide takes a free day offered to them: it becomes GUIDE_PREASSIGNED, as an
 * ADMIN preassignment, and they confirm or reject it (24 h). 403
 * TOUR_DAY_NOT_OFFERED when it is not among their available days; 409
 * INVALID_TOUR_DAY_STATUS when another guide took it first.
 */
export function takeTourDay(id: string) {
  return request<AssignmentResult | null>(`/tour-days/${encodeURIComponent(id)}/take`, { method: "PATCH" }).then(toAssignmentResult);
}

/** A warning as a sentence, e.g. "Outside the guide's zones" or "Overlaps KY-12-1". */
export function formatAssignmentWarning(warning: AssignmentWarning) {
  if (warning.code === "OUTSIDE_ZONE") return "Outside the guide's zones";
  const message = warning.message || warning.code;
  return message.charAt(0).toUpperCase() + message.slice(1);
}

export function unassignGuide(tourDayIds: string[], guideId: string) {
  return request<void>("/tour-days/unassign-guide", { method: "PATCH", body: JSON.stringify({ tour_day_ids: tourDayIds, guide_id: guideId }) });
}

export function listItinerary(tourDayId: string) {
  return request<ItineraryItem[] | null>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary`).then((items) => (items ?? []).sort((a, b) => a.order_index - b.order_index));
}

export type ItineraryItemInput = {
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  type: string | null;
  place_id: string | null;
  activity_id: string | null;
  notes: string | null;
};

export function createItineraryItem(tourDayId: string, input: ItineraryItemInput) {
  return request<ItineraryItem>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary`, { method: "POST", body: JSON.stringify(input) });
}

/** Partial: fields left out keep their value and null clears them. */
export function updateItineraryItem(tourDayId: string, itemId: string, input: Partial<ItineraryItemInput>) {
  return request<ItineraryItem>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary/${encodeURIComponent(itemId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteItineraryItem(tourDayId: string, itemId: string) {
  return request<void>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

/**
 * A reusable itinerary (ADMIN only). Applying it copies its stops into the
 * days, so changing or deleting it later never touches days already set up.
 */
export type ItineraryTemplate = {
  id: string;
  name: string;
  description: string | null;
  zone_id: string | null;
  items: ItineraryTemplateItem[];
  created_at: string;
  updated_at: string;
};

/** A template in the list: no stops, only how many. */
export type ItineraryTemplateSummary = Omit<ItineraryTemplate, "items"> & { item_count: number };

export type ItineraryTemplateItem = Omit<ItineraryItem, "tour_day_id">;

/** A stop of a template; its position in the list is its order. */
export type ItineraryTemplateItemInput = Omit<ItineraryItemInput, "order_index">;

export type ItineraryTemplateInput = {
  name: string;
  description: string | null;
  zone_id: string | null;
  items: ItineraryTemplateItemInput[];
};

export type ApplyTemplateMode = "REPLACE" | "APPEND";

export function listItineraryTemplates(zoneId?: string) {
  const path = zoneId ? `/itinerary-templates?zone_id=${encodeURIComponent(zoneId)}` : "/itinerary-templates";
  return request<ItineraryTemplateSummary[] | null>(path).then((items) => (items ?? []).sort((a, b) => a.name.localeCompare(b.name)));
}

export function getItineraryTemplate(id: string) {
  return request<ItineraryTemplate>(`/itinerary-templates/${encodeURIComponent(id)}`).then((template) => ({ ...template, items: (template.items ?? []).sort((a, b) => a.order_index - b.order_index) }));
}

export function createItineraryTemplate(input: ItineraryTemplateInput) {
  return request<ItineraryTemplate>("/itinerary-templates", { method: "POST", body: JSON.stringify(input) });
}

/** A template with a copy of the day's current itinerary. */
export function createItineraryTemplateFromDay(tourDayId: string, input: { name: string; description: string | null; zone_id: string | null }) {
  return request<ItineraryTemplate>("/itinerary-templates", { method: "POST", body: JSON.stringify({ ...input, from_tour_day_id: tourDayId }) });
}

/** `items` replaces every stop of the template. */
export function updateItineraryTemplate(id: string, input: ItineraryTemplateInput) {
  return request<ItineraryTemplate>(`/itinerary-templates/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteItineraryTemplate(id: string) {
  return request<void>(`/itinerary-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** All the days or none; a cancelled day answers 409 TOUR_DAY_CANCELLED. */
export function applyItineraryTemplate(id: string, tourDayIds: string[], mode: ApplyTemplateMode) {
  return request<{ tour_days: { tour_day_id: string; items_added: number }[] }>(`/itinerary-templates/${encodeURIComponent(id)}/apply`, { method: "POST", body: JSON.stringify({ tour_day_ids: tourDayIds, mode }) });
}

export type ItineraryPlace = { id: string; name: string; zone_id: string | null; zone_name: string | null };
export type ItineraryActivity = { id: string; name: string };

/** Active places, as the itinerary offers them. */
export function listItineraryPlaces() {
  return listPlacesWithZone().then((items) => items.filter((item) => item.place.is_active).map((item): ItineraryPlace => ({ id: item.place.id, name: item.place.name, zone_id: item.place.zone_id, zone_name: item.zone?.name ?? null })));
}

/** Active activities, as the itinerary offers them. */
export function listItineraryActivities() {
  return listAllActivities().then((items) => items.filter((item) => item.is_active).map((item): ItineraryActivity => ({ id: item.id, name: item.name })));
}
