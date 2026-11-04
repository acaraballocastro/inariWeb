import { request, requestPage } from "@/lib/api/client";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  url?: string;
  tour_day_id?: string;
  incident_id?: string;
  is_read: boolean;
  created_at: string;
};

export function listNotifications(options: { unreadOnly?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set("unread", "true");
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return request<AppNotification[]>(`/notifications${query ? `?${query}` : ""}`);
}

// Most recent first.
export function listNotificationsPage(options: { unreadOnly?: boolean }, page: { limit: number; offset: number }) {
  return requestPage<AppNotification>(options.unreadOnly ? "/notifications?unread=true" : "/notifications", page);
}

export function getUnreadCount() {
  return request<{ unread: number }>("/notifications/unread-count").then((body) => body.unread);
}

export function markNotificationRead(id: string) {
  return request<void>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return request<void>("/notifications/read-all", { method: "POST" });
}

export function getPushConfig() {
  return request<{ enabled: boolean; public_key: string }>("/push/config");
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return request<void>("/push/subscriptions", { method: "POST", body: JSON.stringify(subscription) });
}

export function deletePushSubscription(endpoint: string) {
  return request<void>("/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint }) });
}
