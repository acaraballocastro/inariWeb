import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";

const tourDays = [
  {
    date: "18 Oct",
    title: "Kyoto's eastern lanes",
    time: "09:30 – 16:00",
    location: "Higashiyama, Kyoto",
    details: "Kiyomizu-dera · Ninenzaka · Tea tasting",
  },
  {
    date: "20 Oct",
    title: "Quiet gardens of Arashiyama",
    time: "09:00 – 15:30",
    location: "Arashiyama, Kyoto",
    details: "Bamboo grove · Tenryu-ji · Riverside walk",
  },
];

export function ReservationDetailScreen() {
  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Reservations" />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Reservations / Detail" />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-5 pt-8 sm:pt-10">
                <Link href="/reservations" className="inline-flex bg-[#e9e5d7] px-3 py-2 text-[9px] text-[#5d5e55] transition-colors hover:bg-[#ded8c7]">
                  ← Reservations
                </Link>
                <p className="mt-6 text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">RESERVATION / DETAILS</p>
                <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">Kyoto, beyond the ordinary</h1>
                <div className="mt-4 flex items-center gap-3 text-[9px] text-[#98978c]">
                  <span>IN-2026-1042</span>
                  <span className="bg-[#e9e5d7] px-3 py-1 text-[#77786f]">Confirmed</span>
                </div>
              </header>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.72fr)]">
                <div className="space-y-5">
                  <ReservationInformation />
                  <RelatedTourDays />
                </div>
                <div className="space-y-5">
                  <DocumentsPanel />
                  <ClientReferences />
                  <ReservationActivity />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReservationInformation() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Reservation information</h2>
      <p className="mt-4 text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">ABOUT THIS JOURNEY</p>
      <p className="mt-3 text-[11px] leading-relaxed text-[#85867c]">A considered autumn journey through Kyoto&apos;s historic streets, temple gardens and quiet tea houses.</p>

      <div className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        <DetailItem label="Agency" value="Maple Travel" />
        <DetailItem label="Guests" value="8" />
        <DetailItem label="Quote number" value="QT-68314" />
        <DetailItem label="File number" value="MF-29801" />
        <DetailItem label="Client contact" value="Naomi Laurent" />
        <DetailItem label="Start date" value="Sun 18 October" />
        <DetailItem label="End date" value="Wed 21 October" />
      </div>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p>
      <p className="mt-2 text-[11px] text-[#55574f]">{value}</p>
    </div>
  );
}

function DocumentsPanel() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Documents</h2>
      <DetailItem label="Voucher" value="Generated" />
      <div className="mt-5"><DetailItem label="Client signature" value="Signed" /></div>
    </section>
  );
}

function ClientReferences() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Client references</h2>
      <div className="mt-5 space-y-4 text-[10px] text-[#85867c]">
        <div className="flex justify-between gap-4"><span>Quote</span><strong className="font-normal text-[#55574f]">QT-68314</strong></div>
        <div className="flex justify-between gap-4"><span>File</span><strong className="font-normal text-[#55574f]">MF-29801</strong></div>
      </div>
    </section>
  );
}

function RelatedTourDays() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Related tour days</h2>
      <p className="mt-3 text-[10px] text-[#85867c]">A considered itinerary, arranged day by day.</p>
      <div className="mt-5 divide-y divide-[#ecebe5]">
        {tourDays.map((day) => (
          <article key={day.date} className="grid gap-3 py-4 sm:grid-cols-[75px_minmax(0,1fr)_88px_auto] sm:items-start">
            <p className="text-[10px] text-[#55574f]">{day.date}</p>
            <div><Link href="/tours/kyoto-eastern-lanes" className="text-[10px] font-medium hover:text-[#9b8353]">{day.title}</Link><p className="mt-2 text-[8px] text-[#85867c]">{day.time}</p><p className="mt-1 text-[8px] text-[#85867c]">{day.location}</p><p className="mt-1 text-[8px] text-[#85867c]">{day.details}</p></div>
            <div><p className="text-[8px] font-semibold tracking-[0.18em] text-[#9b8353]">GUIDE</p><p className="mt-2 text-[9px] text-[#85867c]">Yuki Tanaka</p></div>
            <span className="bg-[#e9e5d7] px-3 py-2 text-center text-[8px] text-[#77786f]">Accepted</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReservationActivity() {
  const items = [
    ["08:42", "Reservation updated", "Guest count confirmed at 8 travelers."],
    ["09:05", "Guide accepted", "Yuki Tanaka accepted the assigned Kyoto tour."],
    ["09:22", "Voucher generated", "Client voucher prepared for review."],
  ];

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Recent activity</h2>
      <div className="mt-4 space-y-4">
        {items.map(([time, title, detail]) => <div key={time} className="grid grid-cols-[32px_1fr] gap-3 text-[9px]"><span className="text-[#9b8353]">{time}</span><div><p>{title}</p><p className="mt-1 leading-relaxed text-[#85867c]">{detail}</p><p className="mt-1 text-[8px] text-[#aaa99f]">By Operations team</p></div></div>)}
      </div>
    </section>
  );
}