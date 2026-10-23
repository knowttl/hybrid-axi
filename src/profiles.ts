import { AxiError } from "axi-sdk-js";
import { z } from "zod";
import { homedir } from "node:os";
import { isAbsolute, join, resolve, win32 } from "node:path";
import { privateFiles, toolDirectory, type PrivateFileOptions } from "./private-file.js";
import { SecretRedactor } from "./redact.js";
import { suggestion } from "./catalogue.js";

export const ORIGIN = "https://hybrid-analysis.com";
const profileName = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const envName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
export type CredentialContext = PrivateFileOptions & { env?: NodeJS.ProcessEnv; home?: string };

function schemas(platform: NodeJS.Platform) {
  const secretRef = z.union([
    z.strictObject({ env: envName }),
    z.strictObject({ file: z.string().refine((path) => platform === "win32" ? /^[A-Za-z]:[\\/]/.test(path) : isAbsolute(path)) }),
  ]);
  const profile = z.strictObject({
    origin: z.literal(ORIGIN).default(ORIGIN),
    apiKey: secretRef.default({ env: "HYBRID_AXI_API_KEY" }),
    writes: z.strictObject({ allowWrites: z.boolean(), operations: z.array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)) })
      .default({ allowWrites: false, operations: [] }),
  });
  return z.strictObject({ version: z.literal(1), defaultProfile: profileName.optional(), profiles: z.record(profileName, profile) })
    .refine((config) => config.defaultProfile === undefined || Object.hasOwn(config.profiles, config.defaultProfile));
}
export type Profile = z.infer<ReturnType<typeof schemas>>["profiles"][string];
export type SelectedProfile = Profile & { name: string; source: "flag" | "env" | "env-profile" | "config-default" | "sole" };

export function credentialStore(options: CredentialContext = {}, redactor = new SecretRedactor()) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const files = privateFiles(options);
  const invalid = (message: string): never => { throw new AxiError(message, "CONFIG_INVALID", [
    "Use version: 1, named profiles, exact origin https://hybrid-analysis.com and apiKey env/file SecretRefs; run hybrid-axi setup",
  ]); };
  redactor.add(env.HYBRID_AXI_API_KEY);
  function configPath(explicit?: string): string {
    const selected = explicit ?? env.HYBRID_AXI_CONFIG;
    if (selected !== undefined && !selected.trim()) invalid("Config path must not be blank");
    if (selected !== undefined) return (platform === "win32" ? win32.resolve : resolve)(selected);
    return (platform === "win32" ? win32.join : join)(toolDirectory("config", env, platform, home), "config.json");
  }
  function readOnly(): boolean {
    const value = env.HYBRID_AXI_READ_ONLY?.toLowerCase();
    if (value === undefined || value === "" || value === "0" || value === "false") return false;
    if (value === "1" || value === "true") return true;
    return invalid("HYBRID_AXI_READ_ONLY must be 1, true, 0 or false");
  }
  function load(explicit?: string) {
    const path = configPath(explicit);
    let raw: unknown;
    try { raw = JSON.parse(files.read(path)); } catch (error) {
      if (error instanceof AxiError) throw error;
      if (explicit === undefined && env.HYBRID_AXI_CONFIG === undefined && (error as NodeJS.ErrnoException).code === "ENOENT") {
        return { path, config: { version: 1 as const, profiles: {} as Record<string, Profile>, defaultProfile: undefined as string | undefined } };
      }
      return invalid("Cannot read profile configuration as JSON; check its path and syntax");
    }
    // Register env references before validation so malformed metadata cannot echo a key.
    if (raw && typeof raw === "object" && "profiles" in raw && raw.profiles && typeof raw.profiles === "object") {
      for (const profile of Object.values(raw.profiles)) {
        if (!profile || typeof profile !== "object" || !("apiKey" in profile)) continue;
        const ref = profile.apiKey;
        if (typeof ref === "string") redactor.add(ref);
        if (ref && typeof ref === "object" && "env" in ref && typeof ref.env === "string") redactor.add(env[ref.env]);
      }
    }
    const parsed = schemas(platform).safeParse(raw);
    if (!parsed.success) return invalid("Invalid configuration: check profile names, defaultProfile, unknown fields and apiKey env/file SecretRefs");
    return { path, config: parsed.data };
  }
  function select(config: ReturnType<typeof load>["config"], flag?: string, explicit?: string): SelectedProfile {
    const selected = flag ?? env.HYBRID_AXI_PROFILE;
    if (selected !== undefined && !profileName.safeParse(selected).success) invalid("Invalid selected profile name");
    if (selected === undefined && ["HYBRID_AXI_API_KEY", "HYBRID_AXI_ORIGIN"].some((name) => env[name] !== undefined)) {
      if (!env.HYBRID_AXI_API_KEY?.trim() || (env.HYBRID_AXI_ORIGIN !== undefined && env.HYBRID_AXI_ORIGIN !== ORIGIN)) {
        return invalid("Incomplete or invalid HYBRID_AXI env profile; set API_KEY and use the allowed ORIGIN");
      }
      return { origin: ORIGIN, apiKey: { env: "HYBRID_AXI_API_KEY" },
        writes: { allowWrites: false, operations: [] }, name: "env", source: "env-profile" };
    }
    const names = Object.keys(config.profiles);
    const name = selected ?? config.defaultProfile ?? (names.length === 1 ? names[0] : undefined);
    if (name === undefined) throw new AxiError(names.length ? "Select one of the configured profiles" : "No profiles are configured",
      names.length ? "PROFILE_AMBIGUOUS" : "PROFILE_REQUIRED", ["Pass --profile <name>, set HYBRID_AXI_PROFILE, or configure defaultProfile; run hybrid-axi setup"]);
    if (!Object.hasOwn(config.profiles, name)) throw new AxiError("Selected profile is not configured", "PROFILE_NOT_FOUND", [suggestion("profile list", explicit)]);
    return { ...config.profiles[name]!, name, source: flag !== undefined ? "flag" : env.HYBRID_AXI_PROFILE !== undefined ? "env" : config.defaultProfile !== undefined ? "config-default" : "sole" };
  }
  function credentials(profile: SelectedProfile): { apiKey: string } {
    const ref = profile.apiKey;
    let value: string | undefined;
    try { value = "env" in ref ? env[ref.env] : files.read(ref.file, true).replace(/^\uFEFF/, "").trimEnd(); } catch (error) {
      if (error instanceof AxiError) throw error;
      throw new AxiError("Cannot read apiKey SecretRef file", "AUTH_REQUIRED", ["Check the SecretRef file exists and is readable"]);
    }
    redactor.add(value);
    if (!value?.trim()) throw new AxiError("apiKey is required", "AUTH_REQUIRED", ["Set the selected apiKey SecretRef source; run hybrid-axi auth status --help"]);
    if (/[;=\s\p{Cc}]/u.test(value)) invalid("apiKey contains a header delimiter or control character");
    return { apiKey: value };
  }
  function effectiveReadOnly(profile: Profile): boolean {
    return readOnly() || !profile.writes.allowWrites || profile.writes.operations.length === 0;
  }
  function status(explicit?: string, flag?: string) {
    readOnly();
    const loaded = load(explicit);
    const profile = select(loaded.config, flag, explicit);
    credentials(profile);
    return { profile: profile.name, source: "env" in profile.apiKey ? "env" : "file", available: true,
      origin: profile.origin, readOnly: effectiveReadOnly(profile) };
  }
  function list(explicit?: string) {
    readOnly();
    const loaded = load(explicit);
    return { profiles: Object.entries(loaded.config.profiles).map(([name, profile]) => ({ name, origin: profile.origin, default: name === loaded.config.defaultProfile })),
      count: Object.keys(loaded.config.profiles).length, config: loaded.path };
  }
  return { configPath, statePath: () => toolDirectory("state", env, platform, home), readOnly, effectiveReadOnly, load, select, credentials, status, list, redactor };
}
