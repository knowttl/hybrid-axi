import { decode } from "@toon-format/toon";
import { expect, test } from "vitest";
import { main } from "../src/cli.js";
import { constructTransport } from "../src/transport-core.js";
import { transportBindings } from "../src/catalogue.js";
import { fakeHttpsHybrid, keyBody, quotaBody, syntheticKey, type Reply } from "./support/fake-hybrid.js";

async function home(replies: Reply[], args: string[] = []) {
  const fake = await fakeHttpsHybrid(replies);
  let stdout = "";
  const previous = process.exitCode;
  try {
    process.exitCode = 0;
    await main(args, {
      credentials: { env: { HYBRID_AXI_API_KEY: syntheticKey } },
      stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(stdout).not.toContain(syntheticKey);
    expect(stdout).not.toContain("synthetic-user");
    return { value: decode(stdout), code: process.exitCode, requests: fake.requests };
  } finally { process.exitCode = previous; await fake.close(); }
}

test("configured startup returns bounded live context and a recovery command for the full upstream window", async () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({ report_id: `synthetic-${index}`, sha256: "a".repeat(64) }));
  const result = await home([{ body: keyBody }, { body: quotaBody }, { body: rows }]);
  expect(result.code).toBe(0);
  expect(result.value).toMatchObject({ status: "live", keyLevel: "restricted", feed: {
    count: 5, available: 7, complete: false, upstreamCap: 250,
    results: rows.slice(0, 5), help: ["Run hybrid-axi feed detonation --limit 7"],
  } });
  expect(result.requests.map(({ method, url }) => [method, url])).toEqual([
    ["GET", "/api/v2/key/current"], ["GET", "/api/v2/key/submission-quota"], ["GET", "/api/v2/feed/detonation"],
  ]);
  const recovered = await home([{ body: rows }], ["feed", "detonation", "--limit", "7"]);
  expect(recovered.value).toMatchObject({ count: 7, available: 7, complete: true, results: rows });
});

test("configured startup distinguishes an explicitly empty public feed", async () => {
  const result = await home([{ body: keyBody }, { body: quotaBody }, { body: [] }], ["home"]);
  expect(result.code).toBe(0);
  expect(result.value).toMatchObject({ status: "live", feed: { count: 0, available: 0, complete: true, message: "0 results for feed detonation" } });
});

test.each([401, 403, 429, 503])("startup preserves account failure %s without claiming zero results", async (status) => {
  const result = await home([{ status, body: { message: "Synthetic failure" } }]);
  expect(result.code).toBe(1);
  expect(result.value).toMatchObject({ error: { status, operation: "key.current" } });
  expect(result.value).not.toHaveProperty("feed");
  expect(result.requests).toHaveLength(1);
});

test.each([403, 429, 503])("startup retains account context but marks a failed feed %s unavailable", async (status) => {
  const result = await home([{ body: keyBody }, { body: quotaBody }, { status }]);
  expect(result.value).toMatchObject({ status: "partial", keyLevel: "restricted", feed: { status: "unavailable", error: { status } } });
  expect(result.value).not.toHaveProperty("feed.count");
  expect(result.requests).toHaveLength(3);
});

test.each([403, 429, 503])("startup reports quota endpoint failure %s without requesting the feed", async (status) => {
  const result = await home([{ body: keyBody }, { status }]);
  expect(result.code).toBe(1);
  expect(result.value).toMatchObject({ error: { status, operation: "key.submission-quota" } });
  expect(result.value).not.toHaveProperty("feed");
  expect(result.requests).toHaveLength(2);
});

test.each([[], ["hash", "search"], ["report", "state"], ["submit", "url"]])(
  "unknown flags fail before configured service reads or submissions: %j", async (...args) => {
    const result = await home([], [...args, "--axi-review-unknown"]);
    expect(result.code).toBe(2);
    expect(result.value).toMatchObject({ code: "VALIDATION_ERROR", error: expect.stringContaining("--axi-review-unknown") });
    expect(result.requests).toEqual([]);
  });

test("explicit offline startup makes no service calls even when configured", async () => {
  const result = await home([], ["home", "--offline"]);
  expect(result.code).toBe(0);
  expect(result.value).toMatchObject({ setup: "configured", status: "Local configuration; doctor and quota are available for explicit API checks" });
  expect(result.requests).toEqual([]);
});
