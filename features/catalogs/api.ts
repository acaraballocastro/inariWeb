import { request } from "@/lib/api/client";

export type Language = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Zone = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listLanguages() {
  return request<Language[]>("/languages");
}

export function createLanguage(input: { name: string; code: string }) {
  return request<Language>("/languages", { method: "POST", body: JSON.stringify(input) });
}

export function updateLanguage(code: string, input: { name: string; is_active: boolean }) {
  return request<Language>(`/languages/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify({ ...input, code }) });
}

export function deleteLanguage(code: string) {
  return request<void>(`/languages/${encodeURIComponent(code)}`, { method: "DELETE" });
}

export function listZones() {
  return request<Zone[]>("/zones");
}

export function createZone(input: { name: string }) {
  return request<Zone>("/zones", { method: "POST", body: JSON.stringify(input) });
}

export function updateZone(id: string, input: { name: string; type: string; is_active: boolean }) {
  return request<void>(`/zones/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...input, id }) });
}

export function deleteZone(id: string) {
  return request<void>(`/zones/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export type Activity = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type ActivityInput = { name: string; description: string | null; is_active?: boolean };

export function listAllActivities() {
  return request<Activity[] | null>("/activities").then((items) => items ?? []);
}

export function createActivity(input: ActivityInput) {
  return request<void>("/activities", { method: "POST", body: JSON.stringify(input) });
}

export function updateActivity(id: string, input: ActivityInput) {
  return request<void>(`/activities/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...input, id }) });
}

export function deleteActivity(id: string) {
  return request<void>(`/activities/${encodeURIComponent(id)}`, { method: "DELETE" });
}
