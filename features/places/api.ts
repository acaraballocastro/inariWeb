import { request } from "@/lib/api/client";

export type Place = {
  id: string;
  name: string;
  description: string | null;
  zone_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type PlaceInput = {
  name: string;
  description: string | null;
  zone_id: string | null;
  is_active: boolean;
};

export function listPlaces() {
  return request<{ place: Place; zone: { id: string; name: string } | null }[] | null>("/places").then((items) => (items ?? []).map((item) => item.place));
}

export function createPlace(input: PlaceInput) {
  return request<Place>("/places", { method: "POST", body: JSON.stringify(input) });
}

// PATCH changes only the fields sent; zone_id: null removes the zone.
export function updatePlace(id: string, input: PlaceInput) {
  return request<void>(`/places/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deletePlace(id: string) {
  return request<void>(`/places/${encodeURIComponent(id)}`, { method: "DELETE" });
}
