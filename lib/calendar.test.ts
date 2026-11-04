import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { monthCells, monthRange, shiftMonth } from "./calendar.ts";

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
