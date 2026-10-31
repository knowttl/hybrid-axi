import { AxiError } from "axi-sdk-js";
import { submissionBodies, submissionCatalogue, submissionOptionNames } from "./submission-catalogue.js";
import { describeUpload } from "./uploads.js";
import type { Transport } from "./transport-core.js";
import { waitForResult } from "./bounded-wait.js";
import { suggestion } from "./catalogue.js";

export function parseSubmission(argv: string[]) {
  let prefix = 0;
  while (["--config", "--profile"].includes((argv[prefix] ?? "").split("=", 1)[0]!)) {
    if (argv[prefix]!.includes("=")) prefix++;
    else if (argv[prefix + 1] && !argv[prefix + 1]!.startsWith("-")) prefix += 2;
    else break;
  }
  argv = [...argv.slice(prefix), ...argv.slice(0, prefix)];
  const command = argv.slice(0, 2).join(" ");
  if (!Object.hasOwn(submissionCatalogue, command)) return undefined;
  const entry = submissionCatalogue[command]!;
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const usage = (message: string): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid flags for ${command}: ${Object.keys(entry.flags).join(", ")}`, "Use --flag=value for dash-leading values.", ...entry.examples,
  ]); };
  for (let index = 2; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("-")) { positional.push(word); continue; }
    const equals = word.indexOf("=");
    const flag = equals < 0 ? word : word.slice(0, equals);
    if (!Object.hasOwn(entry.flags, flag) || Object.hasOwn(flags, flag)) usage(`Unknown or duplicate flag: ${flag}`);
    if (["--help", "--execute", "--dry-run", "--full"].includes(flag)) {
      if (equals >= 0) usage(`Flag does not accept a value: ${flag}`);
      flags[flag] = "true";
    } else {
      const value = equals < 0 ? argv[++index] : word.slice(equals + 1);
      if (!value?.trim() || equals < 0 && value.startsWith("-")) usage(`Flag requires a value: ${flag}`);
      flags[flag] = value!;
    }
  }
  const needsId = command === "quick-scan submit" || command === "quick-scan show" || command === "quick-scan wait";
  if (positional.length > (needsId ? 1 : 0)) usage("Unexpected positional argument");
  if (flags["--help"]) return { command, entry, flags, help: { command, ...entry }, body: {} };
  if (needsId && positional.length !== 1) usage("One quick-scan ID is required");
  if (command === "quick-scan wait" && (!flags["--timeout"] || !/^\d+$/.test(flags["--timeout"]) || Number(flags["--timeout"]) < 1 || Number(flags["--timeout"]) > 20)) usage("--timeout is required and must be an integer from 1 to 20");
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

export async function quickScanCommand(parsed: NonNullable<ReturnType<typeof parseSubmission>>, transport: Transport): Promise<Record<string, unknown>> {
  if (parsed.help) return parsed.help;
  const { entry, flags, body } = parsed;
  const waiting = parsed.command === "quick-scan wait" ? await waitForResult(transport, "quickScanShow", String(body.id), Number(flags["--timeout"])) : undefined;
  const response = waiting ? { body: waiting.value } : await transport.request(entry.operation, entry.operation === "quickScanShow" ? { pathParams: { id: String(body.id) }, retry: false }
    : entry.operation === "quickScanState" ? { retry: false } : { body, retry: false });
  const value = response.body as Record<string, unknown> | Record<string, unknown>[];
  const defaults = entry.operation === "quickScanState" ? ["name", "available", "description", "supported_types"] : ["id", "finished", "sha256"];
  const select = (row: Record<string, unknown>) => flags["--full"] ? row : Object.fromEntries((flags["--fields"]?.split(",") ?? defaults)
    .filter((key) => Object.hasOwn(row, key)).map((key) => [key, row[key]]));
  const { value: _value, ...status } = waiting ?? {};
  return { ...status, ...(waiting ? { id: body.id } : {}), ...(value ? { scan: Array.isArray(value) ? value.map(select) : select(value) } : {}),
    ...(waiting && !waiting.complete ? { help: [...(waiting.help ?? []), `${suggestion("quick-scan wait", flags["--config"], flags["--profile"])} ${body.id} --timeout ${flags["--timeout"]}${flags["--full"] ? " --full" : flags["--fields"] ? ` --fields ${flags["--fields"]}` : ""}`] } : {}) };
}
