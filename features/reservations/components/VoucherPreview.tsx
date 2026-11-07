"use client";

import { useEffect, useRef, useState } from "react";
import { voucherLanguages, type VoucherSource } from "@/features/reservations/api";

// Width of the preview document: an A4 sheet (210mm = 793.7px) and 24px of
// room each side (see the @media screen rule of voucher.html).
const sheetWidth = 842;
// Room between the toolbar and the first sheet, in screen pixels (not scaled).
const topGap = 24;

type Loaded = { language: string; html: string; error: string };

/**
 * The voucher in a window over the page: the HTML with each page as a real A4
 * sheet (same margins as the PDF), scaled down to fit the window instead of
 * reflowed. It runs in a sandboxed frame (no scripts). The language can be
 * switched and that version generated from here.
 */
export function VoucherPreview({ source, language: initialLanguage, canGenerate, generating, onGenerate, onClose }: { source: VoucherSource; language: string; canGenerate: boolean; generating: boolean; onGenerate: (language: string) => void; onClose: () => void }) {
  const [language, setLanguage] = useState(initialLanguage);
  // Each answer is kept with its language, so switching shows "loading" until it arrives.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const current = loaded?.language === language ? loaded : null;
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: sheetWidth, height: 600 });

  useEffect(() => {
    let active = true;
    source.preview(language)
      .then((blob) => blob.text())
      .then((html) => { if (active) setLoaded({ language, html, error: "" }); })
      .catch((requestError) => { if (active) setLoaded({ language, html: "", error: requestError instanceof Error ? requestError.message : "Could not load the preview." }); });
    return () => { active = false; };
  }, [source, language]);

  // The space for the sheet, to scale it.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  const scale = Math.min(1, box.width / sheetWidth);

  return (
    // pwa-dvh, not inset-0: the phone zoom (globals.css) makes a full-height layer taller than the screen.
    <div role="dialog" aria-modal="true" aria-label="Voucher preview" className="fixed inset-x-0 top-0 z-50 flex pwa-dvh items-stretch justify-center bg-black/40 sm:p-6" onClick={onClose}>
      <div className="flex w-full max-w-[920px] flex-col bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#deddd6] bg-white px-4 py-3">
          <h2 className="mr-auto font-serif text-lg">Voucher preview <span className="text-meta text-[#96968b]">· {source.label}</span></h2>
          <div role="group" aria-label="Language" className="flex border border-[#deddd6]">
            {voucherLanguages.map((item) => (
              <button key={item.value} type="button" aria-pressed={language === item.value} onClick={() => setLanguage(item.value)} className={`h-9 px-3 text-meta ${language === item.value ? "bg-[#292b26] text-white" : "bg-white hover:bg-[#f8f7f3]"}`}>{item.value.toUpperCase()}</button>
            ))}
          </div>
          {canGenerate && <button type="button" onClick={() => onGenerate(language)} disabled={generating || !current?.html} className="h-9 bg-[#9b8353] px-3 text-meta text-white hover:bg-[#86703f] disabled:opacity-60">{generating ? "Generating…" : "Generate PDF"}</button>}
          <button type="button" onClick={onClose} aria-label="Close preview" className="flex h-9 w-9 items-center justify-center border border-[#deddd6] bg-white text-meta hover:bg-[#f8f7f3]">✕</button>
        </div>
        <div ref={frame} className="relative min-h-0 flex-1 overflow-hidden">
          {current?.error && <p role="alert" className="m-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-meta text-[#9b6f37]">{current.error}</p>}
          {!current && <p className="absolute inset-0 flex items-center justify-center text-body text-[#85867c]">Loading preview…</p>}
          {current?.html && (
            // As wide as the sheet and scaled to the space: the sheet keeps its A4 proportions and margins.
            <iframe title="Voucher preview" srcDoc={current.html} sandbox="" className="absolute left-1/2 border-0 bg-white" style={{ top: topGap, width: sheetWidth, height: (box.height - topGap) / scale, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }} />
          )}
        </div>
        <p className="border-t border-[#deddd6] bg-white px-4 py-2 text-label text-[#96968b]">A4 pages with the PDF&apos;s margins, with the current data. Not saved.</p>
      </div>
    </div>
  );
}
