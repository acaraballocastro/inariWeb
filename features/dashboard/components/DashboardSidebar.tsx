"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession, isAdmin, type Session } from "@/lib/api/client";
import { useSession } from "@/lib/api/useSession";
import { logout, logoutEverywhere } from "@/features/auth/api";
import { MobileTabBar } from "./MobileTabBar";
import { Logo } from "@/features/brand/Logo";

type NavItem = { label: string; href: string };
type NavSection = { title: string; items: NavItem[] };

const adminNavigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reservations", href: "/reservations" },
  { label: "Calendar", href: "/calendar" },
  { label: "Assignments", href: "/assignments" },
  { label: "Incidents", href: "/incidents" },
  { label: "Notifications", href: "/notifications" },
];

const adminSections: NavSection[] = [
  { title: "Content", items: [{ label: "Activities", href: "/activities" }, { label: "Places", href: "/places" }, { label: "Itinerary templates", href: "/itinerary-templates" }, { label: "Hotels", href: "/hotels" }, { label: "Languages", href: "/languages" }, { label: "Zones", href: "/zones" }] },
  { title: "Management", items: [{ label: "Guides", href: "/guides" }, { label: "Users", href: "/users" }, { label: "Agencies", href: "/agencies" }, { label: "Customers", href: "/customers" }, { label: "Audit log", href: "/audit" }, { label: "Settings", href: "/settings" }, { label: "System", href: "/system" }] },
];

const guideNavigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My tours", href: "/my-tours" },
  { label: "Available tours", href: "/available" },
  { label: "Availability", href: "/availability" },
  { label: "Profile", href: "/profile" },
  { label: "Incidents", href: "/incidents" },
  { label: "Notifications", href: "/notifications" },
];

// A guide only reaches their own days, incidents and availability; the rest of the API answers 403.
const guidePaths = ["/dashboard", "/my-tours", "/available", "/tours/", "/incidents", "/availability", "/notifications", "/profile"];

export function navigationFor(session: Session | null): { navigation: NavItem[]; sections: NavSection[] } {
  if (!session) return { navigation: [], sections: [] };
  return isAdmin(session) ? { navigation: adminNavigation, sections: adminSections } : { navigation: guideNavigation, sections: [] };
}

export function useSignOut() {
  const { confirm } = useDialogs();
  const router = useRouter();

  async function signOut() {
    await logout();
    router.replace("/");
  }

  async function signOutEverywhere() {
    if (!await confirm({ title: "Sign out on all devices?", message: "Every device where you are signed in is signed out, this one included.", confirmLabel: "Sign out everywhere" })) return;
    await logoutEverywhere();
    router.replace("/");
  }

  return { signOut, signOutEverywhere };
}

export function DashboardSidebar({ activeItem = "Dashboard" }: { activeItem?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/");
      return;
    }
    if (current.mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    if (!isAdmin(current) && !guidePaths.some((path) => pathname.startsWith(path))) {
      router.replace("/dashboard");
    }
  }, [router, pathname]);

  const { navigation, sections } = navigationFor(session);

  return (
    <>
    <MobileTabBar activeItem={activeItem} />
    <aside className="hidden w-[220px] shrink-0 border-r border-[#deddd6] bg-[#f5f4f0] px-5 py-7 lg:block xl:w-[250px] xl:px-7">
      <Link href="/" aria-label="INARI Tours, home" className="block">
        <Logo width={168} />
      </Link>

      <NavigationLinks navigation={navigation} sections={sections} activeItem={activeItem} />

      <div className="mt-10 border-t border-[#deddd6] pt-5">
        <p className="text-label font-semibold tracking-[0.2em] text-[#aaa28f]">JAPAN OPERATIONS</p>
        <p className="mt-2 text-body text-[#77786f]">{session && !isAdmin(session) ? "Guide workspace" : "Autumn season · 2026"}</p>
        <AccountLinks className="mt-4 space-y-2 text-meta" />
      </div>
    </aside>
    </>
  );
}

/** Change password and sign out, at the foot of the sidebar and of the mobile menu. */
export function AccountLinks({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  const { signOut, signOutEverywhere } = useSignOut();
  const linkClass = "block text-[#77786f] underline underline-offset-4 hover:text-[#292b26]";
  return (
    <div className={className}>
      <Link href="/profile" onClick={onNavigate} className={linkClass}>My profile</Link>
      <Link href="/change-password" onClick={onNavigate} className={linkClass}>Change password</Link>
      <button type="button" onClick={signOut} className={linkClass}>Sign out</button>
      <button type="button" onClick={signOutEverywhere} className={linkClass}>Sign out on all devices</button>
    </div>
  );
}

export function NavigationLinks({ navigation, sections, activeItem, onNavigate }: { navigation: NavItem[]; sections: NavSection[]; activeItem?: string; onNavigate?: () => void }) {
  return (
    <nav className="mt-9" aria-label="Main navigation">
      <div className="space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={`block px-3 py-2 text-lead transition-colors ${
              item.label === activeItem ? "bg-[#e9e5d7] font-medium" : "text-[#66685f] hover:bg-[#ecebe5]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="mt-7">
          <p className="px-3 text-label font-semibold tracking-[0.2em] text-[#aaa28f]">{section.title}</p>
          <div className="mt-2 space-y-1">
            {section.items.map((item) => (
              <Link key={item.label} href={item.href} onClick={onNavigate} className={`block px-3 py-1.5 text-lead ${item.label === activeItem ? "font-medium text-[#292b26]" : "text-[#77786f] hover:text-[#292b26]"}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
