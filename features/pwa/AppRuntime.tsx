"use client";

import { useEffect } from "react";
import { registration } from "@/features/notifications/push";
import { rememberInstallPrompt } from "./install";
import { PushPrompt } from "./PushPrompt";

/**
 * What the installed app needs on every page: the service worker (push,
 * offline page) and Android's install prompt, which the browser only offers
 * once, early, and InstallBanner shows later. The first time the installed
 * app opens with a session, it also offers to turn on notifications.
 */
export function AppRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator) registration().catch(() => undefined);
    const onPrompt = (event: Event) => { event.preventDefault(); rememberInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return <PushPrompt />;
}
