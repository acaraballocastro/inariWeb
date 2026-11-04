import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays, addMonths, isWithin, monthCells, monthOf, monthRange, shiftMonth } from "./calendar.ts";

describe("monthRange", () => {
  it("bounds the month in JST, end exclusive", () => {
    assert.deepEqual(monthRange({ year: 2026, month: 11 }), { from: "2026-10-31T15:00:00.000Z", to: "2026-11-30T15:00:00.000Z" });
  });

  it("rolls over into the next year", () => {
    assert.deepEqual(monthRange({ year: 2026, month: 12 }), { from: "2026-11-30T15:00:00.000Z", to: "2026-12-31T15:00:00.000Z" });
  });
});

describe("monthCells", () => {
  it("covers whole weeks from Monday to Sunday", () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const cells = monthCells({ year: 2026, month: 11 });
    assert.equal(cells[0], "2026-10-26");
    assert.equal(cells.at(-1), "2026-12-06");
    assert.equal(cells.length % 7, 0);
  });

  it("adds no extra week when the month starts on Monday and ends on Sunday", () => {
    // February 2027 runs from Monday 1st to Sunday 28th.
    const cells = monthCells({ year: 2027, month: 2 });
    assert.equal(cells[0], "2027-02-01");
    assert.equal(cells.at(-1), "2027-02-28");
    assert.equal(cells.length, 28);
  });
});

describe("shiftMonth", () => {
  it("moves across years both ways", () => {
    assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
    assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  });
});

describe("day arithmetic", () => {
  it("adds days across months and years", () => {
    assert.equal(addDays("2026-11-30", 1), "2026-12-01");
    assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  });

  it("adds months keeping the day when it exists", () => {
    assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
    assert.equal(addMonths("2026-03-15", -3), "2025-12-15");
  });

  it("knows the month and the bounds", () => {
    assert.deepEqual(monthOf("2026-11-04"), { year: 2026, month: 11 });
    assert.ok(isWithin("2026-11-04", "2026-11-04", "2026-11-05"));
    assert.ok(!isWithin("2026-11-03", "2026-11-04"));
    assert.ok(isWithin("2026-11-03"));
  });
});
