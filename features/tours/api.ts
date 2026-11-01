import { request } from "@/lib/api/client";

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

// `from` / `to` accept RFC3339 timestamps or YYYY-MM-DD dates; `to` is exclusive.
export function listTourDays(range: { from?: string; to?: string } = {}) {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const query = params.size ? `?${params}` : "";
  return request<TourDay[] | null>(`/tour-days${query}`).then((items) => items ?? []);
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

export function updateItineraryItem(tourDayId: string, itemId: string, input: ItineraryItemInput) {
  return request<ItineraryItem>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary/${encodeURIComponent(itemId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteItineraryItem(tourDayId: string, itemId: string) {
  return request<void>(`/tour-days/${encodeURIComponent(tourDayId)}/itinerary/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

type ApiPlace = { id: string; name: string; description: string | null; zone_id: string | null; is_active: boolean };
type ApiActivity = { id: string; name: string; description: string | null; is_active: boolean };

export type ItineraryPlace = { id: string; name: string; zone_name: string | null };
export type ItineraryActivity = { id: string; name: string };

export function listPlaces() {
  return request<{ place: ApiPlace; zone: { name: string } | null }[] | null>("/places").then((items) => (items ?? []).filter((item) => item.place.is_active).map((item): ItineraryPlace => ({ id: item.place.id, name: item.place.name, zone_name: item.zone?.name ?? null })));
}

export function listActivities() {
  return request<ApiActivity[] | null>("/activities").then((items) => (items ?? []).filter((item) => item.is_active).map((item): ItineraryActivity => ({ id: item.id, name: item.name })));
}
