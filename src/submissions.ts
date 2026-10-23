import { AxiError } from "axi-sdk-js";
import { submissionBodies, submissionCatalogue, submissionOptionNames } from "./submission-catalogue.js";
import { describeUpload } from "./uploads.js";
import type { Transport } from "./transport-core.js";

export function parseSubmission(argv: string[]) {
  let prefix = 0;
  while (["--config", "--profile"].includes(argv[prefix] ?? "") && argv[prefix + 1]) prefix += 2;
  argv = [...argv.slice(prefix), ...argv.slice(0, prefix)];
  const command = argv.slice(0, 2).join(" ");
  if (!Object.hasOwn(submissionCatalogue, command)) return undefined;
  const entry = submissionCatalogue[command]!;
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const usage = (message: string): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid flags for ${command}: ${Object.keys(entry.flags).join(", ")}`, ...entry.examples,
  ]); };
  for (let index = 2; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("-")) { positional.push(word); continue; }
    if (!Object.hasOwn(entry.flags, word) || Object.hasOwn(flags, word)) usage(`Unknown or duplicate flag: ${word.split("=", 1)[0]}`);
    if (["--help", "--execute", "--dry-run", "--full"].includes(word)) flags[word] = "true";
    else {
      const value = argv[++index];
      if (!value?.trim()) usage(`Flag requires a value: ${word}`);
      flags[word] = value!;
    }
  }
  const needsId = command === "quick-scan submit" || command === "quick-scan show";
  if (positional.length > (needsId ? 1 : 0)) usage("Unexpected positional argument");
  if (flags["--help"]) return { command, entry, flags, help: { command, ...entry }, body: {} };
  if (needsId && positional.length !== 1) usage("One quick-scan ID is required");
  if (flags["--execute"] && flags["--dry-run"]) usage("Choose --execute or --dry-run");
  if (flags["--confirm"] && !flags["--execute"]) usage("--confirm requires --execute");
  if (flags["--full"] && flags["--fields"]) usage("Choose --full or --fields");
  if (flags["--fields"] && !/^[A-Za-z_]\w*(,[A-Za-z_]\w*)*$/.test(flags["--fields"])) usage("Fields must be comma-separated field names");
  const body: Record<string, unknown> = {};
  for (const name of [...submissionOptionNames, "url", "environment_id", "scan_type", "file_hash", "id"]) {
    const value = flags[`--${name.replaceAll("_", "-")}`];
    if (value === undefined) continue;
    if (["environment_id", "custom_run_time", "priority"].includes(name)) {
      if (!/^\d+$/.test(value)) usage(`Invalid --${name.replaceAll("_", "-")}`);
      body[name] = Number(value);
    } else if (["experimental_anti_evasion", "script_logging", "input_sample_tampering"].includes(name)) {
      if (!["true", "false"].includes(value)) usage(`Expected true or false for --${name.replaceAll("_", "-")}`);
      body[name] = value === "true";
    } else body[name] = value;
  }
  if (needsId) body.id = positional[0];
  if (flags["--file"]) body.file = describeUpload(flags["--file"]);
  const parsed = submissionBodies[entry.operation as keyof typeof submissionBodies].safeParse(body);
  if (!parsed.success) usage("Missing or invalid submission selectors or options");
  return { command, entry, flags, body: parsed.data! as Record<string, unknown> };
}

export async function quickScanCommand(parsed: NonNullable<ReturnType<typeof parseSubmission>>, transport: Transport) {
  if (parsed.help) return parsed.help;
  const { entry, flags, body } = parsed;
  const response = await transport.request(entry.operation, entry.operation === "quickScanShow" ? { pathParams: { id: String(body.id) }, retry: false }
    : entry.operation === "quickScanState" ? { retry: false } : { body, retry: false });
  const value = response.body as Record<string, unknown>;
  const defaults = entry.operation === "quickScanState" ? ["name", "available", "description", "supported_types"] : ["id", "finished", "sha256"];
  return { scan: flags["--full"] ? value : Object.fromEntries((flags["--fields"]?.split(",") ?? defaults)
    .filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])) };
}
