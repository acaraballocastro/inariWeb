import type { ReactNode } from "react";

type Kind = "took" | "confirmed" | "lost" | "incident" | "clock" | "day";

// Notification types of the backend (notifications/model.go) by icon.
const kinds: Record<string, Kind> = {
  GUIDE_TOOK_DAY: "took",
  GUIDE_CONFIRMED: "confirmed",
  TOUR_DAY_CONFIRMED: "confirmed",
  GUIDE_REJECTED: "lost",
  TOUR_DAY_UNASSIGNED: "lost",
  TOUR_DAY_CANCELLED: "lost",
  INCIDENT_CREATED: "incident",
  INCIDENT_UPDATED: "incident",
  PREASSIGNMENT_EXPIRED: "clock",
  PREASSIGNMENT_REMINDER: "clock",
  TOUR_DAY_REMINDER: "clock",
  GUIDE_NOTES_CHANGED: "day",
};

const tones: Record<Kind, string> = {
  took: "bg-[#eef0e9] text-[#68705d]",
  confirmed: "bg-[#eef0e9] text-[#68705d]",
  lost: "bg-[#f4e4df] text-[#8a3b2c]",
  incident: "bg-[#fbf6ef] text-[#9b6f37]",
  clock: "bg-[#e9e5d7] text-[#77786f]",
  day: "bg-[#f1f0ec] text-[#77786f]",
};

const calendar = <><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>;

const paths: Record<Kind, ReactNode> = {
  // A day with a plus: a guide took it.
  took: <>{calendar}<path d="M12 12v6M9 15h6" /></>,
  confirmed: <>{calendar}<path d="m9 15 2 2 4-4" /></>,
  lost: <>{calendar}<path d="m9.5 12.5 5 5M14.5 12.5l-5 5" /></>,
  incident: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  day: calendar,
};

/** The icon of a notification by its type; unknown types get the tour day one. */
export function NotificationIcon({ type, size = "md" }: { type: string; size?: "sm" | "md" }) {
  const kind = kinds[type] ?? "day";
  const box = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full ${box} ${tones[kind]}`}>
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg>
    </span>
  );
}
