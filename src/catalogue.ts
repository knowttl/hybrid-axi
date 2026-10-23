import { keyDecoder, quotaDecoder } from "./key-contracts.js";
import type { OperationBinding } from "./transport-core.js";
import { searchBindings, searchCatalogue } from "./search-catalogue.js";
import type { MutationOperation } from "./writes-core.js";
import { reportBindings, reportCatalogue } from "./report-catalogue.js";
import { downloadBindings, downloadOperations } from "./download-catalogue.js";
import { submissionBindings, submissionCatalogue, submissionMutations } from "./submission-catalogue.js";
import { huntingBindings, huntingCatalogue, huntingMutations } from "./hunting-catalogue.js";

export const DESCRIPTION = "Agent-friendly CLI for Hybrid Analysis, under construction";

export const mutationOperations: Readonly<Record<string, MutationOperation>> = Object.freeze({ ...downloadOperations, ...submissionMutations, ...huntingMutations });

// Planned inventory entries never authorize execution. Feature slices bind reviewed operations here.
export const transportBindings: Readonly<Record<string, OperationBinding>> = Object.freeze({
  ...searchBindings,
  ...reportBindings,
  ...downloadBindings,
  ...submissionBindings,
  ...huntingBindings,
  "key.current": Object.freeze({ method: "GET", path: "/api/v2/key/current", effect: "read", decoder: keyDecoder,
    requiredKeyLevel: "restricted" }),
  "key.submission-quota": Object.freeze({ method: "GET", path: "/api/v2/key/submission-quota", effect: "read", decoder: quotaDecoder,
    requiredKeyLevel: "restricted" }),
});
export const catalogue = {
  ...searchCatalogue,
  ...reportCatalogue,
  ...submissionCatalogue,
  ...huntingCatalogue,
  home: {
    description: "Show local profile and policy without contacting Hybrid Analysis",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile name; default HYBRID_AXI_PROFILE or profile precedence" },
    examples: ["hybrid-axi", "hybrid-axi home --help"],
  },
  "auth status": {
    description: "Verify local SecretRef availability and file protections without HTTP",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile name; default profile precedence" },
    examples: ["hybrid-axi auth status", "hybrid-axi auth status --profile example"],
  },
  "profile list": {
    description: "List configured profiles without resolving keys or contacting Hybrid Analysis",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile selector; does not filter the list" },
    examples: ["hybrid-axi profile list", "hybrid-axi profile list --config <path>"],
  },
  "config path": {
    description: "Show selected config and platform state paths without reading files",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile selector; does not affect paths" },
    examples: ["hybrid-axi config path", "hybrid-axi config path --config <path>"],
  },
  setup: {
    description: "Show a read-only config template and SecretRef setup guidance without writing files",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile selector; template uses example" },
    examples: ["hybrid-axi setup", "hybrid-axi setup --config <path>"],
  },
  doctor: {
    description: "Verify credentials and read key level, submission quota and observed limit headers; other access is unverified",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile name; default profile precedence" },
    examples: ["hybrid-axi doctor", "hybrid-axi doctor --profile example"],
  },
  quota: {
    description: "Read key level, submission quota and observed limit headers with two bounded requests and no retries",
    flags: { "--help": "Show help; default false", "--config": "Config path; default HYBRID_AXI_CONFIG or platform config", "--profile": "Profile name; default profile precedence" },
    examples: ["hybrid-axi quota", "hybrid-axi quota --profile example"],
  },
} as const;

export function suggestion(command: string, config?: string, profile?: string): string {
  const quote = (value: string) => `'${value.replaceAll("'", process.platform === "win32" ? "''" : "'\"'\"'")}'`;
  return `Run hybrid-axi ${command}${config === undefined ? "" : ` --config ${quote(config)}`}${profile === undefined ? "" : ` --profile ${quote(profile)}`}`;
}

export function help() {
  return {
    description: DESCRIPTION,
    commands: Object.fromEntries(Object.entries(catalogue).map(([name, command]) => [name, command.description])),
    flags: catalogue.home.flags,
    version: "-v, -V, --version: print the bare version",
    examples: catalogue.home.examples,
  };
}
