"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";

type ReservationStatus = "Confirmed" | "Pending" | "Draft";

type Reservation = {
  code: string;
  title: string;
  agency: string;
  dates: string;
  guests: string;
  status: ReservationStatus;
  voucher: string;
  signature: string;
};

const reservations: Reservation[] = [
  { code: "IN-2026-1042", title: "Kyoto, beyond the ordinary", agency: "Maple Travel", dates: "18 Oct\n21 Oct", guests: "8", status: "Confirmed", voucher: "Generated", signature: "Signed" },
  { code: "IN-2026-1043", title: "The heart of old Tokyo", agency: "Atlas Journeys", dates: "18 Oct\n20 Oct", guests: "12", status: "Confirmed", voucher: "Sent", signature: "Pending" },
  { code: "IN-2026-1044", title: "A day in the ancient capital", agency: "Maple Travel", dates: "19 Oct", guests: "6", status: "Pending", voucher: "Pending", signature: "Pending" },
  { code: "IN-2026-1045", title: "Hakone mountain escape", agency: "North & Beyond", dates: "19 Oct\n22 Oct", guests: "4", status: "Confirmed", voucher: "Generated", signature: "Signed" },
  { code: "IN-2026-1046", title: "Bamboo trails & quiet temples", agency: "Atlas Journeys", dates: "21 Oct\n23 Oct", guests: "10", status: "Confirmed", voucher: "Sent", signature: "Signed" },
  { code: "IN-2026-1047", title: "Tokyo through an artist's eyes", agency: "Maison Voyage", dates: "23 Oct\n24 Oct", guests: "2", status: "Pending", voucher: "Pending", signature: "Pending" },
  { code: "IN-2026-1048", title: "Autumn along the Nakasendo", agency: "North & Beyond", dates: "25 Oct\n29 Oct", guests: "8", status: "Confirmed", voucher: "Generated", signature: "Signed" },
  { code: "IN-2026-1049", title: "Gardens of Kanazawa", agency: "Maison Voyage", dates: "28 Oct\n30 Oct", guests: "6", status: "Draft", voucher: "Pending", signature: "Pending" },
];

const filters = ["All", "Confirmed", "Pending", "Draft"] as const;

export function ReservationsScreen() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof filters)[number]>("All");

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesStatus = statusFilter === "All" || reservation.status === statusFilter;
      const matchesQuery = !normalizedQuery || `${reservation.code} ${reservation.title} ${reservation.agency}`.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Reservations" />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Reservations" />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">OPERATIONS / AUTUMN 2026</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Reservations</h1>
                <p className="mt-2 text-[11px] text-[#85867c]">Every journey, thoughtfully organised. Manage your upcoming reservations and their operational details.</p>
              </header>

              <ReservationStats />

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div>
                  <h2 className="font-serif text-xl">The journeys ahead</h2>
                  <p className="mt-2 text-[9px] text-[#96968b]">October 2026 · All dates in Japan Standard Time</p>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="flex-1 text-[9px]">
                    <span className="mb-2 block">Search reservation</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search journey title..." className="h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none placeholder:text-[#aaa99f] focus:border-[#b5a786]" />
                  </label>
                  <div>
                    <p className="mb-2 text-[9px]">Status</p>
                    <div className="flex gap-1">
                      {filters.map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`h-9 px-3 text-[9px] transition-colors ${statusFilter === filter ? "bg-[#e9e5d7] text-[#55574f]" : "bg-[#f8f7f3] text-[#96968b] hover:bg-[#ebe9e1]"}`}>{filter}</button>)}
                    </div>
                  </div>
                  <button type="button" onClick={() => { setQuery(""); setStatusFilter("All"); }} className="h-9 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]">Reset</button>
                </div>

                <ReservationTable reservations={filteredReservations} />
                <p className="mt-5 text-[9px] text-[#96968b]">{filteredReservations.length} sample reservations · Search and status filters available</p>
              </section>

              <footer className="pt-8 text-[9px] tracking-[0.03em] text-[#a09f94]">DEMO WORKSPACE · Sample operational data · Not connected to live services</footer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReservationStats() {
  const stats = [["Total reservations", "08", "Sample workspace"], ["Confirmed", "05", "Ready for the journey"], ["Pending confirmation", "02", "Awaiting a decision"], ["Vouchers pending", "03", "Documents to prepare"]];

  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats.map(([label, value, note]) => <article key={label} className="min-h-[100px] bg-white p-4"><p className="text-[9px] text-[#8b8c82]">{label}</p><p className="mt-3 font-serif text-2xl leading-none">{value}</p><p className="mt-2 text-[8px] text-[#aaa99f]">{note}</p></article>)}</div>;
}

function ReservationTable({ reservations: items }: { reservations: Reservation[] }) {
  return <div className="mt-6 overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[minmax(245px,1.7fr)_minmax(110px,0.8fr)_75px_48px_75px_minmax(115px,0.9fr)] gap-3 border-b border-[#ecebe5] pb-3 text-[8px] font-semibold tracking-[0.16em] text-[#a19a87]"><span>RESERVATION</span><span>AGENCY</span><span>DATES</span><span>GUESTS</span><span>STATUS</span><span>DOCUMENTS</span></div><div className="divide-y divide-[#f0efe9]">{items.map((reservation) => <ReservationRow key={reservation.code} reservation={reservation} />)}</div></div></div>;
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  return <Link href={`/reservations/${reservation.code}`} className="grid grid-cols-[minmax(245px,1.7fr)_minmax(110px,0.8fr)_75px_48px_75px_minmax(115px,0.9fr)] items-center gap-3 py-4 text-[9px] hover:bg-[#fbfaf7]"><div><p className="text-[8px] text-[#9b9c92]">{reservation.code}</p><p className="mt-2 text-[10px]">{reservation.title}</p></div><span>{reservation.agency}</span><span className="whitespace-pre-line text-[8px] text-[#85867c]">{reservation.dates}</span><span>{reservation.guests}</span><span className="bg-[#e9e5d7] px-2 py-1 text-center text-[8px] text-[#77786f]">{reservation.status}</span><span className="text-[8px] leading-relaxed text-[#85867c]">Voucher · {reservation.voucher}<br />Signature · {reservation.signature}</span></Link>;
}