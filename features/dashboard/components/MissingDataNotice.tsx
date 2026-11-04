"use client";

import { useCallback, useState } from "react";

import { describeMissing } from "@/lib/missing";

/** What a screen could not load, for MissingDataNotice. */
export function useMissingData() {
  const [missing, setMissing] = useState<string[]>([]);
  const report = useCallback((label: string) => setMissing((current) => (current.includes(label) ? current : [...current, label])), []);
  return { missing, report };
}

/** Says which secondary data failed to load, instead of silently showing IDs or "Unknown". */
export function MissingDataNotice({ missing, className = "" }: { missing: string[]; className?: string }) {
  if (!missing.length) return null;
  return (
    <p role="status" className={`border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body leading-relaxed text-[#9b6f37] ${className}`}>
      Could not load {describeMissing(missing)}: some names may show as IDs or &quot;Unknown&quot;.
      <button type="button" onClick={() => window.location.reload()} className="ml-2 underline underline-offset-2">Reload</button>
    </p>
  );
}
