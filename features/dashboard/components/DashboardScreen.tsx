import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { OverviewBanner } from "./OverviewBanner";
import { RecentActivity } from "./RecentActivity";
import { SchedulePanel } from "./SchedulePanel";
import { StatCards } from "./StatCards";
import { UpcomingTours } from "./UpcomingTours";

export function DashboardScreen() {
  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar />

        <div className="min-w-0 flex-1">
          <DashboardHeader />

          <div className="px-5 pb-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="mb-5 border-b border-[#deddd6] pb-5 pt-7 sm:pt-9">
                <p className="text-[9px] tracking-[0.08em] text-[#98978c]">
                  SUNDAY, 18 OCTOBER 2026
                </p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.035em] sm:text-[36px]">
                  Good morning, Agustin.
                </h1>
                <p className="mt-2 text-[11px] text-[#85867c]">
                  Here&apos;s what needs your attention today.
                </p>
              </header>

              <OverviewBanner />
              <StatCards />

              <div className="mt-5">
                <SchedulePanel />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(255px,0.72fr)]">
                <div className="space-y-5">
                  <UpcomingTours />
                  <RecentActivity />
                </div>
                <aside className="space-y-5">
                  <AttentionPanel />
                </aside>
              </div>

              <footer className="pt-8 text-[9px] tracking-[0.03em] text-[#a09f94]">
                DEMO WORKSPACE · Sample operational data · Not connected to live services
              </footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function AttentionPanel() {
  return (
    <section className="bg-[#e9e5d7] p-5 sm:p-6">
      <p className="text-[9px] font-semibold tracking-[0.18em] text-[#9b8353]">
        NEEDS YOUR ATTENTION
      </p>
      <ul className="mt-5 space-y-4 text-[11px]">
        <li className="flex items-center justify-between border-b border-[#d7d1c1] pb-3">
          <span>Tours without a guide</span>
          <strong className="font-serif text-lg font-normal">03</strong>
        </li>
        <li className="flex items-center justify-between border-b border-[#d7d1c1] pb-3">
          <span>Awaiting guide acceptance</span>
          <strong className="font-serif text-lg font-normal">04</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Pending signatures</span>
          <strong className="font-serif text-lg font-normal">02</strong>
        </li>
      </ul>
    </section>
  );
}