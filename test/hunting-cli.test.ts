import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { decode } from "@toon-format/toon";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { main } from "../src/cli.js";
import { mutationOperations, transportBindings } from "../src/catalogue.js";
import { constructTransport } from "../src/transport-core.js";
import { constructWriteCoordinator } from "../src/writes-core.js";
import { fakeHttpsHybrid, fakeTransport, syntheticKey, type Reply } from "./support/fake-hybrid.js";

let directory: string, config: string, bodyFile: string, env: NodeJS.ProcessEnv;
const rule = { id: "rule-1", identifier: "synthetic-rule", active: true };
const createBody = { identifier: "synthetic-rule", threat_categories: ["trojan"], rule: "rule synthetic { condition: false }" };
const createArgs = () => ["hunting", "yara", "create", "--body-file", bodyFile];
const updateArgs = () => ["hunting", "yara", "update", "rule-1", "--body-file", bodyFile];
const matchArgs = ["hunting", "matches", "--items-count", "20", "--search-after", "2026-01-01T00:00:00Z"];

test("YARA validation refusal exposes bounded redacted field diagnostics", async () => {
  const body = { ...createBody, threat_categories: [], active: false, daily_notifications_limit: 0 };
  writeFileSync(bodyFile, JSON.stringify(body));
  await withFake([{ status: 400, body: { message: "Input data validation has failed", validation_errors: {
    threat_categories: ["Choose a category"], rule: [`Invalid ${syntheticKey}`], token: "synthetic-token", detail: "x".repeat(5000),
  } } }], async (fake) => {
    const confirm = confirmation(await invoke(createArgs(), fake.fetch));
    const result = await invoke([...createArgs(), "--execute", "--confirm", confirm], fake.fetch);
    expect(result.code).toBe(1);
    expect(result.output).toMatchObject({ error: { code: "UPSTREAM_ERROR", status: 400,
      validation_errors: { threat_categories: ["Choose a category"], rule: ["Invalid ***redacted***"], token: "***redacted***", detail: "x".repeat(1000) } } });
    expect(result.stdout).not.toContain(syntheticKey);
    expect(result.stdout).not.toContain("synthetic-token");
    expect(JSON.parse(fake.requests[0]!.body)).toEqual(body);
    expect(fake.requests).toHaveLength(1);
  });
});
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-hunting-"));
  config = join(directory, "config.json");
  bodyFile = join(directory, "rule.json");
  env = { SYNTHETIC_KEY: syntheticKey, XDG_STATE_HOME: join(directory, "state") };
  configure(true);
  writeFileSync(bodyFile, JSON.stringify(createBody));
});
afterEach(() => { vi.useRealTimers(); rmSync(directory, { recursive: true, force: true }); });
function configure(allowWrites: boolean, operations = Object.keys(mutationOperations)) {
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: {
    apiKey: { env: "SYNTHETIC_KEY" }, writes: { allowWrites, operations },
  } } }), { mode: 0o600 });
}
async function invoke(argv: string[], fetch: typeof globalThis.fetch) {
  let stdout = "";
  const previous = process.exitCode;
  process.exitCode = 0;
  const credentials = { env, home: directory };
  try {
    await main(["--config", config, "--profile", "example", ...argv], {
      credentials, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch }),
      createWriteCoordinator: (options) => constructWriteCoordinator(options ?? {}, {
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

test("rule filters use the pinned Labs query and preserve future fields after redaction", async () => {
  await withFake([{ body: [{ ...rule, future: { useful: 7, token: syntheticKey } }] }], async (fake) => {
    const result = await invoke(["hunting", "yara", "list", "--search", "synthetic", "--threat-category", "trojan,virus", "--status", "active", "--full"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ experimental: true, count: 1, complete: true, rules: [{ ...rule, future: { useful: 7, token: "***redacted***" } }] });
    const url = new URL(fake.requests[0]!.url, "https://example.com");
    expect(url.pathname).toBe("/api/labs/hunting/yara-rules");
    expect(url.searchParams.getAll("threat_category")).toEqual(["trojan", "virus"]);
    expect(url.searchParams.get("status")).toBe("active");
    expect(url.searchParams.get("search")).toBe("synthetic");
    expect(result.stdout).not.toContain(syntheticKey);
  });
});
test("show selects unknown fields and previews long rule text", async () => {
  await withFake([{ body: { ...rule, future: 8, rule: "x".repeat(1500) } }], async (fake) => {
    const result = await invoke(["hunting", "yara", "show", "rule-1", "--fields", "future,rule"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ rule: { future: 8, rule: expect.stringContaining("1500 chars total") }, help: expect.any(Array) });
    expect(fake.requests[0]).toMatchObject({ method: "GET", url: "/api/labs/hunting/yara-rules/rule-1" });
  });
});
test("an empty rule list is explicit", async () => {
  await withFake([{ body: [] }], async (fake) => {
    expect((await invoke(["hunting", "yara", "list"], fake.fetch)).output).toMatchObject({ count: 0, message: "0 YARA rules found" });
  });
});
test.each([
  { reply: { status: 403, body: { message: "Denied" } }, code: "PERMISSION_DENIED" },
  { reply: { body: {} }, code: "MALFORMED_RESPONSE" },
])("rule failures never become empty lists: $code", async ({ reply, code }) => {
  await withFake([reply], async (fake) => {
    const result = await invoke(["hunting", "yara", "list"], fake.fetch);
    expect(result.code).toBe(1);
    expect(result.output).toMatchObject({ error: { code } });
    expect(result.output).not.toHaveProperty("rules");
  });
});
test("create previews without HTTP then sends the exact confirmed JSON once", async () => {
  await withFake([{ body: { ...rule, future: "kept" } }], async (fake) => {
    const preview = await invoke(createArgs(), fake.fetch);
    expect(preview.output).toMatchObject({ experimental: true, kind: "dry-run", preview: { target: { identifier: createBody.identifier }, proposed: { body: createBody } } });
    expect(fake.requests).toHaveLength(0);
    const result = await invoke([...createArgs(), "--execute", "--confirm", confirmation(preview), "--full"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ kind: "success", response: { ...rule, future: "kept" } });
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ method: "POST", url: "/api/labs/hunting/yara-rules" });
    expect(JSON.parse(fake.requests[0]!.body)).toEqual(createBody);
    expect(readFileSync(join(directory, "state/hybrid-axi/writes.log"), "utf8")).not.toContain(createBody.rule);
  });
});
test.each([
  { verb: "create", args: createArgs, replies: [{ body: rule }], methods: ["POST"] },
  { verb: "update", args: updateArgs, replies: [{ body: rule }, { body: rule }, { body: rule }, { body: rule }], methods: ["GET", "GET", "GET", "POST"] },
])("$verb accepts a 25-character identifier through confirmed execution", async ({ args, replies, methods }) => {
  const body = { ...createBody, identifier: "a".repeat(25) };
  writeFileSync(bodyFile, JSON.stringify(body));
  await withFake(replies, async (fake) => {
    const preview = await invoke(args(), fake.fetch);
    expect(preview.code).toBe(0);
    expect(preview.output).toMatchObject({ kind: "dry-run", preview: { proposed: { body } } });
    const result = await invoke([...args(), "--execute", "--confirm", confirmation(preview)], fake.fetch);
    expect(result.code).toBe(0);
    expect(fake.requests.map((request) => request.method)).toEqual(methods);
    expect(JSON.parse(fake.requests.at(-1)!.body)).toEqual(body);
  });
});
test.each([
  { verb: "create", args: createArgs, flags: [] },
  { verb: "create", args: createArgs, flags: ["--execute", "--confirm", "unused"] },
  { verb: "update", args: updateArgs, flags: [] },
  { verb: "update", args: updateArgs, flags: ["--execute", "--confirm", "unused"] },
])("$verb refuses a 26-character identifier before preview or send with $flags", async ({ args, flags }) => {
  writeFileSync(bodyFile, JSON.stringify({ ...createBody, identifier: "a".repeat(26) }));
  await withFake([], async (fake) => {
    const result = await invoke([...args(), ...flags], fake.fetch);
    expect(result.code).toBe(2);
    expect(result.output).toMatchObject({ code: "VALIDATION_ERROR", error: expect.stringContaining("identifier must be at most 25 characters") });
    expect(result.output).not.toHaveProperty("preview");
    expect(fake.requests).toHaveLength(0);
  });
});
test("partial update previews reset and posts only supplied fields", async () => {
  const body = { reset_counter: true, active: false };
  writeFileSync(bodyFile, JSON.stringify(body));
  await withFake([{ body: rule }, { body: rule }, { body: rule }, { body: { ...rule, active: false } }], async (fake) => {
    const preview = await invoke(updateArgs(), fake.fetch);
    expect(preview.output).toMatchObject({ preview: { target: { id: "rule-1", reset_counter: true }, proposed: { body }, effect: expect.stringContaining("all-time matches counter") } });
    expect(fake.requests).toHaveLength(1);
    expect((await invoke([...updateArgs(), "--execute", "--confirm", confirmation(preview)], fake.fetch)).code).toBe(0);
    expect(fake.requests).toHaveLength(4);
    expect(fake.requests[3]).toMatchObject({ method: "POST", url: "/api/labs/hunting/yara-rules/rule-1" });
    expect(JSON.parse(fake.requests[3]!.body)).toEqual(body);
  });
});
test("delete accepts an empty 204 as a journaled success", async () => {
  await withFake([{ body: rule }, { body: rule }, { body: rule }, { status: 204 }], async (fake) => {
    const argv = ["hunting", "yara", "delete", "rule-1"];
    const confirm = confirmation(await invoke(argv, fake.fetch));
    expect(fake.requests).toHaveLength(1);
    const result = await invoke([...argv, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ status: 204, kind: "success", response: null });
    expect(fake.requests).toHaveLength(4);
    expect(fake.requests[3]).toMatchObject({ method: "DELETE", url: "/api/labs/hunting/yara-rules/rule-1", body: "" });
  });
});
test.each([{ reset_counter: true }, { active: false }])("update reports replacement identity independently of field selection: %j", async (body) => {
  writeFileSync(bodyFile, JSON.stringify(body));
  await withFake([{ body: rule }, { body: rule }, { body: rule }, { body: { ...rule, id: "rule-2" } }], async (fake) => {
    const confirm = confirmation(await invoke(updateArgs(), fake.fetch));
    const result = await invoke([...updateArgs(), "--execute", "--confirm", confirm, "--fields", "identifier"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ idChange: { previousId: "rule-1", newId: "rule-2" } });
    const records = readFileSync(join(directory, "state/hybrid-axi/writes.log"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(records.at(-1)).toMatchObject({ kind: "outcome", result: "SUCCESS", idChange: { previousId: "rule-1", newId: "rule-2" } });
  });
});
test("default consumption preview discloses account-wide irreversible scope without HTTP", async () => {
  await withFake([], async (fake) => {
    const result = await invoke(["hunting", "matches"], fake.fetch);
    expect(result.output).toMatchObject({ preview: { effect: expect.stringContaining("account-wide"), warnings: [expect.stringContaining("irreversible")] } });
    expect(fake.requests).toHaveLength(0);
  });
});
test("matches preview names consuming scope without HTTP then consumes once", async () => {
  const match = { id: "match-1", rule_id: "rule-1", sample_sha256: "a".repeat(64), match_date: "2026-01-02T00:00:00Z", future: 9 };
  await withFake([{ body: [match] }], async (fake) => {
    const preview = await invoke(matchArgs, fake.fetch);
    expect(preview.output).toMatchObject({ experimental: true, preview: { target: { owner: "current-user", items_count: 20, search_after: "2026-01-01T00:00:00Z" }, effect: expect.stringContaining("marked delivered") } });
    expect(fake.requests).toHaveLength(0);
    const result = await invoke([...matchArgs, "--execute", "--confirm", confirmation(preview), "--full"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ response: [match] });
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({ method: "GET", url: "/api/labs/hunting/matches/recent?items_count=20&search_after=2026-01-01T00%3A00%3A00Z" });
  });
});
test.each(["id", "payload", "count", "timestamp"])("changed %s invalidates exact confirmation without sending", async (change) => {
  await withFake(change === "id" ? [{ body: rule }, { body: { ...rule, id: "rule-2" } }] : [], async (fake) => {
    const argv = change === "id" ? ["hunting", "yara", "delete", "rule-1"] : ["count", "timestamp"].includes(change) ? [...matchArgs] : createArgs();
    const confirm = confirmation(await invoke(argv, fake.fetch));
    if (change === "id") argv[3] = "rule-2";
    if (change === "payload") writeFileSync(bodyFile, JSON.stringify({ ...createBody, active: false }));
    if (change === "count") argv[3] = "21";
    if (change === "timestamp") argv[5] = "2026-02-01T00:00:00Z";
    const result = await invoke([...argv, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.code).not.toBe(0);
    expect(result.output).toMatchObject({ error: { code: "CONFIRM_MISMATCH" } });
    expect(fake.requests.every((request) => request.method === "GET" && request.url.startsWith("/api/labs/hunting/yara-rules/"))).toBe(true);
  });
});
test("changed YARA state aborts deletion before its write and records NOT_SENT", async () => {
  await withFake([{ body: rule }, { body: rule }, { body: { ...rule, active: false } }], async (fake) => {
    const argv = ["hunting", "yara", "delete", "rule-1"];
    const confirm = confirmation(await invoke(argv, fake.fetch));
    const result = await invoke([...argv, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.output).toMatchObject({ error: { code: "PREVIEW_CHANGED" } });
    expect(fake.requests.map((request) => request.method)).toEqual(["GET", "GET", "GET"]);
    expect(readFileSync(join(directory, "state/hybrid-axi/writes.log"), "utf8")).toContain('"result":"NOT_SENT"');
  });
});
test("stdin JSON produces a guarded preview without a key file or request", () => {
  const result = spawnSync(process.execPath, ["bin/hybrid-axi.js", "--config", config, "--profile", "example", "hunting", "yara", "create", "--body-file", "-"], {
    env: { ...process.env, ...env }, input: JSON.stringify(createBody), encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ kind: "dry-run", preview: { proposed: { body: createBody } } });
  expect(result.stderr).toBe("");
});
test("a corrupt journal prevents confirmed consumption", async () => {
  await withFake([], async (fake) => {
    const confirm = confirmation(await invoke(matchArgs, fake.fetch));
    env.HYBRID_AXI_WRITE_LOG = bodyFile;
    const result = await invoke([...matchArgs, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.output).toMatchObject({ error: { code: "INTENT_NOT_RECORDED" } });
    expect(fake.requests).toHaveLength(0);
  });
});
test.each(["default", "forced", "scope", "missing-confirm", "wrong-confirm"])("%s guard prevents consumption", async (guard) => {
  if (guard === "default") configure(false);
  if (guard === "forced") env.HYBRID_AXI_READ_ONLY = "true";
  if (guard === "scope") configure(true, ["yaraCreate"]);
  await withFake([], async (fake) => {
    const argv = [...matchArgs, "--execute", ...(guard === "wrong-confirm" ? ["--confirm", "wrong"] : [])];
    const result = await invoke(argv, fake.fetch);
    expect(result.code).toBe(1);
    expect(fake.requests).toHaveLength(0);
  });
});
test.each([429, 503])("consumption never retries explicit %i", async (status) => {
  await withFake([{ status, body: { message: "Try later" } }], async (fake) => {
    const confirm = confirmation(await invoke(matchArgs, fake.fetch));
    const result = await invoke([...matchArgs, "--execute", "--confirm", confirm], fake.fetch);
    expect(result.code).toBe(1);
    expect(fake.requests).toHaveLength(1);
  });
});
test("ambiguous consumption sends once and reserves its intent against replay", async () => {
  vi.useFakeTimers();
  const fake = fakeTransport(["hang"], { credential: { apiKey: syntheticKey, redact: (value) => value } });
  const confirm = confirmation(await invoke(matchArgs, fake.fetch));
  const argv = [...matchArgs, "--execute", "--confirm", confirm, "--intent-id", "synthetic-consumption"];
  const pending = invoke(argv, fake.fetch);
  await vi.advanceTimersByTimeAsync(20_000);
  expect((await pending).output).toMatchObject({ error: { code: "OUTCOME_UNKNOWN" } });
  expect((await invoke(argv, fake.fetch)).output).toMatchObject({ error: { code: "ALREADY_EXECUTED" } });
  expect(fake.requests).toHaveLength(1);
});
test.each([
  ["hunting", "matches", "--items-count", "1001"],
  ["hunting", "matches", "--search-after", "yesterday"],
  ["hunting", "matches", "--execute", "--dry-run"],
  ["hunting", "yara", "show", "../rule"],
  ["hunting", "yara", "list", "--status", "unknown"],
  ["hunting", "yara", "list", "--typo"],
])("invalid hunting input sends nothing: %j", async (...argv) => {
  await withFake([], async (fake) => {
    expect((await invoke(argv, fake.fetch)).code).toBe(2);
    expect(fake.requests).toHaveLength(0);
  });
});
test.each([{}, { unknown: true }, { reset_counter: "true" }])("invalid partial update body sends nothing: %j", async (body) => {
  writeFileSync(bodyFile, JSON.stringify(body));
  await withFake([], async (fake) => {
    expect((await invoke(updateArgs(), fake.fetch)).code).toBe(2);
    expect(fake.requests).toHaveLength(0);
  });
});
test.each(["list", "show", "create", "update", "delete", "matches"])("%s help marks Labs experimental without credentials", async (verb) => {
  rmSync(config);
  await withFake([], async (fake) => {
    const argv = verb === "matches" ? ["hunting", verb] : ["hunting", "yara", verb];
    const result = await invoke([...argv, "--help"], fake.fetch);
    expect(result.code).toBe(0);
    expect(result.output).toMatchObject({ experimental: true, description: expect.stringContaining("Experimental Labs") });
    expect(fake.requests).toHaveLength(0);
  });
});
