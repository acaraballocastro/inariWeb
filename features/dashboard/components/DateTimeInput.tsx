"use client";

import { useState } from "react";

import { DateInput } from "./DateInput";
import { TimeInput } from "./TimeInput";

type DateTimeInputProps = {
  /** "YYYY-MM-DDTHH:MM" (as a datetime-local field gives it), or "" until both parts are set. */
  value: string;
  onChange: (value: string) => void;
  /** Inclusive day bounds, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  disabled?: boolean;
  className: string;
  ariaLabel?: string;
};

/** A day and a time side by side, in place of the browser's datetime-local field. */
export function DateTimeInput({ value, onChange, min, max, disabled = false, className, ariaLabel = "Date and time" }: DateTimeInputProps) {
  // The part chosen while the other is still missing (the value stays "").
  const [pending, setPending] = useState({ date: "", time: "" });
  const date = value ? value.slice(0, 10) : pending.date;
  const time = value ? value.slice(11, 16) : pending.time;

  function update(next: { date: string; time: string }) {
    setPending(next);
    onChange(next.date && next.time ? `${next.date}T${next.time}` : "");
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
      <DateInput value={date} onChange={(nextDate) => update({ date: nextDate, time })} min={min} max={max} disabled={disabled} className={className} ariaLabel={`${ariaLabel}, day`} clearable={false} />
      <TimeInput value={time} onChange={(nextTime) => update({ date, time: nextTime })} disabled={disabled} className={className} ariaLabel={`${ariaLabel}, time`} />
    </div>
  );
}
