import { z } from "zod";
import { afterEach, expect, test, vi } from "vitest";
import { constructTransport, type Credential, type OperationBinding } from "../src/transport-core.js";
import { transportBindings } from "../src/catalogue.js";
import { createSession } from "../src/session.js";
import { SecretRedactor } from "../src/redact.js";
import { fakeHttpsHybrid, fakeTransport, keyBody, quotaBody, syntheticKey } from "./support/fake-hybrid.js";

const redactor = new SecretRedactor();
redactor.add(syntheticKey);
const credential: Credential = { apiKey: syntheticKey, redact: (value) => redactor.payload(value) };
const sample: OperationBinding = { method: "GET", path: "/api/v2/report/{id}/sample", effect: "write",
  download: true, requiredKeyLevel: "default", decoder: z.instanceof(Uint8Array) };
const bindings = { ...transportBindings, sample };
const authorize = () => true;
afterEach(() => vi.useRealTimers());

test("quota decodes documented usage and observed limit headers over verified HTTPS", async () => {
  const fake = await fakeHttpsHybrid([
    { body: keyBody, headers: { "Api-Limits": '{"remaining":5}', "Submission-Limits": '{"day":100}',
      "Quick-Scan-Limits": '{"day":50}', "Sample-Download-Limits": '{"day":10}' } },
    { body: quotaBody, headers: { "Api-Limits": '{"remaining":4}' } },
  ]);
  try {
    const session = createSession(constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }));
    const result = await session.quota();
    expect(result).toMatchObject({ keyLevel: "restricted", quota: {
      detonation: { keyQuota: { quota: { day: 100 }, used: { day: 3 }, available: { day: 97 } }, quota_reached: false },
      quick_scan: { keyQuota: null, quota_reached: false },
    }, rateLimits: {
      key: { "Api-Limits": { value: { remaining: 5 } }, "Submission-Limits": { value: { day: 100 } },
        "Quick-Scan-Limits": { value: { day: 50 } }, "Sample-Download-Limits": { value: { day: 10 } } },
      quota: { "Api-Limits": { value: { remaining: 4 } } },
    } });
    expect(fake.requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: "GET", url: "/api/v2/key/current" }, { method: "GET", url: "/api/v2/key/submission-quota" },
    ]);
    expect(fake.requests[0]!.headers["api-key"]).toBe(syntheticKey);
    expect(JSON.stringify(result)).not.toContain(syntheticKey);
    expect(JSON.stringify(result)).not.toContain("synthetic-user");
  } finally { await fake.close(); }
});

test("doctor leaves missing targets and unprobed operations unverified", async () => {
  const fake = fakeTransport([{ body: keyBody }, { body: quotaBody }, { body: { sandbox: "1", api: "2" } },
    { status: 404 }, { body: { count: 0, result: [] } }, { body: [] }, { body: { sha256s: [], reports: [] } }], { credential });
  expect(await createSession(fake.transport).doctor()).toMatchObject({ status: "ok", keyLevel: "restricted",
    scope: "One read per command group; other operations remain unverified. A not-found probe does not establish access." });
});

test("doctor never retries an explicit transient failure", async () => {
  const fake = fakeTransport([{ status: 503, body: { message: "Unavailable" } }], { credential });
  await expect(createSession(fake.transport).doctor()).rejects.toMatchObject({ error: { code: "UPSTREAM_ERROR", status: 503 } });
  expect(fake.requests).toHaveLength(1);
});

test("doctor never retries a transient group probe failure", async () => {
  const fake = fakeTransport([{ body: keyBody }, { body: quotaBody }, { status: 503 }], { credential });
  await expect(createSession(fake.transport).doctor()).rejects.toMatchObject({ error: { operation: "system version", status: 503 } });
  expect(fake.requests).toHaveLength(3);
});

test("restricted download denial names the required level and account vetting", async () => {
  const fake = fakeTransport([{ body: keyBody }, { status: 403, body: { message: "Forbidden" } }],
    { credential, bindings, consumeWriteAuthorization: authorize });
  await fake.transport.request("key.current");
  await expect(fake.transport.request("sample", { pathParams: { id: "synthetic-job" } })).rejects.toMatchObject({
    error: { code: "KEY_LEVEL_RESTRICTED", status: 403, keyLevel: "restricted", requiredKeyLevel: "default",
      message: expect.stringContaining("vetting") },
  });
});

test("download denial without inspected key says unknown and recommends quota", async () => {
  const fake = fakeTransport([{ status: 403, body: { message: "Forbidden" } }],
    { credential, bindings, consumeWriteAuthorization: authorize });
  await expect(fake.transport.request("sample", { pathParams: { id: "synthetic-job" } })).rejects.toMatchObject({
    error: { code: "PERMISSION_DENIED", keyLevel: "unknown", requiredKeyLevel: "default",
      message: expect.stringContaining("Non-vetted restricted keys cannot download") },
    help: [expect.stringContaining("hybrid-axi quota")],
  });
});

test("ordinary denial never implies restricted download access", async () => {
  const fake = fakeTransport([{ status: 403, body: { message: "Forbidden" } }], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "PERMISSION_DENIED", status: 403 } });
});

test("redirects are rejected without sending credentials to a second destination", async () => {
  const fake = await fakeHttpsHybrid([{ status: 302, headers: { location: "https://example.invalid/stolen" } }]);
  try {
    const transport = constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch });
    await expect(transport.request("key.current")).rejects.toMatchObject({ error: { code: "REDIRECT_BLOCKED" } });
    expect(fake.requests).toHaveLength(1);
  } finally { await fake.close(); }
});

test("an ambiguous timeout is never replayed even for a retryable read", async () => {
  vi.useFakeTimers();
  const fake = fakeTransport(["hang"], { credential,
    bindings: { "key.current": { ...transportBindings["key.current"]!, retrySafe: true } } });
  const result = expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "TIMEOUT" } });
  await vi.advanceTimersByTimeAsync(20_000);
  await result;
  expect(fake.requests).toHaveLength(1);
});

test("disconnects do not expose dependency errors or replay requests", async () => {
  const fake = fakeTransport(["disconnect"], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "NETWORK_ERROR",
    message: "Request failed with an unknown outcome; it was not replayed" } });
  expect(fake.requests).toHaveLength(1);
});

test.each(["", "<html>failure</html>", "{", "{}", '{"auth_level_name":42}', '{"auth_level_name":""}'])("invalid success body fails rather than becoming empty: %s", async (text) => {
  const fake = fakeTransport([{ text }], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
});

test("quota failure never returns a zero quota", async () => {
  const fake = fakeTransport([{ body: keyBody }, { body: {} }], { credential });
  await expect(createSession(fake.transport).quota()).rejects.toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
});

test("HTML success reports safe diagnostics without the login page", async () => {
  const fake = fakeTransport([{ text: `<html>${syntheticKey} synthetic-login</html>`,
    headers: { "content-type": "text/html; charset=utf-8" } }], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: {
    code: "MALFORMED_RESPONSE", status: 200, contentType: "text/html",
    shape: [{ path: "$", type: "undefined" }], shapeTruncated: false,
  } });
});

test("malformed reports replace unsafe malware keys and omit response values", async () => {
  const fake = fakeTransport([{ body: { auth_level_name: 42, "malware.example": { "C:\\payload.exe": syntheticKey },
    "12345678-1234-1234-1234-123456789abc": "synthetic-value" }, headers: { "content-type": "application/json" } }], { credential });
  const error = await fake.transport.request("key.current").catch((error: unknown) => error);
  expect(error).toMatchObject({ error: { code: "MALFORMED_RESPONSE", status: 200, contentType: "application/json",
    shape: [{ path: "$", type: "object" }, { path: '$["auth_level_name"]', type: "number", expected: "string" },
      { path: '$["<key>"]', type: "object" }, { path: '$["<key>"]["<key>"]', type: "string" },
      { path: '$["<key>"]', type: "string" }],
    issues: [{ path: '$["auth_level_name"]', received: "number", expected: "string", code: "invalid_type" }],
  } });
  expect(JSON.stringify(error)).not.toMatch(/malware\.example|payload|12345678|synthetic-value|synthetic-secret|message.*expected string/);
});

test("new quota fields remain available after sensitive-field redaction", async () => {
  const fake = fakeTransport([{ body: keyBody }, { body: { ...quotaBody, pending: 1, password: "synthetic-password" } }], { credential });
  expect(await createSession(fake.transport).quota()).toMatchObject({ quota: { pending: 1, password: "***redacted***" } });
});

test("malformed headers are explicit without hiding valid submission headers", async () => {
  const fake = fakeTransport([{ body: keyBody, headers: { "Api-Limits": "broken", "Submission-Limits": '{"day":3}' } }], { credential });
  expect(await fake.transport.request("key.current")).toMatchObject({ rateLimits: {
    "Api-Limits": { malformed: true }, "Submission-Limits": { value: { day: 3 } },
  } });
});

test("documented upstream messages and headers scrub synthetic raw and encoded keys", async () => {
  const fake = fakeTransport([
    { status: 400, body: { message: `${syntheticKey} ${encodeURIComponent(syntheticKey)}` } },
    { body: keyBody, headers: { "Api-Limits": JSON.stringify({ message: syntheticKey }) } },
  ], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { message: "***redacted*** ***redacted***" } });
  const result = await fake.transport.request("key.current");
  expect(JSON.stringify(result)).not.toContain(syntheticKey);
  expect(result.body).toEqual({ auth_level_name: "restricted" });
});

test.each(["../escape", "https://example.invalid", "x/y", "%2e%2e", "x?key=value", "x\\y"])("unsafe identifier is rejected before sending: %s", async (id) => {
  const fake = fakeTransport([], { credential, bindings, consumeWriteAuthorization: authorize });
  await expect(fake.transport.request("sample", { pathParams: { id } })).rejects.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  expect(fake.requests).toHaveLength(0);
});

test("unregistered operations and guarded downloads cannot bypass authorization", async () => {
  const fake = fakeTransport([], { credential, bindings });
  await expect(fake.transport.request("/api/v2/key/current")).rejects.toMatchObject({ error: { code: "OPERATION_BLOCKED" } });
  await expect(fake.transport.request("sample", { pathParams: { id: "synthetic-job" } })).rejects.toMatchObject({ error: { code: "WRITE_DENIED" } });
  expect(fake.requests).toHaveLength(0);
});

test.each(["http://hybrid-analysis.com", "https://hybrid-analysis.com:444", "https://example.invalid", "https://hybrid-analysis.com/"])("alternate origins are refused: %s", (origin) => {
  expect(() => constructTransport({ credential, origin }, { bindings, fetch: globalThis.fetch })).toThrow("reviewed HTTPS origin");
});

test.each(["x\r\ny", "x;y", "x,y", "x y", ""])("invalid credentials fail before sending: %j", (apiKey) => {
  expect(() => constructTransport({ credential: { ...credential, apiKey } }, { bindings, fetch: globalThis.fetch })).toThrow("header delimiters");
});

test.each([429, 502, 503, 504])("a safe read retries an explicit %i within its deadline", async (status) => {
  vi.useFakeTimers();
  const fake = fakeTransport([{ status, body: { message: "Retry" }, headers: { "Retry-After": "1" } }, { body: keyBody }],
    { credential, bindings: { "key.current": { ...transportBindings["key.current"]!, retrySafe: true } } });
  const result = fake.transport.request("key.current");
  await vi.advanceTimersByTimeAsync(1000);
  expect(await result).toMatchObject({ body: { auth_level_name: "restricted" } });
  expect(fake.requests).toHaveLength(2);
});

test("a retry delay beyond the budget returns rate-limit guidance immediately", async () => {
  const fake = fakeTransport([{ status: 429, body: { message: "Retry" }, headers: { "Retry-After": "60" } }],
    { credential, bindings: { "key.current": { ...transportBindings["key.current"]!, retrySafe: true } } });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "RATE_LIMITED", retryAfter: 60 } });
  expect(fake.requests).toHaveLength(1);
});

test("invocation request budget is shared across calls", async () => {
  const fake = fakeTransport(Array.from({ length: 20 }, () => ({ body: keyBody })), { credential });
  for (let index = 0; index < 20; index++) await fake.transport.request("key.current");
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
  expect(fake.requests).toHaveLength(20);
});

test("oversized decoded JSON fails without publishing partial data", async () => {
  const fake = fakeTransport([{ text: `{"auth_level_name":"${"x".repeat(20 * 1024 * 1024)}"}` }], { credential });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
});

test("JSON byte consumption accumulates across responses", async () => {
  const body = { ...keyBody, padding: "x".repeat(11 * 1024 * 1024) };
  const fake = fakeTransport([{ body }, { body }], { credential });
  await fake.transport.request("key.current");
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
});

test("invocation deadline is not reset between requests", async () => {
  vi.useFakeTimers();
  const fake = fakeTransport([{ body: keyBody }], { credential });
  await fake.transport.request("key.current");
  await vi.advanceTimersByTimeAsync(20_000);
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "DEADLINE_EXCEEDED" } });
  expect(fake.requests).toHaveLength(1);
});

test("a safe read retries at most twice", async () => {
  vi.useFakeTimers();
  const fake = fakeTransport(Array.from({ length: 3 }, () => ({ status: 503, body: { message: "Unavailable" } })),
    { credential, bindings: { "key.current": { ...transportBindings["key.current"]!, retrySafe: true } } });
  const result = expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { status: 503 } });
  await vi.advanceTimersByTimeAsync(2000);
  await result;
  expect(fake.requests).toHaveLength(3);
});

test("an HTTP-date retry interval outside the budget returns rate-limit guidance", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const fake = fakeTransport([{ status: 503, body: { message: "Unavailable" },
    headers: { "Retry-After": "Thu, 01 Jan 2026 00:01:00 GMT" } }],
  { credential, bindings: { "key.current": { ...transportBindings["key.current"]!, retrySafe: true } } });
  await expect(fake.transport.request("key.current")).rejects.toMatchObject({ error: { code: "RATE_LIMITED", retryAfter: 60 } });
  expect(fake.requests).toHaveLength(1);
});

test("caller cancellation aborts the one send without replay", async () => {
  const controller = new AbortController();
  const fake = fakeTransport(["hang"], { credential });
  const result = expect(fake.transport.request("key.current", { signal: controller.signal })).rejects.toMatchObject({ error: { code: "REQUEST_CANCELLED" } });
  controller.abort();
  await result;
  expect(fake.requests).toHaveLength(1);
});

test("cancelled invocations send nothing", async () => {
  const fake = fakeTransport([], { credential });
  await expect(fake.transport.request("key.current", { signal: AbortSignal.abort() })).rejects.toMatchObject({ error: { code: "REQUEST_CANCELLED" } });
  expect(fake.requests).toHaveLength(0);
});

test("unreviewed query and body fields are rejected before sending credentials", async () => {
  const fake = fakeTransport([], { credential });
  await expect(fake.transport.request("key.current", { query: { url: "https://example.invalid" } })).rejects.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  await expect(fake.transport.request("key.current", { body: {} })).rejects.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  expect(fake.requests).toHaveLength(0);
});

test("TLS verification cannot be disabled by environment", () => {
  vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
  try {
    expect(() => constructTransport({ credential }, { bindings, fetch: globalThis.fetch })).toThrow("TLS verification enabled");
  } finally { vi.unstubAllEnvs(); }
});
