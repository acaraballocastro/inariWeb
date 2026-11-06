"use client";

import { useEffect } from "react";
import { isInstalled, registration } from "@/features/notifications/push";
import { rememberInstallPrompt } from "./install";
import { PushPrompt } from "./PushPrompt";

/**
 * What the installed app needs on every page: the service worker (push,
 * offline page) and Android's install prompt, which the browser only offers
 * once, early, and InstallBanner shows later. The first time the installed
 * app opens with a session, it also offers to turn on notifications.
 * In the installed app, pinch zoom is blocked so it behaves like a native
 * one (the browser tab keeps it, for accessibility).
 */
export function AppRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator) registration().catch(() => undefined);
    const onPrompt = (event: Event) => { event.preventDefault(); rememberInstallPrompt(event); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const unblockZoom = isInstalled() ? blockPinchZoom() : () => undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      unblockZoom();
    };
  }, []);
  return <PushPrompt />;
}

/**
 * Blocks pinch zoom: Android honours the viewport's user-scalable=no; iOS
 * ignores it, so its pinch gestures (and two-finger moves) are cancelled.
 */
function blockPinchZoom() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const original = meta?.content;
  if (meta) meta.content = `${original}, maximum-scale=1, user-scalable=no`;
  const cancel = (event: Event) => event.preventDefault();
  const cancelPinch = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
  document.addEventListener("gesturestart", cancel);
  document.addEventListener("gesturechange", cancel);
  document.addEventListener("touchmove", cancelPinch, { passive: false });
  return () => {
    if (meta && original !== undefined) meta.content = original;
    document.removeEventListener("gesturestart", cancel);
    document.removeEventListener("gesturechange", cancel);
    document.removeEventListener("touchmove", cancelPinch);
  };
}
