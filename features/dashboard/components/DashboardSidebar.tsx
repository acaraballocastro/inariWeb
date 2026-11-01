"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/api/client";
import { logout } from "@/features/auth/api";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Reservations", href: "/reservations" },
  { label: "Calendar", href: "/calendar" },
  { label: "Assignments", href: "#assignments" },
  { label: "Incidents", href: "#incidents" },
];

const sections = [
  { title: "Content", items: ["Itineraries", "Activities", "Places", "Languages", "Zones"] },
  { title: "Management", items: ["Guides", "Users", "Tour Templates"] },
  { title: "Documents", items: ["Vouchers", "Signatures"] },
];

export function DashboardSidebar({ activeItem = "Dashboard" }: { activeItem?: string }) {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/");
      return;
    }
    if (session.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace("/");
  }

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[#deddd6] bg-[#f5f4f0] px-5 py-7 lg:block xl:w-[250px] xl:px-7">
      <Link href="/" className="block font-serif text-[25px] tracking-[0.16em]">
        INARI
        <span className="mt-2 block text-[7px] tracking-[0.5em] text-[#9b8353]">TOURS</span>
      </Link>

      <nav className="mt-9" aria-label="Main navigation">
        <div className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block px-3 py-2 text-[11px] transition-colors ${
                item.label === activeItem ? "bg-[#e9e5d7] font-medium" : "text-[#66685f] hover:bg-[#ecebe5]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {sections.map((section) => (
          <div key={section.title} className="mt-7">
            <p className="px-3 text-[8px] font-semibold tracking-[0.2em] text-[#aaa28f]">{section.title}</p>
            <div className="mt-2 space-y-1">
              {section.items.map((item) => (
                <Link key={item} href={item === "Guides" ? "/guides" : item === "Users" ? "/users" : item === "Languages" ? "/languages" : item === "Zones" ? "/zones" : item === "Places" ? "/places" : `#${item.toLowerCase().replaceAll(" ", "-")}`} className={`block px-3 py-1.5 text-[11px] ${item === activeItem ? "font-medium text-[#292b26]" : "text-[#77786f] hover:text-[#292b26]"}`}>
                  {item}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-10 border-t border-[#deddd6] pt-5">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#aaa28f]">JAPAN OPERATIONS</p>
        <p className="mt-2 text-[10px] text-[#77786f]">Autumn season · 2026</p>
        <button type="button" onClick={handleSignOut} className="mt-4 text-[9px] text-[#77786f] underline underline-offset-4 hover:text-[#292b26]">Sign out</button>
      </div>
    </aside>
  );
}