import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCoordinates, mapUrl, parseCoordinates } from "./maps.ts";

describe("parseCoordinates", () => {
  it("reads the pair Google Maps copies", () => {
    assert.deepEqual(parseCoordinates(" 34.9671, 135.7727 "), { latitude: 34.9671, longitude: 135.7727 });
    assert.deepEqual(parseCoordinates("-33.8 151.2"), { latitude: -33.8, longitude: 151.2 });
  });
  it("is null when empty and undefined when invalid", () => {
    assert.equal(parseCoordinates("  "), null);
    assert.equal(parseCoordinates("Kyoto"), undefined);
    assert.equal(parseCoordinates("91, 10"), undefined);
    assert.equal(parseCoordinates("10, 181"), undefined);
  });
});

describe("mapUrl", () => {
  it("prefers coordinates, then the address", () => {
    assert.equal(mapUrl({ address: "Kyoto", latitude: 1.5, longitude: 2 }), "https://www.google.com/maps/search/?api=1&query=1.5,2");
    assert.equal(mapUrl({ address: "Fukakusa, Kyoto", latitude: null, longitude: null }, "Fushimi Inari"), "https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari%2C%20Fukakusa%2C%20Kyoto");
    assert.equal(mapUrl({ address: " ", latitude: null, longitude: null }), null);
  });
  it("formats coordinates back", () => {
    assert.equal(formatCoordinates({ address: null, latitude: 34.9671, longitude: 135.7727 }), "34.9671, 135.7727");
    assert.equal(formatCoordinates({ address: null, latitude: null, longitude: null }), "");
  });
});
