"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getUnreadCount } from "@/features/notifications/api";

const refreshEveryMs = 60_000;

// One unread count for the whole page (header bell, tab bar, app icon badge),
// refreshed by a single timer while anything shows it.
let unread = 0;
let subscribers = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function publish(value: number) {
  unread = Math.max(0, value);
  listeners.forEach((listener) => listener());
  // The number on the installed app's icon, where the platform supports it.
  const nav = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  (unread ? nav.setAppBadge?.(unread) : nav.clearAppBadge?.())?.catch(() => undefined);
}

/** Asks the API again; call it after reading notifications elsewhere. */
export function refreshUnreadCount() {
  getUnreadCount().then(publish).catch(() => undefined);
}

/** Changes the count without asking the API (e.g. after marking one read). */
export function setUnreadCount(update: (current: number) => number) {
  publish(update(unread));
}

function onVisible() {
  if (document.visibilityState === "visible") refreshUnreadCount();
}

function onWorkerMessage(event: MessageEvent) {
  if (event.data?.type === "push") refreshUnreadCount();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useUnreadCount() {
  useEffect(() => {
    subscribers++;
    if (subscribers === 1) {
      refreshUnreadCount();
      timer = window.setInterval(refreshUnreadCount, refreshEveryMs);
      window.addEventListener("focus", refreshUnreadCount);
      // An installed app comes back from the background without a focus event.
      document.addEventListener("visibilitychange", onVisible);
      // sw.js tells the open pages when a push arrives.
      navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    }
    return () => {
      subscribers--;
      if (subscribers === 0) {
        window.clearInterval(timer);
        window.removeEventListener("focus", refreshUnreadCount);
        document.removeEventListener("visibilitychange", onVisible);
        navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      }
    };
  }, []);
  return useSyncExternalStore(subscribe, () => unread, () => 0);
}
