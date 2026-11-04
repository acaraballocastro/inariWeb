"use client";

import { useDialogs } from "@/features/dashboard/components/DialogProvider";
import { DateInput } from "@/features/dashboard/components/DateInput";
import { Select } from "@/features/dashboard/components/Select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { listZones, type Zone } from "@/features/catalogs/api";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import { formatIncidentStatus, incidentStatusClass, listIncidents, type Incident } from "@/features/incidents/api";
import { agencyOption, cancelReservation, confirmReservationPayment, createAgencyNamed, deleteReservationPermanently, getReservationDetail, getReservationHistory, signatureStatuses, updateSignatureStatus, updateVoucherStatus, listAgencies, updateReservation, voucherStatuses, type Agency, type ReservationCustomerInput, type ReservationDetail, type ReservationTourDay } from "@/features/reservations/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { CustomerPicker, toCustomerInputs } from "@/features/reservations/components/CustomerPicker";
import { createTourDay } from "@/features/tours/api";
import { HistoryTimeline } from "@/features/tours/components/HistoryTimeline";
import { TourDayForm, emptyTourDayDraft, toTourDayInput } from "@/features/tours/components/TourDayForm";
import { formatDuration, formatJst } from "@/lib/datetime";
import { finalStatuses, formatStatus } from "@/lib/status";

const initialReservationDraft = { title: "", description: "", agency_id: "", total_people_count: "", start_date: "", end_date: "", quote_number: "", file_number: "", offer_to_zone_guides: true };

const reservationSteps = [
  { status: "PAYMENT_PENDING", label: "Confirm payment", error: "Could not confirm the payment.", run: confirmReservationPayment },
  { status: "VOUCHER_PENDING", label: "Mark voucher sent", error: "Could not update the voucher.", run: (code: string) => updateVoucherStatus(code, "SENT") },
  { status: "SIGNATURE_PENDING", label: "Mark contract signed", error: "Could not update the signature.", run: (code: string) => updateSignatureStatus(code, "SIGNED") },
];


export function ReservationDetailScreen({ code }: { code: string }) {
  const router = useRouter();
  const { confirm, prompt } = useDialogs();
  const [detail, setDetail] = useState<ReservationDetail | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const loadHistory = useCallback(() => getReservationHistory(code), [code]);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(initialReservationDraft);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [draftCustomers, setDraftCustomers] = useState<ReservationCustomerInput[]>([]);
  const { missing, report } = useMissingData();

  useEffect(() => {
    listAgencies().then(setAgencies).catch(() => { setAgencies([]); report("agencies"); });
  }, [report]);

  useEffect(() => {
    getReservationDetail(code).then((result) => { setDetail(result); setDraftCustomers(toCustomerInputs(result.customers)); setDraft({ title: result.reservation.title ?? "", description: result.reservation.description ?? "", agency_id: result.reservation.agency_id ?? "", total_people_count: String(result.reservation.total_people_count ?? 0), start_date: toDateInput(result.reservation.start_date), end_date: toDateInput(result.reservation.end_date), quote_number: result.reservation.quote_number ?? "", file_number: result.reservation.file_number ?? "", offer_to_zone_guides: result.reservation.offer_to_zone_guides ?? true }); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load the reservation."));
  }, [code]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !draft.title.trim() || !draft.start_date || !draft.end_date || draft.start_date > draft.end_date || Number(draft.total_people_count) < 1) { setError("Enter a title, valid dates and the number of guests."); return; }
    setIsSaving(true); setError("");
    try { await updateReservation(code, { ...draft, title: draft.title.trim(), customers: draftCustomers, total_people_count: Number(draft.total_people_count), start_date: `${draft.start_date}T00:00:00Z`, end_date: `${draft.end_date}T00:00:00Z` }); const refreshed = await getReservationDetail(code); setDetail(refreshed); setDraftCustomers(toCustomerInputs(refreshed.customers)); setIsEditing(false); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not update the reservation."); } finally { setIsSaving(false); }
  }

  // Manual steps after the guide confirms, handled per reservation:
  // payment -> voucher -> signature -> confirmed.
  const nextStep = detail ? reservationSteps.find((step) => detail.tour_days.some((day) => day.status === step.status)) : undefined;

  // Every action that changes statuses reloads the reservation and its history.
  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setIsSaving(true); setError("");
    try { await action(); setDetail(await getReservationDetail(code)); setHistoryVersion((current) => current + 1); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : fallbackMessage); } finally { setIsSaving(false); }
  }

  function handleNextStep() {
    if (nextStep) runAction(() => nextStep.run(code), nextStep.error);
  }

  async function handleCancelReservation() {
    if (!await confirm({ title: "Cancel this reservation?", message: "Its open tour days are cancelled; days already done are kept.", confirmLabel: "Cancel reservation", cancelLabel: "Keep it", tone: "danger" })) return;
    runAction(() => cancelReservation(code), "Could not cancel the reservation.");
  }

  async function handleDeletePermanently() {
    // The button only works once the code is typed exactly.
    const typed = await prompt({ title: "Delete this reservation permanently?", message: "This erases the reservation, its tour days, itinerary, incidents and history for good. Customers are kept. It cannot be undone.", label: `Type ${code} to confirm`, placeholder: code, expected: code, confirmLabel: "Delete permanently", tone: "danger" });
    if (typed === null) return;
    setIsSaving(true); setError("");
    try { await deleteReservationPermanently(code); router.replace("/reservations"); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not delete the reservation."); setIsSaving(false); }
  }

  const isClosed = detail ? finalStatuses.includes(detail.reservation.status) : false;

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Reservations" />
        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Reservations / Detail" />
          <div className="px-5 pb-10 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1190px]">
            <Link href="/reservations" className="mt-8 inline-flex bg-[#e9e5d7] px-3 py-2 text-meta text-[#5d5e55] hover:bg-[#ded8c7]">Back to reservations</Link>
            {error && <p role="alert" className="mt-6 text-body text-[#9b6f37]">{error}</p>}
            <MissingDataNotice missing={missing} className="mt-6" />
            {!detail && !error && <p className="mt-6 text-body text-[#85867c]">Loading reservation...</p>}
            {detail && <>
              <header className="border-b border-[#deddd6] pb-6 pt-6"><p className="text-meta font-semibold tracking-[0.2em] text-[#9b8353]">RESERVATION / DETAILS</p><h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">{detail.reservation.title ?? "Untitled reservation"}</h1><div className="mt-4 flex flex-wrap items-center gap-3 text-meta text-[#98978c]"><span>{detail.reservation.code ?? detail.reservation.id}</span><span className="bg-[#e9e5d7] px-3 py-1 text-[#77786f]">{formatStatus(detail.reservation.status)}</span>{nextStep && <button type="button" disabled={isSaving} onClick={handleNextStep} className="h-8 bg-[#292b26] px-3 text-white hover:bg-[#41443b] disabled:opacity-60">{isSaving ? "Saving..." : nextStep.label}</button>}{!isClosed && <button type="button" disabled={isSaving} onClick={handleCancelReservation} className="h-8 border border-[#deddd6] px-3 text-[#9b6f37] hover:bg-[#fbf6ef] disabled:opacity-60">Cancel reservation</button>}<button type="button" disabled={isSaving} onClick={handleDeletePermanently} className="h-8 px-3 text-[#9b6f37] underline underline-offset-2 disabled:opacity-60">Delete permanently</button></div></header>
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.72fr)]"><div className="space-y-5"><ReservationInformation detail={detail} agencies={agencies} onAgencyCreated={(agency) => setAgencies((current) => [...current, agency])} draftCustomers={draftCustomers} onCustomersChange={setDraftCustomers} isEditing={isEditing} draft={draft} onEdit={() => setIsEditing(true)} onChange={setDraft} onSave={handleSave} onCancel={() => { setIsEditing(false); setDraftCustomers(toCustomerInputs(detail.customers)); }} isSaving={isSaving} /><RelatedTourDays detail={detail} onCreated={() => getReservationDetail(code).then(setDetail)} /><ReservationIncidents reservationId={detail.reservation.id} /></div><div className="space-y-5"><DocumentsPanel reservation={detail.reservation} disabled={isSaving || isClosed} onVoucherChange={(status) => runAction(() => updateVoucherStatus(code, status), "Could not update the voucher.")} onSignatureChange={(status) => runAction(() => updateSignatureStatus(code, status), "Could not update the signature.")} /><ClientReferences reservation={detail.reservation} /><CustomersPanel customers={detail.customers ?? []} /><HistoryTimeline load={loadHistory} version={historyVersion} showTourDay /></div></div>
            </>}
          </div></div>
        </div>
      </div>
    </main>
  );
}

function ReservationInformation({ detail, agencies, onAgencyCreated, draftCustomers, onCustomersChange, isEditing, draft, onEdit, onChange, onSave, onCancel, isSaving }: { detail: ReservationDetail; agencies: Agency[]; onAgencyCreated: (agency: Agency) => void; draftCustomers: ReservationCustomerInput[]; onCustomersChange: (customers: ReservationCustomerInput[]) => void; isEditing: boolean; draft: typeof initialReservationDraft; onEdit: () => void; onChange: (draft: typeof initialReservationDraft) => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; isSaving: boolean }) {
  const reservation = detail.reservation;
  const agencyOptions = agencies.filter((agency) => agency.is_active || agency.id === reservation.agency_id);
  const agencyName = reservation.agency_id ? agencies.find((agency) => agency.id === reservation.agency_id)?.name ?? "Unknown agency" : "No agency";
  return <section className="bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><h2 className="font-serif text-xl">Reservation information</h2>{!isEditing && <button type="button" onClick={onEdit} className="h-9 border border-[#deddd6] px-3 text-meta hover:bg-[#f8f7f3]">Edit</button>}</div>{isEditing ? <form onSubmit={onSave} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-meta">Title<input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body" /></label><label className="text-meta">Agency<Combobox value={draft.agency_id} options={agencyOptions.map(agencyOption)} onChange={(agencyId) => onChange({ ...draft, agency_id: agencyId })} onCreate={async (name) => { const agency = await createAgencyNamed(name); onAgencyCreated(agency); return agencyOption(agency); }} noun="agency" placeholder="Search or create an agency..." emptyLabel="No agency assigned" disabled={isSaving} inputClass="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" /></label><label className="text-meta">Guests<input type="number" min="1" value={draft.total_people_count} onChange={(event) => onChange({ ...draft, total_people_count: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body" /></label><label className="text-meta">Start date<DateInput value={draft.start_date} max={draft.end_date || undefined} onChange={(start_date) => onChange({ ...draft, start_date })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" ariaLabel="Start date" clearable={false} /></label><label className="text-meta">End date<DateInput value={draft.end_date} min={draft.start_date || undefined} onChange={(end_date) => onChange({ ...draft, end_date })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body outline-none focus:border-[#b5a786]" ariaLabel="End date" clearable={false} /></label><label className="text-meta">Quote number<input value={draft.quote_number} onChange={(event) => onChange({ ...draft, quote_number: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body" /></label><label className="text-meta">File number<input value={draft.file_number} onChange={(event) => onChange({ ...draft, file_number: event.target.value })} className="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body" /></label><label className="flex items-start gap-2 text-meta sm:col-span-2"><input type="checkbox" checked={draft.offer_to_zone_guides} onChange={(event) => onChange({ ...draft, offer_to_zone_guides: event.target.checked })} className="mt-0.5" /><span>Notify the guides of each zone about days without guide<span className="mt-1 block text-label text-[#96968b]">Off when the guide is already agreed.</span></span></label><div className="sm:col-span-2"><CustomerPicker value={draftCustomers} onChange={onCustomersChange} disabled={isSaving} inputClass="mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body" labelClass="block text-meta" /></div><label className="text-meta sm:col-span-2">Description<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} className="mt-2 min-h-20 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 py-2 text-body" /></label><div className="flex gap-2 sm:col-span-2"><button type="submit" disabled={isSaving} className="h-9 bg-[#292b26] px-4 text-meta text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button><button type="button" onClick={onCancel} className="h-9 border border-[#deddd6] px-4 text-meta">Cancel</button></div></form> : <><p className="mt-4 text-label font-semibold tracking-[0.2em] text-[#9b8353]">ABOUT THIS JOURNEY</p><p className="mt-3 text-lead leading-relaxed text-[#85867c]">{reservation.description || "No description provided."}</p><div className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2"><DetailItem label="Agency" value={agencyName} /><DetailItem label="Guests" value={String(reservation.total_people_count ?? 0)} /><DetailItem label="Quote number" value={reservation.quote_number || "Not provided"} /><DetailItem label="File number" value={reservation.file_number || "Not provided"} /><DetailItem label="Zone guides notified" value={reservation.offer_to_zone_guides === false ? "No (guide already agreed)" : "Yes, about days without guide"} /><DetailItem label="Start date" value={formatDate(reservation.start_date)} /><DetailItem label="End date" value={formatDate(reservation.end_date)} /></div></>}
  </section>;
}

function DetailItem({ label, value }: { label: string; value: string }) { return <div><p className="text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">{label}</p><p className="mt-2 break-words text-lead text-[#55574f]">{value}</p></div>; }

// Voucher and signature are set by hand until documents exist. Lowering them moves
// the confirmed days back to the pending step; raising them advances the days.
function DocumentsPanel({ reservation, disabled, onVoucherChange, onSignatureChange }: { reservation: ReservationDetail["reservation"]; disabled: boolean; onVoucherChange: (status: string) => void; onSignatureChange: (status: string) => void }) {
  const selectClass = "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-body font-normal normal-case tracking-normal text-[#292b26] outline-none focus:border-[#b5a786] disabled:opacity-60";
  const { confirm } = useDialogs();
  const confirmChange = async (label: string, status: string, apply: (status: string) => void) => { if (await confirm({ title: `Set the ${label} to ${formatStatus(status)}?`, message: "Sent voucher and signed contract advance paid days to confirmed; setting them back returns the days to that step.", confirmLabel: `Set ${label}` })) apply(status); };
  return <section className="bg-white p-5 sm:p-6"><h2 className="font-serif text-xl">Documents</h2><label className="mt-5 block text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Voucher<Select value={reservation.voucher_status} disabled={disabled} onChange={(status) => confirmChange("voucher", status, onVoucherChange)} options={voucherStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} className={selectClass} ariaLabel="Voucher" /></label><label className="mt-5 block text-label font-semibold uppercase tracking-[0.18em] text-[#9b8353]">Client signature<Select value={reservation.signature_status} disabled={disabled} onChange={(status) => confirmChange("signature", status, onSignatureChange)} options={signatureStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} className={selectClass} ariaLabel="Client signature" /></label><p className="mt-3 text-label leading-relaxed text-[#85867c]">Sent voucher and signed contract advance paid days to confirmed. Setting them back returns the days to that step.</p></section>;
}

function ReservationIncidents({ reservationId }: { reservationId: string }) {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { listIncidents({ reservationId }).then(setIncidents).catch(() => { setIncidents([]); setFailed(true); }); }, [reservationId]);
  if (failed) return <MissingDataNotice missing={["the incidents of this reservation"]} />;
  if (!incidents?.length) return null;
  return <section className="bg-white p-5 sm:p-6"><h2 className="font-serif text-xl">Incidents</h2><div className="mt-4 divide-y divide-[#ecebe5]">{incidents.map((incident) => <Link key={incident.id} href={`/incidents/${incident.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-[#fbfaf7]"><div className="min-w-0"><p className="truncate text-body">{incident.title || "Untitled incident"}</p><p className="mt-1 text-label text-[#85867c]">{formatJst(incident.created_at, { day: "2-digit", month: "short", year: "numeric" })}</p></div><span className={`shrink-0 px-2 py-1 text-label ${incidentStatusClass(incident.status)}`}>{formatIncidentStatus(incident.status)}</span></Link>)}</div></section>;
}

function ClientReferences({ reservation }: { reservation: ReservationDetail["reservation"] }) { return <section className="bg-white p-5 sm:p-6"><h2 className="font-serif text-xl">Client references</h2><div className="mt-5 space-y-4 text-body text-[#85867c]"><div className="flex justify-between gap-4"><span>Quote</span><strong className="font-normal text-[#55574f]">{reservation.quote_number || "Not provided"}</strong></div><div className="flex justify-between gap-4"><span>File</span><strong className="font-normal text-[#55574f]">{reservation.file_number || "Not provided"}</strong></div></div></section>; }

function CustomersPanel({ customers }: { customers: ReservationDetail["customers"] }) { return <section className="bg-white p-5 sm:p-6"><h2 className="font-serif text-xl">Customers</h2>{customers.length === 0 ? <p className="mt-4 text-body text-[#85867c]">No customers linked.</p> : <div className="mt-4 divide-y divide-[#ecebe5]">{customers.map((customer) => <div key={customer.id} className="py-3 text-body"><p>{customer.full_name}</p><p className="mt-1 text-label text-[#85867c]">{customer.email || "No email"} · {customer.phone || "No phone"}</p></div>)}</div>}</section>; }

function RelatedTourDays({ detail, onCreated }: { detail: ReservationDetail; onCreated: () => Promise<void> }) {
  const tourDays: ReservationTourDay[] = detail.tour_days ?? [];
  const [zones, setZones] = useState<Zone[]>([]);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyTourDayDraft);
  const { missing, report } = useMissingData();

  useEffect(() => {
    listZones().then((items) => setZones(items ?? [])).catch(() => { setZones([]); report("zones"); });
    listGuides().then((items) => setGuides(items ?? [])).catch(() => { setGuides([]); report("guides"); });
  }, [report]);

  function openForm() {
    setDraft({ ...emptyTourDayDraft, start_datetime: `${toDateInput(detail.reservation.start_date)}T09:00`, people_count: detail.reservation.total_people_count ? String(detail.reservation.total_people_count) : "" });
    setError(""); setIsCreating(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = toTourDayInput(draft);
    if ("error" in result) { setError(result.error); return; }
    setIsSaving(true); setError("");
    try { await createTourDay(detail.reservation.id, result.input); await onCreated(); setIsCreating(false); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not create the tour day."); } finally { setIsSaving(false); }
  }

  return <section className="bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-xl">Related tour days</h2><p className="mt-3 text-body text-[#85867c]">Operational days linked to this reservation.</p></div>{!isCreating && <button type="button" onClick={openForm} className="h-9 shrink-0 bg-[#292b26] px-3 text-meta text-white hover:bg-[#41443b]">+ Add tour day</button>}</div>{error && <p role="alert" className="mt-4 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-body text-[#9b6f37]">{error}</p>}<MissingDataNotice missing={missing} className="mt-4" />{isCreating && <div className="mt-5 border-b border-[#ecebe5] pb-5"><TourDayForm draft={draft} zones={zones} onChange={setDraft} onZoneCreated={(zone) => setZones((current) => [...current, zone])} onSubmit={handleCreate} onCancel={() => setIsCreating(false)} isSaving={isSaving} submitLabel="Create tour day" /></div>}{tourDays.length === 0 ? <p className="mt-5 text-body text-[#85867c]">No tour days linked.</p> : <div className="mt-5 divide-y divide-[#ecebe5]">{tourDays.map((day) => <Link key={day.id} href={`/tours/${day.id}`} className="grid gap-3 py-4 hover:bg-[#fbfaf7] sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-start"><p className="text-body text-[#55574f]">{formatDate(day.start_datetime)}</p><div><p className="text-body font-medium">{day.title || day.code || "Untitled tour day"}</p><p className="mt-2 text-label text-[#85867c]">{formatDuration(day.duration) || "Duration not provided"}</p><p className="mt-1 text-label text-[#85867c]">Zone · {zones.find((zone) => zone.id === day.zone_id)?.name ?? (day.zone_id || "Unassigned")}</p><p className="mt-1 text-label text-[#85867c]">Guide · {day.guide_id ? guides.find((item) => item.guide.id === day.guide_id)?.guide.name ?? "Assigned" : "Unassigned"}</p></div><span className="bg-[#e9e5d7] px-3 py-2 text-center text-label text-[#77786f]">{formatStatus(day.status)}</span></Link>)}</div>}</section>;
}

function toDateInput(value: string) { return value.slice(0, 10); }
function formatDate(value: string) { return formatJst(value, { day: "2-digit", month: "short", year: "numeric" }); }
