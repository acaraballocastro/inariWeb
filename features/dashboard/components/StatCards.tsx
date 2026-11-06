import type { DashboardData } from "../api";

export function StatCards({ stats }: { stats: DashboardData["stats"] | null }) {
  const cards = [
    ["Upcoming tours", stats?.upcomingWeek, "Next 7 days"],
    ["In progress", stats?.inProgress, "Guide checked in"],
    ["Tours today", stats?.today, stats ? (stats.today ? `Across ${stats.todayZones} ${stats.todayZones === 1 ? "zone" : "zones"}` : "Nothing scheduled") : ""],
    ["Unassigned tours", stats?.unassigned, "Guide needed"],
    ["Pending confirmations", stats?.awaitingAcceptance, "Awaiting acceptance"],
    // Incidents are not exposed by the API yet.
    ["Open incidents", null, "Not available yet"],
  ] as const;

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(([label, value, note]) => (
        <article key={label} className="min-h-[100px] bg-white p-4">
          <p className="text-meta text-[#8b8c82]">{label}</p>
          <p className="mt-3 font-serif text-2xl leading-none">{value == null ? "—" : String(value).padStart(2, "0")}</p>
          <p className="mt-2 text-label text-[#aaa99f]">{note}</p>
        </article>
      ))}
    </div>
  );
}
