"use client";

/** "1–25 of 140" with previous / next buttons; hidden when everything fits in one page. */
export function Pagination({ offset, limit, total, onChange, noun }: { offset: number; limit: number; total: number; onChange: (offset: number) => void; noun: string }) {
  const end = Math.min(offset + limit, total);

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-meta text-[#96968b]">
      <span>{total === 0 ? `No ${noun}` : `${offset + 1}–${end} of ${total} ${noun}`}</span>
      {total > limit && (
        <span className="flex gap-2">
          <button type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} className="h-8 border border-[#deddd6] px-3 text-[#292b26] hover:bg-[#f8f7f3] disabled:opacity-40">Previous</button>
          <button type="button" disabled={end >= total} onClick={() => onChange(offset + limit)} className="h-8 border border-[#deddd6] px-3 text-[#292b26] hover:bg-[#f8f7f3] disabled:opacity-40">Next</button>
        </span>
      )}
    </div>
  );
}
