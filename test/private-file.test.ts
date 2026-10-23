import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { privateFiles, toolDirectory, type WindowsAcl } from "../src/private-file.js";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "hybrid-private-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

test.each(["linux", "darwin"] as const)("%s selects only absolute XDG paths", (platform) => {
  expect(toolDirectory("config", { XDG_CONFIG_HOME: "/synthetic/config" }, platform, "/synthetic/home")).toBe("/synthetic/config/hybrid-axi");
  expect(toolDirectory("state", { XDG_STATE_HOME: "relative" }, platform, "/synthetic/home")).toBe("/synthetic/home/.local/state/hybrid-axi");
});

test("Windows ignores XDG and uses separate roaming config and local state", () => {
  const env = { APPDATA: "C:\\Synthetic\\Roaming", LOCALAPPDATA: "C:\\Synthetic\\Local", XDG_CONFIG_HOME: "/ignored", XDG_STATE_HOME: "/ignored" };
  expect(toolDirectory("config", env, "win32", "C:\\Home")).toBe("C:\\Synthetic\\Roaming\\hybrid-axi");
  expect(toolDirectory("state", env, "win32", "C:\\Home")).toBe("C:\\Synthetic\\Local\\hybrid-axi");
  expect(toolDirectory("config", { APPDATA: "relative" }, "win32", "C:\\Home")).toBe("C:\\Home\\AppData\\Roaming\\hybrid-axi");
});

test("POSIX writes publish complete private files and leave no temporary file", () => {
  const path = join(directory, "nested/config.json");
  const files = privateFiles();
  files.write(path, "first");
  files.write(path, "replacement");
  expect(files.read(path, true)).toBe("replacement");
  expect(lstatSync(path).mode & 0o777).toBe(0o600);
  expect(lstatSync(dirname(path)).mode & 0o777).toBe(0o700);
  expect(readdirSync(dirname(path))).toEqual(["config.json"]);
});

test("existing private write directories are repaired to 0700", () => {
  const parent = join(directory, "existing");
  mkdirSync(parent, { mode: 0o755 });
  privateFiles().write(join(parent, "file"), "synthetic");
  expect(lstatSync(parent).mode & 0o777).toBe(0o700);
});

test.each([0o620, 0o602, 0o666])("config refuses mode %s before returning contents", (mode) => {
  const path = join(directory, "config.json");
  writeFileSync(path, "synthetic-private");
  chmodSync(path, mode);
  expect(() => privateFiles().read(path)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test("read-only private secret files are accepted while public-readable secrets are refused", () => {
  const path = join(directory, "secret");
  writeFileSync(path, "synthetic-private", { mode: 0o400 });
  expect(privateFiles().read(path, true)).toBe("synthetic-private");
  chmodSync(path, 0o644);
  expect(privateFiles().read(path)).toBe("synthetic-private");
  expect(() => privateFiles().read(path, true)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test("foreign file ownership is rejected", () => {
  const path = join(directory, "secret");
  writeFileSync(path, "synthetic-private", { mode: 0o600 });
  expect(() => privateFiles({ uid: process.getuid!() + 1 }).read(path)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test.each(["linux", "win32"] as const)("%s refuses symlinks and nonregular files", (platform) => {
  const target = join(directory, "target");
  const link = join(directory, "link");
  writeFileSync(target, "synthetic-private", { mode: 0o600 });
  symlinkSync(target, link);
  const files = privateFiles({ platform, acl: () => {} });
  expect(() => files.read(link, true)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
  expect(() => files.read(directory)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test.each([false, true])("Windows reads refuse an unprotected DACL (secret: %s)", (secret) => {
  const path = join(directory, "secret");
  writeFileSync(path, "synthetic-private");
  const acl: WindowsAcl = (_path, action) => { if (action === "verify") throw new Error("Unprotected DACL"); };
  expect(() => privateFiles({ platform: "win32", acl }).read(path, secret))
    .toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test("Windows ordinary reads refuse reparse points through the platform boundary", () => {
  const path = join(directory, "secret");
  writeFileSync(path, "synthetic-private");
  const acl: WindowsAcl = () => { throw new Error("Reparse point"); };
  expect(() => privateFiles({ platform: "win32", acl }).read(path, true))
    .toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test("Windows writes apply protected ACLs before content and retry transient publication failures", () => {
  const path = join(directory, "nested/config.json");
  const protectedPaths = new Set<string>();
  let attempts = 0;
  const waits: number[] = [];
  const files = privateFiles({ platform: "win32", acl: (file, action, isDirectory) => {
    if (action === "restrict") {
      if (!isDirectory) expect(readFileSync(file, "utf8")).toBe("");
      protectedPaths.add(file);
    }
    if (action === "verify" && !protectedPaths.has(file)) throw new Error("Unprotected ACL");
  }, rename: (source, destination) => {
    expect(protectedPaths.has(source.toString())).toBe(true);
    if (++attempts < 3) throw Object.assign(new Error("busy"), { code: "EBUSY" });
    renameSync(source, destination);
    protectedPaths.add(destination.toString());
  }, wait: (ms) => { waits.push(ms); } });
  files.write(path, "synthetic-complete");
  expect(files.read(path, true)).toBe("synthetic-complete");
  expect(protectedPaths.has(dirname(path))).toBe(true);
  expect(waits).toEqual([25, 50]);
  expect(readdirSync(dirname(path))).toEqual(["config.json"]);
});

test("failed atomic publication preserves old bytes and cleans temporary content", () => {
  const path = join(directory, "config.json");
  writeFileSync(path, "previous", { mode: 0o600 });
  const files = privateFiles({ rename: () => { throw new Error("synthetic disk failure"); } });
  expect(() => files.write(path, "replacement")).toThrow("synthetic disk failure");
  expect(readFileSync(path, "utf8")).toBe("previous");
  expect(readdirSync(directory)).toEqual(["config.json"]);
});

test("Windows ACL failure prevents publishing or retaining secret content", () => {
  const path = join(directory, "config.json");
  const files = privateFiles({ platform: "win32", acl: (_path, action, isDirectory) => {
    if (action === "restrict" && !isDirectory) throw new Error("synthetic access denied");
  } });
  expect(() => files.write(path, "synthetic-private")).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
  expect(existsSync(path)).toBe(false);
  expect(readdirSync(directory)).toEqual([]);
});
