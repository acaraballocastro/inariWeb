import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { OperationsCalendar } from "./OperationsCalendar";

export function CalendarScreen() {
  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Calendar" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Calendar" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / PLANNING</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Calendar</h1>
                <p className="mt-2 text-[11px] text-[#85867c]">Keep every journey moving with a clear view of the season ahead.</p>
              </header>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                <OperationsCalendar />
                <CalendarSummary />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CalendarSummary() {
  return (
    <aside className="space-y-5">
      <section className="bg-white p-5 sm:p-6">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">TODAY · 18 OCT</p>
        <h2 className="mt-3 font-serif text-xl">Your schedule</h2>
        <div className="mt-5 space-y-4">
          <ScheduleItem time="09:30" title="Kyoto walking tour" detail="Yuki Tanaka · 8 guests" />
          <ScheduleItem time="14:00" title="Tea ceremony experience" detail="Gion · 6 guests" />
        </div>
      </section>
      <section className="bg-[#e9e5d7] p-5 sm:p-6">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">AT A GLANCE</p>
        <div className="mt-5 space-y-4">
          <SummaryItem label="Scheduled tours" value="08" />
          <SummaryItem label="Unassigned" value="03" />
          <SummaryItem label="Conflicts" value="00" />
        </div>
      </section>
    </aside>
  );
}

function ScheduleItem({ time, title, detail }: { time: string; title: string; detail: string }) {
  return <div className="border-l-2 border-[#b9c8b5] pl-3"><p className="text-[9px] text-[#9b8353]">{time}</p><p className="mt-1 text-[10px]">{title}</p><p className="mt-1 text-[8px] text-[#85867c]">{detail}</p></div>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-[#d7d1c1] pb-3 text-[10px] last:border-0 last:pb-0"><span>{label}</span><strong className="font-serif text-lg font-normal">{value}</strong></div>;
}