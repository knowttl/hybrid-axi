import { resolve, sep } from "node:path";
import { homedir } from "node:os";
import { AxiError } from "axi-sdk-js";
import { catalogue, DESCRIPTION, help, suggestion } from "./catalogue.js";
import { credentialStore, ORIGIN } from "./profiles.js";

export function localStatusOutput(value: Record<string, unknown> | Error, config?: string, profile?: string): Record<string, unknown> {
  const selectedConfig = config === undefined ? undefined : "<path>";
  if (value instanceof Error) {
    const errors: Record<string, [string, string]> = {
      CONFIG_INSECURE: ["Private file protections failed", "Check configuration and secret file ownership and private permissions"],
      CONFIG_INVALID: ["Invalid local configuration", "Check configuration, environment settings and env/file SecretRefs; run hybrid-axi setup"],
      AUTH_REQUIRED: ["apiKey is required", "Check the selected env or file secret source is available and readable"],
      PROFILE_REQUIRED: ["No profiles are configured", suggestion("setup", selectedConfig)],
      PROFILE_AMBIGUOUS: ["Select one of the configured profiles", "Pass --profile <name> or configure defaultProfile"],
      PROFILE_NOT_FOUND: ["Selected profile is not configured", suggestion("profile list", selectedConfig)],
    };
    const code = value instanceof AxiError && Object.hasOwn(errors, value.code) ? value.code : "CONFIG_INVALID";
    const [error, recovery] = errors[code]!;
    return { error, code, help: [recovery] };
  }
  const output = { ...value };
  if ("bin" in output) output.help = [suggestion(output.setup === "configured" ? "auth status" : "setup", selectedConfig, profile), "Run hybrid-axi --help"];
  if (output.flags && typeof output.flags === "object") output.flags = Object.fromEntries(Object.entries(output.flags)
    .map(([name, description]) => [name, typeof description === "string" ? description.replace(/HYBRID_AXI_[A-Z_]+/g, "environment setting") : description]));
  return output;
}

export function commandInput(argv: string[]) {
  const usage = (message = "Unknown command, argument, or flag"): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid commands: ${Object.keys(catalogue).join(", ")}; valid flags: --config, --profile, --help; home also accepts --offline`, "Run hybrid-axi --help",
  ]); };
  const words: string[] = [];
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("--")) { words.push(word); continue; }
    if (!["--help", "--config", "--profile", "--offline"].includes(word) || Object.hasOwn(flags, word)) usage(`Unknown or duplicate flag: ${word.split("=")[0]}`);
    if (word === "--help" || word === "--offline") flags[word] = "true";
    else {
      const value = argv[++index];
      if (!value || value.startsWith("-") || !value.trim()) usage();
      flags[word] = value!;
    }
  }
  const command = words.join(" ") || "home";
  if (!Object.hasOwn(catalogue, command)) usage();
  if (flags["--offline"] && command !== "home") usage("--offline is only available for home; valid flags: --config, --profile, --help");
  return { command: command as keyof typeof catalogue, flags, topLevel: words.length === 0 };
}

export function localCommand(argv: string[], store: ReturnType<typeof credentialStore>): Record<string, unknown> {
  const { command, flags, topLevel } = commandInput(argv);
  if (flags["--help"]) return topLevel ? help() : { command, ...catalogue[command] };
  if (command === "config path") return { config: store.configPath(flags["--config"]), state: store.statePath() };
  if (command === "profile list") return { ...store.list(flags["--config"]), help: [flags["--profile"] === undefined
    ? `${suggestion("auth status", flags["--config"])} --profile <name>`
    : suggestion("auth status", flags["--config"], flags["--profile"])] };
  if (command === "auth status") return store.status(flags["--config"], flags["--profile"]);
  if (command === "setup") return {
    config: store.configPath(flags["--config"]),
    template: { version: 1, defaultProfile: "example", profiles: { example: { origin: ORIGIN, apiKey: { env: "HYBRID_AXI_API_KEY" }, writes: { allowWrites: false, operations: [] } } } },
    help: ["Set HYBRID_AXI_API_KEY in the environment, or use an absolute private-file apiKey SecretRef",
      "Save the template at the config path with current-user ownership and private permissions", suggestion("auth status", flags["--config"], flags["--profile"])],
  };
  store.readOnly();
  const loaded = store.load(flags["--config"]);
  let profile;
  try { profile = store.select(loaded.config, flags["--profile"], flags["--config"]); } catch (error) {
    if (!(error instanceof AxiError) || error.code !== "PROFILE_REQUIRED") throw error;
  }
  const binary = resolve(process.argv[1] ?? "bin/hybrid-axi.js");
  const home = homedir();
  return { bin: binary.startsWith(`${home}${sep}`) ? `~${binary.slice(home.length)}` : binary,
    description: DESCRIPTION, profile: profile?.name ?? "none", origin: profile?.origin ?? ORIGIN,
    readOnly: profile ? store.effectiveReadOnly(profile) : true, setup: profile ? "configured" : "required",
    status: "Local configuration; doctor and quota are available for explicit API checks",
    help: [suggestion(profile ? "auth status" : "setup", flags["--config"], flags["--profile"]), "Run hybrid-axi --help"] };
}
