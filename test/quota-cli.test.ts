import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { expect, test } from "vitest";
import { main } from "../src/cli.js";
import { constructTransport } from "../src/transport-core.js";
import { transportBindings } from "../src/catalogue.js";
import { fakeHttpsHybrid, fakeTransport, keyBody, quotaBody, syntheticKey } from "./support/fake-hybrid.js";
import { createSession } from "../src/session.js";

test("doctor reports every denied group and continues probing", async () => {
  const fake = fakeTransport([{ body: keyBody }, { body: quotaBody },
    { body: { sandbox: "1", api: "2" } }, { status: 403 }, { status: 403 }, { body: [] }, { status: 403 },
  ], { credential: { apiKey: syntheticKey, redact: (value) => value } });
  const result = await createSession(fake.transport).doctor();
  expect(result).toMatchObject({ status: "permission-denied", probes: [
    { group: "system", operation: "system version", status: "ok" },
    { group: "report", operation: "report state", status: "permission-denied" },
    { group: "search", operation: "termsSearch", status: "permission-denied" },
    { group: "feed", operation: "feed detonation", status: "ok" },
    { group: "hash", operation: "hashSearch", status: "permission-denied" },
  ] });
  expect(fake.requests).toHaveLength(7);
});

test.each(["doctor", "quota"])("%s resolves the selected private SecretRef and reports redacted quota over HTTPS", async (command) => {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-quota-"));
  const config = join(directory, "config.json");
  const key = join(directory, "key");
  writeFileSync(key, `${syntheticKey}\n`, { mode: 0o600 });
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { file: key } } } }), { mode: 0o600 });
  const diagnosticHeaders = { "api-version": "2.35", "Webservice-Version": `service-${syntheticKey}`,
    "Retry-After": "Thu, 01 Jan 2026 00:01:00 GMT", "RateLimit": '"default";r=8;t=60',
    "RateLimit-Policy": '"default";q=10;w=60', "RateLimit-Limit": "10", "RateLimit-Remaining": "8", "RateLimit-Reset": "60",
    "X-RateLimit-Limit": "20", "X-RateLimit-Remaining": "18", "X-RateLimit-Reset": "120",
    "Set-Cookie": "synthetic-cookie", "X-Unrelated": "unrelated-value" };
  const observedHeaders = { "Api-Version": { value: "2.35" }, "Webservice-Version": { value: "service-***redacted***" },
    "Retry-After": { value: "Thu, 01 Jan 2026 00:01:00 GMT" }, "RateLimit": { value: '"default";r=8;t=60' },
    "RateLimit-Policy": { value: '"default";q=10;w=60' }, "RateLimit-Limit": { value: "10" },
    "RateLimit-Remaining": { value: "8" }, "RateLimit-Reset": { value: "60" }, "X-RateLimit-Limit": { value: "20" },
    "X-RateLimit-Remaining": { value: "18" }, "X-RateLimit-Reset": { value: "120" } };
  const fake = await fakeHttpsHybrid([{ body: keyBody, headers: { ...diagnosticHeaders, "Api-Limits": JSON.stringify({ remaining: 8,
    echoed: `${syntheticKey} ${encodeURIComponent(syntheticKey)}`, token: "synthetic-other-token" }) } },
  { body: quotaBody, headers: diagnosticHeaders },
  ...(command === "doctor" ? [{ body: { sandbox: "1", api: "2" } }, { status: 404 },
    { body: { count: 0, result: [] } }, { body: [] }, { body: { sha256s: [], reports: [] } }] : [])]);
  let stdout = "";
  try {
    await main([command, "--config", config, "--profile", "example"], {
      credentials: { env: {}, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(decode(stdout)).toMatchObject({ profile: "example", keyLevel: "restricted", quota: {
      detonation: { keyQuota: { quota: { day: 100 }, used: { day: 3 }, available: { day: 97 } } },
      quick_scan: { keyQuota: null, quota_reached: false },
    },
      rateLimits: { key: { "Api-Limits": { value: { remaining: 8, token: "***redacted***" } } } } });
    expect(stdout).not.toContain(syntheticKey);
    expect(stdout).not.toContain(encodeURIComponent(syntheticKey));
    expect(stdout).not.toContain("synthetic-other-token");
    expect(stdout).not.toContain("synthetic-user");
    expect(decode(stdout)).toMatchObject({ rateLimits: {
      key: observedHeaders, quota: observedHeaders,
    } });
    expect(stdout).not.toContain("synthetic-cookie");
    expect(stdout).not.toContain("unrelated-value");
    expect(fake.requests).toHaveLength(command === "doctor" ? 7 : 2);
    if (command === "doctor") expect(decode(stdout)).toMatchObject({ status: "ok", probes: [
      { group: "system", status: "ok" }, { group: "report", status: "not-found" },
      { group: "search", status: "ok" }, { group: "feed", status: "ok" }, { group: "hash", status: "ok" },
    ] });
    expect(fake.requests[0]!.headers["api-key"]).toBe(syntheticKey);
  } finally { await fake.close(); rmSync(directory, { recursive: true, force: true }); }
});

test.each([
  ["doctor", "key.current", [], 1],
  ["quota", "key.current", [], 1],
  ["doctor", "key.submission-quota", [{ body: keyBody }], 2],
  ["quota", "key.submission-quota", [{ body: keyBody }], 2],
] as const)("%s preserves allowlisted headers when %s is rate limited", async (command, operation, preceding, requestCount) => {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-rate-limited-"));
  const config = join(directory, "config.json");
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { env: "SYNTHETIC_KEY" } } } }), { mode: 0o600 });
  const fake = await fakeHttpsHybrid([...preceding, { status: 429, body: { message: "Rate limited" }, headers: {
    "Api-Limits": JSON.stringify({ remaining: 0, echoed: `${syntheticKey} ${encodeURIComponent(syntheticKey)}`, token: "synthetic-token" }),
    "Submission-Limits": "broken", "X-RateLimit-Remaining": "0", "Retry-After": "60",
    "Api-Version": "2.35", "Webservice-Version": `service-${syntheticKey}`,
    "Set-Cookie": "synthetic-cookie", "X-Unrelated": "unrelated-value",
  } }]);
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main([command, "--config", config, "--profile", "example"], {
      credentials: { env: { SYNTHETIC_KEY: syntheticKey }, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(process.exitCode).toBe(1);
    expect(decode(stdout)).toMatchObject({ error: { code: "RATE_LIMITED", status: 429, operation, retryAfter: 60 } });
    expect((decode(stdout) as { error: { rateLimits: unknown } }).error.rateLimits).toEqual({
      "Api-Limits": { value: { remaining: 0, echoed: "***redacted*** ***redacted***", token: "***redacted***" } },
      "Submission-Limits": { malformed: true }, "X-RateLimit-Remaining": { value: "0" }, "Retry-After": { value: "60" },
      "Api-Version": { value: "2.35" }, "Webservice-Version": { value: "service-***redacted***" },
    });
    expect(stdout).not.toContain(syntheticKey);
    expect(stdout).not.toContain(encodeURIComponent(syntheticKey));
    expect(stdout).not.toContain("synthetic-token");
    expect(stdout).not.toContain("synthetic-cookie");
    expect(stdout).not.toContain("unrelated-value");
    expect(fake.requests).toHaveLength(requestCount);
  } finally { process.exitCode = exitCode; await fake.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("quota emits a structured transport error with selector-preserving recovery", async () => {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-denied-"));
  const config = join(directory, "config.json");
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { env: "SYNTHETIC_KEY" } } } }), { mode: 0o600 });
  const fake = await fakeHttpsHybrid([{ status: 401, body: { message: `Denied ${syntheticKey}` } }]);
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main(["quota", "--config", config, "--profile", "example"], {
      credentials: { env: { SYNTHETIC_KEY: syntheticKey }, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(process.exitCode).toBe(1);
    expect(decode(stdout)).toMatchObject({ error: { code: "AUTH_REQUIRED", status: 401, operation: "key.current" },
      help: [`Run hybrid-axi auth status --config '${config}' --profile 'example'`] });
    expect(stdout).not.toContain(syntheticKey);
    expect(fake.requests).toHaveLength(1);
  } finally { process.exitCode = exitCode; await fake.close(); rmSync(directory, { recursive: true, force: true }); }
});

test.each([["quota", "--api-key", "synthetic-argv-key"], ["doctor", "extra"], ["quota", "--full"],
  ["doctor", "--profile", "example", "--profile", "other"]])("network commands reject invalid grammar before reading configuration: %j", async (...args) => {
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main([...args, "--config", "/synthetic-missing-config"], {
      credentials: { env: {} }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: () => { throw new Error("Unexpected credential transport construction"); },
    });
    expect(process.exitCode).toBe(2);
    expect(decode(stdout)).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(stdout).not.toContain("synthetic-argv-key");
  } finally { process.exitCode = exitCode; }
});
