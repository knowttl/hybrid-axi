import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { decode } from "@toon-format/toon";
import { afterAll, beforeAll, expect, test } from "vitest";

let directory: string;
let entry: string;
let packageRoot: string;
let version: string;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "hybrid-axi-package-"));
  const pack = (cwd: string) => {
    const result = spawnSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", directory], { cwd, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout)[0] as { filename: string; version: string };
  };
  const metadata = pack(process.cwd());
  version = metadata.version;
  const tarballs = [join(directory, metadata.filename)];
  for (const dependency of ["axi-sdk-js", "@toon-format/toon", "zod"]) {
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

afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

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
  expect(decode(result.stdout)).toMatchObject({ commands: { home: "Show local profile and policy without contacting Hybrid Analysis",
    "auth status": "Verify local SecretRef availability and file protections without HTTP" } });
  expect(result.stderr).toBe("");
});

test.each([[], ["home"]])("packed home reports local setup state offline: %j", (...args) => {
  const result = cli(...args);
  expect(result.status, result.stderr).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ bin: expect.stringContaining("hybrid-axi.js"),
    setup: "required", readOnly: true, help: ["Run hybrid-axi setup", "Run hybrid-axi --help"] });
  expect(result.stderr).toBe("");
});

test.each([
  ["hash", "show", "synthetic-hash"], ["submit", "file"], ["home", "--unknown"],
  ["home", "--help", "--help"], ["home", "extra"], ["--version", "home"], ["home", "--version"],
  ["--api-key", "synthetic-secret-never-print"],
])("packed CLI rejects unsupported input without echoing values: %j", (...args) => {
  const result = cli(...args);
  expect(result.status).toBe(2);
  expect(decode(result.stdout)).toMatchObject({ code: "VALIDATION_ERROR", help: expect.arrayContaining([expect.stringContaining("Valid commands")]) });
  expect(result.stdout).not.toContain("synthetic-secret-never-print");
  expect(result.stderr).toBe("");
});

test("packed inventory enables only reviewed key reads", async () => {
  const { pathToFileURL } = await import("node:url");
  const { transportBindings } = await import(pathToFileURL(join(packageRoot, "dist/src/catalogue.js")).href);
  expect(Object.keys(transportBindings).sort()).toEqual(["key.current", "key.submission-quota"]);
  const inventory = JSON.parse(readFileSync(join(packageRoot, "inventory/capabilities.json"), "utf8"));
  expect(inventory.operations).toHaveLength(62);
  const schema = JSON.parse(readFileSync(join(packageRoot, "axi-credential.schema.json"), "utf8"));
  expect(schema).toMatchObject({ additionalProperties: false, properties: {
    origin: { const: "https://hybrid-analysis.com" },
    apiKey: { "x-secret": true, default: { env: "HYBRID_AXI_API_KEY" } },
  } });
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
