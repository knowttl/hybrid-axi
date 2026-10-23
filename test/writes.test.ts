import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import { constructWriteCoordinator, type MutationOperation, type WriteCoordinatorOptions } from "../src/writes-core.js";
import { createWriteCoordinator } from "../src/writes.js";
import { privateFiles } from "../src/private-file.js";
import { type OperationBinding } from "../src/transport-core.js";
import { fakeHttpsHybrid, syntheticKey } from "./support/fake-hybrid.js";

let directory: string;
let config: string;
let log: string;
let env: NodeJS.ProcessEnv;
const binding: OperationBinding = { method: "POST", path: "/api/labs/synthetic/{id}", effect: "write",
  body: z.strictObject({ active: z.boolean(), source: z.string().optional() }), decoder: z.looseObject({ id: z.string() }) };
const definition: MutationOperation = {
  input: z.strictObject({ id: z.string().min(1), active: z.boolean(), source: z.string().optional() }),
  prepare(input) {
    const { id, ...body } = input as { id: string; active: boolean; source?: string };
    return { target: { ruleId: id }, request: { pathParams: { id }, body } };
  },
  effect: "Change the synthetic rule", readBackHelp: ["Read back the synthetic rule before deciding what to do next"],
};
const input = { id: "synthetic-rule", active: true };

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-writes-"));
  config = join(directory, "config.json");
  log = join(directory, "state", "hybrid-axi", "writes.log");
  env = { SYNTHETIC_KEY: syntheticKey, XDG_STATE_HOME: join(directory, "state") };
  configure(true, ["synthetic-write"]);
});
afterEach(() => { vi.useRealTimers(); rmSync(directory, { recursive: true, force: true }); });

function configure(allowWrites: boolean, operations: string[]) {
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: {
    apiKey: { env: "SYNTHETIC_KEY" }, writes: { allowWrites, operations },
  } } }), { mode: 0o600 });
}
function coordinator(fetch: typeof globalThis.fetch, options: WriteCoordinatorOptions = {}, operation = definition,
  files?: ReturnType<typeof privateFiles>) {
  return constructWriteCoordinator({ config, ...options }, { operations: { "synthetic-write": operation },
    bindings: { "synthetic-write": binding, "synthetic-read": { ...binding, method: "GET", effect: "read", body: undefined } },
    credentials: { env, home: directory }, fetch, files });
}
function records() { return readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line)); }

test.each([
  { allow: false, operations: ["synthetic-write"], forced: undefined, host: false, code: "WRITES_DISABLED" },
  { allow: true, operations: [], forced: undefined, host: false, code: "OPERATION_NOT_WRITABLE" },
  { allow: true, operations: ["another-write"], forced: undefined, host: false, code: "OPERATION_NOT_WRITABLE" },
  { allow: true, operations: ["synthetic-write"], forced: "TRUE", host: false, code: "WRITES_DISABLED" },
  { allow: true, operations: ["synthetic-write"], forced: undefined, host: true, code: "WRITES_DISABLED" },
])("policy denies even a preview before HTTP: $code, $forced, $host", async ({ allow, operations, forced, host, code }) => {
  configure(allow, operations);
  env.HYBRID_AXI_READ_ONLY = forced;
  const fake = await fakeHttpsHybrid([]);
  try {
    await expect(coordinator(fake.fetch, { readOnly: host }).run("synthetic-write", input)).rejects.toMatchObject({ error: { code } });
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(log)).toBe(false);
  } finally { await fake.close(); }
});

test("an environment profile cannot enable writes", async () => {
  env.HYBRID_AXI_API_KEY = syntheticKey;
  const fake = await fakeHttpsHybrid([]);
  try {
    await expect(coordinator(fake.fetch).run("synthetic-write", input, { execute: true })).rejects.toMatchObject({ error: { code: "WRITES_DISABLED" } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test("preview is local, redacts proposed source and binds the exact request digest", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch);
    const first = await writes.run("synthetic-write", { ...input, source: syntheticKey });
    const reordered = await writes.run("synthetic-write", { source: syntheticKey, active: true, id: input.id });
    const changed = await writes.run("synthetic-write", { ...input, active: false, source: syntheticKey });
    expect(first).toMatchObject({ kind: "dry-run", preview: { target: { ruleId: input.id }, proposed: { body: { source: "***redacted***" } } } });
    expect(first.preview.confirm).toBe(reordered.preview.confirm);
    expect(first.preview.confirm).not.toBe(changed.preview.confirm);
    expect(first.preview.confirm).toContain(input.id);
    expect(first.preview.confirm).toContain(first.preview.digest);
    expect(JSON.stringify(first)).not.toContain(syntheticKey);
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(log)).toBe(false);
  } finally { await fake.close(); }
});

test.each([
  { flags: { execute: true }, code: "CONFIRM_REQUIRED" },
  { flags: { execute: true, confirm: "synthetic-rule" }, code: "CONFIRM_MISMATCH" },
  { flags: { execute: true, dryRun: true }, code: "VALIDATION_ERROR" },
])("invalid execution flags prevent sends: $code", async ({ flags, code }) => {
  const fake = await fakeHttpsHybrid([]);
  try {
    await expect(coordinator(fake.fetch).run("synthetic-write", input, flags)).rejects.toMatchObject({ error: { code } });
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(log)).toBe(false);
  } finally { await fake.close(); }
});

test("changing request options invalidates a previous confirmation", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch);
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", { ...input, active: false }, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "CONFIRM_MISMATCH" } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test("a redacted confirmation cannot authorize the original secret target", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch);
    const unsafe = { ...input, id: syntheticKey };
    const { preview } = await writes.run("synthetic-write", unsafe);
    await expect(writes.run("synthetic-write", unsafe, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "CONFIRM_UNSAFE" } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test("execution reserves a private intent before one send and stores metadata only", async () => {
  const fake = await fakeHttpsHybrid([{ body: { id: input.id, source: "response-body-must-not-be-journaled" } }]);
  const fetch: typeof globalThis.fetch = async (url, init) => {
    expect(records()).toMatchObject([{ kind: "intent", operation: "synthetic-write" }]);
    return fake.fetch(url, init);
  };
  try {
    const writes = coordinator(fetch);
    const payload = { ...input, source: "source-body-must-not-be-journaled" };
    const { preview } = await writes.run("synthetic-write", payload);
    const result = await writes.run("synthetic-write", payload, { execute: true, confirm: preview.confirm });
    expect(result).toMatchObject({ kind: "success", status: 200, auditId: expect.any(String), help: definition.readBackHelp });
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ method: "POST", url: "/api/labs/synthetic/synthetic-rule", body: JSON.stringify({ active: true, source: payload.source }) });
    expect(records()).toMatchObject([
      { kind: "intent", target: preview.digest, auditId: result.kind === "success" ? result.auditId : "" },
      { kind: "outcome", result: "SUCCESS", status: 200 },
    ]);
    const journal = readFileSync(log, "utf8");
    expect(journal).not.toContain(payload.source);
    expect(journal).not.toContain("response-body-must-not-be-journaled");
    expect(journal).not.toContain(syntheticKey);
    if (process.platform !== "win32") {
      expect(statSync(log).mode & 0o777).toBe(0o600);
      expect(statSync(dirname(log)).mode & 0o777).toBe(0o700);
    }
    expect(existsSync(`${log}.lock`)).toBe(false);
  } finally { await fake.close(); }
});

test.each(["malformed", "partial", "lock", "symlink", "insecure"])("unsafe journal blocks execution before HTTP: %s", async (fault) => {
  mkdirSync(dirname(log), { recursive: true });
  if (fault === "lock") writeFileSync(`${log}.lock`, "", { mode: 0o600 });
  else if (fault === "symlink") symlinkSync(config, log);
  else {
    writeFileSync(log, fault === "partial" ? "{" : fault === "malformed" ? "{}\n" : "", { mode: 0o600 });
    if (fault === "insecure") chmodSync(log, 0o666);
  }
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch);
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "INTENT_NOT_RECORDED", auditId: expect.any(String) } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test("failed outcome persistence reports possible success with audit and read-back guidance", async () => {
  const files = privateFiles();
  const fake = await fakeHttpsHybrid([{ body: { id: input.id } }]);
  try {
    const writes = coordinator(fake.fetch, {}, definition, { ...files, write(path, content) {
      if (content.includes('"kind":"outcome"')) throw new Error("Synthetic disk failure");
      files.write(path, content);
    } });
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "OUTCOME_UNKNOWN", auditId: expect.any(String), message: expect.stringContaining("success is possible") },
        help: expect.arrayContaining([...definition.readBackHelp]) });
    expect(fake.requests).toHaveLength(1);
    expect(records()).toHaveLength(1);
  } finally { await fake.close(); }
});

test.each(["orphan", "duplicate", "mismatched"])("journal history corruption blocks later sends: %s", async (fault) => {
  const fake = await fakeHttpsHybrid([{ body: { id: input.id } }]);
  try {
    const writes = coordinator(fake.fetch);
    const { preview } = await writes.run("synthetic-write", input);
    await writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm });
    const [intent, outcome] = records();
    const corrupt = fault === "orphan" ? [outcome] : fault === "duplicate" ? [intent, outcome, outcome]
      : [intent, { ...outcome, target: "a".repeat(64) }];
    writeFileSync(log, corrupt.map((record) => JSON.stringify(record)).join("\n") + "\n");
    await expect(coordinator(fake.fetch).run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "INTENT_NOT_RECORDED" } });
    expect(fake.requests).toHaveLength(1);
  } finally { await fake.close(); }
});

test("ambiguous timeout sends once and refuses the reserved intent in a later coordinator", async () => {
  vi.useFakeTimers();
  let sends = 0;
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    sends++;
    return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("Synthetic timeout")), { once: true }));
  };
  const writes = coordinator(fetch);
  const { preview } = await writes.run("synthetic-write", input);
  const flags = { execute: true, confirm: preview.confirm, intentId: "synthetic-intent" };
  const pending = expect(writes.run("synthetic-write", input, flags)).rejects.toMatchObject({
    error: { code: "OUTCOME_UNKNOWN", auditId: expect.any(String), message: expect.stringContaining("never replay") }, help: definition.readBackHelp,
  });
  await vi.advanceTimersByTimeAsync(20_000);
  await pending;
  expect(records()).toMatchObject([{ kind: "intent" }, { kind: "outcome", result: "OUTCOME_UNKNOWN" }]);
  await expect(coordinator(fetch).run("synthetic-write", input, flags)).rejects.toMatchObject({ error: {
    code: "ALREADY_EXECUTED", auditId: records()[0]!.auditId,
  } });
  expect(sends).toBe(1);
});

test("a changed target state after reservation aborts without a write", async () => {
  const fake = await fakeHttpsHybrid([{ body: { id: "before" } }, { body: { id: "before" } }, { body: { id: "changed" } }]);
  try {
    const writes = coordinator(fake.fetch, {}, { ...definition, current: async (transport) => ({ state: (await transport.request("synthetic-read", { pathParams: { id: input.id } })).body }) });
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "PREVIEW_CHANGED" } });
    expect(fake.requests.map(({ method }) => method)).toEqual(["GET", "GET", "GET"]);
    expect(records()).toMatchObject([{ kind: "intent" }, { kind: "outcome", result: "NOT_SENT" }]);
  } finally { await fake.close(); }
});

test("host approval cannot widen frozen scope or the prepared request", async () => {
  const fake = await fakeHttpsHybrid([{ body: { id: input.id } }]);
  const options: WriteCoordinatorOptions = { approval: async (preview) => {
    (preview.proposed as { body: { active: boolean } }).body.active = false;
    configure(true, ["another-write"]);
    return true;
  } };
  try {
    const writes = coordinator(fake.fetch, options);
    options.readOnly = true;
    const { preview } = await writes.run("synthetic-write", input);
    await writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm });
    expect(writes.scope.operations).toEqual(["synthetic-write"]);
    expect(Object.isFrozen(writes.scope.operations)).toBe(true);
    expect(fake.requests[0]!.body).toBe('{"active":true}');
  } finally { await fake.close(); }
});

test("a denied host approval prevents journal reservation and sends", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch, { approval: () => false });
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "APPROVAL_DENIED" } });
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(log)).toBe(false);
  } finally { await fake.close(); }
});

test("a forced read-only change during approval prevents execution", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch, { approval: () => { env.HYBRID_AXI_READ_ONLY = "1"; return true; } });
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "WRITES_DISABLED" } });
    expect(fake.requests).toHaveLength(0);
    expect(existsSync(log)).toBe(false);
  } finally { await fake.close(); }
});

test.each([
  { id: "../escape", active: true },
  { id: input.id, active: true, unknown: "ignored-option" },
])("invalid targets and payloads fail before HTTP: %j", async (payload) => {
  const fake = await fakeHttpsHybrid([]);
  try {
    await expect(coordinator(fake.fetch).run("synthetic-write", payload)).rejects.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test("an explicit HTTP denial records failure without replay", async () => {
  const fake = await fakeHttpsHybrid([{ status: 403, body: { message: syntheticKey } }]);
  try {
    const writes = coordinator(fake.fetch);
    const { preview } = await writes.run("synthetic-write", input);
    await expect(writes.run("synthetic-write", input, { execute: true, confirm: preview.confirm }))
      .rejects.toMatchObject({ error: { code: "PERMISSION_DENIED", auditId: expect.any(String) } });
    expect(fake.requests).toHaveLength(1);
    expect(records()).toMatchObject([{ kind: "intent" }, { kind: "outcome", status: 403, result: "FAILED" }]);
  } finally { await fake.close(); }
});

test("the production coordinator exposes no write operations in this slice", async () => {
  const writes = createWriteCoordinator({ config }, { env, home: directory });
  await expect(writes.run("synthetic-write", input)).rejects.toMatchObject({ error: { code: "OPERATION_BLOCKED" } });
  expect(existsSync(log)).toBe(false);
});

test("state readers cannot call a consuming write during preview", async () => {
  const fake = await fakeHttpsHybrid([]);
  try {
    const writes = coordinator(fake.fetch, {}, { ...definition, current: async (transport) => ({ state: await transport.request("synthetic-write", { pathParams: { id: input.id }, body: { active: true } }) }) });
    await expect(writes.run("synthetic-write", input)).rejects.toMatchObject({ error: { code: "OPERATION_BLOCKED" } });
    expect(fake.requests).toHaveLength(0);
  } finally { await fake.close(); }
});

test.each(["", "relative.log"])("invalid write-log overrides fail closed: %j", (override) => {
  env.HYBRID_AXI_WRITE_LOG = override;
  expect(() => coordinator(globalThis.fetch)).toThrowError(expect.objectContaining({ error: { code: "CONFIG_INVALID", operation: "writes", message: expect.any(String) } }));
});
