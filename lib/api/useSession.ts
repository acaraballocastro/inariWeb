"use client";

import { useMemo, useSyncExternalStore } from "react";

import { readStoredSession, sessionChangeEvent, type Session } from "./client";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(sessionChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(sessionChangeEvent, onChange);
  };
}

/**
 * The signed-in session, or null before mount and when signed out. Renders
 * that depend on the role wait for it, so the prerender shows neither menu.
 */
export function useSession(): Session | null {
  const stored = useSyncExternalStore(subscribe, readStoredSession, () => null);
  return useMemo(() => {
    if (!stored) return null;
    try {
      return JSON.parse(stored) as Session;
    } catch {
      return null;
    }
  }, [stored]);
}
