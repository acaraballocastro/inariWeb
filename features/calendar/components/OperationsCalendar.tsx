"use client";

import { useState } from "react";

const weeks = [
  ["28", "29", "30", "1", "2", "3", "4"],
  ["5", "6", "7", "8", "9", "10", "11"],
  ["12", "13", "14", "15", "16", "17", "18"],
  ["19", "20", "21", "22", "23", "24", "25"],
  ["26", "27", "28", "29", "30", "31", "1"],
];

const events: Record<string, { title: string; time: string; tone: "gold" | "green" | "blue" }[]> = {
  "1": [{ title: "Kyoto eastern lanes", time: "09:30", tone: "green" }],
  "3": [{ title: "Old Tokyo discovery", time: "10:00", tone: "blue" }],
  "5": [{ title: "Hakone escape", time: "08:30", tone: "gold" }],
  "12": [{ title: "Nara ancient capital", time: "09:00", tone: "gold" }],
  "18": [{ title: "Kyoto walking tour", time: "09:30", tone: "green" }],
  "19": [{ title: "Hakone escape", time: "08:30", tone: "gold" }],
  "21": [{ title: "Bamboo trail", time: "10:00", tone: "green" }],
  "23": [{ title: "Tokyo through art", time: "09:00", tone: "blue" }],
};

const toneStyles = {
  gold: "border-[#cfc09b] bg-[#f2eddf]",
  green: "border-[#b9c8b5] bg-[#e8efe7]",
  blue: "border-[#bac8d0] bg-[#e8eef0]",
};

type CalendarView = "Month" | "Week" | "Agenda";

export function OperationsCalendar() {
  const [view, setView] = useState<CalendarView>("Month");

  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-[#ecebe5] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS PLANNING</p>
          <h2 className="mt-3 font-serif text-2xl">October 2026</h2>
          <p className="mt-2 text-[9px] text-[#96968b]">Japan Standard Time · 8 scheduled tour days</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="border border-[#deddd6] px-3 py-2 text-[9px] text-[#77786f]">‹</button>
          <button type="button" className="border border-[#deddd6] px-3 py-2 text-[9px] text-[#77786f]">Today</button>
          <button type="button" className="border border-[#deddd6] px-3 py-2 text-[9px] text-[#77786f]">›</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 bg-[#f8f7f3] p-1">
          {(["Month", "Week", "Agenda"] as CalendarView[]).map((option) => (
            <button key={option} type="button" onClick={() => setView(option)} className={`px-3 py-2 text-[9px] ${view === option ? "bg-white text-[#292b26] shadow-sm" : "text-[#96968b]"}`}>
              {option}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-[8px] text-[#85867c]">
          <Legend tone="bg-[#b9c8b5]" label="Assigned" />
          <Legend tone="bg-[#cfc09b]" label="Pending" />
          <Legend tone="bg-[#bac8d0]" label="In progress" />
        </div>
      </div>

      {view === "Month" && <MonthView />}
      {view === "Week" && <WeekView />}
      {view === "Agenda" && <AgendaView />}
    </section>
  );
}

function MonthView() {
  return (
    <>
      <div className="mt-6 grid grid-cols-7 text-center text-[8px] font-semibold tracking-[0.14em] text-[#a19a87]">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="mt-2 grid grid-cols-7 border-l border-t border-[#deddd6]">{weeks.flatMap((week, weekIndex) => week.map((day, dayIndex) => <CalendarCell key={`${weekIndex}-${dayIndex}`} day={day} muted={(weekIndex === 0 && dayIndex < 3) || (weekIndex === 4 && dayIndex === 6)} />))}</div>
    </>
  );
}

function CalendarCell({ day, muted }: { day: string; muted: boolean }) {
  const dayEvents = events[day] ?? [];

  return <div className={`min-h-[110px] border-b border-r border-[#deddd6] p-2 text-right ${day === "18" ? "bg-[#fbf8ed]" : ""}`}><span className={`text-[9px] ${muted ? "text-[#bbbcb4]" : "text-[#77786f]"}`}>{day}</span><div className="mt-2 space-y-1 text-left">{dayEvents.map((event) => <div key={event.title} className={`border-l-2 px-2 py-1.5 ${toneStyles[event.tone]}`}><p className="text-[8px] text-[#55574f]">{event.time}</p><p className="mt-1 truncate text-[8px] text-[#77786f]">{event.title}</p></div>)}</div></div>;
}

function WeekView() {
  return <div className="mt-6 grid gap-px border border-[#deddd6] bg-[#deddd6] sm:grid-cols-2 lg:grid-cols-4">{["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"].map((day) => <div key={day} className="min-h-32 bg-white p-3"><p className="text-[9px] font-semibold tracking-[0.12em] text-[#9b8353]">{day}</p>{day === "Sun 18" ? <div className="mt-4 border-l-2 border-[#b9c8b5] bg-[#e8efe7] px-2 py-2 text-[8px]"><p>09:30</p><p className="mt-1 text-[#77786f]">Kyoto walking tour</p></div> : <p className="mt-5 text-[9px] text-[#b0b1aa]">No tours scheduled</p>}</div>)}</div>;
}

function AgendaView() {
  return <div className="mt-6 divide-y divide-[#ecebe5] border-y border-[#ecebe5]">{Object.entries(events).flatMap(([day, dayEvents]) => dayEvents.map((event) => <div key={`${day}-${event.title}`} className="grid gap-3 py-4 sm:grid-cols-[70px_70px_minmax(0,1fr)_100px] sm:items-center"><span className="font-serif text-lg">{day} Oct</span><span className="text-[9px] text-[#9b8353]">{event.time}</span><div><p className="text-[10px]">{event.title}</p><p className="mt-1 text-[8px] text-[#96968b]">Kyoto · 8 guests</p></div><span className={`w-fit border-l-2 px-2 py-1 text-[8px] ${toneStyles[event.tone]}`}>{event.tone === "green" ? "Assigned" : event.tone === "gold" ? "Pending" : "In progress"}</span></div>))}</div>;
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2 w-2 ${tone}`} />{label}</span>;
}
