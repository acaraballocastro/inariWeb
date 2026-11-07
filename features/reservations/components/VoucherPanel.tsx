"use client";

import { useCallback, useEffect, useState } from "react";
import { Select } from "@/features/dashboard/components/Select";
import { voucherLanguages, type Voucher, type VoucherSource } from "@/features/reservations/api";
import { VoucherPreview } from "@/features/reservations/components/VoucherPreview";
import { formatJst } from "@/lib/datetime";
import { openBlob } from "@/lib/openBlob";

const selectClass = "h-10 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786] sm:h-9";

/**
 * The versions of a voucher (the reservation's for the customers, or a day's
 * for its guide, see VoucherSource): generated automatically when the payment
 * is confirmed, or here (each time a new version). `source` must keep its
 * identity between renders (useMemo). `refreshKey` changes when the data
 * does: the list is read again, and once more a few seconds later for the
 * vouchers made in the background after a payment.
 */
export function VoucherPanel({ source, title, description, refreshKey, disabled, onGenerated }: { source: VoucherSource; title: string; description: string; refreshKey: string; disabled: boolean; onGenerated?: () => Promise<void> | void }) {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [language, setLanguage] = useState("es");
  const [busy, setBusy] = useState<"" | "generate">("");
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => source.list().then(setVouchers).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the vouchers.")), [source]);

  useEffect(() => {
    load();
    const later = window.setTimeout(load, 5000);
    return () => window.clearTimeout(later);
  }, [load, refreshKey]);

  async function run(kind: "generate", action: () => Promise<void>, fallback: string) {
    setBusy(kind); setError("");
    try { await action(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallback); } finally { setBusy(""); }
  }

  const generate = (chosen = language) => run("generate", async () => {
    const created = await source.generate(chosen);
    setPreviewing(false);
    setVouchers((current) => [created, ...(current ?? [])]);
    await onGenerated?.();
  }, "Could not generate the voucher.");
  const open = (voucher: Voucher) => openBlob(() => source.download(voucher.id)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not open the voucher."));

  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">{title}</h2>
      <p className="mt-1 text-label leading-relaxed text-[#96968b]">{description}</p>
      <label className="mt-4 block text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Language<Select value={language} onChange={setLanguage} options={voucherLanguages.map((item) => ({ value: item.value, label: item.label }))} className={`${selectClass} mt-2`} ariaLabel="Voucher language" /></label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPreviewing(true)} disabled={busy !== ""} className="h-10 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3] disabled:opacity-60 sm:h-9">Preview</button>
        <button type="button" onClick={() => generate()} disabled={disabled || busy !== ""} className="h-10 bg-[#292b26] px-3 text-meta text-white hover:bg-[#41443b] disabled:opacity-60 sm:h-9">{busy === "generate" ? "Generating…" : "Generate"}</button>
      </div>
      {previewing && <VoucherPreview source={source} language={language} canGenerate={!disabled} generating={busy === "generate"} onGenerate={(chosen) => { setLanguage(chosen); generate(chosen); }} onClose={() => setPreviewing(false)} />}
      {error && <p role="alert" className="mt-3 text-meta text-[#9b6f37]">{error}</p>}
      {vouchers === null ? <p className="mt-4 text-meta text-[#96968b]">Loading…</p> : vouchers.length === 0 ? <p className="mt-4 text-meta text-[#96968b]">No voucher yet.</p> : (
        <ul className="mt-4 divide-y divide-[#f0efe9] border-y border-[#f0efe9]">
          {vouchers.map((voucher, index) => (
            <li key={voucher.id}>
              <button type="button" onClick={() => open(voucher)} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left hover:bg-[#fbfaf7]">
                <span className="min-w-0">
                  <span className="block text-body">Version {voucher.version} · {voucher.language.toUpperCase()}{index === 0 && <span className="ml-2 bg-[#eef0e9] px-1.5 py-0.5 text-label text-[#68705d]">Latest</span>}</span>
                  <span className="block truncate text-label text-[#96968b]">{formatJst(voucher.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {voucher.created_by ?? "Automatic"}</span>
                </span>
                <span className="shrink-0 text-label text-[#6f6a5b] underline underline-offset-2">PDF ↗</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
