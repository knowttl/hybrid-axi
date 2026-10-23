export const DESCRIPTION = "Agent-friendly CLI for Hybrid Analysis, under construction";

// Planned inventory entries never authorize execution. Feature slices bind reviewed operations here.
export const transportBindings: Readonly<Record<string, never>> = Object.freeze({});
export const catalogue = {
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
} as const;

export function help() {
  return {
    description: DESCRIPTION,
    commands: Object.fromEntries(Object.entries(catalogue).map(([name, command]) => [name, command.description])),
    flags: catalogue.home.flags,
    version: "-v, -V, --version: print the bare version",
    examples: catalogue.home.examples,
  };
}
