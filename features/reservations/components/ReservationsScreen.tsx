
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import { MissingDataNotice, useMissingData } from "@/features/dashboard/components/MissingDataNotice";
import { Pagination } from "@/features/dashboard/components/Pagination";
import { listGuides, type GuideDetail } from "@/features/guides/api";
import {
  countReservations,
  listAgencies,
  listReservationsPage,
  type Agency,
  type ReservationCustomer,
  type ReservationFilter,
  type ReservationListItem,
} from "@/features/reservations/api";
import { CreateReservationModal } from "@/features/reservations/components/CreateReservationModal";
import { formatJst } from "@/lib/datetime";
import { formatStatus, pendingStatuses } from "@/lib/status";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

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

const statusFilters = [
  { label: "All", statuses: [] },
  { label: "Pending", statuses: pendingStatuses },
  { label: "Pending assignment", statuses: ["PENDING_ASSIGNMENT"] },
  { label: "Partially confirmed", statuses: ["PARTIALLY_CONFIRMED"] },
  { label: "Confirmed", statuses: ["CONFIRMED"] },
  { label: "Completed", statuses: ["COMPLETED"] },
  { label: "Cancelled", statuses: ["CANCELLED", "FORCE_MAJEURE_CANCELLED"] },
];

const pageSize = 25;

type Filters = {
  status: string;
  from: string;
  to: string;
  agencyId: string;
  guideId: string;
};

const emptyFilters: Filters = {
  status: "All",
  from: "",
  to: "",
  agencyId: "",
  guideId: "",
};

type Stats = {
  total: number;
  confirmed: number;
  pending: number;
  voucherPending: number;
};

export function ReservationsScreen() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [offset, setOffset] = useState(0);
  // Bumped after creating a reservation to reload the list and the stats.
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: ReservationListItem[];
    total: number;
  } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [guides, setGuides] = useState<GuideDetail[]>([]);
  const [error, setError] = useState("");
  const { missing, report } = useMissingData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim());

  // Filtering and paging happen on the server.
  const filter = useMemo<ReservationFilter>(
    () => ({
      status: statusFilters.find((item) => item.label === filters.status)
        ?.statuses,
      from: filters.from || undefined,
      to: filters.to || undefined,
      agencyId: filters.agencyId || undefined,
      guideId: filters.guideId || undefined,
      q: debouncedQuery || undefined,
    }),
    [filters, debouncedQuery],
  );
  const requestKey = JSON.stringify({ filter, offset, version });
  const isLoading = result?.key !== requestKey;

  useEffect(() => {
    let active = true;

    listReservationsPage(filter, { limit: pageSize, offset })
      .then((page) => {
        if (active) {
          setResult({ key: requestKey, ...page });
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setResult({ key: requestKey, items: [], total: 0 });
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load reservations.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [filter, offset, requestKey]);

  useEffect(() => {
    let active = true;

    Promise.all([
      countReservations({}),
      countReservations({ status: ["CONFIRMED"] }),
      countReservations({ status: pendingStatuses }),
      countReservations({ status: ["VOUCHER_PENDING"] }),
    ])
      .then(([total, confirmed, pending, voucherPending]) => {
        if (active) {
          setStats({ total, confirmed, pending, voucherPending });
        }
      })
      .catch(() => {
        if (active) {
          setStats(null);
        }
      });

    return () => {
      active = false;
    };
  }, [version]);

  // Reservations only carry the agency id, so the agency names are resolved here.
  useEffect(() => {
    listAgencies()
      .then(setAgencies)
      .catch(() => { setAgencies([]); report("agencies"); });
    listGuides()
      .then((items) => setGuides(items ?? []))
      .catch(() => { setGuides([]); report("guides"); });
  }, [report]);

  const reservations = useMemo(() => {
    const agencyNames = new Map(
      agencies.map((agency) => [agency.id, agency.name]),
    );
    return (result?.items ?? []).map((item) =>
      mapReservation(item, agencyNames),
    );
  }, [result, agencies]);

  function updateFilters(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }

  const handleCreated = useCallback(() => {
    setIsCreateOpen(false);
    setError("");
    setVersion((current) => current + 1);
  }, []);

  const filterInputClass =
    "mt-2 h-9 w-full border border-[#e3e1da] bg-[#f8f7f3] px-3 text-[10px] outline-none focus:border-[#b5a786]";

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

              <ReservationStats stats={stats} />

              <section className="mt-5 bg-white p-5 sm:p-6">
                <div>
                  <h2 className="font-serif text-xl">
                    The journeys ahead
                  </h2>
                  <p className="mt-2 text-[9px] text-[#96968b]">
                    Most recent start first · All dates in Japan Standard Time
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
                  <label className="text-[9px]">
                    Search reservation
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setOffset(0);
                      }}
                      placeholder="Search code or title..."
                      className={`${filterInputClass} placeholder:text-[#aaa99f]`}
                    />
                  </label>

                  <label className="text-[9px]">
                    From
                    <input
                      type="date"
                      value={filters.from}
                      max={filters.to || undefined}
                      onChange={(event) =>
                        updateFilters({ from: event.target.value })
                      }
                      className={filterInputClass}
                    />
                  </label>

                  <label className="text-[9px]">
                    To
                    <input
                      type="date"
                      value={filters.to}
                      min={filters.from || undefined}
                      onChange={(event) =>
                        updateFilters({ to: event.target.value })
                      }
                      className={filterInputClass}
                    />
                  </label>

                  <label className="text-[9px]">
                    Agency
                    <select
                      value={filters.agencyId}
                      onChange={(event) =>
                        updateFilters({ agencyId: event.target.value })
                      }
                      className={filterInputClass}
                    >
                      <option value="">All agencies</option>
                      {agencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[9px]">
                    Guide
                    <select
                      value={filters.guideId}
                      onChange={(event) =>
                        updateFilters({ guideId: event.target.value })
                      }
                      className={filterInputClass}
                    >
                      <option value="">All guides</option>
                      {guides.map((item) => (
                        <option key={item.guide.id} value={item.guide.id}>
                          {item.guide.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <p className="mb-2 text-[9px]">Status</p>
                    <div className="flex flex-wrap gap-1">
                      {statusFilters.map(({ label }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => updateFilters({ status: label })}
                          className={`h-9 px-3 text-[9px] transition-colors ${
                            filters.status === label
                              ? "bg-[#e9e5d7] text-[#55574f]"
                              : "bg-[#f8f7f3] text-[#96968b] hover:bg-[#ebe9e1]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      updateFilters(emptyFilters);
                    }}
                    className="h-9 shrink-0 border border-[#deddd6] px-3 text-[9px] hover:bg-[#f8f7f3]"
                  >
                    Reset
                  </button>
                </div>

                <MissingDataNotice missing={missing} className="mt-5" />

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
                  reservations.length === 0 && (
                    <p className="mt-6 text-[10px] text-[#85867c]">
                      No reservations found.
                    </p>
                  )}

                {reservations.length > 0 && (
                  <ReservationTable reservations={reservations} />
                )}

                {result && (
                  <Pagination
                    offset={offset}
                    limit={pageSize}
                    total={result.total}
                    onChange={setOffset}
                    noun="reservations"
                  />
                )}
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

// Counted on the server, so they cover every reservation and not just the page shown.
function ReservationStats({ stats }: { stats: Stats | null }) {
  const items = [
    {
      label: "Total reservations",
      value: stats?.total,
      note: "All reservations",
    },
    {
      label: "Confirmed",
      value: stats?.confirmed,
      note: "Ready for the journey",
    },
    {
      label: "Pending",
      value: stats?.pending,
      note: "Awaiting a decision",
    },
    {
      label: "Vouchers pending",
      value: stats?.voucherPending,
      note: "Documents to prepare",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, note }) => (
        <article
          key={label}
          className="min-h-[100px] bg-white p-4"
        >
          <p className="text-[9px] text-[#8b8c82]">{label}</p>
          <p className="mt-3 font-serif text-2xl leading-none">
            {value === undefined ? "—" : String(value).padStart(2, "0")}
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
