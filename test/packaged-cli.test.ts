import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { decode } from "@toon-format/toon";
import { parse } from "smol-toml";
import { afterAll, beforeAll, expect, test } from "vitest";
import { fakeHttpsHybrid, keyBody, quotaBody, syntheticKey } from "./support/fake-hybrid.js";

let directory: string;
let entry: string;
let packageRoot: string;
let version: string;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-axi-package-"));
  const pack = (cwd: string) => {
    // Dependency contributor toolchains do not constrain consumers of their tarballs.
    const result = spawnSync("npm", ["pack", "--ignore-scripts", "--force", "--json", "--pack-destination", directory], { cwd, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout)[0] as { filename: string; version: string };
  };
  const metadata = pack(process.cwd());
  version = metadata.version;
  const tarballs = [join(directory, metadata.filename)];
  for (const dependency of ["axi-sdk-js", "@toon-format/toon", "zod", "smol-toml"]) {
    const source = join(directory, "dependencies", dependency);
    cpSync(realpathSync(resolve("node_modules", dependency)), source, { recursive: true });
    tarballs.push(join(directory, pack(source).filename));
  }
  const prefix = join(directory, "Agent's $Tools");
  const installed = spawnSync("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", prefix, ...tarballs], { encoding: "utf8" });
  expect(installed.status, installed.stderr).toBe(0);
  packageRoot = join(prefix, "node_modules/@knowttl/hybrid-axi");
  entry = join(packageRoot, "bin/hybrid-axi.js");
}, 30_000);

afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); }, 60_000);

function cli(...args: string[]) {
  return spawnSync(process.execPath, [entry, ...args], { encoding: "utf8", cwd: directory, timeout: 10_000 });
}

test("packed version aliases work without the command graph", () => {
  const graph = join(packageRoot, "dist");
  renameSync(graph, `${graph}.hidden`);
  try {
    for (const flag of ["--version", "-v", "-V"]) {
      const result = cli(flag);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe(`${version}\n`);
      expect(result.stderr).toBe("");
    }
  } finally { renameSync(`${graph}.hidden`, graph); }
});

test("packed help lists executable local commands", () => {
  const args = ["--help"];
  const result = cli(...args);
  expect(result.status, result.stderr).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ commands: { home: "Show live key level, quota and five recent public reports when configured; --offline shows local profile and policy without HTTP",
    "auth status": "Verify local SecretRef availability and file protections without HTTP" } });
  expect(result.stderr).toBe("");
});

test("installed artifact returns configured live home through the controlled HTTPS API", async () => {
  const { main } = await import(pathToFileURL(join(packageRoot, "dist/src/cli.js")).href);
  const { constructTransport } = await import(pathToFileURL(join(packageRoot, "dist/src/transport-core.js")).href);
  const { transportBindings } = await import(pathToFileURL(join(packageRoot, "dist/src/catalogue.js")).href);
  const fake = await fakeHttpsHybrid([{ body: keyBody }, { body: quotaBody }, { body: [] }]);
  let stdout = "";
  try {
    await main([], { credentials: { env: { HYBRID_AXI_API_KEY: syntheticKey }, home: directory },
      stdout: { write: (chunk: string) => { stdout += chunk; } },
      createTransport: (credential: unknown) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(decode(stdout)).toMatchObject({ status: "live", keyLevel: "restricted", feed: { count: 0, message: "0 results for feed detonation" } });
    expect(fake.requests.map(({ method, url }) => [method, url])).toEqual([
      ["GET", "/api/v2/key/current"], ["GET", "/api/v2/key/submission-quota"], ["GET", "/api/v2/feed/detonation"],
    ]);
    expect(stdout).not.toContain(syntheticKey);
  } finally { await fake.close(); }
});

test("published guidance and per-command help disclose the quick-scan transmission exception", () => {
  // These are shipped documentation contracts, not evidence of gate implementation.
  for (const path of ["README.md", "docs/commands.md", "skills/hybrid-axi/SKILL.md"]) {
    const document = readFileSync(join(packageRoot, path), "utf8");
    expect(document).toMatch(/quick.scan[\s\S]*transmit[\s\S]*(without write gates|without those write gates|even under read-only policy)/i);
  }
  for (const type of ["file", "url"]) {
    const result = cli("quick-scan", type, "--help");
    expect(result.status).toBe(0);
    expect(decode(result.stdout)).toMatchObject({ effect: "read", description: expect.stringMatching(/without a write gate/i) });
    expect(decode(result.stdout)).not.toHaveProperty("flags.--execute");
  }
  const guarded = decode(cli("submit", "url", "--help").stdout);
  expect(guarded).toMatchObject({ effect: "write", flags: { "--execute": expect.any(String), "--confirm": expect.any(String) } });
});

test.each([[], ["home"]])("packed home reports local setup state offline: %j", (...args) => {
  const result = cli(...args);
  expect(result.status, result.stderr).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ bin: entry.startsWith(`${homedir()}${sep}`) ? `~${entry.slice(homedir().length)}` : entry,
    setup: "required", readOnly: true, help: ["Run hybrid-axi setup", "Run hybrid-axi --help"] });
  expect(result.stderr).toBe("");
});

test("packed identity follows relocation and collapses only the home directory boundary", () => {
  const original = resolve(packageRoot, "../../..");
  const moved = join(directory, "Relocated Tools");
  renameSync(original, moved);
  const originalEntry = entry;
  entry = join(moved, "node_modules/@knowttl/hybrid-axi/bin/hybrid-axi.js");
  try {
    const result = cli("home", "--offline");
    const expected = entry.startsWith(`${homedir()}${sep}`) ? `~${entry.slice(homedir().length)}` : entry;
    expect(result.status, result.stderr).toBe(0);
    expect(decode(result.stdout)).toMatchObject({ bin: expected });
    const siblingHome = moved.slice(0, -1);
    const sibling = spawnSync(process.execPath, [entry, "home", "--offline"], {
      encoding: "utf8", cwd: directory, env: hookEnvironment(siblingHome),
    });
    expect(sibling.status, sibling.stderr).toBe(0);
    expect(decode(sibling.stdout)).toMatchObject({ bin: entry });
    const inside = spawnSync(process.execPath, [entry, "home", "--offline"], {
      encoding: "utf8", cwd: directory, env: hookEnvironment(moved),
    });
    expect(decode(inside.stdout)).toMatchObject({ bin: `~${entry.slice(moved.length)}` });
  } finally { entry = originalEntry; renameSync(moved, original); }
});

test.each([[], ["home"], ["quota"], ["hash", "search"], ["report", "state"], ["submit", "url"], ["setup", "hooks"]])(
  "packed unknown flags name the rejected flag before credentials: %j", (...args) => {
    const result = cli(...args, "--axi-review-unknown");
    expect(result.status).toBe(2);
    expect(decode(result.stdout)).toMatchObject({ code: "VALIDATION_ERROR", error: expect.stringContaining("--axi-review-unknown"),
      help: expect.arrayContaining([expect.stringMatching(/valid flags/i)]) });
    expect(result.stderr).toBe("");
  });

test.each([
  ["hash", "show", "synthetic-hash"], ["submit", "file"], ["home", "--unknown"],
  ["home", "--help", "--help"], ["home", "extra"], ["--version", "home"], ["home", "--version"],
  ["--api-key", "synthetic-secret-never-print"],
])("packed CLI rejects unsupported input without echoing values: %j", (...args) => {
  const result = cli(...args);
  expect(result.status).toBe(2);
  expect(decode(result.stdout)).toMatchObject({ code: "VALIDATION_ERROR", help: expect.arrayContaining([expect.stringMatching(/Valid (commands|flags)/)]) });
  expect(result.stdout).not.toContain("synthetic-secret-never-print");
  expect(result.stderr).toBe("");
});

test("packed inventory enables only reviewed operations", async () => {
  const { pathToFileURL } = await import("node:url");
  const { transportBindings } = await import(pathToFileURL(join(packageRoot, "dist/src/catalogue.js")).href);
  expect(Object.keys(transportBindings).sort()).toEqual([
    "convertQuickScan", "feed abuse", "feed detonation", "feed latest", "feed quick-scan",
    "hash-download-bin", "hashOverview", "hashSearch", "hashesSearch", "huntingMatches", "key.current", "key.submission-quota", "labsOverview", "queryResults", "queryRun",
    "quickScanFile", "quickScanShow", "quickScanState", "quickScanUrl",
    "report artifact crt", "report artifact html", "report artifact json", "report artifact maec", "report artifact memory-strings",
    "report artifact misp", "report artifact misp-json", "report artifact openioc", "report artifact pcap", "report artifact pdf", "report artifact stix", "report artifact xml",
    "report children", "report memory hex", "report memory list", "report memory strings", "report screenshots", "report show", "report state",
    "report-download-bin", "report-download-dropped-files", "report-download-memory",
    "submitDroppedFile", "submitFile", "submitUrl",
    "system action-scripts", "system configuration", "system environments", "system queue-size", "system stats", "system total-submissions", "system version", "termsSearch",
    "yaraCreate", "yaraDelete", "yaraList", "yaraShow", "yaraUpdate",
  ]);
  const inventory = JSON.parse(readFileSync(join(packageRoot, "inventory/capabilities.json"), "utf8"));
  expect(inventory.operations).toHaveLength(62);
  const schema = JSON.parse(readFileSync(join(packageRoot, "axi-credential.schema.json"), "utf8"));
  expect(schema).toMatchObject({ additionalProperties: false, properties: {
    origin: { const: "https://hybrid-analysis.com" },
    apiKey: { "x-secret": true, default: { env: "HYBRID_AXI_API_KEY" } },
  } });
  expect(readFileSync(join(packageRoot, "skills/hybrid-axi/SKILL.md"), "utf8")).toContain("name: hybrid-axi");
  expect(readFileSync(join(packageRoot, "docs/commands.md"), "utf8")).toContain("# Command reference");
});

function hookEnvironment(home: string): NodeJS.ProcessEnv {
  return { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: join(home, ".codex"),
    CLAUDE_CONFIG_DIR: join(home, ".claude"), XDG_CONFIG_HOME: join(home, ".config"),
    HYBRID_AXI_CONFIG: undefined, HYBRID_AXI_API_KEY: undefined };
}

test.each(["user", "project"])("packed opt-in %s hooks preserve settings and provide local context", async (scope) => {
  const home = mkdtempSync(join(directory, "hooks-"));
  const project = join(home, "project");
  mkdirSync(project);
  const env = hookEnvironment(home);
  const run = (...args: string[]) => spawnSync(process.execPath, [entry, ...args], { cwd: project, env, encoding: "utf8" });
  for (const args of [[], ["setup"], ["setup", "hooks", "--help"]]) expect(run(...args).status).toBe(0);
  expect(existsSync(join(home, ".claude"))).toBe(false);
  expect(existsSync(join(home, ".codex"))).toBe(false);
  expect(existsSync(join(project, ".opencode"))).toBe(false);
  const root = scope === "project" ? project : home;
  mkdirSync(join(root, ".claude"), { recursive: true });
  mkdirSync(join(home, ".codex"), { recursive: true });
  const claudePath = join(root, ".claude/settings.json");
  const codexPath = join(root, ".codex/hooks.json");
  const configPath = join(home, ".codex/config.toml");
  writeFileSync(claudePath, JSON.stringify({ custom: true, hooks: { SessionStart: [{ hooks: [{ type: "command", command: "unrelated-tool" }] }] } }));
  writeFileSync(configPath, 'model = "example"\n[features]\nhooks = false\n');
  const result = run("setup", "hooks", "--scope", scope);
  expect(result.status, result.stderr + result.stdout).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ hooks: { status: "installed", scope } });
  const claude = JSON.parse(readFileSync(claudePath, "utf8"));
  expect(claude.custom).toBe(true);
  expect(claude.hooks.SessionStart[0].hooks[0].command).toBe("unrelated-tool");
  const codex = JSON.parse(readFileSync(codexPath, "utf8"));
  expect(codex.hooks.SessionStart).toHaveLength(1);
  expect(parse(readFileSync(configPath, "utf8"))).toMatchObject({ model: "example", features: { hooks: true } });
  const hookEntry = join(packageRoot, "bin/hybrid-axi-hook.js");
  if (process.platform !== "win32") expect(codex.hooks.SessionStart[0].hooks[0].command).toBe(`'${hookEntry.replaceAll("'", "'\\''")}'`);
  const context = spawnSync(process.execPath, [hookEntry], { cwd: project, env, encoding: "utf8" });
  expect(context.status, context.stderr).toBe(0);
  expect(decode(context.stdout)).toMatchObject({ setup: "required", readOnly: true });
  const pluginPath = scope === "project" ? join(project, ".opencode/plugins/axi-hybrid-axi-hook.js")
    : join(home, ".config/opencode/plugins/axi-hybrid-axi-hook.js");
  const { default: plugin } = await import(pathToFileURL(pluginPath).href);
  const hooks = await plugin.server({ directory: project });
  const output = { system: [] as string[] };
  await hooks["experimental.chat.system.transform"]({ sessionID: "synthetic-session" }, output);
  expect(decode(output.system[0]!)).toMatchObject({ readOnly: true });
  const files = [claudePath, codexPath, configPath, pluginPath];
  const before = files.map((path) => ({ text: readFileSync(path, "utf8"), modified: statSync(path).mtimeMs }));
  expect(run("setup", "hooks", "--scope", scope).status).toBe(0);
  expect(files.map((path) => ({ text: readFileSync(path, "utf8"), modified: statSync(path).mtimeMs }))).toEqual(before);
});

test("packed hook setup repairs stale paths and respects the first executable on PATH", () => {
  if (process.platform === "win32") return;
  const home = mkdtempSync(join(directory, "hook-path-"));
  const env = hookEnvironment(home);
  const pathBin = join(home, "bin");
  mkdirSync(pathBin);
  const shim = join(pathBin, "hybrid-axi-hook");
  symlinkSync(join(packageRoot, "bin/hybrid-axi-hook.js"), shim);
  env.PATH = `${pathBin}:${process.env.PATH}`;
  const run = () => spawnSync(process.execPath, [entry, "setup", "hooks"], { env, cwd: home, encoding: "utf8" });
  expect(run().status).toBe(0);
  const settings = join(home, ".claude/settings.json");
  const command = () => JSON.parse(readFileSync(settings, "utf8")).hooks.SessionStart[0].hooks[0].command;
  expect(command()).toBe("hybrid-axi-hook");
  rmSync(shim);
  writeFileSync(shim, "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  expect(run().status).toBe(0);
  expect(command()).toBe(`'${join(packageRoot, "bin/hybrid-axi-hook.js").replaceAll("'", "'\\''")}'`);
  expect(JSON.parse(readFileSync(settings, "utf8")).hooks.SessionStart).toHaveLength(1);
});

test("packed hook setup reports configuration failures without exposing their contents", () => {
  const home = mkdtempSync(join(directory, "hook-error-"));
  mkdirSync(join(home, ".codex"));
  writeFileSync(join(home, ".codex/config.toml"), 'secret = "synthetic-do-not-print"\nfeatures = false\n');
  const result = spawnSync(process.execPath, [entry, "setup", "hooks"], { env: hookEnvironment(home), cwd: home, encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(decode(result.stdout)).toMatchObject({ code: "HOOK_INSTALL_FAILED" });
  expect(result.stdout + result.stderr).not.toContain("synthetic-do-not-print");
});

test("packed guarded journeys preview without sends and reject default read-only execution", () => {
  const home = mkdtempSync(join(directory, "guarded-"));
  const config = join(home, "profile.json");
  const env = { ...hookEnvironment(home), HYBRID_AXI_CONFIG: config, HYBRID_AXI_API_KEY: "synthetic-preview-key",
    HYBRID_AXI_PROFILE: "example", XDG_STATE_HOME: join(home, "state") };
  const run = (...args: string[]) => spawnSync(process.execPath, [entry, ...args], { env, cwd: home, encoding: "utf8" });
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { writes: { allowWrites: false, operations: [] } } } }), { mode: 0o600 });
  expect(decode(run("hunting", "matches").stdout)).toMatchObject({ error: { code: "WRITES_DISABLED" } });
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { writes: { allowWrites: true,
    operations: ["huntingMatches", "submitUrl", "hash-download-bin"] } } } }));
  for (const args of [["hunting", "matches"], ["submit", "url", "--url", "https://example.com", "--environment-id", "160"],
    ["hash", "file", "a".repeat(64), "--output", join(home, "sample.gz")]]) {
    const result = run(...args);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(decode(result.stdout)).toMatchObject({ kind: "dry-run", preview: { confirm: expect.any(String) } });
    const denied = run(...args, "--execute", "--confirm", "wrong-confirmation");
    expect(denied.status).toBe(1);
    expect(decode(denied.stdout)).toMatchObject({ error: { code: "CONFIRM_MISMATCH" } });
  }
  expect(existsSync(join(home, "sample.gz"))).toBe(false);
  expect(existsSync(join(home, "state/hybrid-axi/writes.log"))).toBe(false);
});

test("packed local setup, help and paths work without credentials or network", () => {
  expect(decode(cli("setup").stdout)).toMatchObject({ template: { version: 1, profiles: { example: {
    apiKey: { env: "HYBRID_AXI_API_KEY" }, writes: { allowWrites: false, operations: [] },
  } } } });
  expect(decode(cli("config", "path").stdout)).toMatchObject({ config: expect.stringContaining("hybrid-axi/config.json"), state: expect.stringContaining("hybrid-axi") });
  const result = cli("auth", "status", "--config", join(directory, "missing"), "--help");
  expect(result.status).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ command: "auth status" });
  expect(result.stderr).toBe("");
});

test.each(["doctor", "quota"])("packed %s help is available without credentials or HTTP", (command) => {
  const result = cli(command, "--help");
  expect(result.status).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ command, flags: { "--profile": expect.any(String), "--config": expect.any(String) } });
  expect(result.stderr).toBe("");
});

test("packed quota cannot reach a real upstream with a synthetic environment key", () => {
  const result = spawnSync(process.execPath, [entry, "quota"], { cwd: directory, encoding: "utf8",
    env: { ...process.env, HYBRID_AXI_API_KEY: "synthetic-packed-network-key" } });
  expect(result.status).toBe(1);
  expect(decode(result.stdout)).toMatchObject({ error: { code: "NETWORK_ERROR", operation: "key.current" } });
  expect(result.stdout + result.stderr).not.toContain("synthetic-packed-network-key");
  expect(result.stderr).toBe("");
});

test("packed auth status resolves a synthetic private file and never prints its value", () => {
  const key = join(directory, "synthetic-key");
  const config = join(directory, "synthetic-config.json");
  writeFileSync(key, "\uFEFFsynthetic-packed-file-key\r\n", { mode: 0o600 });
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { file: key } } } }), { mode: 0o600 });
  const result = cli("auth", "status", "--config", config);
  expect(result.status).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ profile: "example", source: "file", available: true, readOnly: true });
  expect(result.stdout).not.toContain("synthetic-packed-file-key");
  expect(result.stdout).not.toContain(key);
  expect(result.stdout).not.toContain(config);
  expect(result.stderr).toBe("");
});

test.each(["--api-key", "--key", "--header", "--token"])("packed CLI refuses credential argv %s before reading configuration", (flag) => {
  const result = cli("auth", "status", "--config", join(directory, "missing"), flag, "synthetic-argv-key");
  expect(result.status).toBe(2);
  expect(decode(result.stdout)).toMatchObject({ code: "VALIDATION_ERROR" });
  expect(result.stdout).not.toContain("synthetic-argv-key");
  expect(result.stderr).toBe("");
});

test("packed stdout and error channels scrub raw, escaped and encoded environment keys", () => {
  const secret = 'synthetic/"packed\\key?';
  const forms = [secret, JSON.stringify(secret).slice(1, -1), encodeURIComponent(secret)];
  const result = spawnSync(process.execPath, [entry, "config", "path", "--config", join(directory, forms.join("-"))], {
    cwd: directory, encoding: "utf8", env: { ...process.env, HYBRID_AXI_API_KEY: secret },
  });
  expect(result.status).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ config: expect.stringContaining("***redacted***") });
  for (const form of forms) expect(result.stdout + result.stderr).not.toContain(form);
  const invalid = spawnSync(process.execPath, [entry, "auth", "status"], {
    cwd: directory, encoding: "utf8", env: { ...process.env, HYBRID_AXI_API_KEY: "synthetic\r\ninvalid-key" },
  });
  expect(invalid.status).toBe(1);
  expect(decode(invalid.stdout)).toMatchObject({ code: "CONFIG_INVALID" });
  expect(invalid.stdout + invalid.stderr).not.toContain("synthetic");
  expect(invalid.stderr).toBe("");
});

test("version startup stays close to the same-machine Node floor", () => {
  const floor: number[] = [], times: number[] = [];
  for (let index = 0; index < 7; index++) {
    let start = performance.now();
    expect(spawnSync(process.execPath, ["-e", "console.log(1)"], { encoding: "utf8" }).status).toBe(0);
    floor.push(performance.now() - start);
    start = performance.now();
    expect(cli("--version").stdout).toBe(`${version}\n`);
    times.push(performance.now() - start);
  }
  const median = (values: number[]) => values.sort((a, b) => a - b)[3]!;
  expect(median(times) / median(floor)).toBeLessThan(4);
});
