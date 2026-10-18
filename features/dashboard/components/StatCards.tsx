const stats = [
  ["Upcoming tours", "24", "Next 7 days"],
  ["Tours today", "06", "Across 3 destinations"],
  ["Unassigned tours", "03", "Guide needed"],
  ["Pending confirmations", "04", "Awaiting acceptance"],
  ["Open incidents", "02", "1 needs attention"],
];

export function StatCards() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(([label, value, note]) => (
        <article key={label} className="min-h-[100px] bg-white p-4">
          <p className="text-[9px] text-[#8b8c82]">{label}</p>
          <p className="mt-3 font-serif text-2xl leading-none">{value}</p>
          <p className="mt-2 text-[8px] text-[#aaa99f]">{note}</p>
        </article>
      ))}
    </div>
  );
}