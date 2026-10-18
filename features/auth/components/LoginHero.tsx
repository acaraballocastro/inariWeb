import Image from "next/image";

export function LoginHero() {
  return (
    <aside className="relative hidden min-h-dvh min-w-0 overflow-hidden bg-[#d7d1c5] lg:block">
      <Image
        src="/images/kyoto-hero.png"
        alt="Templo tradicional japonés entre árboles otoñales en Kioto"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 0px"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/5" />

      <div className="absolute bottom-8 left-8 right-8 bg-[#252821] px-5 py-5 text-white sm:px-6 sm:py-6">
        <p className="text-[9px] font-semibold tracking-[0.2em]">
          KYOTO, JAPAN
        </p>

        <h2 className="mt-3 font-serif text-2xl tracking-tight xl:text-[28px]">
          Your journey, our story.
        </h2>
      </div>
    </aside>
  );
}