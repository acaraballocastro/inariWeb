"use client";

import { useCallback } from "react";
import { usePreassignmentHours } from "@/features/settings/api";
import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { formatAssignmentWarning, takeTourDay, type TourDay } from "@/features/tours/api";
import { ApiError } from "@/lib/api/client";
import { formatDuration, formatJst, formatJstClock } from "@/lib/datetime";

/** How taking a day went: null when the guide did not confirm. */
export type TakeOutcome = { taken: boolean; message: string; /** The list is out of date (taken by someone else, no longer offered). */ stale: boolean } | null;

/**
 * A guide takes an offered day (D1): asks first, then the day is preassigned
 * to them, and goes ahead unless they decline it within the window.
 */
export function useTakeTourDay() {
  const { confirm } = useDialogs();
  const hours = usePreassignmentHours();
  return useCallback(async (day: TourDay, zone: string | null): Promise<TakeOutcome> => {
    const name = day.title || day.code || "this tour";
    const facts = [formatJst(day.start_datetime, { weekday: "short", day: "numeric", month: "short" }), formatJstClock(day.start_datetime), formatDuration(day.duration), zone, day.people_count ? `${day.people_count} guests` : null].filter(Boolean).join(" · ");
    if (!await confirm({ title: `Take ${name}?`, message: `${facts}.\nIt is preassigned to you: if you cannot take it, decline it within ${hours} hours; after that it goes ahead.`, confirmLabel: "Take tour", cancelLabel: "Not now" })) return null;
    try {
      const { warnings } = await takeTourDay(day.id);
      const notes = warnings.map(formatAssignmentWarning).join(" · ");
      return { taken: true, stale: true, message: `You took ${name}. It is under "Preassigned" on your home.${notes ? ` Note: ${notes}.` : ""}` };
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        if (requestError.code === "INVALID_TOUR_DAY_STATUS") return { taken: false, stale: true, message: "Another guide took this tour first." };
        if (requestError.code === "TOUR_DAY_NOT_OFFERED") return { taken: false, stale: true, message: "This tour is no longer offered to you." };
        return { taken: false, stale: requestError.status === 409, message: requestError.message };
      }
      return { taken: false, stale: false, message: requestError instanceof Error ? requestError.message : "Could not take the tour." };
    }
  }, [confirm, hours]);
}
