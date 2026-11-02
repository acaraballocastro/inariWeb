
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import {
  createReservation,
  listAgencies,
  listCustomers,
  listReservations,
  type Agency,
  type Reservation as ApiReservation,
  type ReservationListItem,
  type ReservationCustomer,
  type ReservationCustomerInput,
  type ReservationFormInput,
} from "@/features/reservations/api";
import { CustomerPicker } from "@/features/reservations/components/CustomerPicker";
import { ReservationItineraryStep } from "@/features/tours/components/ReservationItineraryStep";
import { ReservationTourDaysStep } from "@/features/tours/components/ReservationTourDaysStep";
import { formatJst, jstInputToIso } from "@/lib/datetime";

type ReservationStatus = string;

type Reservation = {
  id: string;
  code: string;
  title: string;
  agency: string;
  customer: string;
  customerDetail: string;
  dates: string;
  guests: string;
  status: ReservationStatus;
  voucher: string;
  signature: string;
};

const filters = [
  "All",
  "PENDING",
  "PENDING_ASSIGNMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

type StatusFilter = (typeof filters)[number];

export function ReservationsScreen() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadReservations = useCallback(async () => {
    setReservations(await loadReservationRows());
  }, []);

  useEffect(() => {
    let active = true;

    loadReservationRows()
      .then((rows) => {
        if (active) {
          setReservations(rows);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load reservations.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCreated = useCallback(() => {
    setIsCreateOpen(false);
    setError("");

    loadReservations().catch((requestError: unknown) => {
      setError(
        requestError instanceof Error
          ? `Reservation created, but the list could not be refreshed: ${requestError.message}`
          : "Reservation created, but the list could not be refreshed.",
      );
    });
  }, [loadReservations]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesStatus =
        statusFilter === "All" || reservation.status === statusFilter;

      const matchesQuery =
        !normalizedQuery ||
        `${reservation.code} ${reservation.title} ${reservation.agency} ${reservation.customerDetail}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, reservations]);

  return (
    <main className="min-h-dvh bg-[#f1f0ec] text-[#292b26]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px]">
        <DashboardSidebar activeItem="Reservations" />

        <div className="min-w-0 flex-1">
          <DashboardHeader breadcrumb="Workspace / Reservations" />

          <div className="px-5 pb-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1190px]">
              <header className="flex flex-col gap-5 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between sm:pt-10">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">
                    OPERATIONS / AUTUMN 2026
                  </p>

                  <h1 className="mt-3 font-serif text-3xl tracking-[-0.04em] sm:text-[36px]">
                    Reservations
                  </h1>

                  <p className="mt-2 max-w-xl text-[11px] text-[#85867c]">
                    Every journey, thoughtfully organised. Manage your
                    upcoming reservations and their operational details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 bg-[#292b26] px-5 text-[10px] text-white transition-colors hover:bg-[#41443b]"
                >
                  <span className="text-base leading-none">+</span>
                  Create reservation
                </button>
              </header>

              <ReservationStats reservations={reservations} />

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div>
                  <h2 className="font-serif text-xl">
                    The journeys ahead
                  </h2>
                  <p className="mt-2 text-[9px] text-[#96968b]">
                    October 2026 · All dates in Japan Standard Time
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="min-w-0 flex-1 text-[9px]">
                    <span className="mb-2 block">
                      Search reservation
                    </span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search code, title, agency or customer..."
                      className="h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none placeholder:text-[#aaa99f] focus:border-[#b5a786]"
                    />
                  </label>

                  <div className="min-w-0">
                    <p className="mb-2 text-[9px]">Status</p>
                    <div className="flex flex-wrap gap-1">
                      {filters.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setStatusFilter(filter)}
                          className={`h-9 px-3 text-[9px] transition-colors ${
                            statusFilter === filter
                              ? "bg-[#e9e5d7] text-[#55574f]"
                              : "bg-[#f8f7f3] text-[#96968b] hover:bg-[#ebe9e1]"
                          }`}
                        >
                          {filter === "All"
                            ? "All"
                            : formatStatus(filter)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("All");
                    }}
                    className="h-9 shrink-0 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]"
                  >
                    Reset
                  </button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]"
                  >
                    {error}
                    <button
                      type="button"
                      onClick={() => setError("")}
                      className="ml-3 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {isLoading && (
                  <p className="mt-6 text-[10px] text-[#85867c]">
                    Loading reservations...
                  </p>
                )}

                {!isLoading &&
                  !error &&
                  filteredReservations.length === 0 && (
                    <p className="mt-6 text-[10px] text-[#85867c]">
                      No reservations found.
                    </p>
                  )}

                {!isLoading &&
                  filteredReservations.length > 0 && (
                    <ReservationTable
                      reservations={filteredReservations}
                    />
                  )}

                <p className="mt-5 text-[9px] text-[#96968b]">
                  {filteredReservations.length} reservations shown ·
                  InariOps
                </p>
              </section>

              <footer className="pt-8 text-[9px] tracking-[0.03em] text-[#a09f94]">
                INARIOPS · RESERVATION MANAGEMENT
              </footer>
            </div>
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <CreateReservationModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}

function ReservationStats({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const stats = [
    {
      label: "Total reservations",
      value: reservations.length,
      note: "All reservations",
    },
    {
      label: "Confirmed",
      value: reservations.filter(
        (item) => item.status === "CONFIRMED",
      ).length,
      note: "Ready for the journey",
    },
    {
      label: "Pending",
      value: reservations.filter((item) =>
        item.status.startsWith("PENDING"),
      ).length,
      note: "Awaiting a decision",
    },
    {
      label: "Vouchers pending",
      value: reservations.filter(
        (item) =>
          item.voucher !== "GENERATED" &&
          item.voucher !== "SENT",
      ).length,
      note: "Documents to prepare",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ label, value, note }) => (
        <article
          key={label}
          className="min-h-[100px] bg-white p-4"
        >
          <p className="text-[9px] text-[#8b8c82]">{label}</p>
          <p className="mt-3 font-serif text-2xl leading-none">
            {String(value).padStart(2, "0")}
          </p>
          <p className="mt-2 text-[8px] text-[#aaa99f]">
            {note}
          </p>
        </article>
      ))}
    </div>
  );
}

function mapCustomers(customers: ReservationCustomer[]) {
  const [first, ...rest] = customers;

  return {
    customer: first
      ? `${first.full_name}${rest.length ? ` +${rest.length}` : ""}`
      : "No customer",
    customerDetail: customers
      .map((customer) => `${customer.full_name} ${customer.email}`)
      .join(" · "),
  };
}

// Reservations only carry the agency id, so the agency names are resolved here.
async function loadReservationRows() {
  const [items, agencies] = await Promise.all([
    listReservations(),
    listAgencies().catch(() => [] as Agency[]),
  ]);
  const agencyNames = new Map(
    (agencies ?? []).map((agency) => [agency.id, agency.name]),
  );

  return (items ?? []).map((item) => mapReservation(item, agencyNames));
}

function mapReservation(
  item: ReservationListItem,
  agencyNames: Map<string, string>,
): Reservation {
  return {
    id: item.id,
    code: item.code ?? item.id,
    title: item.title ?? "Untitled reservation",
    agency: item.agency_id
      ? (agencyNames.get(item.agency_id) ?? "Unknown agency")
      : "No agency",
    ...mapCustomers(item.customers ?? []),
    dates: `${formatDate(item.start_date)}\n${formatDate(item.end_date)}`,
    guests: String(item.total_people_count ?? 0),
    status: item.status,
    voucher: item.voucher_status,
    signature: item.signature_status,
  };
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return formatJst(date, {
    day: "2-digit",
    month: "short",
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ReservationTable({
  reservations,
}: {
  reservations: Reservation[];
}) {
  // Agency now has more room, and Status has a dedicated,
  // bounded column so long status names cannot overlap it.
  const columns =
    "grid-cols-[minmax(220px,1.7fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(78px,0.65fr)_minmax(48px,0.4fr)_minmax(105px,0.85fr)_minmax(140px,1fr)]";

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="min-w-[1020px]">
        <div
          className={`grid ${columns} gap-3 border-b border-[#ecebe5] pb-3 text-[8px] font-semibold tracking-[0.16em] text-[#a19a87]`}
        >
          <span>RESERVATION</span>
          <span>AGENCY</span>
          <span>CUSTOMER</span>
          <span>DATES</span>
          <span>GUESTS</span>
          <span>STATUS</span>
          <span>DOCUMENTS</span>
        </div>

        <div className="divide-y divide-[#f0efe9]">
          {reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              columns={columns}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReservationRow({
  reservation,
  columns,
}: {
  reservation: Reservation;
  columns: string;
}) {
  return (
    <Link
      href={`/reservations/${encodeURIComponent(reservation.code)}`}
      className={`grid ${columns} items-center gap-3 py-4 text-[9px] hover:bg-[#fbfaf7]`}
    >
      <div className="min-w-0">
        <p className="truncate text-[8px] text-[#9b9c92]">
          {reservation.code}
        </p>
        <p className="mt-2 break-words text-[10px]">
          {reservation.title}
        </p>
      </div>

      <span
        className="min-w-0 break-words text-[#65665d]"
        title={reservation.agency}
      >
        {reservation.agency}
      </span>

      <span
        className="min-w-0 break-words text-[#65665d]"
        title={reservation.customerDetail || reservation.customer}
      >
        {reservation.customer}
      </span>

      <span className="whitespace-pre-line text-[8px] leading-relaxed text-[#85867c]">
        {reservation.dates}
      </span>

      <span className="text-center tabular-nums">
        {reservation.guests}
      </span>

      <span
        title={formatStatus(reservation.status)}
        className="inline-flex min-w-0 max-w-full items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap bg-[#e9e5d7] px-2 py-1.5 text-[8px] leading-tight text-[#77786f]"
      >
        {formatStatus(reservation.status)}
      </span>

      <div className="min-w-0 text-[8px] leading-relaxed text-[#85867c]">
        <p className="break-words">
          Voucher · {formatStatus(reservation.voucher)}
        </p>
        <p className="break-words">
          Signature · {formatStatus(reservation.signature)}
        </p>
      </div>
    </Link>
  );
}

function CreateReservationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);
  const [agencyError, setAgencyError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdReservation, setCreatedReservation] =
    useState<ApiReservation | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Once the reservation exists, closing the modal must refresh the list.
  const handleClose = createdReservation ? onCreated : onClose;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [peopleCount, setPeopleCount] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [fileNumber, setFileNumber] = useState("");
  const [offerToZoneGuides, setOfferToZoneGuides] = useState(true);
  const [customers, setCustomers] = useState<ReservationCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<
    ReservationCustomerInput[]
  >([]);

  useEffect(() => {
    let active = true;

    listCustomers()
      .then((items) => {
        if (active) {
          setCustomers(items);
        }
      })
      .catch(() => {
        if (active) {
          setCustomers([]);
        }
      });

    listAgencies()
      .then((items) => {
        if (active) {
          setAgencies(items.filter((agency) => agency.is_active));
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setAgencyError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load agencies.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingAgencies(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Enter a reservation title.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Select both the start and end dates.");
      return;
    }

    if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
      setError("The end date must be later than the start date.");
      return;
    }

    const totalPeople = Number(peopleCount);

    if (!Number.isInteger(totalPeople) || totalPeople < 1) {
      setError("The number of guests must be at least 1.");
      return;
    }

    const payload: ReservationFormInput = {
      title: title.trim(),
      description: description.trim(),
      agency_id: agencyId,
      customers: selectedCustomers,
      total_people_count: totalPeople,
      start_date: jstInputToIso(startDate),
      end_date: jstInputToIso(endDate),
      ...(quoteNumber.trim()
        ? { quote_number: quoteNumber.trim() }
        : {}),
      ...(fileNumber.trim()
        ? { file_number: fileNumber.trim() }
        : {}),
      offer_to_zone_guides: offerToZoneGuides,
    };

    setIsSubmitting(true);

    try {
      const detail = await createReservation(payload);
      setCreatedReservation(detail.reservation);
      setStep(2);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the reservation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 h-10 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[11px] outline-none transition-colors focus:border-[#b5a786]";

  const labelClass = "block text-[10px] text-[#65665d]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#292b26]/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-reservation-title"
        className={`my-auto max-h-[90dvh] w-full overflow-y-auto bg-white shadow-xl ${step === 3 ? "max-w-3xl" : "max-w-2xl"}`}
      >
        <header className="flex items-start justify-between border-b border-[#ecebe5] px-6 py-5 sm:px-8">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.2em] text-[#9b8353]">
              {step === 1
                ? "STEP 1 OF 3 · RESERVATION DETAILS"
                : step === 2
                  ? "STEP 2 OF 3 · TOUR DAYS"
                  : "STEP 3 OF 3 · ITINERARY"}
            </p>
            <h2
              id="create-reservation-title"
              className="mt-2 font-serif text-2xl tracking-[-0.03em]"
            >
              {step === 1
                ? "Create reservation"
                : step === 2
                  ? "Plan the tour days"
                  : "Plan the itinerary"}
            </h2>
            <p className="mt-2 text-[10px] text-[#85867c]">
              {step === 1
                ? "Enter the details for the new journey."
                : step === 2
                  ? "Complete the operational days of the journey."
                  : "Arrange the stops of each day."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-xl text-[#85867c] hover:bg-[#f1f0ec] disabled:opacity-50"
          >
            ×
          </button>
        </header>

        {createdReservation && step === 3 ? (
          <ReservationItineraryStep
            reservation={createdReservation}
            onBack={() => setStep(2)}
            onFinish={onCreated}
          />
        ) : createdReservation ? (
          <ReservationTourDaysStep
            reservation={createdReservation}
            onFinish={() => setStep(3)}
          />
        ) : (
        <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8">
          {error && (
            <p
              role="alert"
              className="mb-5 border border-[#eadbc7] bg-[#fbf6ef] p-3 text-[10px] text-[#9b6f37]"
            >
              {error}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Reservation title *
              <input
                required
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Autumn in Kyoto"
                className={inputClass}
              />
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Additional information about the journey..."
                rows={3}
                className="mt-2 w-full resize-y border border-[#e3e1da] bg-[#f8f7f3] px-3 py-3 text-[11px] outline-none focus:border-[#b5a786]"
              />
            </label>

            <label className={labelClass}>
              Agency
              <select
                value={agencyId}
                onChange={(event) => setAgencyId(event.target.value)}
                disabled={isLoadingAgencies}
                className={inputClass}
              >
                <option value="">
                  {isLoadingAgencies
                    ? "Loading agencies..."
                    : "No agency assigned"}
                </option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
              {agencyError && (
                <span className="mt-1 block text-[9px] text-[#9b6f37]">
                  {agencyError}
                </span>
              )}
            </label>

            <label className={labelClass}>
              Number of guests *
              <input
                required
                type="number"
                min={1}
                step={1}
                value={peopleCount}
                onChange={(event) => setPeopleCount(event.target.value)}
                className={inputClass}
              />
            </label>

            <div className="sm:col-span-2">
              <CustomerPicker
                customers={customers}
                value={selectedCustomers}
                onChange={setSelectedCustomers}
                disabled={isSubmitting}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            </div>

            <label className={labelClass}>
              Start date and time (JST) *
              <input
                required
                type="datetime-local"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              End date and time (JST) *
              <input
                required
                type="datetime-local"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Quote number
              <input
                value={quoteNumber}
                onChange={(event) => setQuoteNumber(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              File number
              <input
                value={fileNumber}
                onChange={(event) => setFileNumber(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </label>

            <label className="flex items-start gap-2 text-[10px] text-[#65665d] sm:col-span-2">
              <input
                type="checkbox"
                checked={offerToZoneGuides}
                onChange={(event) => setOfferToZoneGuides(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Notify the guides of each zone about days without guide
                <span className="mt-1 block text-[9px] text-[#96968b]">Turn it off when the guide is already agreed: nobody else is told about these days.</span>
              </span>
            </label>
          </div>

          <p className="mt-5 text-[9px] leading-relaxed text-[#96968b]">
            Fields marked with * are required. The reservation will be
            created using the current InariOps API.
          </p>

          <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-[#ecebe5] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 border border-[#deddd6] px-5 text-[10px] hover:bg-[#f8f7f3] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isLoadingAgencies}
              className="h-10 bg-[#292b26] px-6 text-[10px] text-white transition-colors hover:bg-[#41443b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create and continue"}
            </button>
          </footer>
        </form>
        )}
      </section>
    </div>
  );
}
