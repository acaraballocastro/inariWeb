"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HistoryEntry } from "@/features/tours/api";
import { formatJst } from "@/lib/datetime";

/**
 * Timeline of a reservation or tour day. `version` reloads it after an action
 * on the parent screen changes the history.
 */
export function HistoryTimeline({ load, version = 0, showTourDay = false, limit = 12 }: { load: () => Promise<HistoryEntry[]>; version?: number; showTourDay?: boolean; limit?: number }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    load()
      .then((items) => { if (active) { setEntries(items); setError(""); } })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the history."); });
    return () => { active = false; };
  }, [load, version]);

  const visible = entries && !showAll ? entries.slice(0, limit) : entries;

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">History</h2>
      {error && <p role="alert" className="mt-4 text-body text-[#9b6f37]">{error}</p>}
      {!entries && !error && <p className="mt-4 text-body text-[#85867c]">Loading history...</p>}
      {entries?.length === 0 && <p className="mt-4 text-body text-[#85867c]">No changes registered yet.</p>}
      {visible && visible.length > 0 && (
        <ol className="mt-5 space-y-4">
          {visible.map((entry, index) => (
            <li key={`${entry.created_at}-${index}`} className="grid grid-cols-[70px_1fr] gap-3 text-meta">
              <span className="text-[#9b8353]">{formatJst(entry.created_at, { day: "2-digit", month: "short" })}<span className="block text-label text-[#aaa99f]">{formatJst(entry.created_at, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}</span></span>
              <div className="min-w-0">
                <p>{describe(entry)}</p>
                <p className="mt-1 text-label text-[#85867c]">
                  {showTourDay && entry.tour_day_id && <><Link href={`/tours/${entry.tour_day_id}`} className="hover:underline">{entry.tour_day_code ?? "Tour day"}</Link> · </>}
                  {actor(entry)}
                </p>
                {entry.reason && <p className="mt-1 leading-relaxed text-[#85867c]">{entry.reason}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {entries && entries.length > limit && <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-4 text-meta underline underline-offset-2">{showAll ? "Show less" : `Show all ${entries.length}`}</button>}
    </section>
  );
}

function describe(entry: HistoryEntry) {
  if (entry.type === "TOUR_DAY_ASSIGNMENT") {
    const guide = entry.guide_name ?? "guide";
    if (entry.action === "ASSIGNED") return `Assigned to ${guide}`;
    if (entry.action === "UNASSIGNED") return `${guide} unassigned`;
    if (entry.action === "REJECTED") return `Rejected by ${guide}`;
    return `${formatLabel(entry.action ?? "Assignment")} · ${guide}`;
  }
  const subject = entry.type === "RESERVATION_STATUS" ? "Reservation" : "Day";
  const to = entry.new_status ? formatLabel(entry.new_status) : "—";
  return entry.previous_status ? `${subject}: ${formatLabel(entry.previous_status)} → ${to}` : `${subject}: ${to}`;
}

function actor(entry: HistoryEntry) {
  if (entry.changed_by_name) return entry.changed_by_name;
  if (entry.changed_by === "SYSTEM" || !entry.changed_by) return "System";
  return formatLabel(entry.changed_by);
}

function formatLabel(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
