import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDayKey, formatDuration, formatJstClock, isoToJstInput, jstInputToIso, parseDuration, parseTimeText, startOfJstDay, timesOfDay, toDayKey } from "./datetime.ts";

describe("JST conversions", () => {
  it("reads a datetime-local value as Japan time", () => {
    assert.equal(jstInputToIso("2026-11-04T09:30"), "2026-11-04T00:30:00.000Z");
  });

  it("crosses the date line backwards into the previous UTC day", () => {
    assert.equal(jstInputToIso("2026-11-04T06:00"), "2026-11-03T21:00:00.000Z");
  });

  it("shows an instant as a JST datetime-local value", () => {
    assert.equal(isoToJstInput("2026-11-03T21:00:00Z"), "2026-11-04T06:00");
  });

  it("round-trips", () => {
    assert.equal(isoToJstInput(jstInputToIso("2026-12-31T23:59")), "2026-12-31T23:59");
  });

  it("returns an empty input for an invalid instant", () => {
    assert.equal(isoToJstInput("not a date"), "");
  });

  it("formats the clock in JST, 24 h", () => {
    assert.equal(formatJstClock("2026-11-04T13:05:00Z"), "22:05");
  });
});

describe("day keys", () => {
  it("uses the Japan day, not the UTC one", () => {
    assert.equal(toDayKey("2026-11-04T16:00:00Z"), "2026-11-05");
    assert.equal(toDayKey(new Date("2026-11-04T14:59:59Z")), "2026-11-04");
  });

  it("starts a JST day at 15:00 UTC of the day before", () => {
    assert.equal(startOfJstDay("2026-11-05").toISOString(), "2026-11-04T15:00:00.000Z");
  });
});

describe("durations", () => {
  it("parses whole hours in the accepted spellings", () => {
    for (const text of ["6", "6h", "6 h", "6 horas", "6 hours", " 6H "]) assert.equal(parseDuration(text), 6, text);
  });

  it("is null when empty and NaN when not a whole number of hours", () => {
    assert.equal(parseDuration(""), null);
    for (const text of ["0", "1.5", "six", "-2", "6 min"]) assert.ok(Number.isNaN(parseDuration(text)), text);
  });

  it("formats hours and hides empty values", () => {
    assert.equal(formatDuration(6), "6h");
    assert.equal(formatDuration(0), "");
    assert.equal(formatDuration(null), "");
  });
});

describe("typed times", () => {
  it("reads the usual ways of typing a time", () => {
    const cases: Record<string, string> = { "9": "09:00", "930": "09:30", "0930": "09:30", "9:30": "09:30", "9.3": "09:30", "17h30": "17:30", " 23:59 ": "23:59", "0": "00:00", "17:": "17:00" };
    for (const [text, want] of Object.entries(cases)) assert.equal(parseTimeText(text), want, text);
  });

  it("refuses what is not a time", () => {
    for (const text of ["", "24:00", "9:60", "abc", "12345", "1:2:3"]) assert.equal(parseTimeText(text), null, text);
  });

  it("lists the times of the day", () => {
    const times = timesOfDay(15);
    assert.equal(times.length, 96);
    assert.equal(times[0], "00:00");
    assert.equal(times[37], "09:15");
    assert.equal(times.at(-1), "23:45");
  });

  it("formats a calendar day without shifting it", () => {
    assert.equal(formatDayKey("2026-11-04"), "Wed, 4 Nov 2026");
  });
});
