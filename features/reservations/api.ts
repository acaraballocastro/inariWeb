import { request } from "@/lib/api/client";

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
};

export type Agency = {
  id: string;
  name: string;
  representative: string;
  email: string;
  is_active: boolean;
};

export type ReservationListItem = Reservation & { customers: ReservationCustomer[] | null };

export function listReservations() {
  return request<ReservationListItem[]>("/reservations");
}

export function listAgencies() {
  return request<Agency[]>("/agencies");
}

export function listCustomers() {
  return request<ReservationCustomer[] | null>("/customers").then((items) => items ?? []);
}

export function getReservationDetail(code: string) {
  return request<ReservationDetail>(`/reservations/details/${encodeURIComponent(code)}`).then((detail) => ({
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
  customers: ReservationCustomerInput[];
};

// An existing customer is sent by id; a new one with its data (the API reuses it if the email exists).
export type ReservationCustomerInput = { id?: string; full_name: string; document_number: string; phone: string; email: string; age: number };

export function createReservation(input: Omit<ReservationFormInput, "quote_number" | "file_number">) {
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

export type ReservationCustomer = { id: string; full_name: string; document_number: string; phone: string; email: string; age: number | null };
export type ReservationTourDay = { id: string; code: string | null; title: string | null; start_datetime: string; duration: number | null; zone_id: string | null; guide_id: string | null; status: string; people_count: number | null; meeting_point: string | null; voucher_status: string };
export type ReservationDetail = { reservation: Reservation; customers: ReservationCustomer[]; tour_days: ReservationTourDay[] };
