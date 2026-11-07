import { request } from "@/lib/api/client";

export type Place = {
  id: string;
  name: string;
  description: string | null;
  zone_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type PlaceInput = {
  name: string;
  description: string | null;
  zone_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

export type PlaceWithZone = { place: Place; zone: { id: string; name: string } | null };

/** Every place with the zone it belongs to. */
export function listPlacesWithZone() {
  return request<PlaceWithZone[] | null>("/places").then((items) => items ?? []);
}

export function listPlaces() {
  return listPlacesWithZone().then((items) => items.map((item) => item.place));
}

export function createPlace(input: PlaceInput) {
  return request<Place>("/places", { method: "POST", body: JSON.stringify(input) });
}

// PATCH changes only the fields sent; null removes the zone, address or coordinates.
export function updatePlace(id: string, input: PlaceInput) {
  return request<void>(`/places/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deletePlace(id: string) {
  return request<void>(`/places/${encodeURIComponent(id)}`, { method: "DELETE" });
}
