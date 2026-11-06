"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isInstalled, isIos } from "@/features/notifications/push";
import { canPromptInstall, onInstallPromptChange, promptInstall } from "./install";

const dismissedKey = "inari.install-banner-dismissed";

/**
 * Invites phone users to install the app on the home screen: it opens full
 * screen, from its icon, and on iPhone it is the only way to get push
 * notifications. Android gets the browser's install dialog; iPhone, the steps.
 * Hidden once installed or dismissed.
 */
export function InstallBanner({ className = "" }: { className?: string }) {
  const [platform, setPlatform] = useState<"ios" | "other" | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const promptable = useSyncExternalStore(onInstallPromptChange, canPromptInstall, () => false);

  useEffect(() => {
    if (isInstalled() || !window.matchMedia("(max-width: 1023px)").matches) return;
    let wasDismissed = false;
    try { wasDismissed = window.localStorage.getItem(dismissedKey) === "1"; } catch { /* private mode */ }
    // Reading the device is only possible in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(wasDismissed);
    setPlatform(isIos() ? "ios" : "other");
  }, []);

  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem(dismissedKey, "1"); } catch { /* private mode */ }
  }

  if (dismissed || platform === null || (platform === "other" && !promptable)) return null;

  return (
    <section className={`flex items-start gap-3 bg-[#292b26] p-4 text-white ${className}`}>
      <Image src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium">Install INARI on your phone</p>
        <p className="mt-1 text-meta leading-relaxed text-white/75">
          {platform === "ios" ? "Tap Share, then “Add to Home Screen”. It opens like an app and can send you notifications." : "It opens like an app, from your home screen, and sends you notifications."}
        </p>
        {platform === "other" && <button type="button" onClick={() => promptInstall().then((accepted) => { if (accepted) dismiss(); })} className="mt-3 h-9 bg-white px-4 text-meta font-medium text-[#292b26]">Install</button>}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="h-8 w-8 shrink-0 text-lead text-white/70">✕</button>
    </section>
  );
}
