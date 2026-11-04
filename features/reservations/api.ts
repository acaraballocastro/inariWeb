import { request, requestPage } from "@/lib/api/client";
import type { HistoryEntry } from "@/features/tours/api";

export type Reservation = {
  id: string;
  code: string | null;
  title: string | null;
  description: string | null;
  status: string;
  quote_number: string | null;
  file_number: string | null;
  agency_id: string | null;
  total_people_count: number | null;
  start_date: string;
  end_date: string;
  signature_status: string;
  voucher_status: string;
  created_at: string;
  updated_at: string;
  /** Its days left without guide are offered to the guides of their zones. */
  offer_to_zone_guides: boolean;
};

export type Agency = {
  id: string;
  name: string;
  representative: string;
  email: string;
  is_active: boolean;
};

export type ReservationListItem = Reservation & { customers: ReservationCustomer[] | null };

/** `from`/`to` are inclusive dates (YYYY-MM-DD) and match the reservations overlapping the range; `q` matches part of the code or title. */
export type ReservationFilter = { status?: string[]; from?: string; to?: string; agencyId?: string; guideId?: string; q?: string };

function reservationsPath(filter: ReservationFilter) {
  const params = new URLSearchParams();
  if (filter.status?.length) params.set("status", filter.status.join(","));
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.agencyId) params.set("agency_id", filter.agencyId);
  if (filter.guideId) params.set("guide_id", filter.guideId);
  if (filter.q) params.set("q", filter.q);
  return params.size ? `/reservations?${params}` : "/reservations";
}

// Most recent start first.
export function listReservations(filter: ReservationFilter = {}) {
  return request<ReservationListItem[] | null>(reservationsPath(filter)).then((items) => items ?? []);
}

export function listReservationsPage(filter: ReservationFilter, page: { limit: number; offset: number }) {
  return requestPage<ReservationListItem>(reservationsPath(filter), page);
}

/** How many reservations match, without loading them. */
export function countReservations(filter: ReservationFilter) {
  return listReservationsPage(filter, { limit: 1, offset: 0 }).then((result) => result.total);
}

export type AgencyFilter = { name?: string; email?: string; isActive?: boolean };

export function listAgencies(filter: AgencyFilter = {}) {
  const params = new URLSearchParams();
  if (filter.name) params.set("name", filter.name);
  if (filter.email) params.set("email", filter.email);
  if (filter.isActive !== undefined) params.set("is_active", String(filter.isActive));
  return request<Agency[] | null>(params.size ? `/agencies?${params}` : "/agencies").then((items) => items ?? []);
}

// Sorted by name.
export function listCustomersPage(page: { limit: number; offset: number }) {
  return requestPage<ReservationCustomer>("/customers", page);
}

/** Matches part of the name, document, phone or email; at most 20 results. */
export function searchCustomers(query: string) {
  return request<ReservationCustomer[] | null>(`/customers/search?query=${encodeURIComponent(query)}`).then((items) => items ?? []);
}

export type AgencyInput = { name: string; representative: string; email: string; is_active?: boolean };

export function createAgency(input: AgencyInput) {
  return request<Agency>("/agencies", { method: "POST", body: JSON.stringify(input) });
}

/** An agency with just its name, created from a picker; the rest is filled in later from Agencies. */
export function createAgencyNamed(name: string) {
  return createAgency({ name, representative: "", email: "" });
}

export function agencyOption(agency: Agency) {
  return { id: agency.id, label: agency.name, detail: agency.representative || agency.email || null };
}

export function updateAgency(id: string, input: AgencyInput) {
  return request<void>(`/agencies/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteAgency(id: string) {
  return request<void>(`/agencies/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type CustomerInput = { full_name: string; document_number: string; phone: string; email: string; age: number };

export function createCustomer(input: CustomerInput) {
  return request<ReservationCustomer>("/customers", { method: "POST", body: JSON.stringify(input) });
}

export function updateCustomer(id: string, input: CustomerInput) {
  return request<void>(`/customers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

/** Refused with 409 while a reservation still links the customer. */
export function deleteCustomer(id: string) {
  return request<void>(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getReservationDetail(code: string) {
  return request<ReservationDetail>(`/reservations/${encodeURIComponent(code)}`).then((detail) => ({
    ...detail,
    customers: detail.customers ?? [],
    tour_days: detail.tour_days ?? [],
  }));
}

export type ReservationFormInput = {
  title: string;
  description: string;
  agency_id: string;
  total_people_count: number;
  start_date: string;
  end_date: string;
  quote_number?: string;
  file_number?: string;
  offer_to_zone_guides?: boolean;
  customers: ReservationCustomerInput[];
};

// An existing customer is sent by id; a new one with its data (the API reuses it if the email exists).
export type ReservationCustomerInput = { id?: string; full_name: string; document_number: string; phone: string; email: string; age: number };

export function createReservation(input: ReservationFormInput) {
  return request<ReservationDetail>("/reservations", { method: "POST", body: JSON.stringify({ ...input, agency_id: input.agency_id || null }) });
}

export function updateReservation(code: string, input: ReservationFormInput) {
  return request<void>(`/reservations/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify({ ...input, code }) });
}

// Payment is manual and registered per reservation: confirms every tour day pending payment.
export function confirmReservationPayment(code: string) {
  return request<void>(`/reservations/${encodeURIComponent(code)}/confirm-payment`, { method: "PATCH" });
}

// Completing the voucher (SENT) and signature (SIGNED) steps advances the reservation's tour days.
export function updateVoucherStatus(code: string, status: string) {
  return request<void>(`/reservations/${encodeURIComponent(code)}/voucher`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function updateSignatureStatus(code: string, status: string) {
  return request<void>(`/reservations/${encodeURIComponent(code)}/signature`, { method: "PATCH", body: JSON.stringify({ status }) });
}

/** Cancels the days not yet closed; the reservation takes their status (COMPLETED if part was done). */
export function cancelReservation(code: string) {
  return request<void>(`/reservations/${encodeURIComponent(code)}`, { method: "DELETE" });
}

/** Erases the reservation, its days and everything depending on them. Customers are kept. */
export function deleteReservationPermanently(code: string) {
  return request<void>(`/reservations/${encodeURIComponent(code)}/permanently`, { method: "DELETE" });
}

export function getReservationHistory(code: string) {
  return request<HistoryEntry[] | null>(`/reservations/${encodeURIComponent(code)}/history`).then((items) => items ?? []);
}

export const voucherStatuses = ["NOT_GENERATED", "GENERATED", "PARTIALLY_SENT", "SENT"];
export const signatureStatuses = ["NOT_SENT", "SENT", "SIGNED", "REJECTED"];

export type ReservationCustomer = { id: string; full_name: string; document_number: string; phone: string; email: string; age: number | null };
export type ReservationTourDay = { id: string; code: string | null; title: string | null; start_datetime: string; duration: number | null; zone_id: string | null; guide_id: string | null; status: string; people_count: number | null; meeting_point: string | null; voucher_status: string };
export type ReservationDetail = { reservation: Reservation; customers: ReservationCustomer[]; tour_days: ReservationTourDay[] };
