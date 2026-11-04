"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/features/notifications/api";
import { PushToggle } from "./PushToggle";
import { formatNotificationTime } from "./time";

const refreshEveryMs = 60_000;

/** The bell of the header: unread count and the latest notifications. */
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    getUnreadCount().then(setUnread).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, refreshEveryMs);
    window.addEventListener("focus", refreshCount);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshCount); };
  }, [refreshCount]);

  useEffect(() => {
    if (!isOpen) return;
    listNotifications({ limit: 8 }).then((result) => { setItems(result); setLoadFailed(false); }).catch(() => { setItems([]); setLoadFailed(true); });
    const close = (event: MouseEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [isOpen]);

  async function open(item: AppNotification) {
    if (!item.is_read) {
      await markNotificationRead(item.id).catch(() => undefined);
      setUnread((count) => Math.max(0, count - 1));
    }
    setIsOpen(false);
    router.push(item.url || "/notifications");
  }

  async function readAll() {
    await markAllNotificationsRead().catch(() => undefined);
    setUnread(0);
    setItems((current) => current?.map((item) => ({ ...item, is_read: true })) ?? null);
  }

  return (
    <div ref={panel} className="relative">
      <button type="button" aria-label={unread ? `${unread} unread notifications` : "Notifications"} onClick={() => setIsOpen((current) => !current)} className="relative flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#e9e5d7]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9b6f37] px-1 text-label font-medium text-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-[min(340px,calc(100vw-2rem))] border border-[#deddd6] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#ecebe5] px-4 py-3">
            <p className="font-serif text-base text-[#292b26]">Notifications</p>
            {unread > 0 && <button type="button" onClick={readAll} className="text-meta text-[#77786f] underline underline-offset-2">Mark all as read</button>}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {items === null && <p className="px-4 py-5 text-body text-[#85867c]">Loading…</p>}
            {loadFailed && <p role="status" className="px-4 py-5 text-body text-[#9b6f37]">Could not load the notifications.</p>}
            {!loadFailed && items?.length === 0 && <p className="px-4 py-5 text-body text-[#85867c]">Nothing yet.</p>}
            {items?.map((item) => (
              <button key={item.id} type="button" onClick={() => open(item)} className={`block w-full border-b border-[#f0efe9] px-4 py-3 text-left hover:bg-[#fbfaf7] ${item.is_read ? "" : "bg-[#fbf8f1]"}`}>
                <span className="flex items-start gap-2">
                  {!item.is_read && <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9b6f37]" />}
                  <span className="min-w-0">
                    <span className="block text-body font-medium text-[#292b26]">{item.title}</span>
                    {item.message && <span className="mt-1 block text-meta leading-relaxed text-[#77786f]">{item.message}</span>}
                    <span className="mt-1 block text-label text-[#aaa99f]">{formatNotificationTime(item.created_at)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-3 border-t border-[#ecebe5] px-4 py-3">
            <PushToggle compact />
            <Link href="/notifications" onClick={() => setIsOpen(false)} className="block text-meta text-[#292b26] underline underline-offset-2">All notifications</Link>
          </div>
        </div>
      )}
    </div>
  );
}
