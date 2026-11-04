"use client";

import { DateInput } from "@/features/dashboard/components/DateInput";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  createReservation,
  agencyOption,
  createAgencyNamed,
  listAgencies,
  type Agency,
  type Reservation,
  type ReservationCustomerInput,
  type ReservationFormInput,
} from "@/features/reservations/api";
import { Combobox } from "@/features/dashboard/components/Combobox";
import { CustomerPicker } from "@/features/reservations/components/CustomerPicker";
import { ReservationItineraryStep } from "@/features/tours/components/ReservationItineraryStep";
import { ReservationTourDaysStep } from "@/features/tours/components/ReservationTourDaysStep";
import { jstInputToIso } from "@/lib/datetime";

/** Time of day (JST) the tour days of a new reservation start at, until each is given its own. */
const defaultTourDayStart = "09:00";

/** Creation in three steps: the reservation, its tour days and their itinerary. */
export function CreateReservationModal({
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
    useState<Reservation | null>(null);
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
  const [selectedCustomers, setSelectedCustomers] = useState<
    ReservationCustomerInput[]
  >([]);

  useEffect(() => {
    let active = true;

    listAgencies({ isActive: true })
      .then((items) => {
        if (active) {
          setAgencies(items);
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

    // A one-day reservation starts and ends on the same day.
    if (endDate < startDate) {
      setError("The end date cannot be before the start date.");
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
      // A reservation is a range of days. The API creates one tour day per
      // day at this time of day; each day's times are set afterwards, in its
      // itinerary and tour day.
      start_date: jstInputToIso(`${startDate}T${defaultTourDayStart}`),
      end_date: jstInputToIso(`${endDate}T${defaultTourDayStart}`),
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
              <Combobox
                value={agencyId}
                options={agencies.map(agencyOption)}
                onChange={setAgencyId}
                onCreate={async (name) => {
                  const agency = await createAgencyNamed(name);
                  setAgencies((current) => [...current, agency]);
                  return agencyOption(agency);
                }}
                noun="agency"
                placeholder={isLoadingAgencies ? "Loading agencies..." : "Search or create an agency..."}
                emptyLabel="No agency assigned"
                disabled={isLoadingAgencies || isSubmitting}
                inputClass={inputClass}
              />
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
                value={selectedCustomers}
                onChange={setSelectedCustomers}
                disabled={isSubmitting}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            </div>

            <label className={labelClass}>
              Start date *
              <DateInput
                value={startDate}
                max={endDate || undefined}
                onChange={setStartDate}
                disabled={isSubmitting}
                className={inputClass}
                ariaLabel="Start date"
                clearable={false}
              />
            </label>

            <label className={labelClass}>
              End date *
              <DateInput
                min={startDate || undefined}
                value={endDate}
                onChange={setEndDate}
                disabled={isSubmitting}
                className={inputClass}
                ariaLabel="End date"
                clearable={false}
              />
              <span className="mt-1 block text-[9px] text-[#96968b]">One tour day is created per day; set each day&apos;s times in its itinerary.</span>
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
