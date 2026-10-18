const tours = [
  ["Kyoto, beyond the ordinary", "18 Oct · 09:30–16:00 · Kyoto", "Yuki Tanaka", "Accepted"],
  ["The heart of old Tokyo", "18 Oct · 10:00–17:00 · Tokyo", "Kenji Sato", "Accepted"],
  ["A day in the ancient capital", "19 Oct · 09:00–16:30 · Nara", "Not assigned", "Unassigned"],
  ["Hakone mountain escape", "19 Oct · 08:30–18:00 · Hakone", "Hana Suzuki", "Pending"],
];

export function UpcomingTours() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Upcoming tours</h2>
      <p className="mt-2 text-[10px] text-[#96968b]">Thoughtfully planned. Ready to explore.</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_92px_70px] gap-3 border-b border-[#ecebe5] pb-2 text-[8px] font-semibold tracking-[0.14em] text-[#a19a87]">
        <span>TOUR / DESTINATION</span><span>GUIDE</span><span>STATUS</span>
      </div>
      <div className="divide-y divide-[#f0efe9]">
        {tours.map(([title, detail, guide, status]) => (
          <div key={title} className="grid grid-cols-[minmax(0,1fr)_92px_70px] items-center gap-3 py-3 text-[9px]">
            <div><p>{title}</p><p className="mt-1 text-[8px] text-[#a2a299]">{detail}</p></div>
            <span className="text-[8px] text-[#8e8f85]">{guide}</span>
            <span className="bg-[#ebe7da] px-2 py-1 text-center text-[8px] text-[#77786f]">{status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}