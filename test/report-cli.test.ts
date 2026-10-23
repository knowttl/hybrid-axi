import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { decode } from "@toon-format/toon";
import { expect, test } from "vitest";
import { main } from "../src/cli.js";
import { transportBindings } from "../src/catalogue.js";
import { constructTransport } from "../src/transport-core.js";
import { fakeHttpsHybrid, fakeTransport, keyBody, quotaBody, syntheticKey, type Reply } from "./support/fake-hybrid.js";

const id = "a".repeat(64) + ":120";
const summary = { job_id: "synthetic-job", state: "SUCCESS", verdict: "malicious", threat_score: 80 };

async function cli(argv: string[], replies: Reply[], options: {
  before?: (directory: string) => void;
  inspect?: (directory: string) => void;
  afterRequest?: (directory: string) => void;
  scripted?: boolean;
  noCredentials?: boolean;
  response?: (response: Response) => Response;
} = {}) {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-report-"));
  const upstream = options.scripted ? undefined : await fakeHttpsHybrid(replies);
  let stdout = "";
  const previous = process.exitCode;
  try {
    options.before?.(directory);
    process.exitCode = 0;
    const scripted = options.scripted ? fakeTransport(replies, { credential: { apiKey: syntheticKey, redact: (value) => value } }) : undefined;
    await main(argv.map((word) => word.replaceAll("<dir>", directory)), {
      credentials: { env: options.noCredentials ? {} : { HYBRID_AXI_API_KEY: syntheticKey }, home: directory },
      stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => scripted?.transport ?? constructTransport({ credential }, { bindings: transportBindings,
        fetch: async (url, init) => { const response = await upstream!.fetch(url, init); options.afterRequest?.(directory); return options.response?.(response) ?? response; } }),
    });
    options.inspect?.(directory);
    return { output: decode(stdout), stdout, code: process.exitCode, requests: upstream?.requests ?? scripted!.requests };
  } finally { process.exitCode = previous; await upstream?.close(); rmSync(directory, { recursive: true, force: true }); }
}

test.each([
  { argv: ["report", "show", id], path: `/report/${encodeURIComponent(id)}/summary`, body: summary, expected: { result: summary } },
  { argv: ["report", "state", id], path: `/report/${encodeURIComponent(id)}/state`, body: { state: "IN_PROGRESS" }, expected: { result: { state: "IN_PROGRESS" } } },
  { argv: ["report", "children", id], path: `/report/${encodeURIComponent(id)}/children`, body: ["child-one", "child-two"], expected: { count: 2, total: 2, complete: true, results: ["child-one", "child-two"] } },
  { argv: ["report", "memory", "list", id], path: `/report/${encodeURIComponent(id)}/memory-dumps-list`, body: [{ filename: "dump.bin", address: "0x100", flags: "rw", file_process_pid: 7 }], expected: { count: 1, results: [{ filename: "dump.bin", address: "0x100", flags: "rw", file_process_pid: 7 }] } },
  { argv: ["report", "memory", "strings", id, "--filename", "dump & one.bin"], path: `/report/${encodeURIComponent(id)}/memory-dump/extracted-strings?filename=dump+%26+one.bin`, body: { data: ["inert string"] }, expected: { count: 1, results: ["inert string"] } },
  { argv: ["report", "memory", "hex", id, "--filename", "dump.bin"], path: `/report/${encodeURIComponent(id)}/memory-dump/hex-dump?filename=dump.bin`, body: { data: ["0000 00 01"] }, expected: { count: 1, results: ["0000 00 01"] } },
  { argv: ["report", "screenshots", id], path: `/report/${encodeURIComponent(id)}/screenshots`, body: [{ name: "desktop", date: "2026-10-22T00:00:00Z", image: "AAAA" }], expected: { count: 1 } },
  { argv: ["feed", "latest"], path: "/feed/latest", body: { count: 1, status: "ok", data: [{ job_id: "job", sha256: "a".repeat(64), analysis_start_time: "2026-10-22T00:00:00Z" }] }, expected: { deprecated: true, count: 1, total: 1, upstreamCap: 250 } },
  { argv: ["feed", "detonation"], path: "/feed/detonation", body: [{ report_id: "job", sha256: null, verdict: 5 }], expected: { count: 1, upstreamCap: 250 } },
  { argv: ["feed", "quick-scan"], path: "/feed/quick-scan", body: [{ quick_scan_id: "scan", sha256: null, verdict: 1 }], expected: { count: 1, upstreamCap: 2500 } },
  { argv: ["system", "version"], path: "/system/version", body: { sandbox: "1", api: "2" }, expected: { result: { sandbox: "1", api: "2" } } },
  { argv: ["system", "environments"], path: "/system/environments", body: [{ environment_id: 120, description: "synthetic", architecture: "x64", analysis_mode: "default" }], expected: { count: 1 } },
  { argv: ["system", "action-scripts"], path: "/system/action-scripts", body: [{ name: "synthetic", description: "Inert" }], expected: { count: 1 } },
  { argv: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10 }, expected: { result: { total_submissions: 20, total_samples: 10 } } },
  { argv: ["system", "configuration"], path: "/system/configuration", body: { submit_allow_offline: true, submit_allow_tor: false, enable_quick_scan: true }, expected: { result: { enable_quick_scan: true } } },
  { argv: ["system", "queue-size"], path: "/system/queue-size", body: { value: 4 }, expected: { result: { value: 4 } } },
  { argv: ["system", "total-submissions"], path: "/system/total-submissions", body: { value: 50 }, expected: { result: { value: 50 } } },
])("named CLI binds the documented route: $argv", async ({ argv, path, body, expected }) => {
  const result = await cli(argv, [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject(expected);
  expect(result.requests).toHaveLength(1);
  expect(result.requests[0]).toMatchObject({ method: "GET", url: `/api/v2${path}` });
});

test.each([
  { named: ["report", "memory", "list", "job"], path: "/report/job/memory-dumps-list", body: [{ filename: "dump.bin", address: "0x100", flags: "rw", file_process_pid: "7" }] },
  { named: ["report", "memory", "list", "job"], path: "/report/job/memory-dumps-list", body: [{ filename: "dump.bin", address: "0x100", flags: "rw", file_process_pid: 1.5 }] },
  { named: ["feed", "detonation"], path: "/feed/detonation", body: [{ report_id: "job", sha256: null, verdict_human: 5 }] },
  { named: ["feed", "quick-scan"], path: "/feed/quick-scan", body: [{ quick_scan_id: "scan", sha256: null, verdict_human: 1 }] },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, behaviour_indicators: "unknown" } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, total_yara_rules: "unknown" } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, behaviour_indicators: null } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, total_yara_rules: null } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, behaviour_indicators: 1.5 } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, total_yara_rules: 1.5 } },
].flatMap(({ named, path, body }) => [{ argv: named, body }, { argv: ["api", "get", path], body }]))("default output rejects mistyped optional fields: $argv $body", async ({ argv, body }) => {
  const result = await cli(argv, [{ body }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
});

test.each([
  { named: ["report", "memory", "list", "job"], path: "/report/job/memory-dumps-list", body: [{ filename: "dump.bin", address: "0x100", flags: "rw", file_process_pid: null }], expected: { results: [{ file_process_pid: null }] } },
  { named: ["feed", "detonation"], path: "/feed/detonation", body: [{ report_id: "job", sha256: null, verdict_human: "malicious" }, { report_id: "other", sha256: null, verdict_human: null }], expected: { results: [{ verdict_human: "malicious" }, { verdict_human: null }] } },
  { named: ["feed", "quick-scan"], path: "/feed/quick-scan", body: [{ quick_scan_id: "scan", sha256: null, verdict_human: "clean" }, { quick_scan_id: "other", sha256: null, verdict_human: null }], expected: { results: [{ verdict_human: "clean" }, { verdict_human: null }] } },
  { named: ["system", "stats"], path: "/system/stats", body: { total_submissions: 20, total_samples: 10, behaviour_indicators: 0, total_yara_rules: 3 }, expected: { result: { behaviour_indicators: 0, total_yara_rules: 3 } } },
].flatMap(({ named, path, body, expected }) => [{ argv: named, body, expected }, { argv: ["api", "get", path], body, expected }]))("default output accepts documented optional field types: $argv", async ({ argv, body, expected }) => {
  const result = await cli(argv, [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject(expected);
});

test("abuse feed uses only the page selector and generates its own continuation", async () => {
  const result = await cli(["feed", "abuse", "--page", "2"], [{ body: { number_of_results: 4, number_of_pages: 3, link_to_next_page: "https://untrusted.invalid/?api-key=secret", falcon_mal_query_results: [{ sha256: "a".repeat(64), deleted_at: null }] } }]);
  expect(result.output).toMatchObject({ count: 1, total: 4, complete: false, continuation: { page: 3 }, help: ["Run hybrid-axi feed abuse --page 3"] });
  expect(result.requests[0]).toMatchObject({ url: "/api/v2/abuse-reports/feed?page=2" });
  expect(result.stdout).not.toContain("untrusted");
});

test.each([
  { body: [], expected: { count: 0, total: 0, available: 0, complete: true, results: [], message: "0 results for report children" } },
  { body: ["first", "second", "third"], expected: { count: 2, total: 3, available: 3, complete: false, results: ["first", "second"], help: ["Run hybrid-axi report children 'job' --limit 3"] } },
])("children counts and local limit describe the returned window: $body", async ({ body, expected }) => {
  const result = await cli(["report", "children", "job", "--limit", "2"], [{ body }]);
  expect(result.output).toMatchObject(expected);
});

test("raw and named report reads share projection, recursive text bounds and redaction", async () => {
  const body = { ...summary, future: { text: "x".repeat(1200), token: "synthetic-token", echo: syntheticKey } };
  for (const argv of [["report", "show", "job"], ["api", "get", "/report/job/summary"]]) {
    const preview = await cli([...argv, "--fields", "future"], [{ body }]);
    expect(preview.output).toMatchObject({ result: { future: { text: expect.stringContaining("1200 chars total"), token: "***redacted***", echo: "***redacted***" } }, truncation: [{ returned: 1000, total: 1200 }] });
    const full = await cli([...argv, "--full"], [{ body }]);
    expect(full.output).toMatchObject({ result: { future: { text: "x".repeat(1200), token: "***redacted***" } } });
    expect(full.stdout).not.toContain(syntheticKey);
  }
});

test("raw read query validation and local collection bounds match named memory reads", async () => {
  const result = await cli(["api", "get", "/report/job/memory-dump/extracted-strings?filename=dump%20one.bin", "--limit", "1"], [{ body: { data: ["one", "two"] } }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ count: 1, total: 2, complete: false, results: ["one"] });
  expect(result.requests[0]).toMatchObject({ url: "/api/v2/report/job/memory-dump/extracted-strings?filename=dump+one.bin" });
});

test.each([
  { path: "/key/current", body: keyBody, expected: { result: { auth_level_name: "restricted" } } },
  { path: "/key/submission-quota", body: quotaBody, expected: { result: { detonation: { keyQuota: { quota: { day: 100 } } } } } },
])("raw key reads cannot expose credentials or user details: $path", async ({ path, body, expected }) => {
  const result = await cli(["api", "get", path, "--full"], [{ body }]);
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject(expected);
  expect(result.stdout).not.toContain(syntheticKey);
  expect(result.stdout).not.toContain("synthetic-user");
});

test("reviewed raw Labs overview uses the experimental binding", async () => {
  const sha = "a".repeat(64);
  const result = await cli(["api", "get", `/sample/${sha}/overview`, "--labs", "--fields", "future"], [{ body: { sha256: sha, report_ids: { sandbox_job_ids: ["job"] }, future: "new" } }]);
  expect(result.output).toEqual({ experimental: true, overview: { future: "new" } });
  expect(result.requests[0]).toMatchObject({ url: `/api/labs/sample/${sha}/overview` });
});

test.each(["crt", "pcap", "json", "memory-strings", "xml", "html", "pdf", "maec", "stix", "misp", "misp-json", "openioc"])("one %s artifact is published unchanged and private", async (type) => {
  const bytes = Uint8Array.from([0, 1, 128, 255, 10]);
  const paths: Record<string, string> = { crt: "certificate", pcap: "pcap", json: "report/json", "memory-strings": "memory-strings" };
  const result = await cli(["report", "file", "job", "--type", type, "--output", "<dir>/artifact"], [{ bytes, headers: { "vx-filename": "../../ignored" } }], {
    inspect: (directory) => {
      expect(readFileSync(join(directory, "artifact"))).toEqual(Buffer.from(bytes));
      expect(readdirSync(directory)).toEqual(["artifact"]);
      if (process.platform !== "win32") expect(lstatSync(join(directory, "artifact")).mode & 0o777).toBe(0o600);
    },
  });
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ id: "job", type, bytes: 5 });
  if (!paths[type]) expect(result.output).toMatchObject({ deprecated: true, warning: expect.stringContaining("deprecated") });
  expect(result.requests).toHaveLength(1);
  expect(result.requests[0]).toMatchObject({ method: "GET", url: `/api/v2/report/job/${paths[type] ?? `file/${type}`}` });
});

test("gzip artifact bytes delivered without content encoding remain compressed", async () => {
  const bytes = gzipSync("synthetic capture");
  const result = await cli(["report", "file", "job", "--type", "pcap", "--output", "<dir>/capture.gz"], [{ bytes }], {
    inspect: (directory) => expect(readFileSync(join(directory, "capture.gz"))).toEqual(bytes),
  });
  expect(result.code).toBe(0);
  expect(result.requests[0]).toMatchObject({ headers: { "accept-encoding": "identity" } });
});

test.each(["crt", "pcap", "json", "memory-strings", "xml", "html", "pdf", "maec", "stix", "misp", "misp-json", "openioc"])("encoded %s delivery cannot publish transformed bytes", async (type) => {
  const result = await cli(["report", "file", "job", "--type", type, "--output", "<dir>/artifact"], [{ text: "synthetic capture", headers: { "content-encoding": "gzip" } }], {
    inspect: (directory) => expect(readdirSync(directory)).toEqual([]),
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "MALFORMED_RESPONSE" } });
  expect(result.requests).toHaveLength(1);
  expect(result.requests[0]).toMatchObject({ headers: { "accept-encoding": "identity" } });
});

test("an artifact destination created during the request is never overwritten", async () => {
  const result = await cli(["report", "file", "job", "--type", "json", "--output", "<dir>/artifact"], [{ text: "inert" }], {
    afterRequest: (directory) => writeFileSync(join(directory, "artifact"), "existing"),
    inspect: (directory) => { expect(readFileSync(join(directory, "artifact"), "utf8")).toBe("existing"); expect(readdirSync(directory)).toEqual(["artifact"]); },
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "OUTPUT_FAILED" } });
});

test.each([
  { status: 403, expected: "PERMISSION_DENIED" }, { status: 500, expected: "UPSTREAM_ERROR" },
])("artifact HTTP $status leaves no file or staging artifact", async ({ status, expected }) => {
  const result = await cli(["report", "file", "job", "--type", "json", "--output", "<dir>/artifact"], [{ status, body: { message: "synthetic failure" } }], {
    inspect: (directory) => expect(readdirSync(directory)).toEqual([]),
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: expected } });
});

test("oversized artifact headers fail before publication", async () => {
  const result = await cli(["report", "file", "job", "--type", "json", "--output", "<dir>/artifact"], [{ text: "inert", headers: { "content-length": String(250 * 1024 * 1024 + 1) } }], {
    scripted: true, inspect: (directory) => expect(existsSync(join(directory, "artifact"))).toBe(false),
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
});

test("streamed bytes enforce the artifact ceiling even without a content length", async () => {
  const chunk = new Uint8Array(1024 * 1024);
  const result = await cli(["report", "file", "job", "--type", "pcap", "--output", "<dir>/artifact"], [{ text: "inert" }], {
    response: () => new Response(new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(chunk); } })),
    inspect: (directory) => expect(readdirSync(directory)).toEqual([]),
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "LIMIT_EXCEEDED" } });
  expect(result.requests).toHaveLength(1);
});

test("an interrupted artifact response publishes no partial file and is never replayed", async () => {
  const result = await cli(["report", "file", "job", "--type", "pcap", "--output", "<dir>/artifact"], [{ text: "inert" }], {
    response: () => new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1, 2])); }, pull(controller) { controller.error(new Error("synthetic stream failure")); } })),
    inspect: (directory) => expect(readdirSync(directory)).toEqual([]),
  });
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: "NETWORK_ERROR" } });
  expect(result.requests).toHaveLength(1);
});

test("prototype-named query parameters cannot disappear during raw validation", async () => {
  const result = await cli(["api", "get", "/system/version?__proto__=ignored"], [], { noCredentials: true });
  expect(result.code).toBe(2);
  expect(result.requests).toHaveLength(0);
});

test("raw list truncation hints preserve profile, configuration and query selectors", async () => {
  const result = await cli(["--config", "<dir>/config.json", "--profile", "example", "api", "get", "/report/job/memory-dump/hex-dump?filename=dump.bin", "--limit", "1"], [{ body: { data: ["one", "two"] } }], {
    before: (directory) => writeFileSync(join(directory, "config.json"), JSON.stringify({ version: 1, profiles: { example: {} } }), { mode: 0o600 }),
  });
  expect(result.code).toBe(0);
  expect(result.output).toMatchObject({ help: [expect.stringMatching(/^Run hybrid-axi api get --config '.+config.json' --profile 'example' '\/report\/job\/memory-dump\/hex-dump\?filename=dump.bin' --limit 2$/)] });
});

test.each([
  ["report", "show", "job", "extra"], ["report", "state", "../escape"], ["report", "memory", "strings", "job"],
  ["report", "file", "job", "--type", "json", "--output", "<dir>/artifact", "--execute"],
  ["report", "file", "job", "--type", "unknown", "--output", "<dir>/artifact"],
  ["report", "file", "job", "--type", "json", "--type", "xml", "--output", "<dir>/artifact"],
  ["report", "file", "job", "--type", "json"], ["report", "file", "job", "--type", "json", "--output", "-"],
  ["feed", "latest", "--limit", "0"], ["feed", "latest", "--page", "2"], ["system", "version", "--full", "--fields", "api"],
  ...["https://untrusted.invalid/system/version", "//system/version", "/report/job/file/json", "/report/job/file/bin", "/report/job/sample", "/report/job/memory-strings", "/report/job/pcap", "/report/job/dropped-files-v2", "/report/job/dropped-file-raw/hash", "/overview/hash/refresh", "/system/../version", "/system/%76ersion", "/system/version?api-key=x", "/system/version?page=1", "/report/job/memory-dump/hex-dump", "/report/job/memory-dump/hex-dump?filename=a&filename=b", "/report/job/memory-dump/hex-dump?filename=%zz", "/unknown"].map((path) => ["api", "get", path]),
  ["api", "get", "/hunting/matches/recent", "--labs"], ["api", "get", "/system/version", "--headers", "x"],
])("invalid or sensitive input fails before credential resolution: %j", async (...argv) => {
  const result = await cli(argv, [], { noCredentials: true });
  expect(result.code).toBe(2);
  expect(result.requests).toHaveLength(0);
});

test.each([
  ["report", "show", "job"], ["report", "state", "job"],
  ["report", "file", "job"], ["report", "memory", "list", "job"],
  ["feed", "latest"], ["system", "version"], ["api", "get", "/system/version"],
])("inline rejected credentials never appear in diagnostics: %j", async (...argv) => {
  const result = await cli([...argv, `--api-key=${syntheticKey}`], [], { noCredentials: true });
  expect(result.code).toBe(2);
  expect(result.output).toMatchObject({ error: expect.stringContaining("Unknown or duplicate flag: --api-key") });
  expect(result.stdout).not.toContain(syntheticKey);
  expect(result.requests).toHaveLength(0);
});

test.each(["existing", "symlink"])("artifact %s destinations send nothing", async (kind) => {
  const result = await cli(["report", "file", "job", "--type", "json", "--output", "<dir>/artifact"], [], {
    before: (directory) => kind === "existing" ? writeFileSync(join(directory, "artifact"), "keep") : symlinkSync(join(directory, "absent"), join(directory, "artifact")),
  });
  expect(result.code).toBe(2);
  expect(result.requests).toHaveLength(0);
});

test.each([{ status: 403, body: { message: "Denied" }, expected: "PERMISSION_DENIED" }, { body: {}, expected: "MALFORMED_RESPONSE" }])("summary denial and malformed data remain failures: $expected", async ({ expected, ...reply }) => {
  const result = await cli(["report", "show", "job"], [reply]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { code: expected } });
});

test("container 410 points to children without inventing a report summary", async () => {
  const result = await cli(["report", "show", "job"], [{ status: 410, body: { message: "Container", related_id: ["child"] } }]);
  expect(result.code).toBe(1);
  expect(result.output).toMatchObject({ error: { status: 410 }, help: ["Run hybrid-axi report children job"] });
});
