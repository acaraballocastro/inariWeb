import Link from "next/link";

import { formatClock, formatShortDate, type DashboardTour } from "../api";

export function SchedulePanel({ tours, today }: { tours: DashboardTour[] | null; today: Date | null }) {
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl">Today&apos;s schedule</h2>
          <p className="mt-2 text-[9px] text-[#96968b]">{today ? `${formatShortDate(today).toUpperCase()} · ` : ""}JAPAN TIME</p>
        </div>
        <Link href="/calendar" className="bg-[#ebe7da] px-3 py-2 text-[9px] text-[#5d5e55]">Agenda</Link>
      </div>
      <div className="mt-5 divide-y divide-[#ecebe5]">
        {tours === null && <p className="py-3 text-[10px] text-[#999a90]">Loading…</p>}
        {tours?.length === 0 && <p className="py-3 text-[10px] text-[#999a90]">No tours scheduled for today.</p>}
        {tours?.map((tour) => (
          <Link key={tour.id} href={`/tours/${tour.id}`} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 py-3 text-[10px] hover:bg-[#faf9f6]">
            <span className="text-[#9b8353]">{formatClock(tour.startDatetime)}</span>
            <span>{tour.title}{tour.zone ? <span className="text-[#999a90]"> · {tour.zone}</span> : null}</span>
            <span className="text-[9px] text-[#999a90]">{String(tour.peopleCount).padStart(2, "0")} guests</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
