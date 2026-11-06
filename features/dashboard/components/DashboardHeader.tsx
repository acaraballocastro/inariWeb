"use client";

import { useEffect, useState } from "react";

import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useSession } from "@/lib/api/useSession";
import { formatClock } from "../api";
import { useCurrentUser } from "../useCurrentUser";
import { AccountLinks, NavigationLinks, navigationFor } from "./DashboardSidebar";
import { Logo } from "@/features/brand/Logo";

export function DashboardHeader({ breadcrumb = "Workspace / Dashboard" }: { breadcrumb?: string }) {
  const user = useCurrentUser();
  const [clock, setClock] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const initials = user?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-[#deddd6] bg-[#f5f4f0] px-5 py-4 sm:px-8 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => setIsMenuOpen(true)} aria-label="Open menu" className="flex h-8 w-8 items-center justify-center border border-[#deddd6] text-ui-lg text-[#5d5e55] lg:hidden">☰</button>
        <p className="truncate text-meta text-[#aaa99f]">{breadcrumb}</p>
      </div>
      <div className="flex items-center gap-4 text-meta text-[#77786f]">
        {clock && <span className="hidden sm:inline">Tokyo · {clock} JST</span>}
        {/* On phones the tab bar has the notifications. */}
        <span className="hidden lg:block"><NotificationBell /></span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e9e5d7] font-medium text-[#5d5e55]">{initials || "·"}</span>
        {user && <span className="hidden sm:inline">{user.name.split(/\s+/)[0]}</span>}
      </div>
      {isMenuOpen && <MobileMenu onClose={() => setIsMenuOpen(false)} />}
    </header>
  );
}

// The sidebar is only shown on large screens; below that the same links open from the header.
function MobileMenu({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const { navigation, sections } = navigationFor(session);

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-[#292b26]/30" />
      <div className="absolute inset-y-0 left-0 w-[260px] max-w-[85vw] overflow-y-auto bg-[#f5f4f0] px-5 py-7 text-[#292b26]">
        <div className="flex items-start justify-between">
          <Logo width={150} />
          <button type="button" onClick={onClose} aria-label="Close menu" className="h-8 w-8 border border-[#deddd6] text-lead">✕</button>
        </div>
        <NavigationLinks navigation={navigation} sections={sections} onNavigate={onClose} />
        <AccountLinks className="mt-10 space-y-3 border-t border-[#deddd6] pt-5 text-body" onNavigate={onClose} />
      </div>
    </div>
  );
}
