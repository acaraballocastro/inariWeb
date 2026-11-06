"use client";

import { useEffect, useState } from "react";

import { isAdmin } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";
import { operationsTimeZone } from "@/lib/datetime";
import { loadDashboard, type DashboardData } from "../api";
import { useCurrentUser } from "../useCurrentUser";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { GuideDashboard } from "./GuideDashboard";
import { InstallBanner } from "@/features/pwa/InstallBanner";
import { MissingDataNotice } from "./MissingDataNotice";
import { OverviewBanner } from "./OverviewBanner";
import { RecentActivity } from "./RecentActivity";
import { SchedulePanel } from "./SchedulePanel";
import { StatCards } from "./StatCards";
import { UpcomingTours } from "./UpcomingTours";

export function DashboardScreen() {
  const user = useCurrentUser();
  const session = useSession();
  // Nothing loads until the session is read, so a guide never asks for the admin data.
  const role = session?.role ?? null;
  // Read the clock after mount so the prerender doesn't freeze a stale date.
  const [now, setNow] = useState<Date | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!role) return;
    let active = true;
    const current = new Date();

    // A guide's tours load in GuideDashboard; here only the clock is set.
    (role === "ADMIN" ? loadDashboard(current) : Promise.resolve(null))
      .then((result) => { if (active && result) setData(result); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the dashboard.");
      })
      .finally(() => { if (active) setNow(current); });

    return () => { active = false; };
  }, [role]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar />

        <div className="min-w-0 flex-1">
          <DashboardHeader />

          <div className="px-5 pb-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="mb-5 border-b border-[#deddd6] pb-5 pt-7 sm:pt-9">
                <p className="min-h-[1em] text-meta tracking-[0.08em] text-[#98978c]">
                  {now ? formatLongDate(now) : ""}
                </p>
                <h1 className="mt-3 min-h-[1.2em] font-serif text-3xl tracking-[-0.035em] sm:text-[36px]">
                  {now ? `${greeting(now)}${user ? `, ${user.name.split(/\s+/)[0]}` : ""}.` : ""}
                </h1>
                <p className="mt-2 text-lead text-[#85867c]">
                  {session && !isAdmin(session) ? "Your tours, today and upcoming." : "Here\u2019s what needs your attention today."}
                </p>
              </header>

              {session && !isAdmin(session) ? <GuideDashboard now={now} /> : <>

              {error && <p className="mb-5 bg-[#f4e4df] px-4 py-3 text-body text-[#8a3b2c]">{error}</p>}
              <MissingDataNotice missing={data?.missing ?? []} className="mb-5" />
              <InstallBanner className="mb-5" />

              <OverviewBanner />
              <StatCards stats={data?.stats ?? null} />

              <div className="mt-5">
                <SchedulePanel tours={data?.todayTours ?? null} today={now} />
              </div>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(255px,0.72fr)]">
                <div className="space-y-5">
                  <UpcomingTours tours={data?.upcomingTours ?? null} />
                  <RecentActivity activity={data?.activity ?? null} today={now} />
                </div>
                <aside className="space-y-5">
                  <AttentionPanel attention={data?.attention ?? null} />
                </aside>
              </div>
              </>}

              <footer className="pt-8 text-meta tracking-[0.03em] text-[#a09f94]">
                Live operational data · All times in Japan Standard Time (JST)
              </footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function AttentionPanel({ attention }: { attention: DashboardData["attention"] | null }) {
  const items = [
    ["Tours without a guide", attention?.unassigned],
    ["Awaiting guide acceptance", attention?.awaitingAcceptance],
    ["Signatures not sent", attention?.signaturesNotSent],
    ["Awaiting signature", attention?.awaitingSignature],
  ] as const;

  return (
    <section className="bg-[#e9e5d7] p-5 sm:p-6">
      <p className="text-meta font-semibold tracking-[0.18em] text-[#9b8353]">
        NEEDS YOUR ATTENTION
      </p>
      <ul className="mt-5 space-y-4 text-lead">
        {items.map(([label, value], index) => (
          <li key={label} className={`flex items-center justify-between ${index < items.length - 1 ? "border-b border-[#d7d1c1] pb-3" : ""}`}>
            <span>{label}</span>
            <strong className="font-serif text-lg font-normal">{value == null ? "—" : String(value).padStart(2, "0")}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: operationsTimeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value).toUpperCase();
}

function greeting(value: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: operationsTimeZone, hour: "numeric", hourCycle: "h23" }).format(value));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
