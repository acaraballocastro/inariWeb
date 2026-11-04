import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { finalStatuses, formatStatus, isCancelled, isFinal, openStatuses } from "./status.ts";

describe("statuses", () => {
  it("formats codes as words", () => {
    assert.equal(formatStatus("FORCE_MAJEURE_CANCELLED"), "Force Majeure Cancelled");
    assert.equal(formatStatus("SENT"), "Sent");
  });

  it("splits open and final statuses without overlap", () => {
    assert.equal(openStatuses.filter((status) => finalStatuses.includes(status)).length, 0);
    assert.ok(isFinal("COMPLETED"));
    assert.ok(!isFinal("CONFIRMED"));
  });

  it("knows the cancelled statuses", () => {
    assert.ok(isCancelled("FORCE_MAJEURE_CANCELLED"));
    assert.ok(!isCancelled("COMPLETED"));
  });
});
