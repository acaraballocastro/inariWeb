import Image from "next/image";

export function OverviewBanner() {
  return (
    <section className="grid overflow-hidden bg-[#ebe7da] md:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)]">
      <div className="p-5 sm:p-7">
        <p className="text-[8px] font-semibold tracking-[0.2em] text-[#9b8353]">THE ART OF A WELL-PLANNED JOURNEY</p>
        <h2 className="mt-4 font-serif text-2xl tracking-[-0.03em] sm:text-[26px]">Every detail, thoughtfully in place.</h2>
        <p className="mt-2 text-[10px] text-[#85867c]">A new day of exceptional experiences across Japan.</p>
      </div>
      <div className="relative min-h-[155px]">
        <Image src="/images/kyoto-hero.png" alt="Kyoto temple at sunset" fill sizes="(min-width: 768px) 35vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}