import { encode } from "@toon-format/toon";
import { AxiError, runAxiCli } from "axi-sdk-js";
import { DESCRIPTION, help } from "./catalogue.js";
import { credentialStore, type CredentialContext } from "./profiles.js";
import { localCommand } from "./local-commands.js";

export async function main(argv = process.argv.slice(2), options: {
  credentials?: CredentialContext;
  stdout?: { write: (chunk: string) => unknown };
} = {}): Promise<void> {
  const store = credentialStore(options.credentials);
  await runAxiCli({
    description: DESCRIPTION,
    argv: ["scaffold"],
    topLevelHelp: "",
    home: async () => help(),
    stdout: { write: (chunk) => (options.stdout ?? process.stdout).write(store.redactor.text(chunk)) },
    formatError: (error) => ({
      output: `${encode(store.redactor.value(error instanceof AxiError
        ? { error: error.message, code: error.code, help: error.suggestions }
        : { error: "Local command could not complete", code: "CONFIG_INVALID" }))}\n`,
      exitCode: error instanceof AxiError && error.code === "VALIDATION_ERROR" ? 2 : 1,
    }),
    commands: {
      scaffold: async () => {
        return store.redactor.value(localCommand(argv, store)) as Record<string, unknown>;
      },
    },
  });
}
