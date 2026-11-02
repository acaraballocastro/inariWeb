"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, getPushState, type PushState } from "@/features/notifications/push";

const hints: Record<PushState, string> = {
  unsupported: "This browser cannot receive notifications. They still appear here.",
  "needs-install": "On iPhone: tap Share → Add to Home Screen, open INARI from there and enable notifications.",
  unavailable: "Device notifications are not set up on the server yet. They still appear here.",
  denied: "Notifications are blocked for this site. Allow them in the browser settings.",
  off: "Get notified on this device even when INARI is closed.",
  on: "This device receives your notifications.",
};

/** Turns push notifications on or off for this device. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    setIsBusy(true);
    setError("");
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron activar las notificaciones.");
    } finally {
      setIsBusy(false);
    }
  }

  if (!state) return null;
  const canToggle = state === "on" || state === "off";
  return (
    <div className={compact ? "text-[9px]" : "text-[10px]"}>
      <p className="text-[#85867c]">{hints[state]}</p>
      {canToggle && (
        <button type="button" disabled={isBusy} onClick={toggle} className={`mt-2 h-8 px-3 text-[9px] disabled:opacity-60 ${state === "on" ? "border border-[#deddd6] hover:bg-[#f8f7f3]" : "bg-[#292b26] text-white hover:bg-[#41443b]"}`}>
          {isBusy ? "…" : state === "on" ? "Turn off on this device" : "Enable notifications on this device"}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-[#9b6f37]">{error}</p>}
    </div>
  );
}
