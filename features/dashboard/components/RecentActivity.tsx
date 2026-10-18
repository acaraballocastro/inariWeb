const activity = [
  ["08:45", "Guide accepted an assignment", "Yuki Tanaka · Kyoto, beyond the ordinary"],
  ["08:12", "Reservation updated", "IN-2026-1042 · Maple Travel"],
  ["08:10", "Voucher generated", "IN-2026-1038 · The heart of old Tokyo"],
];

export function RecentActivity() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Recent activity</h2>
      <div className="mt-4 divide-y divide-[#f0efe9]">
        {activity.map(([time, title, detail]) => (
          <div key={`${time}-${title}`} className="grid grid-cols-[32px_1fr] gap-3 py-3 text-[9px]">
            <span className="text-[#a19a87]">{time}</span>
            <div><p>{title}</p><p className="mt-1 text-[8px] text-[#a2a299]">{detail}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}