import Link from "next/link";

import { formatDuration } from "@/lib/datetime";
import { formatClock, formatShortDate, formatStatus, type DashboardTour } from "../api";

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  PENDING_ASSIGNMENT: "Unassigned",
  GUIDE_PREASSIGNED: "Awaiting",
  GUIDE_CONFIRMED: "Accepted",
  PAYMENT_PENDING: "Payment",
  VOUCHER_PENDING: "Voucher",
  SIGNATURE_PENDING: "Signature",
  PARTIALLY_CONFIRMED: "Partial",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
};

export function UpcomingTours({ tours }: { tours: DashboardTour[] | null }) {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Upcoming tours</h2>
      <p className="mt-2 text-[10px] text-[#96968b]">Thoughtfully planned. Ready to explore.</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_92px_70px] gap-3 border-b border-[#ecebe5] pb-2 text-[8px] font-semibold tracking-[0.14em] text-[#a19a87]">
        <span>TOUR / DESTINATION</span><span>GUIDE</span><span>STATUS</span>
      </div>
      <div className="divide-y divide-[#f0efe9]">
        {tours === null && <p className="py-3 text-[9px] text-[#a2a299]">Loading…</p>}
        {tours?.length === 0 && <p className="py-3 text-[9px] text-[#a2a299]">No upcoming tours.</p>}
        {tours?.map((tour) => (
          <Link key={tour.id} href={`/tours/${tour.id}`} className="grid grid-cols-[minmax(0,1fr)_92px_70px] items-center gap-3 py-3 text-[9px] hover:bg-[#faf9f6]">
            <div><p>{tour.title}</p><p className="mt-1 text-[8px] text-[#a2a299]">{[formatShortDate(tour.startDatetime), formatClock(tour.startDatetime), formatDuration(tour.duration), tour.zone].filter(Boolean).join(" · ")}</p></div>
            <span className="text-[8px] text-[#8e8f85]">{tour.guide ?? "Not assigned"}</span>
            <span className="bg-[#ebe7da] px-2 py-1 text-center text-[8px] text-[#77786f]">{statusLabels[tour.status] ?? formatStatus(tour.status)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
