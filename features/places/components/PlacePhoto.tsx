"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { getPlacePhoto, removePlacePhoto, uploadPlacePhoto, type Place } from "@/features/places/api";

/** The place's photo (printed in the vouchers): shown, replaced or removed at once. */
export function PlacePhoto({ place, onChanged }: { place: Place; onChanged: (place: Place) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!place.photo_file_id) return;
    let active = true;
    let created: string | null = null;
    getPlacePhoto(place.id).then((blob) => { created = URL.createObjectURL(blob); if (active) setUrl(created); }).catch(() => undefined);
    return () => { active = false; if (created) URL.revokeObjectURL(created); setUrl(null); };
  }, [place.id, place.photo_file_id]);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try { onChanged(await uploadPlacePhoto(place.id, file)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not upload the photo."); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError("");
    try { await removePlacePhoto(place.id); onChanged({ ...place, photo_file_id: null }); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not remove the photo."); } finally { setBusy(false); }
  }

  return (
    <div className="text-meta text-[#77786f]">
      <span>Photo (voucher)</span>
      <div className="mt-2 flex items-center gap-3">
        {place.photo_file_id
          // eslint-disable-next-line @next/next/no-img-element -- an in-memory blob, not a static asset
          ? (url ? <img src={url} alt={place.name} className="h-14 w-20 object-cover" /> : <span className="flex h-14 w-20 items-center justify-center bg-[#f1f0ec] text-label">…</span>)
          : <span className="flex h-14 w-20 items-center justify-center border border-dashed border-[#deddd6] text-label text-[#a2a299]">No photo</span>}
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="h-9 border border-[#deddd6] bg-white px-3 text-label hover:bg-[#f8f7f3] disabled:opacity-60">{busy ? "Saving…" : place.photo_file_id ? "Change" : "Add photo"}</button>
        {place.photo_file_id && <button type="button" onClick={remove} disabled={busy} className="h-9 px-2 text-label text-[#9b6f37] underline underline-offset-2 disabled:opacity-60">Remove</button>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} className="hidden" />
      </div>
      {error && <p role="alert" className="mt-1 text-label text-[#9b6f37]">{error}</p>}
    </div>
  );
}
