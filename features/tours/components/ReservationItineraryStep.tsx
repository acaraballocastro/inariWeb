"use client";

import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { withFallback } from "@/lib/missing";
import { useEffect, useState } from "react";
import type { Reservation } from "@/features/reservations/api";
import { listItineraryActivities, listItineraryPlaces, listTourDaysByReservation, type ItineraryActivity, type ItineraryPlace, type TourDay } from "@/features/tours/api";
import { ItineraryEditor } from "@/features/tours/components/ItineraryEditor";
import { formatJst, formatJstClock } from "@/lib/datetime";

// Third step of the reservation creation: the itinerary of each tour day. It can be skipped
// and completed later from the tour day detail.
export function ReservationItineraryStep({ reservation, onBack, onFinish }: { reservation: Reservation; onBack: () => void; onFinish: () => void }) {
  const [tourDays, setTourDays] = useState<TourDay[]>([]);
  const [places, setPlaces] = useState<ItineraryPlace[]>([]);
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  const [activeId, setActiveId] = useState("");
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();

  useEffect(() => {
    let active = true;
    listTourDaysByReservation(reservation.id)
      .then(async (items) => {
        const sorted = items.filter((day) => day.status !== "CANCELLED").sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
        const failed: string[] = [];
        const [placeItems, activityItems] = await Promise.all([sorted[0] ? withFallback(listItineraryPlaces(), [], "places", failed) : [], withFallback(listItineraryActivities(), [], "activities", failed)]);
        if (!active) return;
        failed.forEach(report);
        setTourDays(sorted); setPlaces(placeItems); setActivities(activityItems); setActiveId(sorted[0]?.id ?? "");
      })
      .catch((requestError: unknown) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load the tour days."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [reservation.id, report]);

  const activeDay = tourDays.find((day) => day.id === activeId);
  const plannedDays = tourDays.filter((day) => (stopCounts[day.id] ?? 0) > 0).length;

  return (
    <div className="px-6 py-6 sm:px-8">
      {error && <p role="alert" className="mb-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]">{error}</p>}
      <MissingDataNotice missing={missing} className="mb-5" />
      <p className="text-[10px] leading-relaxed text-[#85867c]">Arrange the stops of each day. You can skip this step and complete the itinerary later from each tour day.</p>
      {isLoading && <p className="mt-5 text-[10px] text-[#85867c]">Loading tour days...</p>}
      {!isLoading && tourDays.length === 0 && !error && <p className="mt-5 text-[10px] text-[#85867c]">No tour days linked.</p>}

      {tourDays.length > 0 && (
        <>
          <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[#ecebe5] pb-3">
            {tourDays.map((day, index) => <button key={day.id} type="button" onClick={() => setActiveId(day.id)} className={`shrink-0 px-3 py-2 text-left text-[9px] transition-colors ${day.id === activeId ? "bg-[#e9e5d7] text-[#55574f]" : "bg-[#f8f7f3] text-[#96968b] hover:bg-[#ebe9e1]"}`}><span className="block font-semibold tracking-[0.12em]">DAY {index + 1}</span><span className="mt-1 block">{formatDate(day.start_datetime)}{stopCounts[day.id] ? ` · ${stopCounts[day.id]} stops` : ""}</span></button>)}
          </div>
          {activeDay && (
            <section className="mt-5">
              <h3 className="font-serif text-lg">{activeDay.title || "Untitled tour day"}</h3>
              <p className="mt-1 text-[9px] text-[#85867c]">{formatDate(activeDay.start_datetime)} · Starts {toClock(activeDay.start_datetime)}{activeDay.meeting_point ? ` · ${activeDay.meeting_point}` : ""}</p>
              <ItineraryEditor key={activeDay.id} tourDay={activeDay} places={places} activities={activities} onCountChange={(count) => setStopCounts((current) => current[activeDay.id] === count ? current : { ...current, [activeDay.id]: count })} />
            </section>
          )}
        </>
      )}

      <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-[#ecebe5] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="h-10 border border-[#deddd6] px-5 text-[10px] hover:bg-[#f8f7f3]">← Tour days</button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <p className="text-[9px] text-[#96968b]">{plannedDays} of {tourDays.length} days planned</p>
          <button type="button" onClick={onFinish} className="h-10 border border-[#deddd6] px-5 text-[10px] hover:bg-[#f8f7f3]">Skip for now</button>
          <button type="button" onClick={onFinish} className="h-10 bg-[#292b26] px-6 text-[10px] text-white transition-colors hover:bg-[#41443b]">Finish</button>
        </div>
      </footer>
    </div>
  );
}

function formatDate(value: string) { return formatJst(value, { weekday: "short", day: "2-digit", month: "short" }); }
function toClock(value: string) { return formatJstClock(value); }
