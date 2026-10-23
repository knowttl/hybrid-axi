import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync } from "node:fs";
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

test.each([["--help"], ["home", "--help"]])("packed help lists only executable scaffold commands: %j", (...args) => {
  const result = cli(...args);
  expect(result.status, result.stderr).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ commands: { home: "Show scaffold status without contacting Hybrid Analysis" } });
  expect(result.stderr).toBe("");
});

test.each([[], ["home"]])("packed home reports scaffold status offline: %j", (...args) => {
  const result = cli(...args);
  expect(result.status, result.stderr).toBe(0);
  expect(decode(result.stdout)).toMatchObject({ bin: expect.stringContaining("hybrid-axi.js"),
    status: "Scaffold only; API operations are not implemented", help: ["Run hybrid-axi --help"] });
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

test("packed inventory remains non-executable evidence", async () => {
  const { pathToFileURL } = await import("node:url");
  const { transportBindings } = await import(pathToFileURL(join(packageRoot, "dist/src/catalogue.js")).href);
  expect(transportBindings).toEqual({});
  const inventory = JSON.parse(readFileSync(join(packageRoot, "inventory/capabilities.json"), "utf8"));
  expect(inventory.operations).toHaveLength(62);
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
