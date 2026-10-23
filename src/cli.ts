import { encode } from "@toon-format/toon";
import { AxiError, runAxiCli } from "axi-sdk-js";
import { DESCRIPTION, help, suggestion } from "./catalogue.js";
import { credentialStore, type CredentialContext } from "./profiles.js";
import { commandInput, localCommand } from "./local-commands.js";
import { createTransport } from "./transport.js";
import { createSession } from "./session.js";
import { TransportError } from "./transport-core.js";

export async function main(argv = process.argv.slice(2), options: {
  credentials?: CredentialContext;
  stdout?: { write: (chunk: string) => unknown };
  createTransport?: typeof createTransport;
} = {}): Promise<void> {
  const store = credentialStore(options.credentials);
  let selectors: { config?: string; profile?: string } = {};
  await runAxiCli({
    description: DESCRIPTION,
    argv: ["scaffold"],
    topLevelHelp: "",
    home: async () => help(),
    stdout: { write: (chunk) => (options.stdout ?? process.stdout).write(store.redactor.text(chunk)) },
    formatError: (error) => ({
      output: `${encode(store.redactor.value(error instanceof TransportError
        ? { ...error.toJSON(), help: error.help.map((line) => line
          .replace("Run hybrid-axi auth status", suggestion("auth status", selectors.config, selectors.profile))
          .replace("Run hybrid-axi quota", suggestion("quota", selectors.config, selectors.profile))) }
        : error instanceof AxiError
        ? { error: error.message, code: error.code, help: error.suggestions }
        : { error: "Local command could not complete", code: "CONFIG_INVALID" }))}\n`,
      exitCode: error instanceof AxiError && error.code === "VALIDATION_ERROR" ? 2 : 1,
    }),
    commands: {
      scaffold: async () => {
        const { command, flags } = commandInput(argv);
        selectors = { config: flags["--config"], profile: flags["--profile"] };
        if (!flags["--help"] && (command === "doctor" || command === "quota")) {
          store.readOnly();
          const loaded = store.load(selectors.config);
          const profile = store.select(loaded.config, selectors.profile, selectors.config);
          const credential = store.credentials(profile);
          const transport = (options.createTransport ?? createTransport)({ ...credential, redact: (value) => store.redactor.payload(value) });
          return { profile: profile.name, ...await createSession(transport)[command]() };
        }
        return store.redactor.value(localCommand(argv, store)) as Record<string, unknown>;
      },
    },
  });
}
