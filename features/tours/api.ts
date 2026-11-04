import { listAllActivities } from "@/features/catalogs/api";
import { listPlacesWithZone } from "@/features/places/api";
import { request, requestPage } from "@/lib/api/client";

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
export type TourDayFilter = { from?: string; to?: string; status?: string[]; guideId?: string; zoneId?: string; reservationId?: string; unassigned?: boolean };

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

/** One change in the timeline of a reservation or tour day, most recent first. */
export type HistoryEntry = {
  type: "RESERVATION_STATUS" | "TOUR_DAY_STATUS" | "TOUR_DAY_ASSIGNMENT";
  tour_day_id: string | null;
  tour_day_code: string | null;
  previous_status: string | null;
  new_status: string | null;
  /** ASSIGNED, UNASSIGNED or REJECTED, in assignment entries. */
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


export function assignGuide(tourDayIds: string[], guideId: string) {
  return request<void>("/tour-days/assign-guide", { method: "PATCH", body: JSON.stringify({ tour_day_ids: tourDayIds, guide_id: guideId }) });
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
