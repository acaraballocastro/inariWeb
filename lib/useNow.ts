"use client";

import { useSyncExternalStore } from "react";

// The current time for components, refreshed every minute. Null while
// prerendering, so the build never freezes a stale date into the page.
let now: Date | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = window.setInterval(() => { now = new Date(); listeners.forEach((notify) => notify()); }, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

function snapshot() {
  // Created on the first read in the browser; replaced only by the timer, so
  // React sees the same object between renders.
  if (!now) now = new Date();
  return now;
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
