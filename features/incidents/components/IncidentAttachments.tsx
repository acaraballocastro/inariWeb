"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { deleteIncidentFile, downloadIncidentFile, uploadIncidentFile, type IncidentFile } from "@/features/incidents/api";

// Browsers other than Safari cannot show HEIC: those are offered as files.
const previewable = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Photos and PDFs of an incident. Files are fetched with the session (the API
 * checks who can see them) and shown from memory. `canEdit`: the incident is
 * not closed; removing is for the uploader or an admin.
 */
export function IncidentAttachments({ incidentId, files, canEdit, userId, admin, onChanged }: { incidentId: string; files: IncidentFile[]; canEdit: boolean; userId: string | null; admin: boolean; onChanged: () => Promise<void> | void }) {
  const { confirm } = useDialogs();
  const input = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Thumbnails of the photos, released when the list changes.
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    for (const file of files.filter((item) => previewable.includes(item.mime_type))) {
      downloadIncidentFile(incidentId, file.id)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          urls.push(url);
          if (active) setPreviews((current) => ({ ...current, [file.id]: url }));
        })
        .catch(() => undefined);
    }
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [incidentId, files]);

  async function open(file: IncidentFile) {
    setError("");
    // Open the tab now (a tap allows pop-ups only synchronously), fill it after.
    const tab = window.open("", "_blank");
    try {
      const url = previews[file.id] ?? URL.createObjectURL(await downloadIncidentFile(incidentId, file.id));
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (requestError) {
      tab?.close();
      setError(requestError instanceof Error ? requestError.message : "Could not open the file.");
    }
  }

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (chosen.length === 0) return;
    setError("");
    setUploading(chosen.map((file) => file.name));
    const failed: string[] = [];
    for (const file of chosen) {
      try {
        await uploadIncidentFile(incidentId, file);
      } catch (requestError) {
        failed.push(`${file.name}: ${requestError instanceof Error ? requestError.message : "could not upload"}`);
      }
    }
    setUploading([]);
    if (failed.length) setError(failed.join(" · "));
    await onChanged();
  }

  async function remove(file: IncidentFile) {
    if (!await confirm({ title: "Remove attachment?", message: file.name, confirmLabel: "Remove", cancelLabel: "Keep" })) return;
    setError("");
    try {
      await deleteIncidentFile(incidentId, file.id);
      await onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not remove the file.");
    }
  }

  return (
    <section className="bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl">Photos & documents</h2>
          <p className="mt-1 text-label text-[#96968b]">Photos (JPEG, PNG, WebP, HEIC) and PDFs, up to 10 MB each.</p>
        </div>
        {canEdit && <button type="button" onClick={() => input.current?.click()} disabled={uploading.length > 0} className="h-10 shrink-0 bg-[#292b26] px-4 text-meta text-white hover:bg-[#41443b] disabled:opacity-60 sm:h-8 sm:px-3">{uploading.length ? "Uploading…" : "+ Add"}</button>}
        <input ref={input} type="file" accept="image/*,application/pdf" multiple onChange={add} className="hidden" />
      </div>
      {error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-meta text-[#9b6f37]">{error}</p>}
      {files.length === 0 && uploading.length === 0 && <p className="mt-4 text-body text-[#85867c]">No attachments.</p>}
      {(files.length > 0 || uploading.length > 0) && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <li key={file.id} className="group relative border border-[#ecebe5] bg-[#f8f7f3]">
              <button type="button" onClick={() => open(file)} className="block w-full text-left">
                {previews[file.id]
                  // eslint-disable-next-line @next/next/no-img-element -- an in-memory blob, not a static asset
                  ? <img src={previews[file.id]} alt={file.name} className="aspect-square w-full object-cover" />
                  : <span className="flex aspect-square w-full items-center justify-center font-serif text-lg text-[#9b8353]">{file.mime_type === "application/pdf" ? "PDF" : previewable.includes(file.mime_type) ? "…" : "Photo"}</span>}
                <span className="block truncate px-2 pt-1.5 text-label text-[#55574f]">{file.name}</span>
                <span className="block px-2 pb-1.5 text-label text-[#a2a299]">{formatSize(file.size)}</span>
              </button>
              {canEdit && (admin || file.uploaded_by === userId) && <button type="button" onClick={() => remove(file)} aria-label={`Remove ${file.name}`} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center bg-white/90 text-meta text-[#8a3b2c] shadow-sm hover:bg-white">✕</button>}
            </li>
          ))}
          {uploading.map((name) => <li key={`up-${name}`} className="flex aspect-square items-center justify-center border border-dashed border-[#deddd6] p-2 text-center text-label text-[#96968b]">Uploading {name}…</li>)}
        </ul>
      )}
    </section>
  );
}
