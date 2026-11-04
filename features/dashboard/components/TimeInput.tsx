"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { parseTimeText, timesOfDay } from "@/lib/datetime";

type TimeInputProps = {
  /** "HH:MM", or "" for none. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Same input classes the forms use. */
  className: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Minutes between the suggested times (15 by default). */
  step?: number;
};

/**
 * The app's time field, in place of the browser's: type it ("930", "9:30",
 * "17h30"…) or pick it from the list. Arrows move in the list, Enter picks,
 * Escape gives up. What cannot be read as a time is dropped on leaving.
 */
export function TimeInput({ value, onChange, disabled = false, className, placeholder = "HH:MM", ariaLabel, step = 15 }: TimeInputProps) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  // Null while not typing: the field shows the value.
  const [text, setText] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const times = useMemo(() => timesOfDay(step), [step]);

  // The suggestion closest to what is typed, or to the value.
  function nearestIndex(time: string | null) {
    if (!time) return times.indexOf("09:00");
    const index = times.findIndex((option) => option >= time);
    return index === -1 ? times.length - 1 : index;
  }

  useEffect(() => {
    if (isOpen) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [isOpen, active]);

  function commit(next: string) {
    if (next !== value) onChange(next);
    setText(null);
    setIsOpen(false);
  }

  // Leaving the field keeps a valid typed time, clears an emptied one and
  // forgets anything else.
  function settle() {
    if (text === null) { setIsOpen(false); return; }
    if (!text.trim()) commit("");
    else commit(parseTimeText(text) ?? value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) { setIsOpen(true); setActive(nearestIndex(value)); return; }
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + times.length) % times.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (text !== null) settle();
      else if (isOpen) commit(times[active]);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setText(null);
      setIsOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        value={text ?? value}
        placeholder={placeholder}
        onFocus={(event) => { setIsOpen(true); setActive(nearestIndex(value)); event.currentTarget.select(); }}
        onChange={(event) => {
          setText(event.target.value);
          setIsOpen(true);
          setActive(nearestIndex(parseTimeText(event.target.value)));
        }}
        onBlur={settle}
        onKeyDown={handleKeyDown}
        className={`${className} pr-8`}
      />
      <ClockIcon />
      {isOpen && (
        <ul ref={listRef} id={listId} role="listbox" className="absolute z-30 mt-1 max-h-52 w-full min-w-[96px] overflow-y-auto border border-[#deddd6] bg-[#fffefa] py-1 shadow-[0_8px_18px_rgba(42,43,38,0.08)]">
          {times.map((time, index) => (
            <li
              key={time}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={time === value}
              // Keeps the focus in the field, so blur does not close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => commit(time)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-[10px] tabular-nums text-[#292b26] ${index === active ? "bg-[#f1ede2]" : ""}`}
            >
              {time}
              {time === value && <span aria-hidden="true" className="text-[9px] text-[#9b8353]">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 text-[#9b8353]" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}
