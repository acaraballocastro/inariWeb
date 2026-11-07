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

/** A guide changes their own languages and zones (the rest of the profile is the admin's). */
export function updateGuideSkills(id: string, input: { languages: GuideLanguage[]; zones: GuideZone[] }) {
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

/** A guide's blocked dates with the guide's name (every guide, ADMIN only). */
export type GuideTimeOff = GuideAvailability & { guide_name: string };

/** Every active guide's blocked dates touching [from, to] (YYYY-MM-DD, inclusive). */
export function listAllAvailabilities(from: string, to: string) {
  return request<GuideTimeOff[] | null>(`/availabilities?from=${from}&to=${to}`).then((items) => items ?? []);
}

/** The guides off on each day key of [from, to], by name. */
export function timeOffByDay(blocks: GuideTimeOff[], from: string, to: string) {
  const byDay = new Map<string, string[]>();
  for (const block of blocks) {
    if (!block.start_date || !block.end_date) continue;
    let key = block.start_date.slice(0, 10) < from ? from : block.start_date.slice(0, 10);
    const end = block.end_date.slice(0, 10) > to ? to : block.end_date.slice(0, 10);
    while (key <= end) {
      byDay.set(key, [...(byDay.get(key) ?? []), block.guide_name || "Guide"]);
      const next = new Date(`${key}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      key = next.toISOString().slice(0, 10);
    }
  }
  return byDay;
}
