import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, sep } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { credentialStore, ORIGIN } from "../src/profiles.js";
import { localCommand } from "../src/local-commands.js";
import { main } from "../src/cli.js";
import { decode } from "@toon-format/toon";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "hybrid-profiles-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function config(profiles: Record<string, unknown>, defaultProfile?: string, name = "config.json") {
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify({ version: 1, profiles, ...(defaultProfile ? { defaultProfile } : {}) }), { mode: 0o600 });
  return path;
}
const configured = { apiKey: { env: "SYNTHETIC_FILE_KEY" }, writes: { allowWrites: true, operations: ["synthetic-write"] } };

async function output(argv: string[], env: NodeJS.ProcessEnv = {}) {
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main(argv, { credentials: { env, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } } });
    return { stdout, value: decode(stdout), exitCode: process.exitCode };
  } finally { process.exitCode = exitCode; }
}

test.each([
  { args: [], source: "env" }, { args: ["home"], source: "env" }, { args: ["auth", "status"], source: "env" },
  { args: [], source: "file" }, { args: ["home"], source: "file" }, { args: ["auth", "status"], source: "file" },
])("local status output hides identifiers for $args with $source credentials", async ({ args, source }) => {
  const key = join(directory, "private-key");
  writeFileSync(key, "synthetic-file-secret", { mode: 0o600 });
  const path = config({ example: { apiKey: source === "env" ? { env: "SYNTHETIC_FILE_KEY" } : { file: key } } }, undefined, "private 'config.json");
  const result = await output([...args, ...(args[0] === "auth" ? [] : ["--offline"]), "--config", path], { SYNTHETIC_FILE_KEY: "synthetic-env-secret" });
  expect(result.exitCode ?? 0).toBe(0);
  expect(result.value).toMatchObject(args[0] === "auth" ? { source, available: true } : {
    setup: "configured", help: ["Run hybrid-axi auth status --config '<path>'", "Run hybrid-axi --help"],
  });
  for (const identifier of [directory, key, path, "SYNTHETIC_FILE_KEY", "synthetic-file-secret", "synthetic-env-secret"])
    expect(result.stdout).not.toContain(identifier);
});

test.each([[], ["home"], ["auth", "status"]])("local status help omits environment names for %j", async (...args) => {
  const result = await output([...args, "--help"]);
  expect(result.exitCode ?? 0).toBe(0);
  expect(result.value).toHaveProperty("flags.--config");
  expect(result.stdout).not.toContain("HYBRID_AXI_");
});

test.each([[], ["home"], ["auth", "status"]])("local status errors hide metadata for %j", async (...args) => {
  const key = join(directory, "private-key");
  writeFileSync(key, "synthetic-file-secret", { mode: 0o600 });
  const path = config({ example: { apiKey: { file: key } } });
  const cases = [
    { flags: ["--profile", "absent"], env: {}, code: "PROFILE_NOT_FOUND" },
    { flags: [], env: { HYBRID_AXI_READ_ONLY: "invalid" }, code: "CONFIG_INVALID" },
    { flags: [], env: { HYBRID_AXI_ORIGIN: ORIGIN }, code: "CONFIG_INVALID" },
  ];
  for (const scenario of cases) {
    const result = await output([...args, "--config", path, ...scenario.flags], scenario.env);
    expect(result.exitCode).toBe(1);
    expect(result.value).toMatchObject({ code: scenario.code });
    expect(result.stdout).not.toContain(directory);
    expect(result.stdout).not.toContain("HYBRID_AXI_");
    expect(result.stdout).not.toContain("API_KEY");
  }
  chmodSync(path, 0o666);
  const insecure = await output([...args, "--config", path]);
  expect(insecure.exitCode).toBe(1);
  expect(insecure.value).toMatchObject({ code: "CONFIG_INSECURE" });
  expect(insecure.stdout).not.toContain(directory);
});

test("auth status hides insecure secret-file paths", async () => {
  const key = join(directory, "private-key");
  writeFileSync(key, "synthetic-file-secret", { mode: 0o600 });
  chmodSync(key, 0o644);
  const path = config({ example: { apiKey: { file: key } } });
  const result = await output(["auth", "status", "--config", path]);
  expect(result.exitCode).toBe(1);
  expect(result.value).toMatchObject({ code: "CONFIG_INSECURE" });
  expect(result.stdout).not.toContain(directory);
  expect(result.stdout).not.toContain("synthetic-file-secret");
});

test("unconfigured home hides its config path in setup guidance", async () => {
  const path = config({});
  const result = await output(["home", "--config", path]);
  expect(result.exitCode ?? 0).toBe(0);
  expect(result.value).toMatchObject({ setup: "required", help: ["Run hybrid-axi setup --config '<path>'", "Run hybrid-axi --help"] });
  expect(result.stdout).not.toContain(path);
});

test.each([
  { flag: "flag", env: { HYBRID_AXI_PROFILE: "variable", HYBRID_AXI_API_KEY: "synthetic-env" }, name: "flag", source: "flag" },
  { flag: undefined, env: { HYBRID_AXI_PROFILE: "variable", HYBRID_AXI_API_KEY: "synthetic-env" }, name: "variable", source: "env" },
  { flag: undefined, env: { HYBRID_AXI_API_KEY: "synthetic-env" }, name: "env", source: "env-profile" },
  { flag: undefined, env: {}, name: "default", source: "config-default" },
])("profile precedence selects $source", ({ flag, env, name, source }) => {
  const path = config({ flag: configured, variable: configured, default: configured }, "default");
  const store = credentialStore({ env: { ...env, SYNTHETIC_FILE_KEY: "synthetic-configured" }, home: directory });
  const profile = store.select(store.load(path).config, flag);
  expect(profile).toMatchObject({ name, source, origin: ORIGIN });
  expect(store.credentials(profile)).toEqual({ apiKey: source === "env-profile" ? "synthetic-env" : "synthetic-configured" });
  expect(store.effectiveReadOnly(profile)).toBe(source === "env-profile");
});

test("sole profile defaults apiKey to the exact supported environment name", () => {
  const store = credentialStore({ env: { HYBRID_AXI_API_KEY: "synthetic-default" } });
  const selected = store.select(store.load(config({ only: {} })).config, "only");
  expect(selected.apiKey).toEqual({ env: "HYBRID_AXI_API_KEY" });
  expect(store.credentials(selected)).toEqual({ apiKey: "synthetic-default" });
  expect(credentialStore({ env: {} }).select(store.load(config({ only: {} })).config)).toMatchObject({ name: "only", source: "sole" });
});

test("config flags override environment paths and environment paths override platform defaults", () => {
  const envPath = config({ environment: {} }, undefined, "env.json");
  const flagPath = config({ flag: {} });
  const store = credentialStore({ env: { HYBRID_AXI_CONFIG: envPath }, home: directory });
  expect(Object.keys(store.load().config.profiles)).toEqual(["environment"]);
  expect(Object.keys(store.load(flagPath).config.profiles)).toEqual(["flag"]);
  expect(credentialStore({ env: {}, home: directory }).configPath()).toBe(join(directory, ".config/hybrid-axi/config.json"));
});

test.each([
  { HYBRID_AXI_ORIGIN: ORIGIN }, { HYBRID_AXI_API_KEY: "" },
  { HYBRID_AXI_API_KEY: "synthetic-env", HYBRID_AXI_ORIGIN: "https://example.invalid" },
])("incomplete or foreign env profiles fail without mixing file fields: %j", (env) => {
  const store = credentialStore({ env });
  const loaded = store.load(config({ default: configured }, "default"));
  expect(() => store.select(loaded.config)).toThrowError(expect.objectContaining({ code: "CONFIG_INVALID" }));
  expect(store.select(loaded.config, "default").apiKey).toEqual(configured.apiKey);
});

test.each([
  { profiles: {}, code: "PROFILE_REQUIRED", flag: undefined },
  { profiles: { first: {}, second: {} }, code: "PROFILE_AMBIGUOUS", flag: undefined },
  { profiles: { first: {} }, code: "PROFILE_NOT_FOUND", flag: "absent" },
])("selection reports $code", ({ profiles, code, flag }) => {
  const store = credentialStore({ env: {} });
  expect(() => store.select(store.load(config(profiles)).config, flag)).toThrowError(expect.objectContaining({ code }));
});

test.each([
  { apiKey: "synthetic-inline-secret" }, { apiKey: { stored: true } }, { apiKey: { env: "BAD-NAME" } },
  { apiKey: { env: "KEY", file: "/synthetic" } }, { apiKey: { file: "relative" } },
  { apiKey: { value: "synthetic-inline-secret" } }, { unknown: true }, { origin: "https://example.invalid" },
  { writes: { allowWrites: true, operations: [], bypass: true } },
])("invalid configuration fails closed: %j", (profile) => {
  const store = credentialStore({ env: {} });
  expect(() => store.load(config({ example: profile }))).toThrowError(expect.objectContaining({ code: "CONFIG_INVALID" }));
});

test.each(["true", "TRUE", "1", "false", "FALSE", "0", "", undefined])("read-only override honors %s", (value) => {
  const store = credentialStore({ env: { HYBRID_AXI_READ_ONLY: value } });
  const profile = store.select(store.load(config({ example: configured })).config);
  expect(store.effectiveReadOnly(profile)).toBe(["true", "TRUE", "1"].includes(value ?? ""));
});

test("invalid nonempty read-only values fail closed", () => {
  expect(() => credentialStore({ env: { HYBRID_AXI_READ_ONLY: "yes" } }).readOnly())
    .toThrowError(expect.objectContaining({ code: "CONFIG_INVALID" }));
});

test("private UTF-8 secret file removes BOM and trailing whitespace", () => {
  const key = join(directory, "key");
  writeFileSync(key, "\uFEFFsynthetic-file-key\r\n \t", { mode: 0o600 });
  const store = credentialStore({ env: {} });
  const path = config({ example: { apiKey: { file: key } } });
  expect(store.credentials(store.select(store.load(path).config))).toEqual({ apiKey: "synthetic-file-key" });
  expect(store.status(path)).toMatchObject({ source: "file", available: true, readOnly: true });
});

test("auth status reports only the secret source kind for an env ref", () => {
  const path = config({ example: configured });
  const status = credentialStore({ env: { SYNTHETIC_FILE_KEY: "synthetic-configured" }, home: directory }).status(path);
  expect(status).toEqual({ profile: "example", source: "env", available: true, origin: ORIGIN, readOnly: false });
  expect(JSON.stringify(status)).not.toContain("SYNTHETIC_FILE_KEY");
  expect(JSON.stringify(status)).not.toContain(path);
});

test("auth status reports only the secret source kind for a file ref", () => {
  const key = join(directory, "key");
  writeFileSync(key, "synthetic-file-key", { mode: 0o600 });
  const path = config({ example: { apiKey: { file: key } } });
  const status = credentialStore({ env: {}, home: directory }).status(path);
  expect(status).toEqual({ profile: "example", source: "file", available: true, origin: ORIGIN, readOnly: true });
  expect(JSON.stringify(status)).not.toContain(key);
  expect(JSON.stringify(status)).not.toContain(path);
});

test("home identifies the executable by its absolute path", () => {
  const path = config({});
  const result = localCommand(["home", "--config", path], credentialStore({ env: {}, home: directory }));
  expect(typeof result.bin).toBe("string");
  expect(isAbsolute(result.bin as string) || (result.bin as string).startsWith(`~${sep}`)).toBe(true);
  expect(result.bin).not.toContain(directory);
});

test.each(["", "\uFEFF \r\n", "synthetic\r\nheader", "synthetic;header", "synthetic=header", "synthetic\u0000key"])("invalid file credentials are refused: %j", (value) => {
  const key = join(directory, "key");
  writeFileSync(key, value, { mode: 0o600 });
  const store = credentialStore({ env: {} });
  const profile = store.select(store.load(config({ example: { apiKey: { file: key } } })).config);
  expect(() => store.credentials(profile)).toThrowError(expect.objectContaining({ code: value.trim().replace(/^\uFEFF/, "") ? "CONFIG_INVALID" : "AUTH_REQUIRED" }));
});

test("auth status rejects permissive SecretRef files", () => {
  const key = join(directory, "key");
  writeFileSync(key, "synthetic-key", { mode: 0o600 });
  chmodSync(key, 0o644);
  const path = config({ example: { apiKey: { file: key } } });
  expect(() => credentialStore({ env: {} }).status(path)).toThrowError(expect.objectContaining({ code: "CONFIG_INSECURE" }));
});

test.each(["home", "setup", "profile list"])("%s follow-up retains explicit config and profile selectors", (command) => {
  const path = config({ staging: {} }, undefined, "custom config.json");
  const store = credentialStore({ env: {} });
  const result = localCommand([...command.split(" "), "--config", path, "--profile", "staging"], store);
  expect(result.help).toContain(`Run hybrid-axi auth status --config '${path}' --profile 'staging'`);
});

test("profile list keeps the config selector when suggesting a profile placeholder", () => {
  const path = config({ staging: {} });
  const result = localCommand(["profile", "list", "--config", path], credentialStore({ env: {} }));
  expect(result.help).toEqual([`Run hybrid-axi auth status --config '${path}' --profile <name>`]);
});

test.each(["home", "auth status"])("%s missing-profile recovery lists the selected config", (command) => {
  const path = config({ staging: {} });
  expect(() => localCommand([...command.split(" "), "--config", path, "--profile", "absent"], credentialStore({ env: {} })))
    .toThrowError(expect.objectContaining({ code: "PROFILE_NOT_FOUND", suggestions: [`Run hybrid-axi profile list --config '${path}'`] }));
});

test("unconfigured home retains the config selector in setup guidance", () => {
  const path = config({});
  const result = localCommand(["home", "--config", path], credentialStore({ env: {} }));
  expect(result.help).toContain(`Run hybrid-axi setup --config '${path}'`);
});
