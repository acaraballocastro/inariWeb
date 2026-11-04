import { listZones } from "@/features/catalogs/api";
import { listGuides } from "@/features/guides/api";
import { listReservations, listReservationsPage, type ReservationListItem } from "@/features/reservations/api";
import { countTourDays, listTourDays, listTourDaysPage, type TourDay } from "@/features/tours/api";

import { formatJst, formatJstClock, startOfJstDay, toDayKey } from "@/lib/datetime";
import { withFallback } from "@/lib/missing";
import { activeStatuses, formatStatus, isCancelled, openStatuses } from "@/lib/status";

const dayMs = 24 * 60 * 60 * 1000;
// The activity feed reads the open reservations plus the ones starting latest, so recent
// cancellations and completions also show up without loading the whole history.
const recentReservationsCount = 20;

export type DashboardTour = {
  id: string;
  title: string;
  startDatetime: string;
  duration: number | null;
  zone: string | null;
  guide: string | null;
  peopleCount: number;
  status: string;
};

export type DashboardActivity = {
  id: string;
  code: string;
  at: string;
  title: string;
  detail: string;
};

export type DashboardData = {
  today: string;
  stats: {
    upcomingWeek: number;
    today: number;
    todayZones: number;
    unassigned: number;
    awaitingAcceptance: number;
  };
  attention: {
    unassigned: number;
    awaitingAcceptance: number;
    signaturesNotSent: number;
    awaitingSignature: number;
  };
  todayTours: DashboardTour[];
  upcomingTours: DashboardTour[];
  activity: DashboardActivity[];
  /** Labels that could not be loaded (the dashboard shows it without them). */
  missing: string[];
};

const upcomingCount = 6;

export async function loadDashboard(now = new Date()): Promise<DashboardData> {
  const today = toDayKey(now);
  const todayStart = startOfJstDay(today);
  const tomorrowStart = new Date(todayStart.getTime() + dayMs);
  const weekEnd = new Date(todayStart.getTime() + 7 * dayMs);

  // Everything is bounded: this week's days, counts for the rest of the future, the
  // next few days and the open reservations; never the whole history. Guides and zones
  // only provide labels, so the dashboard still renders without them and says so.
  const missing: string[] = [];
  const fromToday = todayStart.toISOString();
  const [weekTourDays, upcoming, unassigned, awaitingAcceptance, openReservations, latestReservations, guides, zones] = await Promise.all([
    listTourDays({ from: fromToday, to: weekEnd.toISOString() }),
    listTourDaysPage({ from: now.toISOString(), status: activeStatuses }, { limit: upcomingCount, offset: 0 }).then((page) => page.items),
    countTourDays({ from: fromToday, status: openStatuses, unassigned: true }),
    countTourDays({ from: fromToday, status: ["GUIDE_PREASSIGNED"] }),
    listReservations({ status: openStatuses }),
    listReservationsPage({}, { limit: recentReservationsCount, offset: 0 }).then((page) => page.items),
    withFallback(listGuides().then((items) => items ?? []), [], "guides", missing),
    withFallback(listZones().then((items) => items ?? []), [], "zones", missing),
  ]);

  const guideNames = new Map(guides.map((item) => [item.guide.id, item.guide.name]));
  const zoneNames = new Map(zones.map((zone) => [zone.id, zone.name]));
  const toTour = (day: TourDay): DashboardTour => ({
    id: day.id,
    title: day.title || day.code || "Untitled tour day",
    startDatetime: day.start_datetime,
    duration: day.duration,
    zone: day.zone_id ? zoneNames.get(day.zone_id) ?? null : null,
    guide: day.guide_id ? guideNames.get(day.guide_id) ?? "Assigned guide" : null,
    peopleCount: day.people_count ?? 0,
    status: day.status,
  });

  const weekDays = weekTourDays.filter((day) => !isCancelled(day.status));
  const todayDays = weekDays.filter((day) => new Date(day.start_datetime) < tomorrowStart);

  return {
    today,
    stats: {
      upcomingWeek: weekDays.length,
      today: todayDays.length,
      todayZones: new Set(todayDays.map((day) => day.zone_id).filter(Boolean)).size,
      unassigned,
      awaitingAcceptance,
    },
    attention: {
      unassigned,
      awaitingAcceptance,
      signaturesNotSent: openReservations.filter((reservation) => reservation.signature_status === "NOT_SENT").length,
      awaitingSignature: openReservations.filter((reservation) => reservation.signature_status === "SENT").length,
    },
    todayTours: todayDays.map(toTour),
    upcomingTours: upcoming.map(toTour),
    activity: recentActivity([...openReservations, ...latestReservations]),
    missing,
  };
}

function recentActivity(reservations: ReservationListItem[]): DashboardActivity[] {
  const unique = new Map(reservations.map((reservation) => [reservation.id, reservation]));
  return [...unique.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((reservation) => ({
      id: reservation.id,
      code: reservation.code ?? "",
      at: reservation.updated_at,
      title: reservation.created_at === reservation.updated_at ? "Reservation created" : `Reservation updated · ${formatStatus(reservation.status)}`,
      detail: [reservation.code, reservation.title || reservation.customers?.[0]?.full_name].filter(Boolean).join(" · "),
    }));
}

export function formatClock(value: string | Date) {
  return formatJstClock(value);
}

export function formatShortDate(value: string | Date) {
  return formatJst(value, { day: "numeric", month: "short" });
}
