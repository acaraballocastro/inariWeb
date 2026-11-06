"use client";

import { useEffect, useState } from "react";
import { enablePush, getPushState, isInstalled } from "@/features/notifications/push";
import { useSession } from "@/lib/api/useSession";

const dismissedKey = "inari.push-prompt.dismissed";

function wasDismissed() {
  try { return window.localStorage.getItem(dismissedKey) === "1"; } catch { return false; }
}

function rememberDismissed() {
  try { window.localStorage.setItem(dismissedKey, "1"); } catch { /* private mode: it asks again next time */ }
}

/**
 * The first time the installed app is opened with a session, offers to turn
 * on notifications. Browsers only show the permission dialog after a tap
 * (always on iPhone), so this asks first and the button triggers it. Shown
 * once: "Not now" or any answer is remembered; the toggle on the
 * notifications page stays available.
 */
export function PushPrompt() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !isInstalled() || wasDismissed() || !("Notification" in window) || Notification.permission !== "default") return;
    let active = true;
    getPushState().then((state) => { if (active && state === "off") setOpen(true); }).catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  function close() {
    rememberDismissed();
    setOpen(false);
  }

  async function enable() {
    setIsBusy(true); setError("");
    try {
      await enablePush();
      close();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not turn on notifications.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="push-prompt-title" className="fixed inset-x-0 top-0 z-50 flex pwa-dvh items-center justify-center bg-black/30 p-4">
      {/* pwa-dvh, not inset-0: the phone zoom (globals.css) makes a full-height layer taller than the screen. */}
      <div className="max-h-full w-full max-w-[400px] overflow-y-auto bg-white p-6 sm:p-7">
        <p className="text-label font-semibold tracking-[0.2em] text-[#9b8353]">NOTIFICATIONS</p>
        <h2 id="push-prompt-title" className="mt-3 font-serif text-2xl">Stay up to date</h2>
        <p className="mt-3 text-lead leading-relaxed text-[#5d5e55]">Get notified on this device about new and assigned tours, changes and incidents, even when the app is closed.</p>
        {error && <p role="alert" className="mt-3 text-meta text-[#9b6f37]">{error}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button type="button" onClick={enable} disabled={isBusy} className="min-h-14 flex-1 bg-[#292b26] px-5 py-3 text-lead font-medium text-white hover:bg-[#41443b] disabled:opacity-60">{isBusy ? "Turning on…" : "Turn on notifications"}</button>
          <button type="button" onClick={close} disabled={isBusy} className="min-h-14 flex-1 border border-[#deddd6] px-5 py-3 text-lead hover:bg-[#f8f7f3] disabled:opacity-60">Not now</button>
        </div>
      </div>
    </div>
  );
}
