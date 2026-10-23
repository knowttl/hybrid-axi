import { homedir } from "node:os";
import { resolve, sep } from "node:path";
import { AxiError, runAxiCli } from "axi-sdk-js";
import { DESCRIPTION, help } from "./catalogue.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  await runAxiCli({
    description: DESCRIPTION,
    argv: ["scaffold"],
    topLevelHelp: "",
    home: async () => help(),
    commands: {
      scaffold: async () => {
        if (argv.length === 1 && argv[0] === "--help"
          || argv.length === 2 && argv[0] === "home" && argv[1] === "--help") return help();
        if (argv.length === 0 || argv.length === 1 && argv[0] === "home") {
          const binary = resolve(process.argv[1] ?? "bin/hybrid-axi.js");
          const home = homedir();
          return { bin: binary.startsWith(`${home}${sep}`) ? `~${binary.slice(home.length)}` : binary,
            description: DESCRIPTION, status: "Scaffold only; API operations are not implemented",
            help: ["Run hybrid-axi --help"] };
        }
        // Do not echo untrusted argv: it can contain accidentally supplied credentials.
        throw new AxiError("Unknown command, argument, or flag", "VALIDATION_ERROR",
          ["Valid commands: home; valid flags: --help", "Run hybrid-axi --help"]);
      },
    },
  });
}
