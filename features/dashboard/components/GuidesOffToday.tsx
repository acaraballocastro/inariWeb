"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listAllAvailabilities, type GuideTimeOff } from "@/features/guides/api";
import { toDayKey } from "@/lib/datetime";

/** The guides who blocked today (Japan time), for the ADMIN dashboard. */
export function GuidesOffToday({ now }: { now: Date | null }) {
  const [blocks, setBlocks] = useState<GuideTimeOff[] | null>(null);
  const [failed, setFailed] = useState(false);
  const today = now ? toDayKey(now) : null;

  useEffect(() => {
    if (!today) return;
    let active = true;
    listAllAvailabilities(today, today)
      .then((items) => { if (active) setBlocks(items); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [today]);

  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta font-semibold tracking-[0.18em] text-[#9b8353]">GUIDES OFF TODAY</p>
        <Link href="/calendar" className="text-label underline underline-offset-2">Calendar</Link>
      </div>
      {failed && <p className="mt-4 text-meta text-[#9b6f37]">Could not load the guides&apos; availability.</p>}
      {!failed && !blocks && <p className="mt-4 text-meta text-[#96968b]">Loading…</p>}
      {blocks && blocks.length === 0 && <p className="mt-4 text-body text-[#85867c]">Every guide is available.</p>}
      {blocks && blocks.length > 0 && (
        <ul className="mt-4 space-y-3">
          {blocks.map((block) => (
            <li key={block.id} className="text-body">
              <Link href={`/guides/${block.guide_id}`} className="hover:underline">{block.guide_name || "Guide"}</Link>
              <p className="mt-0.5 text-label text-[#96968b]">{[block.start_date?.slice(0, 10) === block.end_date?.slice(0, 10) ? "Today" : `Until ${block.end_date?.slice(0, 10)}`, block.reason].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
