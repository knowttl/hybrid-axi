import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { afterEach, describe, expect, test, vi } from "vitest";
import { main } from "../src/cli.js";
import { transportBindings } from "../src/catalogue.js";
import { constructTransport } from "../src/transport-core.js";
import { fakeHttpsHybrid, fakeTransport, syntheticKey, type Reply } from "./support/fake-hybrid.js";

const sha256 = "a".repeat(64);
const overview = { sha256, verdict: "malicious", threat_score: 90, reports: ["synthetic-job"] };
const match = { sha256, verdict: "malicious", submit_name: "synthetic.exe" };
const completed = [{ query_status: "finished", number_of_results: 1, number_of_pages: 1, results: [match] }];

test.each([{ flags: [] }, { flags: ["--full"] }, { flags: ["--fields", "sha256"] }])("terms discloses incomplete upstream results with view flags $flags", async ({ flags }) => {
  const result = await cli(["search", "terms", "--filename", "synthetic.exe", ...flags], [{ body: { count: 10, result: [match] } }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ count: 10, returned: 1, complete: false,
    searches: [{ count: 10, returned: 1, complete: false, result: [{ sha256 }] }],
    help: ["Hybrid Analysis does not page search terms; narrow with --date-from/--date-to"] });
});

test.each([0, 1])("terms always explains the paging restriction for %i complete results", async (count) => {
  const result = await cli(["search", "terms", "--filename", "synthetic.exe"], [{ body: { count, result: count ? [match] : [] } }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ count, returned: count,
    help: ["Hybrid Analysis does not page search terms; narrow with --date-from/--date-to"] });
  expect(result.output).not.toHaveProperty("complete", false);
});

test("terms accepts the observed object envelope and nullable sample fields", async () => {
  const body = { search_terms: [{ id: "filename", value: "synthetic.com" }], count: 1, result: [{
    sha256, verdict: null, av_detect: null, threat_score: null, vx_family: null, job_id: "synthetic-job",
    environment_id: 160, analysis_start_time: "2026-01-01", submit_name: "synthetic.com",
    environment_description: "Synthetic", size: 1, type: null, type_short: "text",
  }] };
  const result = await cli(["search", "terms", "--filename", "synthetic.com"], [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ count: 1, searches: [{ search_terms: body.search_terms, result: [{ sha256, verdict: null, threat_score: null }] }] });
});

test.each([`sha256:${sha256}`, "verdict:malicious AND score:80+ AND positives:10+"])("observed Labs object results decode for %s", async (query) => {
  const body = { ...completed[0], results: [{ ...match, type_short: ["text", "executable"], last_seen: "2026-01-01" }], future: { useful: true } };
  const result = await cli(["search", "run", "--query", query, "--size", "1", "--full"], [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ experimental: true, searches: [body] });
  expect(result.requests).toHaveLength(1);
});

test("object async start exposes the query ID and resumes an object result", async () => {
  const result = await cli(["search", "run", "--query", "synthetic"], [
    { status: 202, body: { id: "synthetic-query" } }, { body: { query_status: "processing" } },
  ]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ id: "synthetic-query", state: "pending", help: ["Run hybrid-axi search results synthetic-query"] });
  expect(result.requests.map(({ url }) => url)).toEqual(["/api/labs/search/query/run", "/api/labs/search/query/synthetic-query/results"]);
});

test.each([
  { argv: ["search", "terms", "--filename", "synthetic"], body: { count: "1", result: [] } },
  { argv: ["search", "run", "--query", "synthetic"], body: { query_status: "finished", results: [{ sha256: 1 }] } },
])("object envelopes still reject invalid consumed fields: $argv", async ({ argv, body }) => {
  const result = await cli(argv, [{ body }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
});
afterEach(() => vi.useRealTimers());

async function cli(argv: string[], replies: Reply[], files: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-search-"));
  const fake = await fakeHttpsHybrid(replies);
  let stdout = "";
  const previous = process.exitCode;
  try {
    for (const [name, content] of Object.entries(files)) writeFileSync(join(directory, name), content, { mode: 0o600 });
    process.exitCode = 0;
    await main(argv.map((value) => value === "<hashes-file>" ? join(directory, "hashes.txt") : value === "<config-file>" ? join(directory, "config.json") : value), {
      credentials: { env: { HYBRID_AXI_API_KEY: syntheticKey }, home: directory },
      stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    return { output: decode(stdout), stdout, code: process.exitCode, requests: fake.requests };
  } finally { process.exitCode = previous; await fake.close(); rmSync(directory, { recursive: true, force: true }); }
}

test("stable overview uses the reviewed route and compact fields", async () => {
  const result = await cli(["hash", "show", sha256], [{ body: { ...overview, last_file_name: "synthetic.exe" } }]);
  expect(result.output).toEqual({ overview });
  expect(result.code).toBe(0);
  expect(result.requests.map(({ method, url }) => ({ method, url }))).toEqual([{ method: "GET", url: `/api/v2/overview/${sha256}` }]);
});

test.each([
  { flags: [], body: { sha256, reports: [], verdict: null, threat_score: null } },
  { flags: ["--labs"], body: { sha256, report_ids: { sandbox_job_ids: [] }, verdict: null, threat_score: null } },
])("a valid overview with no analysis is a definitive successful empty state: $flags", async ({ flags, body }) => {
  const result = await cli(["hash", "show", sha256, ...flags], [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ state: "empty", message: "No analysis is available for this hash", help: [`Run hybrid-axi hash search --hash ${sha256}`] });
});

test("Labs overview exposes new fields under full after sensitive-field redaction", async () => {
  const result = await cli(["hash", "show", sha256, "--labs", "--full"], [{ body: {
    sha256, verdict: "malicious", threat_score: 80, report_ids: { sandbox_job_ids: ["synthetic-job"] },
    future: { feature: true, token: "synthetic-new-token", echoed: encodeURIComponent(syntheticKey) },
  } }]);
  expect(result.output).toMatchObject({ experimental: true, overview: { future: { feature: true, token: "***redacted***", echoed: "***redacted***" } } });
  expect(result.stdout).not.toContain("synthetic-new-token");
  expect(result.stdout).not.toContain(syntheticKey);
});

test("Labs overview selects unknown fields explicitly", async () => {
  const result = await cli(["hash", "show", sha256, "--labs", "--fields", "future"], [{ body: {
    sha256, report_ids: { sandbox_job_ids: ["synthetic-job"] }, future: { feature: true },
  } }]);
  expect(result.output).toEqual({ experimental: true, overview: { future: { feature: true } } });
});

test.each([["hash", "show"], ["hash", "search"], ["search", "terms"], ["search", "run"], ["search", "results"]])("leaf help works without identifiers or readable configuration: %j", async (...argv) => {
  const result = await cli([...argv, "--config", "/synthetic-missing-config", "--help"], []);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ command: argv.join(" "), flags: expect.any(Object), examples: expect.any(Array) });
  expect(result.requests).toHaveLength(0);
});

test("pending resume retains leading configuration and profile selectors", async () => {
  const result = await cli(["--config", "<config-file>", "--profile", "example", "search", "run", "--query", "synthetic"],
    [{ status: 202, body: [{ id: "synthetic-query" }] }, { body: [{ query_status: "processing" }] }],
    { "config.json": JSON.stringify({ version: 1, profiles: { example: {} } }) });
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ state: "pending", help: [expect.stringMatching(/^Run hybrid-axi search results synthetic-query --config '.+config.json' --profile 'example'$/)] });
  expect(result.requests).toHaveLength(2);
});

test("Labs 425 is pending with an exact retry command", async () => {
  const result = await cli(["hash", "show", sha256, "--labs"], [{ status: 425, body: { message: "Analysis in progress" } }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ experimental: true, state: "pending", help: [`Run hybrid-axi hash show ${sha256} --labs`] });
});

test.each([
  ["hash", "show", sha256], ["hash", "show", sha256, "--labs"],
  ["hash", "search", "--hash", sha256], ["search", "terms", "--filename", "synthetic.exe"],
  ["search", "run", "--query", "synthetic"], ["search", "results", "synthetic-query"],
])("denial remains an error rather than empty data: %j", async (...argv) => {
  const result = await cli(argv, [{ status: 403, body: { message: "Denied" } }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "PERMISSION_DENIED", status: 403 } });
  expect(result.output).not.toHaveProperty("state");
});

test.each([{}, [], { sha256, reports: "invalid" }])("malformed overview cannot become an empty state: %j", async (body) => {
  const result = await cli(["hash", "show", sha256], [{ body }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
});

test("hash show limits reported report ids by default and with --limit", async () => {
  const reports = Array.from({ length: 150 }, (_, index) => `synthetic-job-${index}`);
  const body = { sha256, verdict: "malicious", threat_score: 90, reports };
  const bounded = await cli(["hash", "show", sha256], [{ body }]);
  expect(bounded.output).toMatchObject({ overview: { reports: reports.slice(0, 100) }, truncation: [{ path: "overview.reports", returned: 100, total: 150 }],
    help: [`Run hybrid-axi hash show ${sha256} --limit 150`] });
  const explicit = await cli(["hash", "show", sha256, "--limit", "2"], [{ body }]);
  expect(explicit.output).toMatchObject({ overview: { reports: reports.slice(0, 2) }, truncation: [{ path: "overview.reports", returned: 2, total: 150 }] });
});

test("Labs hash show limits sandbox job ids", async () => {
  const ids = Array.from({ length: 3 }, (_, index) => `synthetic-job-${index}`);
  const result = await cli(["hash", "show", sha256, "--labs", "--limit", "2"], [{ body: { sha256, verdict: "malicious", threat_score: 80, report_ids: { sandbox_job_ids: ids } } }]);
  expect(result.output).toMatchObject({ overview: { report_ids: { sandbox_job_ids: ids.slice(0, 2) } },
    truncation: [{ path: "overview.report_ids.sandbox_job_ids", returned: 2, total: 3 }], help: [`Run hybrid-axi hash show ${sha256} --labs --limit 3`] });
});

test("hash search limits reported report ids while keeping the total count", async () => {
  const reports = Array.from({ length: 150 }, (_, index) => ({ id: `synthetic-job-${index}` }));
  const result = await cli(["hash", "search", "--hash", sha256], [{ body: { sha256s: [sha256], reports } }]);
  expect(result.output).toMatchObject({ reports: reports.slice(0, 100), count: 150, truncation: [{ path: "reports", returned: 100, total: 150 }],
    help: [`Run hybrid-axi hash search --hash ${sha256} --limit 150`] });
});

test("bulk hash search limits result rows", async () => {
  const rows = [{ ...match, job_id: "synthetic-job-0" }, { ...match, job_id: "synthetic-job-1" }];
  const result = await cli(["hash", "search", "--hashes-file", "<hashes-file>", "--limit", "1"], [{ body: rows }], { "hashes.txt": `${sha256}\n` });
  expect(result.output).toMatchObject({ deprecated: true, results: [{ sha256, verdict: "malicious", job_id: "synthetic-job-0" }], count: 2, truncation: [{ path: "results", returned: 1, total: 2 }] });
});

test("hash search uses current GET and preserves report identifiers", async () => {
  const body = { sha256s: [sha256], reports: [{ id: "synthetic-job", verdict: "malicious" }] };
  const result = await cli(["hash", "search", "--hash", "b".repeat(128)], [{ body }]);
  expect(result.output).toEqual({ ...body, count: 1 });
  expect(result.requests[0]).toMatchObject({ method: "GET", url: `/api/v2/search/hash?hash=${"b".repeat(128)}` });
});

test("bulk hash search sends repeated form parameters only to the deprecated bulk route", async () => {
  const md5 = "b".repeat(32);
  const result = await cli(["hash", "search", "--hashes-file", "<hashes-file>"], [{ status: 201, body: [{ ...match, job_id: "synthetic-job" }] }],
    { "hashes.txt": `${sha256}\r\n${md5}\n` });
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ deprecated: true, count: 1, results: [{ sha256, job_id: "synthetic-job" }] });
  expect(result.requests[0]).toMatchObject({ method: "POST", url: "/api/v2/search/hashes", headers: { "content-type": "application/x-www-form-urlencoded" } });
  expect(new URLSearchParams(result.requests[0]!.body).getAll("hashes[]")).toEqual([sha256, md5]);
});

test("term filters map kebab-case names to documented form fields", async () => {
  const result = await cli(["search", "terms", "--filename", "invoice & copy.exe", "--env-id", "120", "--verdict", "5", "--port", "443", "--date-from", "2026-10-01 00:00"],
    [{ body: [{ count: 1, result: [{ ...match, threat_score: 85, job_id: "synthetic-job" }] }] }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ count: 1, searches: [{ count: 1, result: [{ sha256, threat_score: 85, job_id: "synthetic-job" }] }] });
  expect(result.requests[0]).toMatchObject({ method: "POST", url: "/api/v2/search/terms", headers: { "content-type": "application/x-www-form-urlencoded" } });
  expect(Object.fromEntries(new URLSearchParams(result.requests[0]!.body))).toEqual({ filename: "invoice & copy.exe", env_id: "120", verdict: "5", port: "443", date_from: "2026-10-01 00:00" });
});

test.each([
  { argv: ["hash", "search", "--hash", sha256], body: { sha256s: [], reports: [] } },
  { argv: ["search", "terms", "--filename", "missing.exe"], body: [{ count: 0, result: [] }] },
  { argv: ["search", "run", "--query", "missing"], body: [{ query_status: "finished", number_of_results: 0, results: [] }] },
])("search zero matches is explicit and successful: $argv", async ({ argv, body }) => {
  const result = await cli(argv, [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ state: "empty", message: expect.any(String) });
});

test("synchronous Labs results return without starting or fetching another page", async () => {
  const result = await cli(["search", "run", "--query", "verdict:malicious", "--size", "200", "--page", "2", "--date-from", "2026-10-01", "--date-to", "2026-10-22"], [{ body: completed }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ experimental: true, searches: completed });
  expect(result.requests).toHaveLength(1);
  expect(result.requests[0]).toMatchObject({ method: "POST", url: "/api/labs/search/query/run", headers: { "content-type": "application/json" } });
  expect(JSON.parse(result.requests[0]!.body)).toEqual({ query: "verdict:malicious", size: 200, page: 2, date_from: "2026-10-01", date_to: "2026-10-22" });
});

describe.each([
  { path: "synchronous run", argv: ["search", "run", "--query", "synthetic", "--page", "2"], start: [] },
  { path: "asynchronous run", argv: ["search", "run", "--query", "synthetic"], start: [{ status: 202, body: [{ id: "synthetic-query" }] }] },
  { path: "standalone results", argv: ["search", "results", "synthetic-query"], start: [] },
])("empty Labs results through $path", ({ argv, start }) => {
  test.each([
    { total: 0, message: "No samples match this query" },
    { total: 1, message: "No samples on this result page" },
    { total: undefined, message: "No samples on this result page" },
  ])("scopes the empty message to the known total: $total", async ({ total, message }) => {
    const body = [{ query_status: "finished", number_of_results: total, number_of_pages: 1, results: [] }];
    const result = await cli(argv, [...start, { body }]);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ state: "empty", message, searches: [{ query_status: "finished", results: [] }] });
  });
});

test("asynchronous Labs start fetches results once without duplicating the start", async () => {
  const result = await cli(["search", "run", "--query", "synthetic"], [{ status: 202, body: [{ id: "synthetic-query" }] }, { body: completed }]);
  expect(result.output).toMatchObject({ experimental: true, id: "synthetic-query", searches: completed });
  expect(result.requests.map(({ method, url }) => ({ method, url }))).toEqual([
    { method: "POST", url: "/api/labs/search/query/run" }, { method: "GET", url: "/api/labs/search/query/synthetic-query/results" },
  ]);
  expect(JSON.parse(result.requests[0]!.body)).toEqual({ query: "synthetic", size: 50, page: 1 });
});

test("pending async queries stop after one fetch and can resume without a start", async () => {
  const result = await cli(["search", "run", "--query", "synthetic"], [{ status: 202, body: [{ id: "synthetic-query" }] },
    { body: [{ query_status: "processing", results: [] }] }]);
  expect(result.output).toMatchObject({ id: "synthetic-query", state: "pending", help: ["Run hybrid-axi search results synthetic-query"] });
  expect(result.requests).toHaveLength(2);
  const resumed = await cli(["search", "results", "synthetic-query"], [{ body: completed }]);
  expect(resumed.output).toMatchObject({ id: "synthetic-query", searches: completed });
  expect(resumed.requests.map(({ method, url }) => ({ method, url }))).toEqual([{ method: "GET", url: "/api/labs/search/query/synthetic-query/results" }]);
});

test("failed result retrieval retains the known ID in recovery guidance", async () => {
  const result = await cli(["search", "run", "--query", "synthetic"], [{ status: 202, body: [{ id: "synthetic-query" }] }, { status: 503, body: { message: "Unavailable" } }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "UPSTREAM_ERROR" }, help: ["Run hybrid-axi search results synthetic-query"] });
  expect(result.requests).toHaveLength(2);
});

test.each([429, 503])("a query start is not replayed after explicit %i", async (status) => {
  const result = await cli(["search", "run", "--query", "synthetic"], [{ status, body: { message: "Try later" } }]);
  expect(result.code).toBe(1);
  expect(result.requests).toHaveLength(1);
});

test("unknown Labs query fields survive full output at envelope and result levels", async () => {
  const result = await cli(["search", "run", "--query", "synthetic", "--full"], [{ body: [{ ...completed[0], future: "new-envelope", results: [{ ...match, future: { classification: "new-match" } }] }] }]);
  expect(result.output).toMatchObject({ searches: [{ future: "new-envelope", results: [{ future: { classification: "new-match" } }] }] });
});

test.each([
  ["hash", "show", "bad-hash"], ["hash", "show", sha256, "extra"],
  ["hash", "search"], ["hash", "search", "--hash", sha256, "--hashes-file", "missing"],
  ["search", "terms"], ["search", "terms", "--verdict", "6"], ["search", "terms", "--port", "65536"],
  ["search", "run"], ["search", "run", "--query", "x", "--size", "201"],
  ["search", "run", "--query", "x", "--page", "0"], ["search", "run", "--query", "x", "--date-from", "2026-02-30"],
  ["search", "run", "--query", "x", "--date-from", "2026-10-22", "--date-to", "2026-10-01"],
  ["search", "results", "../escape"], ["search", "results", "q", "--query", "x"],
  ["hash", "show", sha256, "--full", "--fields", "sha256"], ["hash", "show", sha256, "--labs", "--labs"],
  ["hash", "show", sha256, "--limit", "0"], ["hash", "search", "--hash", sha256, "--limit", "many"],
  ["search", "terms", "--filename", "synthetic.exe", "--limit", "2"],
])("invalid input sends nothing: %j", async (...argv) => {
  const result = await cli(argv, []);
  expect(result.code).toBe(2);
  expect(result.output).toMatchObject({ code: "VALIDATION_ERROR", help: expect.arrayContaining([expect.stringContaining("valid flags")]) });
  expect(result.requests).toHaveLength(0);
});

test.each([
  { replies: ["hang"] as const, sends: 1, help: ["Inspect any known result ID before deciding whether to send again"] },
  { replies: [{ status: 202, body: [{ id: "synthetic-query" }] }, "hang"] as const, sends: 2, help: ["Inspect any known result ID before deciding whether to send again", "Run hybrid-axi search results synthetic-query"] },
])("an ambiguous query timeout is bounded without replay: $sends sends", async ({ replies, sends, help }) => {
  vi.useFakeTimers();
  const directory = mkdtempSync(join(tmpdir(), "hybrid-search-timeout-"));
  const fake = fakeTransport([...replies], { credential: { apiKey: syntheticKey, redact: (value) => value } });
  let stdout = "";
  const previous = process.exitCode;
  try {
    const result = main(["search", "run", "--query", "synthetic"], {
      credentials: { env: { HYBRID_AXI_API_KEY: syntheticKey }, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: () => fake.transport,
    });
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(decode(stdout)).toMatchObject({ error: { code: "TIMEOUT" }, help });
    expect(fake.requests).toHaveLength(sends);
  } finally { process.exitCode = previous; rmSync(directory, { recursive: true, force: true }); }
});
