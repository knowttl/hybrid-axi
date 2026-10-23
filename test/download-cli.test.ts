import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { decode } from "@toon-format/toon";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { main } from "../src/cli.js";
import { mutationOperations, transportBindings } from "../src/catalogue.js";
import { constructWriteCoordinator } from "../src/writes-core.js";
import { fakeHttpsHybrid, keyBody, syntheticKey, type Reply } from "./support/fake-hybrid.js";

let directory: string;
let env: NodeJS.ProcessEnv;
let upstream: Awaited<ReturnType<typeof fakeHttpsHybrid>>;
const sha256 = "a".repeat(64);
const cases = [
  { argv: ["report", "file", "job", "--type", "bin"], path: "/report/job/sample", operation: "report-download-bin", type: "bin" },
  { argv: ["report", "file", `${sha256}:120`, "--type", "memory"], path: `/report/${sha256}%3A120/file/memory`, operation: "report-download-memory", type: "memory" },
  { argv: ["report", "file", "job", "--type", "dropped-files"], path: "/report/job/dropped-files-v2", operation: "report-download-dropped-files", type: "dropped-files" },
  { argv: ["hash", "file", sha256], path: `/overview/${sha256}/sample`, operation: "hash-download-bin", type: "bin" },
];
const bytes = gzipSync(`NON-malware synthetic artifact ${syntheticKey}`);
const output = () => join(directory, "artifact.gz");
const log = () => join(directory, "state", "hybrid-axi", "writes.log");
function configure(allowWrites = true, operations = cases.map((entry) => entry.operation)) {
  writeFileSync(join(directory, "config.json"), JSON.stringify({ version: 1, profiles: { example: {
    apiKey: { env: "SYNTHETIC_KEY" }, writes: { allowWrites, operations },
  } } }), { mode: 0o600 });
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-download-"));
  env = { SYNTHETIC_KEY: syntheticKey, XDG_STATE_HOME: join(directory, "state") };
  configure();
  upstream = await fakeHttpsHybrid([]);
});
afterEach(async () => { vi.useRealTimers(); await upstream.close(); rmSync(directory, { recursive: true, force: true }); });

async function cli(argv: string[], replies: Reply[] = [], fetch?: typeof globalThis.fetch) {
  if (!fetch) {
    await upstream.close();
    upstream = await fakeHttpsHybrid(replies);
  }
  let stdout = "";
  const previous = process.exitCode;
  try {
    process.exitCode = 0;
    await main([...argv, "--config", join(directory, "config.json")], {
      credentials: { env, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createWriteCoordinator: (options, credentials) => constructWriteCoordinator(options ?? {}, {
        operations: mutationOperations, bindings: transportBindings, credentials,
        fetch: fetch ?? upstream.fetch,
      }),
    });
    return { code: process.exitCode, stdout, body: decode(stdout) as Record<string, any> };
  } finally { process.exitCode = previous; }
}
const args = (argv = cases[0]!.argv) => [...argv, "--output", output()];
async function confirmation(argv = args()) {
  const result = await cli(argv);
  expect(result.code).toBe(0);
  return result.body.preview.confirm as string;
}

test.each(cases)("$operation previews exact scope and warnings without a request or file", async ({ argv, type }) => {
  const result = await cli(args(argv));
  expect(result.code).toBe(0);
  expect(result.body).toMatchObject({ kind: "dry-run", preview: { target: { type, output: output() },
    warnings: expect.arrayContaining([expect.stringContaining("Live-malware warning"), expect.stringContaining("Protection is unverified")]) } });
  expect(result.body.preview.confirm).toContain(output());
  expect(result.body.preview.confirm).toContain(argv[2]);
  expect(upstream.requests).toHaveLength(0);
  expect(existsSync(output())).toBe(false);
  expect(existsSync(log())).toBe(false);
});

test.each(cases)("$operation saves upstream compressed bytes privately without printing or journaling them", async ({ argv, path, type }) => {
  const confirm = await confirmation(args(argv));
  const result = await cli([...args(argv), "--execute", "--confirm", confirm], [{ bytes, headers: { "vx-filename": "../../untrusted" } }]);
  expect(result.code).toBe(0);
  expect(result.body).toMatchObject({ type, bytes: bytes.length, auditId: expect.any(String), output: output() });
  expect(readFileSync(output())).toEqual(bytes);
  expect(readdirSync(directory).sort()).toEqual(["artifact.gz", "config.json", "state"]);
  if (process.platform !== "win32") expect(lstatSync(output()).mode & 0o777).toBe(0o600);
  expect(upstream.requests).toHaveLength(1);
  expect(upstream.requests[0]).toMatchObject({ method: "GET", url: `/api/v2${path}`, headers: { "accept-encoding": "identity" } });
  expect(result.stdout).not.toContain(syntheticKey);
  expect(result.stdout).not.toContain("NON-malware");
  const journal = readFileSync(log(), "utf8");
  expect(journal).not.toContain(syntheticKey);
  expect(journal).not.toContain("NON-malware");
  expect(journal.trim().split("\n").map((line) => JSON.parse(line))).toMatchObject([{ kind: "intent" }, { kind: "outcome", result: "SUCCESS" }]);
});

test.each(["id", "type", "output", "missing"])("changed %s confirmation cannot send", async (change) => {
  const confirm = await confirmation();
  const argv = change === "id" ? args(["report", "file", "other", "--type", "bin"])
    : change === "type" ? args(cases[2]!.argv) : change === "output" ? [...cases[0]!.argv, "--output", join(directory, "other.gz")] : args();
  const result = await cli([...argv, "--execute", ...(change === "missing" ? [] : ["--confirm", confirm])]);
  expect(result.body).toMatchObject({ error: { code: change === "missing" ? "CONFIRM_REQUIRED" : "CONFIRM_MISMATCH" } });
  expect(upstream.requests).toHaveLength(0);
  expect(existsSync(log())).toBe(false);
});

test.each(["default", "forced", "scope"])("%s read-only policy blocks even preview", async (policy) => {
  if (policy === "default") configure(false);
  if (policy === "forced") env.HYBRID_AXI_READ_ONLY = "true";
  if (policy === "scope") configure(true, []);
  const result = await cli(args());
  expect(result.body).toMatchObject({ error: { code: policy === "scope" ? "OPERATION_NOT_WRITABLE" : "WRITES_DISABLED" } });
  expect(upstream.requests).toHaveLength(0);
});

test.each(["bin", "memory", "dropped-files"])("help discloses live malware and unverified protection for %s", async (type) => {
  const result = await cli(["report", "file", "--help", "--type", type]);
  expect(result.stdout).toContain("Live-malware warning");
  expect(result.stdout).toContain("Protection is unverified");
  expect(upstream.requests).toHaveLength(0);
});

test.each(["restricted", "default", "unknown"])("download 403 reports %s key level without a file or replay", async (level) => {
  const confirm = await confirmation();
  const result = await cli([...args(), "--execute", "--confirm", confirm], [
    { status: 403, body: { message: syntheticKey } },
    level === "unknown" ? { status: 403, body: { message: "Key inspection denied" } } : { body: { ...keyBody, auth_level_name: level } },
  ]);
  expect(result.code).toBe(1);
  expect(result.body).toMatchObject({ error: { code: level === "restricted" ? "KEY_LEVEL_RESTRICTED" : "PERMISSION_DENIED", status: 403,
    keyLevel: level, requiredKeyLevel: "default", auditId: expect.any(String) } });
  expect(result.stdout).toContain("vetting");
  expect(result.stdout).not.toContain(syntheticKey);
  expect(upstream.requests.map((request) => request.url)).toEqual(["/api/v2/report/job/sample", "/api/v2/key/current"]);
  expect(existsSync(output())).toBe(false);
});

test.each(["existing", "symlink", "stdout"])("unsafe %s destination prevents sends", async (kind) => {
  if (kind === "existing") writeFileSync(output(), "keep");
  if (kind === "symlink") symlinkSync(join(directory, "missing"), output());
  const result = await cli([...cases[0]!.argv, "--output", kind === "stdout" ? "-" : output()]);
  expect(result.code).toBe(2);
  expect(upstream.requests).toHaveLength(0);
});

test("journal failure prevents the download", async () => {
  const confirm = await confirmation();
  mkdirSync(join(directory, "state", "hybrid-axi"), { recursive: true });
  writeFileSync(log() + ".lock", "", { mode: 0o600 });
  const result = await cli([...args(), "--execute", "--confirm", confirm]);
  expect(result.body).toMatchObject({ error: { code: "INTENT_NOT_RECORDED" } });
  expect(upstream.requests).toHaveLength(0);
});

test("a publication race preserves the existing destination and removes staging files", async () => {
  const confirm = await confirmation();
  const fake = await fakeHttpsHybrid([{ bytes }]);
  try {
    const result = await cli([...args(), "--execute", "--confirm", confirm], [], async (url, init) => {
      const response = await fake.fetch(url, init);
      writeFileSync(output(), "keep");
      return response;
    });
    expect(result.body).toMatchObject({ error: { code: "OUTPUT_FAILED", auditId: expect.any(String) } });
    expect(readFileSync(output(), "utf8")).toBe("keep");
    expect(readdirSync(directory).sort()).toEqual(["artifact.gz", "config.json", "state"]);
  } finally { await fake.close(); }
});

test.each<{ headers: Record<string, string>; code: string }>([
  { headers: { "content-encoding": "gzip" }, code: "MALFORMED_RESPONSE" },
  { headers: { "content-length": String(250 * 1024 * 1024 + 1) }, code: "LIMIT_EXCEEDED" },
])("invalid delivery fails without publishing: $code", async ({ headers, code }) => {
  const confirm = await confirmation();
  const result = await cli([...args(), "--execute", "--confirm", confirm], [], async () => new Response(bytes, { headers }));
  expect(result.body).toMatchObject({ error: { code } });
  expect(existsSync(output())).toBe(false);
});

test("an ambiguous timeout sends once and publishes nothing", async () => {
  const confirm = await confirmation();
  vi.useFakeTimers();
  let sends = 0;
  const pending = cli([...args(), "--execute", "--confirm", confirm], [], async (_url, init) => {
    sends++;
    return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("Synthetic timeout")), { once: true }));
  });
  await vi.advanceTimersByTimeAsync(20_000);
  const result = await pending;
  expect(result.body).toMatchObject({ error: { code: "OUTCOME_UNKNOWN" } });
  expect(sends).toBe(1);
  expect(existsSync(output())).toBe(false);
});
