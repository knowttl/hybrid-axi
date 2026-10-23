export const DESCRIPTION = "Agent-friendly CLI for Hybrid Analysis, under construction";

// Planned inventory entries never authorize execution. Feature slices bind reviewed operations here.
export const transportBindings: Readonly<Record<string, never>> = Object.freeze({});
export const catalogue = {
  home: {
    description: "Show scaffold status without contacting Hybrid Analysis",
    flags: { "--help": "Show help; default false" },
    examples: ["hybrid-axi", "hybrid-axi home --help"],
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
