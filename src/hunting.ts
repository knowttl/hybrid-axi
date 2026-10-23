import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { AxiError } from "axi-sdk-js";
import { huntingCatalogue, matchesQuery, yaraCreate, yaraUpdate } from "./hunting-catalogue.js";
import type { Transport } from "./transport-core.js";

function bodyFile(path: string): unknown {
  let fd: number | undefined;
  try {
    fd = path === "-" ? 0 : openSync(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    if (path !== "-" && !fstatSync(fd).isFile()) throw new Error("Not a file");
    const bytes = Buffer.alloc(1024 * 1024 + 1);
    let size = 0;
    while (size < bytes.length) {
      const count = readSync(fd, bytes, size, bytes.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size === bytes.length) throw new Error("Too large");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
  } catch { throw new AxiError("--body-file requires readable JSON of at most 1 MiB", "VALIDATION_ERROR"); }
  finally { if (fd !== undefined && fd !== 0) closeSync(fd); }
}

export function parseHunting(argv: string[]) {
  let prefix = 0;
  while (["--config", "--profile"].includes((argv[prefix] ?? "").split("=", 1)[0]!)) {
    if (argv[prefix]!.includes("=")) prefix++;
    else if (argv[prefix + 1] && !argv[prefix + 1]!.startsWith("-")) prefix += 2;
    else break;
  }
  argv = [...argv.slice(prefix), ...argv.slice(0, prefix)];
  const command = [argv.slice(0, 3).join(" "), argv.slice(0, 2).join(" ")].find((name) => Object.hasOwn(huntingCatalogue, name));
  if (!command) return undefined;
  const entry = huntingCatalogue[command]!;
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const usage = (message: string): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid flags for ${command}: ${Object.keys(entry.flags).join(", ")}`, ...entry.examples,
  ]); };
  for (let index = command.split(" ").length; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("-")) { positional.push(word); continue; }
    const equals = word.indexOf("=");
    const flag = equals < 0 ? word : word.slice(0, equals);
    if (!Object.hasOwn(entry.flags, flag) || Object.hasOwn(flags, flag)) usage(`Unknown or duplicate flag: ${flag}`);
    if (["--help", "--full", "--execute", "--dry-run"].includes(flag)) {
      if (equals >= 0) usage(`Flag does not accept a value: ${flag}`);
      flags[flag] = "true";
    } else {
      const value = equals < 0 ? argv[++index] : word.slice(equals + 1);
      if (!value?.trim() || equals < 0 && value.startsWith("-") && !(flag === "--body-file" && value === "-")) usage(`Flag requires a value: ${flag}`);
      flags[flag] = value!;
    }
  }
  const needsId = ["yaraShow", "yaraUpdate", "yaraDelete"].includes(entry.operation);
  if (positional.length > (needsId ? 1 : 0)) usage("Unexpected positional argument");
  if (flags["--help"]) return { command, entry, flags, positional, body: {}, help: { command, experimental: true, ...entry } };
  if (needsId && (positional.length !== 1 || !/^[A-Za-z0-9_-]{1,256}$/.test(positional[0]!))) usage("One valid YARA rule ID is required");
  if (flags["--execute"] && flags["--dry-run"]) usage("Choose --execute or --dry-run");
  if (flags["--confirm"] && !flags["--execute"]) usage("--confirm requires --execute");
  if (flags["--full"] && flags["--fields"]) usage("Choose --full or --fields");
  if (flags["--fields"] && !/^[A-Za-z_]\w*(,[A-Za-z_]\w*)*$/.test(flags["--fields"])) usage("Fields must be comma-separated field names");
  let body: Record<string, unknown> = {};
  if (["yaraCreate", "yaraUpdate"].includes(entry.operation)) {
    if (!flags["--body-file"]) usage("--body-file is required");
    const parsed = (entry.operation === "yaraCreate" ? yaraCreate : yaraUpdate).safeParse(bodyFile(flags["--body-file"]!));
    if (!parsed.success) usage(parsed.error.issues.find((issue) => issue.path[0] === "identifier" && issue.code === "too_big")?.message
      ?? "Invalid YARA body; use the operation's documented JSON fields");
    body = entry.operation === "yaraCreate" ? parsed.data! : { id: positional[0], body: parsed.data };
  } else if (entry.operation === "yaraDelete") body = { id: positional[0] };
  else if (entry.operation === "huntingMatches") {
    const count = flags["--items-count"] ?? "100";
    if (!/^\d+$/.test(count)) usage("Invalid --items-count");
    const parsed = matchesQuery.safeParse({ items_count: Number(count), ...(flags["--search-after"] ? { search_after: flags["--search-after"] } : {}) });
    if (!parsed.success) usage("Invalid match count or date-time");
    body = parsed.data!;
  } else if (entry.operation === "yaraList") {
    if (flags["--status"] && !["active", "paused"].includes(flags["--status"])) usage("Invalid --status");
    if (flags["--threat-category"]?.split(",").some((value) => !value.trim())) usage("Empty threat category");
  }
  return { command, entry, flags, positional, body };
}

export async function huntingRead(parsed: NonNullable<ReturnType<typeof parseHunting>>, transport: Transport) {
  const { entry, flags, positional } = parsed;
  const response = await transport.request(entry.operation, entry.operation === "yaraShow" ? { pathParams: { id: positional[0]! } } : {
    query: { ...(flags["--search"] ? { search: flags["--search"] } : {}), ...(flags["--status"] ? { status: flags["--status"] } : {}),
      ...(flags["--threat-category"] ? { threat_category: flags["--threat-category"].split(",").map((value) => value.trim()) } : {}) },
  });
  const view = huntingView(response.body, flags);
  const rows = Array.isArray(view.value) ? view.value : undefined;
  return { experimental: true, ...(rows ? { rules: rows, count: rows.length, complete: true, ...(rows.length ? {} : { message: "0 YARA rules found" }) }
    : { rule: view.value }), ...view.guidance };
}

export function huntingView(value: unknown, flags: Record<string, string>, matches = false) {
  let truncated = false;
  function trim(value: unknown): unknown {
    if (flags["--full"]) return value;
    if (typeof value === "string" && value.length > 1000) { truncated = true; return `${value.slice(0, 1000)}\n... (truncated, ${value.length} chars total)`; }
    if (Array.isArray(value)) return value.map(trim);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, trim(child)]));
    return value;
  }
  const select = (row: unknown) => row && typeof row === "object" ? trim(flags["--full"] ? row : Object.fromEntries((flags["--fields"]?.split(",")
    ?? (matches ? ["id", "rule_id", "sample_sha256", "match_date"] : ["id", "identifier", "active"]))
    .filter((key) => Object.hasOwn(row, key)).map((key) => [key, (row as Record<string, unknown>)[key]]))) : row;
  const result = Array.isArray(value) ? value.map(select) : select(value);
  return { value: result, guidance: truncated ? { help: ["Use --full for untruncated fields on future invocations; never replay a write to recover omitted fields"] } : {} };
}
