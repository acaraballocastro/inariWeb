import { request } from "@/lib/api/client";
import { useEffect, useState } from "react";

/** Application settings (spec 2, 3.17); every role reads them, ADMINs change them. */
export type Settings = {
  push_enabled: boolean;
  email_enabled: boolean;
  /** Hours a guide has to answer a preassignment before it counts as accepted (1–168). */
  preassignment_window_hours: number;
  /** Minutes a new day without zone waits before every guide hears about it (0–1440). */
  unzoned_grace_minutes: number;
  updated_at: string;
  updated_by: string | null;
};

export type SettingsUpdate = Partial<Pick<Settings, "push_enabled" | "email_enabled" | "preassignment_window_hours" | "unzoned_grace_minutes">>;

export function getSettings() {
  return request<Settings>("/settings");
}

export function updateSettings(input: SettingsUpdate) {
  return request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(input) });
}

/** The channels the user chose, and those in use (`available`): a channel chosen but not available sends nothing. */
export type NotificationPreferences = { push: boolean; email: boolean; available: { push: boolean; email: boolean } };

export function getNotificationPreferences() {
  return request<NotificationPreferences>("/notifications/preferences");
}

export function updateNotificationPreferences(input: { push?: boolean; email?: boolean }) {
  return request<NotificationPreferences>("/notifications/preferences", { method: "PATCH", body: JSON.stringify(input) });
}

let windowHours: Promise<number> | null = null;

/** The preassignment window in hours, for the texts that mention it; 24 until loaded or when it fails. */
export function usePreassignmentHours() {
  const [hours, setHours] = useState(24);
  useEffect(() => {
    let active = true;
    windowHours ??= getSettings().then((settings) => settings.preassignment_window_hours).catch(() => { windowHours = null; return 24; });
    windowHours.then((value) => { if (active) setHours(value); });
    return () => { active = false; };
  }, []);
  return hours;
}

/** Forgets the cached window after an ADMIN changes it. */
export function forgetPreassignmentHours() {
  windowHours = null;
}
