import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { AxiError } from "axi-sdk-js";
import { catalogue, DESCRIPTION, help } from "./catalogue.js";
import { credentialStore, ORIGIN } from "./profiles.js";

export function localCommand(argv: string[], store: ReturnType<typeof credentialStore>): Record<string, unknown> {
  const usage = (): never => { throw new AxiError("Unknown command, argument, or flag", "VALIDATION_ERROR", [
    `Valid commands: ${Object.keys(catalogue).join(", ")}; valid flags: --config, --profile, --help`, "Run hybrid-axi --help",
  ]); };
  const words: string[] = [];
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("--")) { words.push(word); continue; }
    if (!["--help", "--config", "--profile"].includes(word) || Object.hasOwn(flags, word)) usage();
    if (word === "--help") flags[word] = "true";
    else {
      const value = argv[++index];
      if (!value || value.startsWith("-") || !value.trim()) usage();
      flags[word] = value!;
    }
  }
  const command = words.join(" ") || "home";
  if (!Object.hasOwn(catalogue, command)) usage();
  if (flags["--help"]) return words.length === 0 ? help() : { command, ...catalogue[command as keyof typeof catalogue] };
  if (command === "config path") return { config: store.configPath(flags["--config"]), state: store.statePath() };
  if (command === "profile list") return { ...store.list(flags["--config"]), help: ["Run hybrid-axi auth status --profile <name>"] };
  if (command === "auth status") return store.status(flags["--config"], flags["--profile"]);
  if (command === "setup") return {
    config: store.configPath(flags["--config"]),
    template: { version: 1, defaultProfile: "example", profiles: { example: { origin: ORIGIN, apiKey: { env: "HYBRID_AXI_API_KEY" }, writes: { allowWrites: false, operations: [] } } } },
    help: ["Set HYBRID_AXI_API_KEY in the environment, or use an absolute private-file apiKey SecretRef",
      "Save the template at the config path with current-user ownership and private permissions", "Run hybrid-axi auth status"],
  };
  store.readOnly();
  const loaded = store.load(flags["--config"]);
  let profile;
  try { profile = store.select(loaded.config, flags["--profile"]); } catch (error) {
    if (!(error instanceof AxiError) || error.code !== "PROFILE_REQUIRED") throw error;
  }
  const binary = resolve(process.argv[1] ?? "bin/hybrid-axi.js");
  const home = homedir();
  return { bin: binary.startsWith(`${home}${sep}`) ? `~${binary.slice(home.length)}` : binary,
    description: DESCRIPTION, profile: profile?.name ?? "none", origin: profile?.origin ?? ORIGIN,
    readOnly: profile ? store.effectiveReadOnly(profile) : true, setup: profile ? "configured" : "required",
    status: "Local configuration only; API operations are not implemented",
    help: [profile ? "Run hybrid-axi auth status" : "Run hybrid-axi setup", "Run hybrid-axi --help"] };
}
