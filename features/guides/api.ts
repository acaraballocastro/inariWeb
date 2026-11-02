import { request } from "@/lib/api/client";

export type GuideUser = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  max_tours_per_day: number;
  created_at: string;
};

export type GuideLanguage = {
  id: string;
  name: string;
  code: string;
  is_active?: boolean;
};

export type GuideZone = {
  id: string;
  name: string;
  type?: string;
  is_active?: boolean;
};

export type GuideDetail = {
  guide: GuideUser;
  languages: GuideLanguage[];
  zones: GuideZone[];
};

export type GuideAvailability = {
  id: string;
  guide_id: string;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
};

export type UpdateGuideInput = {
  name: string;
  email: string;
  phone: string;
  max_tours_per_day: number;
  languages: GuideLanguage[];
  zones: GuideZone[];
};

export function listGuides() {
  return request<GuideDetail[]>("/guides");
}

export function listLanguages() {
  return request<GuideLanguage[]>("/languages");
}

export function listZones() {
  return request<GuideZone[]>("/zones");
}

export function getGuide(id: string) {
  return request<GuideDetail>(`/guides/${id}`);
}

export function getGuideDetail(id: string) {
  return request<GuideDetail>(`/guides/${id}`);
}

export function getGuideByUser(userId: string) {
  return request<{ id: string; user_id: string; max_tours_per_day: number; created_at: string }>(`/guides/user/${userId}`);
}

/** Creates the guide's user (with the invitation email), guide record, languages and zones in one transaction. */
export function createGuide(input: UpdateGuideInput) {
  return request<GuideDetail>("/guides", { method: "POST", body: JSON.stringify(input) });
}

export function updateGuide(id: string, input: UpdateGuideInput) {
  return request<GuideDetail>(`/guides/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function listGuideAvailabilities(guideId: string) {
  return request<GuideAvailability[] | null>(`/guides/${guideId}/availabilities`).then((items) => items ?? []);
}

export function createGuideAvailability(guideId: string, input: { start_date: string; end_date: string; reason: string }) {
  return request<GuideAvailability>(`/guides/${guideId}/availabilities`, { method: "POST", body: JSON.stringify(input) });
}

export function updateGuideAvailability(guideId: string, availabilityId: string, input: { start_date: string; end_date: string; reason: string }) {
  return request<GuideAvailability>(`/guides/${guideId}/availabilities/${availabilityId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteGuideAvailability(guideId: string, availabilityId: string) {
  return request<void>(`/guides/${guideId}/availabilities/${availabilityId}`, { method: "DELETE" });
}
