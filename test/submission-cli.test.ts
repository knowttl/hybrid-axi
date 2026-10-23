import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { decode } from "@toon-format/toon";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { main } from "../src/cli.js";
import { mutationOperations, transportBindings } from "../src/catalogue.js";
import { constructTransport } from "../src/transport-core.js";
import { constructWriteCoordinator } from "../src/writes-core.js";
import { parseSubmission } from "../src/submissions.js";
import { fakeHttpsHybrid, fakeTransport, syntheticKey, type Reply } from "./support/fake-hybrid.js";

let directory: string, config: string, sample: string, journal: string, env: NodeJS.ProcessEnv;
const inert = "Inert synthetic upload.\n";
const sha256 = createHash("sha256").update(inert).digest("hex");
const submitted = { job_id: "synthetic-job", submission_id: "synthetic-submission", environment_id: 160, sha256 };
const scanned = { id: "synthetic-scan", finished: false, sha256 };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-submissions-"));
  config = join(directory, "config.json");
  sample = join(directory, "sample.bin");
  journal = join(directory, "state", "hybrid-axi", "writes.log");
  env = { SYNTHETIC_KEY: syntheticKey, XDG_STATE_HOME: join(directory, "state") };
  writeFileSync(sample, inert);
  configure(true);
});
afterEach(() => { vi.useRealTimers(); rmSync(directory, { recursive: true, force: true }); });
function configure(allowWrites: boolean) {
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: {
    apiKey: { env: "SYNTHETIC_KEY" }, writes: { allowWrites, operations: Object.keys(mutationOperations) },
  } } }), { mode: 0o600 });
}
async function invoke(argv: string[], fetch: typeof globalThis.fetch, approval?: () => boolean) {
  let stdout = "";
  const previous = process.exitCode;
  process.exitCode = 0;
  const credentials = { env, home: directory };
  try {
    await main(["--config", config, "--profile", "example", ...argv], {
      credentials, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch }),
      createWriteCoordinator: (options) => constructWriteCoordinator({ ...options, approval }, {
        credentials, operations: mutationOperations, bindings: transportBindings, fetch,
      }),
    });
    return { output: decode(stdout) as Record<string, unknown>, stdout, code: process.exitCode };
  } finally { process.exitCode = previous; }
}
function confirmation(result: Awaited<ReturnType<typeof invoke>>) {
  return (result.output.preview as { confirm: string }).confirm;
}
async function withFake(replies: Reply[], run: (fake: Awaited<ReturnType<typeof fakeHttpsHybrid>>) => Promise<void>) {
  const fake = await fakeHttpsHybrid(replies);
  try { await run(fake); } finally { await fake.close(); }
}
const fileArgs = () => ["submit", "file", "--file", sample, "--environment-id", "160"];
const urlArgs = ["submit", "url", "--url", "https://example.com/sample?a=1&b=2", "--environment-id", "160"];

test.each(["--config", "--profile"])("dash-leading %s selectors work before and after the command", (flag) => {
  expect(parseSubmission([flag, "-synthetic", ...urlArgs])?.flags[flag]).toBe("-synthetic");
  expect(parseSubmission([...urlArgs, flag, "-synthetic"])?.flags[flag]).toBe("-synthetic");
});

test("file preview discloses visibility, names sample and environment and sends nothing", async () => {
  await withFake([], async (fake) => {
    const result = await invoke(fileArgs(), fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ kind: "dry-run", preview: {
      target: { sha256, bytes: Buffer.byteLength(inert), name: "sample.bin", environment_id: 160 },
      warnings: ["The sample and its report can become visible to the community."],
    } });
    expect(confirmation(result)).toContain(sha256);
    expect(confirmation(result)).toContain('"environment_id":160');
    expect(result.stdout).not.toContain(inert);
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(journal)).toBe(false);
  });
});

test("exact file confirmation sends multipart bytes once and journals metadata only", async () => {
  await withFake([{ status: 201, body: submitted }], async (fake) => {
    const confirm = confirmation(await invoke(fileArgs(), fake.fetch));
    const result = await invoke([...fileArgs(), "--execute", "--confirm", confirm], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ kind: "success", response: submitted, auditId: expect.any(String) });
    expect(fake.requests).toHaveLength(1);
    const request = fake.requests[0]!;
    expect(request).toMatchObject({ method: "POST", url: "/api/v2/submit/file", headers: { "api-key": syntheticKey } });
    const form = await new Response(new Uint8Array(request.bytes), { headers: { "content-type": String(request.headers["content-type"]) } }).formData();
    expect(form.get("environment_id")).toBe("160");
    const file = form.get("file") as File;
    expect(file.name).toBe("sample.bin");
    expect(await file.text()).toBe(inert);
    const log = readFileSync(journal, "utf8");
    expect(log.trim().split("\n").map((line) => JSON.parse(line))).toMatchObject([{ kind: "intent" }, { kind: "outcome", result: "SUCCESS", status: 201 }]);
    expect(log).not.toContain(inert);
    expect(log).not.toContain(sample);
    expect(log).not.toContain(syntheticKey);
  });
});

test("multipart uploads preserve inert binary bytes", async () => {
  const bytes = new Uint8Array([0, 255, 13, 10, 128, 1]);
  writeFileSync(sample, bytes);
  await withFake([{ status: 201, body: submitted }], async (fake) => {
    const preview = await invoke(fileArgs(), fake.fetch);
    const result = await invoke([...fileArgs(), "--execute", "--confirm", confirmation(preview)], fake.fetch);
    expect(result.code).toBe(0);
    const request = fake.requests[0]!;
    const form = await new Response(new Uint8Array(request.bytes), { headers: { "content-type": String(request.headers["content-type"]) } }).formData();
    expect(new Uint8Array(await (form.get("file") as File).arrayBuffer())).toEqual(bytes);
  });
});

test.each([
  { flags: ["--execute"], code: "CONFIRM_REQUIRED" },
  { flags: ["--execute", "--confirm", "synthetic-wrong-target"], code: "CONFIRM_MISMATCH" },
])("execution needs the complete exact confirmation: $code", async ({ flags, code }) => {
  await withFake([], async (fake) => {
    const result = await invoke([...urlArgs, ...flags], fake.fetch);
    expect(result.output).toMatchObject({ error: { code } });
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(journal)).toBe(false);
  });
});

test("URL submission preserves the exact URL and explicit options without deprecated defaults", async () => {
  await withFake([{ status: 201, body: submitted }], async (fake) => {
    const argv = [...urlArgs, "--network-settings", "simulated", "--script-logging", "false", "--priority", "4", "--custom-cmd-line", "--silent"];
    const preview = await invoke(argv, fake.fetch);
    expect(preview.output).toMatchObject({ preview: { target: { url: urlArgs[3], environment_id: 160 } } });
    const result = await invoke([...argv, "--execute", "--confirm", confirmation(preview)], fake.fetch);
    expect(result.code).toBe(0);
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ url: "/api/v2/submit/url", headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(Object.fromEntries(new URLSearchParams(fake.requests[0]!.body))).toEqual({ url: urlArgs[3], environment_id: "160", network_settings: "simulated", script_logging: "false", priority: "4", custom_cmd_line: "--silent" });
  });
});

test("document passwords are sent explicitly but redacted from previews and output", async () => {
  await withFake([{ status: 201, body: submitted }], async (fake) => {
    const argv = [...fileArgs(), "--document-password", "--synthetic-document-password"];
    const preview = await invoke(argv, fake.fetch);
    expect(preview.stdout).not.toContain("synthetic-document-password");
    expect(preview.output).toMatchObject({ preview: { proposed: { body: { document_password: "***redacted***" } } } });
    const result = await invoke([...argv, "--execute", "--confirm", confirmation(preview)], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("synthetic-document-password");
    const request = fake.requests[0]!;
    const form = await new Response(new Uint8Array(request.bytes), { headers: { "content-type": String(request.headers["content-type"]) } }).formData();
    expect(form.get("document_password")).toBe("--synthetic-document-password");
  });
});

test.each([
  { argv: ["submit", "dropped-file", "--id", `${sha256}:160`, "--file-hash", "b".repeat(64)], target: { report: `${sha256}:160`, file_hash: "b".repeat(64) }, path: "/api/v2/submit/dropped-file", body: { id: `${sha256}:160`, file_hash: "b".repeat(64) } },
  { argv: ["quick-scan", "submit", "synthetic-scan", "--environment-id", "140"], target: { quickScan: "synthetic-scan", environment_id: 140 }, path: "/api/v2/quick-scan/synthetic-scan/convert-to-full", body: { environment_id: "140" } },
])("guarded conversion sends only the confirmed selectors: $path", async ({ argv, target, path, body }) => {
  await withFake([{ status: 201, body: submitted }], async (fake) => {
    const preview = await invoke(argv, fake.fetch);
    expect(preview.output).toMatchObject({ kind: "dry-run", preview: { target, warnings: ["The sample and its report can become visible to the community."] } });
    expect(fake.requests).toHaveLength(0);
    const result = await invoke([...argv, "--execute", "--confirm", confirmation(preview)], fake.fetch);
    expect(result.code).toBe(0);
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ method: "POST", url: path });
    expect(Object.fromEntries(new URLSearchParams(fake.requests[0]!.body))).toEqual(body);
  });
});

test.each(["sample", "environment", "URL", "option"])("changed %s invalidates an earlier exact confirmation", async (change) => {
  await withFake([], async (fake) => {
    const argv = change === "URL" ? [...urlArgs] : fileArgs();
    const confirm = confirmation(await invoke(argv, fake.fetch));
    if (change === "sample") writeFileSync(sample, "Different inert sample");
    if (change === "environment") argv[argv.length - 1] = "140";
    if (change === "URL") argv[3] = "https://example.com/other";
    if (change === "option") argv.push("--comment", "changed");
    const result = await invoke([...argv, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.output).toMatchObject({ error: { code: "CONFIRM_MISMATCH" } });
    expect(fake.requests).toHaveLength(0);
  });
});

test("file bytes changed during host approval cannot be uploaded", async () => {
  await withFake([], async (fake) => {
    const confirm = confirmation(await invoke(fileArgs(), fake.fetch));
    const result = await invoke([...fileArgs(), "--execute", "--confirm", confirm], fake.fetch, () => {
      writeFileSync(sample, "Changed after confirmation"); return true;
    });
    expect(result.code).toBe(1);
    expect(fake.requests).toHaveLength(0);
  });
});

test.each(["default", "forced"])("%s read-only policy denies a submission before HTTP", async (policy) => {
  if (policy === "default") configure(false);
  else env.HYBRID_AXI_READ_ONLY = "1";
  await withFake([], async (fake) => {
    const result = await invoke(urlArgs, fake.fetch);
    expect(result.output).toMatchObject({ error: { code: "WRITES_DISABLED" } });
    expect(fake.requests).toHaveLength(0);
  });
});

test.each(["directory", "oversized"])("invalid upload %s fails before HTTP", async (kind) => {
  if (kind === "oversized") truncateSync(sample, 250 * 1024 * 1024 + 1);
  await withFake([], async (fake) => {
    const result = await invoke(["quick-scan", "file", "--file", kind === "directory" ? directory : sample, "--scan-type", "all"], fake.fetch);
    expect(result.code).toBe(2);
    expect(fake.requests).toHaveLength(0);
  });
});

test("a journal failure prevents an otherwise confirmed submission", async () => {
  await withFake([], async (fake) => {
    const confirm = confirmation(await invoke(urlArgs, fake.fetch));
    mkdirSync(dirname(journal), { recursive: true });
    writeFileSync(journal, "invalid journal\n", { mode: 0o600 });
    const result = await invoke([...urlArgs, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.output).toMatchObject({ error: { code: "INTENT_NOT_RECORDED" } });
    expect(fake.requests).toHaveLength(0);
  });
});

test.each(["file", "url"])("quick-scan %s transmits under forced read-only without a journal", async (type) => {
  configure(false);
  env.HYBRID_AXI_READ_ONLY = "true";
  await withFake([{ status: 201, body: scanned }], async (fake) => {
    const argv = ["quick-scan", type, type === "file" ? "--file" : "--url", type === "file" ? sample : "https://example.com", "--scan-type", "all_lookup", "--comment", "--synthetic-comment", "--submit-name", "-sample"];
    const result = await invoke(argv, fake.fetch);
    expect(result.output).toEqual({ scan: scanned });
    expect(result.code).toBe(0);
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ method: "POST", url: `/api/v2/quick-scan/${type}` });
    if (type === "file") {
      const form = await new Response(fake.requests[0]!.body, { headers: { "content-type": String(fake.requests[0]!.headers["content-type"]) } }).formData();
      expect(await (form.get("file") as File).text()).toBe(inert);
      expect(form.get("scan_type")).toBe("all_lookup");
      expect(form.get("comment")).toBe("--synthetic-comment");
      expect(form.get("submit_name")).toBe("-sample");
    } else expect(Object.fromEntries(new URLSearchParams(fake.requests[0]!.body))).toEqual({ url: "https://example.com", scan_type: "all_lookup", comment: "--synthetic-comment", submit_name: "-sample" });
    expect(existsSync(journal)).toBe(false);
  });
});

test.each(["file", "url"])("quick-scan %s help discloses transmission without resolving credentials", async (type) => {
  rmSync(config);
  await withFake([], async (fake) => {
    const result = await invoke(["quick-scan", type, "--help"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ effect: "read", description: expect.stringContaining(`sends the ${type === "file" ? "sample" : "URL"} to Hybrid Analysis`) });
    expect(fake.requests).toHaveLength(0);
  });
});

test("quick-scan result resumes a known ID without another upload", async () => {
  await withFake([{ body: { ...scanned, finished: true, future: { token: "secret-token", useful: true } } }], async (fake) => {
    const result = await invoke(["quick-scan", "show", "synthetic-scan", "--full"], fake.fetch);
    expect(result.output).toMatchObject({ scan: { ...scanned, finished: true, future: { token: "***redacted***", useful: true } } });
    expect(fake.requests.map(({ method, url }) => ({ method, url }))).toEqual([{ method: "GET", url: "/api/v2/quick-scan/synthetic-scan" }]);
  });
});

test("quick-scan scanners uses the documented service object", async () => {
  const body = { name: "synthetic-scanner", available: true, description: "Synthetic scanner", supported_types: ["all_lookup"] };
  await withFake([{ body }], async (fake) => {
    const result = await invoke(["quick-scan", "scanners"], fake.fetch);
    expect(result.output).toEqual({ scan: body });
    expect(fake.requests[0]).toMatchObject({ method: "GET", url: "/api/v2/quick-scan/state" });
  });
});

test.each([
  ["submit", "url", "--url", "https://example.com", "--environment-id", "999"],
  ["submit", "url", "--url", "https://user:pass@example.com", "--environment-id", "160"],
  ["submit", "url", "--url", "https://example.com", "--environment-id", "160", "--offline-analysis", "true"],
  ["submit", "url", "--url", "https://example.com", "--environment-id", "160", "--custom-cmd-line", "--silent", "--unknown"],
  ["submit", "url", "--url", "https://example.com", "--environment-id", "160", "--comment"],
  ["submit", "url", "--url", "https://example.com", "--environment-id", "160", "--comment", " "],
  ["submit", "url", "--url", "https://example.com", "--environment-id", "160", "--priority", "-1"],
  ["submit", "dropped-file", "--id", "report", "--file-hash", "bad"],
  ["quick-scan", "file", "--file", "missing.bin", "--scan-type", "all"],
  ["quick-scan", "url", "--url", "https://example.com", "--scan-type", "typo"],
  ["quick-scan", "url", "--url", "https://example.com", "--scan-type", "all", "--execute"],
  ["quick-scan", "show", "../escape"],
])("invalid submission input sends nothing: %j", async (...argv) => {
  await withFake([], async (fake) => {
    const result = await invoke(argv, fake.fetch);
    expect(result.code).toBe(2);
    expect(fake.requests).toHaveLength(0);
  });
});

test.each(["submit", "quick-scan"])("an ambiguous %s timeout sends once", async (kind) => {
  vi.useFakeTimers();
  const fake = fakeTransport(["hang"], { credential: { apiKey: syntheticKey, redact: (value) => value } });
  const fetch = fake.fetch;
  const argv = kind === "submit" ? [...urlArgs] : ["quick-scan", "url", "--url", "https://example.com", "--scan-type", "all"];
  if (kind === "submit") argv.push("--execute", "--confirm", confirmation(await invoke(urlArgs, fetch)), "--intent-id", "synthetic-intent");
  const pending = invoke(argv, fetch);
  await vi.advanceTimersByTimeAsync(20_000);
  const result = await pending;
  expect(result.output).toMatchObject({ error: { code: kind === "submit" ? "OUTCOME_UNKNOWN" : "TIMEOUT" } });
  expect(fake.requests).toHaveLength(1);
  if (kind === "submit") {
    const repeated = await invoke(argv, fetch);
    expect(repeated.output).toMatchObject({ error: { code: "ALREADY_EXECUTED" } });
    expect(fake.requests).toHaveLength(1);
  }
});

test.each([429, 503])("quick scans are single-send on explicit %i", async (status) => {
  await withFake([{ status, body: { message: "Try later" } }], async (fake) => {
    const result = await invoke(["quick-scan", "url", "--url", "https://example.com", "--scan-type", "all"], fake.fetch);
    expect(result.code).toBe(1);
    expect(fake.requests).toHaveLength(1);
  });
});

test.each([
  { reply: { status: 403, body: { message: "Denied" } }, code: "PERMISSION_DENIED" },
  { reply: { body: { id: "synthetic-scan" } }, code: "MALFORMED_RESPONSE" },
])("quick-scan failures never become successful scans: $code", async ({ reply, code }) => {
  await withFake([reply], async (fake) => {
    const result = await invoke(["quick-scan", "show", "synthetic-scan"], fake.fetch);
    expect(result.code).toBe(1);
    expect(result.output).toMatchObject({ error: { code } });
    expect(result.output).not.toHaveProperty("scan");
  });
});
