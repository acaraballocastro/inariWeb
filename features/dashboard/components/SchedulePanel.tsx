const schedule = [
  ["09:30", "Kyoto walking tour", "08 guests"],
  ["10:00", "Old Tokyo discovery", "12 guests"],
  ["14:00", "Tea ceremony experience", "06 guests"],
];

export function SchedulePanel() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl">Today&apos;s schedule</h2>
          <p className="mt-2 text-[9px] text-[#96968b]">18 OCTOBER · JAPAN TIME</p>
        </div>
        <button type="button" className="bg-[#ebe7da] px-3 py-2 text-[9px] text-[#5d5e55]">Agenda</button>
      </div>
      <div className="mt-5 divide-y divide-[#ecebe5]">
        {schedule.map(([time, title, guests]) => (
          <div key={title} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 py-3 text-[10px]">
            <span className="text-[#9b8353]">{time}</span>
            <span>{title}</span>
            <span className="text-[9px] text-[#999a90]">{guests}</span>
          </div>
        ))}
      </div>
    </section>
  );
}