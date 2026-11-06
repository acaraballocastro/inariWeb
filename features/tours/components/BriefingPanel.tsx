"use client";

import { useEffect, useState } from "react";
import { getTourDayBriefing, type TourDayBriefing } from "@/features/tours/api";

/**
 * The reservation and customers of the guide's day (spec 4.4, 4.5): what they
 * need on the day, with the phones ready to call.
 */
export function BriefingPanel({ tourDayId }: { tourDayId: string }) {
  const [briefing, setBriefing] = useState<TourDayBriefing | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getTourDayBriefing(tourDayId)
      .then((result) => { if (active) setBriefing(result); })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the customers."); });
    return () => { active = false; };
  }, [tourDayId]);

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Customers</h2>
      {error && <p role="alert" className="mt-4 text-body text-[#9b6f37]">{error}</p>}
      {!briefing && !error && <p className="mt-4 text-body text-[#85867c]">Loading…</p>}
      {briefing && (
        <>
          <div className="mt-4 border-b border-[#ecebe5] pb-4">
            <p className="text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Reservation {briefing.reservation.code ?? ""}</p>
            <p className="mt-2 text-body">{briefing.reservation.title || "Untitled reservation"}{briefing.reservation.total_people_count ? ` · ${briefing.reservation.total_people_count} travellers` : ""}</p>
            {briefing.reservation.description && <p className="mt-2 whitespace-pre-line text-body leading-relaxed text-[#85867c]">{briefing.reservation.description}</p>}
          </div>
          {briefing.customers.length === 0 && <p className="mt-4 text-body text-[#85867c]">No customers on the reservation.</p>}
          <ul className="divide-y divide-[#f0efe9]">
            {briefing.customers.map((customer, index) => (
              <li key={`${customer.full_name}-${index}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-body">{customer.full_name || "Unnamed customer"}</p>
                  {customer.age != null && <p className="mt-0.5 text-label text-[#a2a299]">{customer.age} years</p>}
                </div>
                {customer.phone && <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="flex h-10 shrink-0 items-center border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">Call {customer.phone}</a>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
