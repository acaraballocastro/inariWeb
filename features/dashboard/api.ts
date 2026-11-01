import { listGuides, listZones } from "@/features/guides/api";
import { listReservations, type ReservationListItem } from "@/features/reservations/api";
import { listTourDays, type TourDay } from "@/features/tours/api";

import { operationsTimeZone } from "@/lib/datetime";

// Operations run in Japan, so "today" and every time on the dashboard is JST.
export { operationsTimeZone };
const dayMs = 24 * 60 * 60 * 1000;
const cancelledStatuses = new Set(["CANCELLED", "FORCE_MAJEURE_CANCELLED"]);
const closedReservationStatuses = new Set([...cancelledStatuses, "COMPLETED"]);

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
};

export async function loadDashboard(now = new Date()): Promise<DashboardData> {
  const today = toDayKey(now);
  const todayStart = startOfDay(today);
  const tomorrowStart = new Date(todayStart.getTime() + dayMs);
  const weekEnd = new Date(todayStart.getTime() + 7 * dayMs);

  // Guides and zones only provide labels, so the dashboard still renders without them.
  const [tourDays, reservations, guides, zones] = await Promise.all([
    listTourDays({ from: todayStart.toISOString() }),
    listReservations().then((items) => items ?? []),
    listGuides().then((items) => items ?? []).catch(() => []),
    listZones().then((items) => items ?? []).catch(() => []),
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

  const active = tourDays.filter((day) => !cancelledStatuses.has(day.status));
  const startsBefore = (day: TourDay, limit: Date) => new Date(day.start_datetime) < limit;
  const todayDays = active.filter((day) => startsBefore(day, tomorrowStart));
  const weekDays = active.filter((day) => startsBefore(day, weekEnd));
  const unassigned = active.filter((day) => !day.guide_id).length;
  const awaitingAcceptance = active.filter((day) => day.status === "GUIDE_PREASSIGNED").length;

  const openReservations = reservations.filter((reservation) => !closedReservationStatuses.has(reservation.status));

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
    upcomingTours: active.filter((day) => new Date(day.start_datetime) >= now).slice(0, 6).map(toTour),
    activity: recentActivity(reservations),
  };
}

function recentActivity(reservations: ReservationListItem[]): DashboardActivity[] {
  return [...reservations]
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

export function toDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: operationsTimeZone }).format(date);
}

// Japan has no DST, so a fixed +09:00 offset is exact.
function startOfDay(dayKey: string) {
  return new Date(`${dayKey}T00:00:00+09:00`);
}

export function formatStatus(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function formatClock(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: operationsTimeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: operationsTimeZone, day: "numeric", month: "short" }).format(new Date(value));
}
