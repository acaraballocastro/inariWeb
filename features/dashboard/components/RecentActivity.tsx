import Link from "next/link";

import { formatClock, formatShortDate, toDayKey, type DashboardActivity } from "../api";

export function RecentActivity({ activity, today }: { activity: DashboardActivity[] | null; today: Date | null }) {
  const todayKey = today ? toDayKey(today) : null;

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Recent activity</h2>
      <div className="mt-4 divide-y divide-[#f0efe9]">
        {activity === null && <p className="py-3 text-[9px] text-[#a2a299]">Loading…</p>}
        {activity?.length === 0 && <p className="py-3 text-[9px] text-[#a2a299]">No activity yet.</p>}
        {activity?.map((item) => (
          <Link key={item.id} href={item.code ? `/reservations/${encodeURIComponent(item.code)}` : "/reservations"} className="grid grid-cols-[40px_1fr] gap-3 py-3 text-[9px] hover:bg-[#faf9f6]">
            <span className="text-[#a19a87]">{toDayKey(new Date(item.at)) === todayKey ? formatClock(item.at) : formatShortDate(item.at)}</span>
            <div><p>{item.title}</p><p className="mt-1 text-[8px] text-[#a2a299]">{item.detail}</p></div>
          </Link>
        ))}
      </div>
    </section>
  );
}
