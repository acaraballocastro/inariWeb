"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { addDays, addMonths, isWithin, monthCells, monthOf, shiftMonth, type CalendarMonth } from "@/lib/calendar";
import { formatDayKey, toDayKey } from "@/lib/datetime";

type DateInputProps = {
  /** "YYYY-MM-DD", or "" for none. */
  value: string;
  onChange: (value: string) => void;
  /** Inclusive bounds, "YYYY-MM-DD". */
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Classes of the closed control: the same input classes the forms use. */
  className: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Offers "Clear" (true by default). */
  clearable?: boolean;
};

const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * The app's date picker, in place of the browser's: a month calendar (weeks
 * from Monday, today marked) under the field. Keyboard: the arrows move by day
 * or week, Page Up/Down by month, Enter picks, Escape closes.
 */
export function DateInput({ value, onChange, min, max, disabled = false, className, placeholder = "Select a date", ariaLabel, clearable = true }: DateInputProps) {
  const gridId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const [isOpen, setIsOpen] = useState(false);
  const [focusKey, setFocusKey] = useState("");
  const [month, setMonth] = useState<CalendarMonth>({ year: 2026, month: 1 });
  // Operations happen in Japan: "today" is the JST day.
  const today = isOpen ? toDayKey(new Date()) : "";

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  // The day with the keyboard focus gets the real focus.
  useEffect(() => {
    if (isOpen && focusKey) dayRefs.current.get(focusKey)?.focus();
  }, [isOpen, focusKey]);

  function open() {
    if (disabled) return;
    const start = value || clamp(toDayKey(new Date()));
    setFocusKey(start);
    setMonth(monthOf(start));
    setIsOpen(true);
  }

  function clamp(dayKey: string) {
    if (min && dayKey < min) return min;
    if (max && dayKey > max) return max;
    return dayKey;
  }

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function pick(dayKey: string) {
    if (!isWithin(dayKey, min, max)) return;
    onChange(dayKey);
    close();
  }

  function moveFocus(dayKey: string) {
    const next = clamp(dayKey);
    setFocusKey(next);
    setMonth(monthOf(next));
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusKey, -1),
      ArrowRight: () => addDays(focusKey, 1),
      ArrowUp: () => addDays(focusKey, -7),
      ArrowDown: () => addDays(focusKey, 7),
      PageUp: () => addMonths(focusKey, -1),
      PageDown: () => addMonths(focusKey, 1),
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveFocus(moves[event.key]());
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  const cells = monthCells(month);
  const monthLabel = formatDayKey(`${month.year}-${String(month.month).padStart(2, "0")}-01`, { month: "long", year: "numeric" });
  const navButton = "flex h-7 w-7 items-center justify-center text-[12px] text-[#66685f] hover:bg-[#f1ede2]";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel ? `${ariaLabel}${value ? `: ${formatDayKey(value)}` : ""}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={(event) => { if (event.key === "ArrowDown" && !isOpen) { event.preventDefault(); open(); } }}
        className={`${className} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`truncate ${value ? "" : "text-[#aaa99f]"}`}>{value ? formatDayKey(value) : placeholder}</span>
        <CalendarIcon />
      </button>
      {isOpen && (
        // Inside a <label>, a click here would otherwise be passed on to the
        // field's button and toggle the calendar.
        <div role="dialog" aria-label={ariaLabel ?? "Choose a date"} onClick={(event) => event.preventDefault()} className="absolute z-30 mt-1 w-[248px] border border-[#deddd6] bg-[#fffefa] p-3 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => shiftMonth(current, -1))} className={navButton}>‹</button>
            <p aria-live="polite" className="font-serif text-[13px] text-[#292b26]">{monthLabel}</p>
            <button type="button" aria-label="Next month" onClick={() => setMonth((current) => shiftMonth(current, 1))} className={navButton}>›</button>
          </div>
          <div id={gridId} role="grid" aria-label={monthLabel} onKeyDown={handleGridKeyDown} className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((day) => <span key={day} role="columnheader" className="pb-1 text-[8px] font-semibold tracking-[0.12em] text-[#aaa28f]">{day}</span>)}
            {cells.map((dayKey) => {
              const inMonth = dayKey.slice(0, 7) === `${month.year}-${String(month.month).padStart(2, "0")}`;
              const isSelected = dayKey === value;
              const isToday = dayKey === today;
              const allowed = isWithin(dayKey, min, max);
              return (
                <button
                  key={dayKey}
                  ref={(element) => { if (element) dayRefs.current.set(dayKey, element); else dayRefs.current.delete(dayKey); }}
                  type="button"
                  role="gridcell"
                  tabIndex={dayKey === focusKey ? 0 : -1}
                  aria-selected={isSelected}
                  aria-label={formatDayKey(dayKey, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  aria-current={isToday ? "date" : undefined}
                  disabled={!allowed}
                  onClick={() => pick(dayKey)}
                  onFocus={() => setFocusKey(dayKey)}
                  className={`h-8 text-[10px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#b5a786] disabled:cursor-not-allowed disabled:opacity-30 ${
                    isSelected ? "bg-[#292b26] text-white" : `${inMonth ? "text-[#292b26]" : "text-[#b9b8ae]"} hover:bg-[#f1ede2]`
                  } ${isToday && !isSelected ? "font-semibold text-[#9b8353] underline underline-offset-4" : ""}`}
                >
                  {Number(dayKey.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#ecebe5] pt-2 text-[9px]">
            <button type="button" disabled={!isWithin(today, min, max)} onClick={() => pick(today)} className="text-[#9b8353] underline underline-offset-4 disabled:opacity-40">Today</button>
            {clearable && value && <button type="button" onClick={() => { onChange(""); close(); }} className="text-[#77786f] underline underline-offset-4 hover:text-[#292b26]">Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-[#9b8353]" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="3" width="12" height="11" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  );
}
