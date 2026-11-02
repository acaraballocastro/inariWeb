"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/features/notifications/api";
import { PushToggle } from "./PushToggle";
import { formatNotificationTime } from "./time";

export function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listNotifications({ unreadOnly, limit: 100 })
      .then((list) => { setItems(list); setError(""); })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar las notificaciones."));
  }, [unreadOnly]);

  async function open(item: AppNotification) {
    if (!item.is_read) await markNotificationRead(item.id).catch(() => undefined);
    if (item.url) router.push(item.url);
    else setItems((current) => current?.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry) ?? null);
  }

  async function readAll() {
    await markAllNotificationsRead().catch(() => undefined);
    setItems((current) => (unreadOnly ? [] : current?.map((item) => ({ ...item, is_read: true })) ?? null));
  }

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Notifications" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Notifications" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[860px]">
              <header className="border-b border-[#deddd6] pb-6 pt-8 sm:pt-10">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">WORKSPACE / INBOX</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Notifications</h1>
              </header>

              <section className="mt-5 bg-white p-5 sm:p-6">
                <h2 className="font-serif text-xl">This device</h2>
                <div className="mt-3"><PushToggle /></div>
              </section>

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ecebe5] pb-4">
                  <label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Unread only</label>
                  <button type="button" onClick={readAll} className="h-8 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Mark all as read</button>
                </div>
                {error && <p role="alert" className="mt-4 text-[10px] text-[#9b6f37]">{error}</p>}
                {items === null && !error && <p className="mt-5 text-[10px] text-[#85867c]">Loading…</p>}
                {items?.length === 0 && <p className="mt-5 text-[10px] text-[#85867c]">{unreadOnly ? "Everything is read." : "No notifications yet."}</p>}
                <div className="divide-y divide-[#f0efe9]">
                  {items?.map((item) => (
                    <button key={item.id} type="button" onClick={() => open(item)} className={`block w-full px-2 py-4 text-left hover:bg-[#fbfaf7] ${item.is_read ? "" : "bg-[#fbf8f1]"}`}>
                      <span className="flex items-start gap-3">
                        <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.is_read ? "bg-transparent" : "bg-[#9b6f37]"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-[11px] font-medium">{item.title}</span><span className="text-[8px] text-[#aaa99f]">{formatNotificationTime(item.created_at)}</span></span>
                          {item.message && <span className="mt-1 block text-[10px] leading-relaxed text-[#77786f]">{item.message}</span>}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
