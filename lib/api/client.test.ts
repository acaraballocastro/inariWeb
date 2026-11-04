import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { ApiError, request, requestPage } from "./client.ts";

const realFetch = globalThis.fetch;
const calls: { url: string; init: RequestInit }[] = [];

function respond(status: number, body: unknown, headers: Record<string, string> = {}) {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  calls.length = 0;
});

describe("request", () => {
  it("unwraps the data envelope and sends cookies as JSON", async () => {
    respond(200, { data: { id: "r1" } });
    assert.deepEqual(await request("/reservations/R1"), { id: "r1" });
    assert.match(calls[0].url, /\/api\/v1\/reservations\/R1$/);
    assert.equal(calls[0].init.credentials, "include");
    assert.equal(new Headers(calls[0].init.headers).get("Content-Type"), "application/json");
  });

  it("returns bodies without envelope as they are", async () => {
    respond(200, [1, 2]);
    assert.deepEqual(await request("/x"), [1, 2]);
  });

  it("handles an empty body (204)", async () => {
    respond(204, undefined);
    assert.equal(await request("/x", { method: "DELETE" }), null);
  });

  it("throws the backend message, status and code", async () => {
    respond(404, { error: "reservation not found", code: "RESERVATION_NOT_FOUND" });
    await assert.rejects(request("/reservations/NOPE"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "RESERVATION_NOT_FOUND");
      assert.equal(error.message, "reservation not found");
      return true;
    });
  });

  it("falls back to a plain-text body or a generic message", async () => {
    respond(500, "boom");
    await assert.rejects(request("/x"), { message: "boom", status: 500 });
    respond(502, undefined);
    await assert.rejects(request("/x"), { message: "The operation could not be completed.", status: 502 });
  });

  it("reports a network failure as status 0", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(request("/x"), { status: 0, message: "Could not connect to the server." });
  });
});

describe("requestPage", () => {
  it("adds limit and offset and reads the total header", async () => {
    respond(200, { data: [{ id: "a" }] }, { "X-Total-Count": "41" });
    const page = await requestPage("/reservations?status=CONFIRMED", { limit: 25, offset: 25 });
    assert.match(calls[0].url, /\/reservations\?status=CONFIRMED&limit=25&offset=25$/);
    assert.deepEqual(page, { items: [{ id: "a" }], total: 41 });
  });

  it("estimates the total without the header and treats null as empty", async () => {
    respond(200, { data: null });
    assert.deepEqual(await requestPage("/customers", { limit: 50, offset: 100 }), { items: [], total: 100 });
  });
});
