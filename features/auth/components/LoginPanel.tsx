import Link from "next/link";

export function LoginPanel() {
  return (
    <section className="flex min-w-0 flex-col px-8 py-10 sm:px-12 sm:py-12 lg:px-[clamp(48px,6vw,96px)]">
      <header>
        <Link
          href="/"
          aria-label="INARI Tours, inicio"
          className="font-serif text-[32px] tracking-[0.16em] text-[#282a25]"
        >
          INARI
        </Link>

        <p className="mt-8 text-[10px] tracking-[0.55em] text-[#9b8353]">
          TOURS
        </p>
      </header>

      <div className="my-auto w-full max-w-[430px] py-12">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[#9b8353]">
          YOUR OPERATIONS WORKSPACE
        </p>

        <h1 className="mt-5 font-serif text-3xl font-medium tracking-tight text-[#282a25] sm:text-[32px]">
          Welcome back.
        </h1>

        <p className="mt-4 text-sm text-[#77796f]">
          Exceptional journeys begin with you.
        </p>

        <div className="mt-5 max-w-[380px] rounded-md border border-[#e8e6df] bg-white p-4">
          <h2 className="text-xs font-medium text-[#282a25]">
            Explore the INARI workspace
          </h2>

          <p className="mt-3 text-[11px] leading-relaxed text-[#77796f]">
            This prototype uses sample data. No email or password is required.
          </p>

          <Link
            href="/dashboard"
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[3px] bg-[#252821] px-4 text-xs font-medium text-white transition-colors hover:bg-[#3a3d34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#252821]"
          >
            Enter demo workspace
          </Link>
        </div>

        <p className="mt-4 max-w-[380px] text-[11px] leading-relaxed text-[#77796f]">
          Authentication will be connected in the production application.
        </p>
      </div>

      <footer className="text-[10px] text-[#77796f]">
        © 2026 INARI TOURS · Crafted journeys, considered details.
      </footer>
    </section>
  );
}