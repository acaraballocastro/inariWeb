import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";

const itinerary = [
  { time: "09:30", title: "Meet at Yasaka Shrine", location: "Higashiyama, Kyoto", description: "Welcome briefing and a quiet introduction to the eastern lanes." },
  { time: "10:15", title: "Kiyomizu-dera temple", location: "1 Chome-294 Kiyomizu", description: "Temple gardens, hillside views and the history of the Otowa waterfall." },
  { time: "12:30", title: "Seasonal tea tasting", location: "Ninenzaka tea house", description: "A considered lunch and tasting experience with local hosts." },
  { time: "14:00", title: "Ninenzaka to Gion", location: "Southern Higashiyama", description: "A walking route through preserved streets, craft shops and small gardens." },
];

const history = [
  ["08:42", "Guide accepted assignment", "Yuki Tanaka accepted the tour."],
  ["Yesterday", "Tour updated", "Tea tasting confirmed with the local host."],
  ["16 Oct", "Guide assigned", "Yuki Tanaka was assigned by Operations."],
];

export function TourDetailScreen() {
  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Tours" />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Tours / Detail" />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="pb-6 pt-8 sm:pt-10">
                <Link href="/dashboard" className="inline-flex bg-[#e9e5d7] px-3 py-2 text-[9px] text-[#5d5e55] transition-colors hover:bg-[#ded8c7]">← Tours</Link>
                <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">TOUR DAY / 18 OCTOBER 2026</p>
                    <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[38px]">Kyoto&apos;s eastern lanes</h1>
                    <p className="mt-2 text-[11px] text-[#85867c]">A slow walk through temple gardens, old lanes and seasonal Kyoto.</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]"><span className="bg-[#e9e5d7] px-3 py-2 text-[#77786f]">Accepted</span><span className="border border-[#deddd6] px-3 py-2 text-[#85867c]">IN-2026-1042</span></div>
                </div>
              </header>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
                <div className="space-y-5">
                  <TourOverview />
                  <ItineraryPanel />
                </div>
                <div className="space-y-5">
                  <AssignmentPanel />
                  <TourResources />
                  <TourHistory />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TourOverview() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ecebe5] pb-5">
        <div><h2 className="font-serif text-xl">Tour overview</h2><p className="mt-2 text-[10px] text-[#85867c]">The operational details for this experience.</p></div>
        <span className="text-[9px] text-[#9b8353]">ASSIGNED TOUR</span>
      </div>
      <div className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Date" value="Sunday, 18 October" />
        <Info label="Time" value="09:30 – 16:00" />
        <Info label="Guests" value="8 travellers" />
        <Info label="Location" value="Higashiyama, Kyoto" />
        <Info label="Reservation" value="IN-2026-1042" />
        <Info label="Agency" value="Maple Travel" />
      </div>
    </section>
  );
}

function AssignmentPanel() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Guide assignment</h2>
      <div className="mt-5 flex items-center gap-3 border-b border-[#ecebe5] pb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9e5d7] font-serif text-lg">YT</span>
        <div><p className="text-[11px]">Yuki Tanaka</p><p className="mt-1 text-[9px] text-[#85867c]">Kyoto guide · Japanese, English</p></div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[9px]"><span className="text-[#85867c]">Assignment status</span><span className="bg-[#e9e5d7] px-3 py-1 text-[#77786f]">Accepted</span></div>
      <Link href="#assignment-history" className="mt-5 block text-[9px] text-[#9b8353] hover:underline">View assignment history →</Link>
    </section>
  );
}

function ItineraryPanel() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-xl">Day itinerary</h2><p className="mt-2 text-[10px] text-[#85867c]">A considered route, arranged from morning to afternoon.</p></div><span className="text-[9px] text-[#9b8353]">4 STOPS</span></div>
      <div className="mt-5 divide-y divide-[#ecebe5]">
        {itinerary.map((stop) => <article key={stop.time} className="grid gap-3 py-4 sm:grid-cols-[58px_20px_minmax(0,1fr)]"><span className="text-[10px] text-[#9b8353]">{stop.time}</span><span className="relative mt-1 flex h-3 w-3 items-center justify-center rounded-full border border-[#b5a786] after:absolute after:left-1/2 after:top-3 after:h-16 after:w-px after:bg-[#deddd6] after:content-[''] last:after:hidden" aria-hidden="true" /> <div><h3 className="text-[11px]">{stop.title}</h3><p className="mt-1 text-[9px] text-[#9b8353]">{stop.location}</p><p className="mt-2 text-[10px] leading-relaxed text-[#85867c]">{stop.description}</p></div></article>)}
      </div>
    </section>
  );
}

function TourResources() {
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Tour resources</h2>
      <div className="mt-5 space-y-4"><Resource label="Activities" value="Tea tasting · Temple visit" /><Resource label="Places" value="Kiyomizu-dera · Gion" /><Resource label="Incidents" value="No open incidents" /></div>
    </section>
  );
}

function TourHistory() {
  return (
    <section id="assignment-history" className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Recent activity</h2>
      <div className="mt-5 space-y-5">{history.map(([time, title, detail]) => <div key={time} className="grid grid-cols-[48px_1fr] gap-3 text-[9px]"><span className="text-[#9b8353]">{time}</span><div><p>{title}</p><p className="mt-1 leading-relaxed text-[#85867c]">{detail}</p></div></div>)}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 text-[10px] text-[#55574f]">{value}</p></div>;
}

function Resource({ label, value }: { label: string; value: string }) {
  return <div className="border-b border-[#ecebe5] pb-3 last:border-0 last:pb-0"><p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 text-[10px] text-[#85867c]">{value}</p></div>;
}