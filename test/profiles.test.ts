import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { credentialStore, ORIGIN } from "../src/profiles.js";
import { localCommand } from "../src/local-commands.js";

let directory: string;
beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "hybrid-profiles-")); });
afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

function config(profiles: Record<string, unknown>, defaultProfile?: string, name = "config.json") {
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify({ version: 1, profiles, ...(defaultProfile ? { defaultProfile } : {}) }), { mode: 0o600 });
  return path;
}
const configured = { apiKey: { env: "SYNTHETIC_FILE_KEY" }, writes: { allowWrites: true, operations: ["synthetic-write"] } };

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
