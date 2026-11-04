import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeMissing, withFallback } from "./missing.ts";

describe("withFallback", () => {
  it("passes the value through and notes nothing on success", async () => {
    const missing: string[] = [];
    assert.deepEqual(await withFallback(Promise.resolve([1]), [], "zones", missing), [1]);
    assert.deepEqual(missing, []);
  });

  it("returns the fallback and notes the label once on failure", async () => {
    const missing: string[] = [];
    assert.deepEqual(await withFallback(Promise.reject(new Error("down")), [], "zones", missing), []);
    await withFallback(Promise.reject(new Error("down")), [], "zones", missing);
    assert.deepEqual(missing, ["zones"]);
  });
});

describe("describeMissing", () => {
  it("joins labels as a sentence without repeats", () => {
    assert.equal(describeMissing([]), "");
    assert.equal(describeMissing(["guides"]), "guides");
    assert.equal(describeMissing(["guides", "zones", "guides"]), "guides and zones");
    assert.equal(describeMissing(["guides", "zones", "agencies"]), "guides, zones and agencies");
  });
});
