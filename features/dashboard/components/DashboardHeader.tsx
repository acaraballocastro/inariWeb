"use client";

import { useEffect, useState } from "react";

import { formatClock } from "../api";
import { useCurrentUser } from "../useCurrentUser";

export function DashboardHeader({ breadcrumb = "Workspace / Dashboard" }: { breadcrumb?: string }) {
  const user = useCurrentUser();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[#deddd6] bg-[#f5f4f0] px-5 py-4 sm:px-8 lg:px-10">
      <p className="text-[9px] text-[#aaa99f]">{breadcrumb}</p>
      <div className="flex items-center gap-4 text-[9px] text-[#77786f]">
        {clock && <span className="hidden sm:inline">Tokyo · {clock} JST</span>}
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e9e5d7] font-medium text-[#5d5e55]">{initials || "·"}</span>
        {user && <span className="hidden sm:inline">{user.name.split(/\s+/)[0]}</span>}
      </div>
    </header>
  );
}
