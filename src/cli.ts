import { encode } from "@toon-format/toon";
import { AxiError, runAxiCli } from "axi-sdk-js";
import { DESCRIPTION, help, suggestion } from "./catalogue.js";
import { credentialStore, type CredentialContext } from "./profiles.js";
import { commandInput, localCommand } from "./local-commands.js";
import { createTransport } from "./transport.js";
import { createSession } from "./session.js";
import { TransportError } from "./transport-core.js";
import { parseSearch, searchCommand } from "./search.js";
import { parseReport, reportCommand } from "./reports.js";
import { createWriteCoordinator } from "./writes.js";
import { saveArtifact } from "./report-file.js";
import { parseSubmission, quickScanCommand } from "./submissions.js";

export async function main(argv = process.argv.slice(2), options: {
  credentials?: CredentialContext;
  stdout?: { write: (chunk: string) => unknown };
  createTransport?: typeof createTransport;
  createWriteCoordinator?: typeof createWriteCoordinator;
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
        const submission = parseSubmission(argv);
        if (submission) {
          selectors = { config: submission.flags["--config"], profile: submission.flags["--profile"] };
          if (submission.help) return submission.help;
          if (submission.entry.effect === "write") {
            const coordinator = (options.createWriteCoordinator ?? createWriteCoordinator)(selectors, options.credentials);
            return store.redactor.payload(await coordinator.run(submission.entry.operation, submission.body, {
              execute: Boolean(submission.flags["--execute"]), dryRun: Boolean(submission.flags["--dry-run"]),
              confirm: submission.flags["--confirm"], intentId: submission.flags["--intent-id"],
            })) as Record<string, unknown>;
          }
          store.readOnly();
          const loaded = store.load(selectors.config);
          const profile = store.select(loaded.config, selectors.profile, selectors.config);
          const credential = store.credentials(profile);
          const transport = (options.createTransport ?? createTransport)({ ...credential, redact: (value) => store.redactor.payload(value) });
          return store.redactor.payload(await quickScanCommand(submission, transport)) as Record<string, unknown>;
        }
        const report = parseReport(argv);
        if (report) {
          selectors = { config: report.flags["--config"], profile: report.flags["--profile"] };
          if (report.help) return report.help;
          if (report.guarded) {
            const writes = (options.createWriteCoordinator ?? createWriteCoordinator)(selectors, options.credentials);
            const result = await writes.run(report.operation!, { id: report.positional[0], output: report.output }, {
              execute: report.flags["--execute"] === "true", dryRun: report.flags["--dry-run"] === "true", confirm: report.flags["--confirm"],
            });
            if (result.kind !== "success") return result;
            try {
              return { id: report.positional[0], type: report.flags["--type"] ?? "bin", auditId: result.auditId,
                ...saveArtifact(report.output!, result.response as Uint8Array, report.operation!) };
            } catch (error) {
              if (error instanceof TransportError) throw new TransportError({ ...error.error, auditId: result.auditId }, result.help);
              throw error;
            }
          }
          store.readOnly();
          const loaded = store.load(selectors.config);
          const profile = store.select(loaded.config, selectors.profile, selectors.config);
          const credential = store.credentials(profile);
          const transport = (options.createTransport ?? createTransport)({ ...credential, redact: (value) => store.redactor.payload(value) });
          return store.redactor.payload(await reportCommand(report, transport)) as Record<string, unknown>;
        }
        const search = parseSearch(argv);
        if (search) {
          selectors = { config: search.flags["--config"], profile: search.flags["--profile"] };
          if (search.help) return search.help;
          store.readOnly();
          const loaded = store.load(selectors.config);
          const profile = store.select(loaded.config, selectors.profile, selectors.config);
          const credential = store.credentials(profile);
          const transport = (options.createTransport ?? createTransport)({ ...credential, redact: (value) => store.redactor.payload(value) });
          return store.redactor.payload(await searchCommand(search, transport)) as Record<string, unknown>;
        }
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
