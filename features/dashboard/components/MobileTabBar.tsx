"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useUnreadCount } from "@/features/notifications/useUnreadCount";
import { isAdmin } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";

type Tab = { label: string; href: string; icon: ReactNode; matches: string[] };

const icon = (path: ReactNode) => <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;

const icons = {
  home: icon(<><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h13V9" /></>),
  tours: icon(<><rect x="3.5" y="5" width="17" height="15.5" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>),
  available: icon(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  bell: icon(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  profile: icon(<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6" /></>),
  reservations: icon(<><path d="M6 3.5h9l4 4v13H6z" /><path d="M14.5 3.5v4.5H19M9 12.5h7M9 16h7" /></>),
  assign: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5M17 8v6M14 11h6" /></>),
  incident: icon(<><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.2v.1" /></>),
};

// Five destinations at most, the ones used in the field; the rest is in the
// menu of the header (☰).
const guideTabs: Tab[] = [
  { label: "Home", href: "/dashboard", icon: icons.home, matches: ["Dashboard"] },
  { label: "My tours", href: "/my-tours", icon: icons.tours, matches: ["My tours"] },
  { label: "Available", href: "/available", icon: icons.available, matches: ["Available tours"] },
  { label: "Alerts", href: "/notifications", icon: icons.bell, matches: ["Notifications"] },
  { label: "Profile", href: "/profile", icon: icons.profile, matches: ["Profile", "Availability"] },
];

const adminTabs: Tab[] = [
  { label: "Home", href: "/dashboard", icon: icons.home, matches: ["Dashboard"] },
  { label: "Bookings", href: "/reservations", icon: icons.reservations, matches: ["Reservations"] },
  { label: "Assign", href: "/assignments", icon: icons.assign, matches: ["Assignments"] },
  { label: "Incidents", href: "/incidents", icon: icons.incident, matches: ["Incidents"] },
  { label: "Alerts", href: "/notifications", icon: icons.bell, matches: ["Notifications"] },
];

/** The app's bottom navigation below the desktop breakpoint. */
export function MobileTabBar({ activeItem }: { activeItem: string }) {
  const session = useSession();
  const unread = useUnreadCount();
  if (!session) return null;
  const tabs = isAdmin(session) ? adminTabs : guideTabs;

  return (
    <nav aria-label="Main" className="mobile-tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-[#deddd6] bg-[#f5f4f0]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid h-[60px] max-w-[560px] grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.matches.includes(activeItem);
          return (
            <li key={tab.href}>
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] ${active ? "text-[#292b26]" : "text-[#96968b]"}`}>
                <span className="relative">
                  {tab.icon}
                  {tab.href === "/notifications" && unread > 0 && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9b6f37] px-1 text-[10px] font-medium text-white">{unread > 99 ? "99+" : unread}</span>}
                </span>
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
                {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 bg-[#9b8353]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
