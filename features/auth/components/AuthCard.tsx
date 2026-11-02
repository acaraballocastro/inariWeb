import type { ReactNode } from "react";

/** Centered card shared by the account screens outside the workspace. */
export function AuthCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f1f0ec] px-5 text-[#292b26]">
      <section className="w-full max-w-[430px] bg-[#f8f7f3] p-7 sm:p-10">
        <p className="font-serif text-[25px] tracking-[0.16em]">INARI</p>
        <p className="mt-2 text-[8px] tracking-[0.5em] text-[#9b8353]">TOURS</p>
        <p className="mt-12 text-[9px] font-semibold tracking-[0.18em] text-[#9b8353]">{eyebrow}</p>
        <h1 className="mt-4 font-serif text-3xl tracking-[-0.04em]">{title}</h1>
        {children}
      </section>
    </main>
  );
}

export const authInputClass = "mt-2 h-10 w-full border border-[#e3e1da] bg-white px-3 text-xs outline-none focus:border-[#b5a786]";
export const authButtonClass = "mt-5 flex h-11 w-full items-center justify-center bg-[#292b26] text-xs font-medium text-white hover:bg-[#3a3d34] disabled:cursor-wait disabled:opacity-60";
export const authLinkClass = "text-[10px] text-[#77796f] underline underline-offset-4 hover:text-[#292b26]";
