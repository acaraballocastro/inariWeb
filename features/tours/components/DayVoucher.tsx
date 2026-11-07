"use client";

import { useEffect, useMemo, useState } from "react";
import { dayVoucherSource } from "@/features/reservations/api";
import { VoucherPanel } from "@/features/reservations/components/VoucherPanel";
import { downloadDayVoucher, getDayVoucher, type TourDay } from "@/features/tours/api";
import { formatJst } from "@/lib/datetime";
import { openBlob } from "@/lib/openBlob";

/** The admin's panel of the day's guide voucher: versions, preview, generate. */
export function DayVoucherPanel({ tourDay, disabled }: { tourDay: TourDay; disabled: boolean }) {
  const label = [tourDay.code, formatJst(tourDay.start_datetime, { day: "numeric", month: "short" })].filter(Boolean).join(" · ");
  const source = useMemo(() => dayVoucherSource(tourDay.id, label), [tourDay.id, label]);
  return <VoucherPanel source={source} title="Guide voucher" description="This day only, for its guide (who sees the latest version). Generated when the payment is confirmed; generate again after changes." refreshKey={tourDay.status} disabled={disabled} />;
}

/** The guide's link to the newest voucher of their day; nothing until one exists. */
export function DayVoucher({ tourDayId }: { tourDayId: string }) {
  const [voucher, setVoucher] = useState<{ version: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDayVoucher(tourDayId).then((found) => { if (active) setVoucher(found); }).catch(() => undefined);
    return () => { active = false; };
  }, [tourDayId]);

  if (!voucher) return null;
  const open = () => { setError(""); openBlob(() => downloadDayVoucher(tourDayId)).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not open the voucher.")); };
  return (
    <section className="bg-white p-5 sm:p-6">
      <h2 className="font-serif text-xl">Voucher</h2>
      <p className="mt-1 text-label text-[#96968b]">Your voucher for this day (version {voucher.version}).</p>
      <button type="button" onClick={open} className="mt-4 h-11 w-full bg-[#292b26] px-4 text-meta text-white hover:bg-[#41443b] sm:h-9">Open voucher PDF</button>
      {error && <p role="alert" className="mt-3 text-meta text-[#9b6f37]">{error}</p>}
    </section>
  );
}
