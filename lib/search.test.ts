import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterOptions, findExactOption, normalizeForSearch } from "./search.ts";

const zones = [
  { id: "1", label: "Kyoto" },
  { id: "2", label: "Tokyo" },
  { id: "3", label: "Kyōto Station", detail: "Shimogyō" },
  { id: "4", label: "Osaka" },
];

describe("normalizeForSearch", () => {
  it("ignores case, accents and extra spaces", () => {
    assert.equal(normalizeForSearch("  Kyōto   STATION "), "kyoto station");
  });
});

describe("filterOptions", () => {
  it("puts the options starting with the query first", () => {
    assert.deepEqual(filterOptions(zones, "kyo").map((zone) => zone.id), ["1", "3", "2"]);
  });

  it("matches the detail and ignores accents", () => {
    assert.deepEqual(filterOptions(zones, "shimogyo").map((zone) => zone.id), ["3"]);
  });

  it("returns everything for an empty query and nothing without matches", () => {
    assert.equal(filterOptions(zones, "  ").length, 4);
    assert.equal(filterOptions(zones, "nara").length, 0);
  });
});

describe("findExactOption", () => {
  it("finds the option named as typed", () => {
    assert.equal(findExactOption(zones, " kyoto ")?.id, "1");
    assert.equal(findExactOption(zones, "KYOTO station")?.id, "3");
  });

  it("finds nothing for partial or empty queries", () => {
    assert.equal(findExactOption(zones, "kyo"), undefined);
    assert.equal(findExactOption(zones, ""), undefined);
  });
});
