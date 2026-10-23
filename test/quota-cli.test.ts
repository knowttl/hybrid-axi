import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { expect, test } from "vitest";
import { main } from "../src/cli.js";
import { constructTransport } from "../src/transport-core.js";
import { transportBindings } from "../src/catalogue.js";
import { fakeHttpsHybrid, keyBody, quotaBody, syntheticKey } from "./support/fake-hybrid.js";

test.each(["doctor", "quota"])("%s resolves the selected private SecretRef and reports redacted quota over HTTPS", async (command) => {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-quota-"));
  const config = join(directory, "config.json");
  const key = join(directory, "key");
  writeFileSync(key, `${syntheticKey}\n`, { mode: 0o600 });
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { file: key } } } }), { mode: 0o600 });
  const fake = await fakeHttpsHybrid([{ body: keyBody, headers: { "Api-Limits": JSON.stringify({ remaining: 8,
    echoed: `${syntheticKey} ${encodeURIComponent(syntheticKey)}`, token: "synthetic-other-token" }) } }, { body: quotaBody }]);
  let stdout = "";
  try {
    await main([command, "--config", config, "--profile", "example"], {
      credentials: { env: {}, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(decode(stdout)).toMatchObject({ profile: "example", keyLevel: "restricted", quota: {
      detonation: { keyQuota: { quota: { day: 100 }, used: { day: 3 }, available: { day: 97 } } },
      quick_scan: { keyQuota: null, quota_reached: false },
    },
      rateLimits: { key: { "Api-Limits": { value: { remaining: 8, token: "***redacted***" } } } } });
    expect(stdout).not.toContain(syntheticKey);
    expect(stdout).not.toContain(encodeURIComponent(syntheticKey));
    expect(stdout).not.toContain("synthetic-other-token");
    expect(stdout).not.toContain("synthetic-user");
    expect(fake.requests).toHaveLength(2);
    expect(fake.requests[0]!.headers["api-key"]).toBe(syntheticKey);
  } finally { await fake.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("quota emits a structured transport error with selector-preserving recovery", async () => {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-denied-"));
  const config = join(directory, "config.json");
  writeFileSync(config, JSON.stringify({ version: 1, profiles: { example: { apiKey: { env: "SYNTHETIC_KEY" } } } }), { mode: 0o600 });
  const fake = await fakeHttpsHybrid([{ status: 401, body: { message: `Denied ${syntheticKey}` } }]);
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main(["quota", "--config", config, "--profile", "example"], {
      credentials: { env: { SYNTHETIC_KEY: syntheticKey }, home: directory }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: (credential) => constructTransport({ credential }, { bindings: transportBindings, fetch: fake.fetch }),
    });
    expect(process.exitCode).toBe(1);
    expect(decode(stdout)).toMatchObject({ error: { code: "AUTH_REQUIRED", status: 401, operation: "key.current" },
      help: [`Run hybrid-axi auth status --config '${config}' --profile 'example'`] });
    expect(stdout).not.toContain(syntheticKey);
    expect(fake.requests).toHaveLength(1);
  } finally { process.exitCode = exitCode; await fake.close(); rmSync(directory, { recursive: true, force: true }); }
});

test.each([["quota", "--api-key", "synthetic-argv-key"], ["doctor", "extra"], ["quota", "--full"],
  ["doctor", "--profile", "example", "--profile", "other"]])("network commands reject invalid grammar before reading configuration: %j", async (...args) => {
  let stdout = "";
  const exitCode = process.exitCode;
  try {
    await main([...args, "--config", "/synthetic-missing-config"], {
      credentials: { env: {} }, stdout: { write: (chunk) => { stdout += chunk; } },
      createTransport: () => { throw new Error("Unexpected credential transport construction"); },
    });
    expect(process.exitCode).toBe(2);
    expect(decode(stdout)).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(stdout).not.toContain("synthetic-argv-key");
  } finally { process.exitCode = exitCode; }
});
