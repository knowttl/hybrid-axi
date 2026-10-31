import { AxiError } from "axi-sdk-js";
import { reportArtifacts, reportCatalogue, reportReads } from "./report-catalogue.js";
import { transportBindings, suggestion } from "./catalogue.js";
import { artifactOutput, saveArtifact } from "./report-file.js";
import { TransportError, type RequestOptions, type Transport } from "./transport-core.js";
import { searchCommand } from "./search.js";
import { guardedArtifacts } from "./download-catalogue.js";
import { waitForResult } from "./bounded-wait.js";

const reportId = /^(?:[A-Za-z0-9_-]{1,256}|[a-f\d]{64}:\d+)$/i;
const rawSearch = { hashOverview: "hash show", labsOverview: "hash show", hashSearch: "hash search", queryResults: "search results" } as const;

export function parseReport(argv: string[]) {
  let prefix = 0;
  while (["--config", "--profile"].includes(argv[prefix] ?? "") && argv[prefix + 1] && !argv[prefix + 1]!.startsWith("-")) prefix += 2;
  argv = [...argv.slice(prefix), ...argv.slice(0, prefix)];
  const command = [argv.slice(0, 3).join(" "), argv.slice(0, 2).join(" ")].find((name) => Object.hasOwn(reportCatalogue, name));
  if (!command) return undefined;
  const entry = reportCatalogue[command]!;
  const usage = (message: string): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid flags for ${command}: ${Object.keys(entry.flags).join(", ")}`, ...entry.examples,
  ]); };
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let index = command.split(" ").length; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("-")) { positional.push(word); continue; }
    const flagName = word.split("=", 1)[0]!;
    if (!Object.hasOwn(entry.flags, word) || Object.hasOwn(flags, word)) usage(`Unknown or duplicate flag: ${flagName}`);
    if (["--help", "--full", "--labs", "--execute", "--dry-run"].includes(word)) flags[word] = "true";
    else {
      const value = argv[++index];
      if (!value?.trim() || value.startsWith("-")) usage(`Flag requires a value: ${flagName}`);
      flags[word] = value!;
    }
  }
  const needsId = command.startsWith("report ") || command === "hash file" || command === "api get";
  if (positional.length > (command === "report batch" ? 20 : needsId ? 1 : 0)) usage(command === "report batch" ? "Batch accepts at most 20 known IDs" : "Unexpected positional argument");
  if (flags["--help"]) return { command, flags, positional, help: { command, ...entry } };
  if (needsId && (command === "report batch" ? !positional.length : positional.length !== 1)) usage(command === "report batch" ? "At least one known report ID is required" : "One positional identifier or API path is required");
  if (command.startsWith("report ") && positional.some((id) => !reportId.test(id))) usage("Expected a job ID or sha256:environmentId");
  if (["report batch", "report wait"].includes(command) && positional.some((id) => /^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64}|[a-f\d]{128})$/i.test(id))) usage("Bare hashes can match multiple reports; use hash search --hash <hash> and supply explicit job IDs or sha256:environmentId");
  const bound = command === "report batch" ? "--limit" : command === "report wait" ? "--timeout" : undefined;
  if (bound && (!flags[bound] || !/^\d+$/.test(flags[bound]!) || Number(flags[bound]) < 1 || Number(flags[bound]) > 20)) usage(`${bound} is required and must be an integer from 1 to 20`);
  if (command === "hash file" && !/^[a-f\d]{64}$/i.test(positional[0]!)) usage("Expected a SHA256");
  if (flags["--execute"] && flags["--dry-run"]) usage("--execute and --dry-run are mutually exclusive");
  if (flags["--full"] && flags["--fields"]) usage("Choose --full or --fields");
  if (flags["--fields"] && !/^[A-Za-z_]\w*(,[A-Za-z_]\w*)*$/.test(flags["--fields"])) usage("Use comma-separated field names");
  for (const name of ["--page", "--limit"]) if (flags[name] && (!/^\d+$/.test(flags[name]) || !Number.isSafeInteger(Number(flags[name])) || Number(flags[name]) < 1)) usage(`${name} must be a positive integer`);
  let operation = command;
  let output: string | undefined;
  let guarded = false;
  const request: RequestOptions = { ...(command.startsWith("report ") ? { pathParams: { id: positional[0]! } } : {}) };
  if (command === "report file" || command === "hash file") {
    const type = command === "hash file" ? "bin" : flags["--type"];
    if (!type || !Object.hasOwn(reportArtifacts, type) && !Object.hasOwn(guardedArtifacts, type)) usage("Choose exactly one documented artifact type");
    if (!flags["--output"]) usage("--output is required");
    output = artifactOutput(flags["--output"]!);
    guarded = command === "hash file" || Object.hasOwn(guardedArtifacts, type!);
    if (!guarded && ["--execute", "--dry-run", "--confirm"].some((name) => flags[name] !== undefined)) usage("Execution flags apply only to guarded artifact types");
    operation = command === "hash file" ? "hash-download-bin" : guarded ? guardedArtifacts[type as keyof typeof guardedArtifacts].operation : `report artifact ${type}`;
  } else if (command === "api get") {
    const path = positional[0]!;
    if (/^[A-Za-z]:\//.test(path)) throw new AxiError("API path was converted to a Windows drive path", "VALIDATION_ERROR", [
      "Git Bash rewrote the leading slash. Pass the path without it (report/<id>/summary) or set MSYS_NO_PATHCONV=1",
    ]);
    const [rawPathname, queryText] = path.split("?");
    const pathname = rawPathname && !rawPathname.startsWith("/") ? `/${rawPathname}` : rawPathname;
    try { decodeURIComponent(queryText ?? ""); } catch { usage("Invalid API query encoding"); }
    if (!pathname?.startsWith("/") || /[\\%#\x00-\x20\x7f]/u.test(pathname) || pathname.includes("//") || path.split("?").length > 2
      || pathname.split("/").some((part) => part === "." || part === "..")) usage("Use a relative reviewed API path without encoding or traversal");
    const absolute = `/api/${flags["--labs"] ? "labs" : "v2"}${pathname}`;
    const allowed = new Set([...Object.keys(reportReads), ...Object.keys(rawSearch), "key.current", "key.submission-quota"]);
    let found = false;
    for (const [name, binding] of Object.entries(transportBindings)) {
      if (!allowed.has(name) || binding.method !== "GET" || binding.effect !== "read" || binding.download) continue;
      const template = binding.path.split("/");
      const segments = absolute.split("/");
      if (template.length !== segments.length || template.some((part, index) => !part.startsWith("{") && part !== segments[index])) continue;
      const pathParams: Record<string, string> = {};
      template.forEach((part, index) => { if (part.startsWith("{")) pathParams[part.slice(1, -1)] = segments[index]!; });
      if (Object.entries(pathParams).some(([key, value]) => key === "id" ? !reportId.test(value) : !/^[a-f\d]{64}$/i.test(value))) usage("Invalid API path identifier");
      const query: Record<string, string | number | boolean> = Object.create(null) as Record<string, string | number | boolean>;
      for (const [key, value] of new URLSearchParams(queryText)) {
        if (Object.hasOwn(query, key)) usage("Duplicate API query parameter");
        query[key] = key === "page" && /^\d+$/.test(value) ? Number(value) : value;
      }
      if (binding.query ? !binding.query.safeParse(query).success : Object.keys(query).length) usage("Query does not match the reviewed operation schema");
      Object.assign(request, { pathParams, query });
      operation = name;
      found = true;
      break;
    }
    if (!found) usage("API path is not a reviewed JSON read; binary, mixed, refresh, consuming and unbound routes are blocked");
    if (flags["--limit"] && !reportReads[operation]?.rows && !["hashOverview", "labsOverview", "hashSearch"].includes(operation)) usage("--limit is only available for reviewed row collections");
  } else {
    if (command === "report memory strings" || command === "report memory hex") {
      if (!flags["--filename"] || flags["--filename"].length > 4096) usage("--filename is required and must be at most 4096 characters");
      request.query = { filename: flags["--filename"]! };
    }
    if (command === "feed abuse") request.query = { page: Number(flags["--page"] ?? "1") };
  }
  return { command, flags, positional, operation, request, output, guarded };
}

export async function reportCommand(parsed: NonNullable<ReturnType<typeof parseReport>>, transport: Transport): Promise<Record<string, unknown>> {
  if (parsed.help) return parsed.help;
  const { command, flags, positional, operation, request, output } = parsed;
  const next = (suffix: string) => `${suggestion(command, flags["--config"], flags["--profile"])}${positional[0] ? ` '${positional[0].replaceAll("'", "'\"'\"'")}'` : ""}${flags["--labs"] ? " --labs" : ""}${flags["--filename"] ? ` --filename '${flags["--filename"].replaceAll("'", "'\"'\"'")}'` : ""}${flags["--page"] ? ` --page ${flags["--page"]}` : ""}${suffix}`;
  if (command === "report batch") {
    const results: Record<string, unknown>[] = [];
    const { "--limit": _limit, ...summaryFlags } = flags;
    let stopped: TransportError | undefined;
    for (const [index, id] of positional.entries()) {
      if (stopped) {
        results.push({ id, ...stopped.toJSON(), skipped: true });
        continue;
      }
      if (index >= Number(flags["--limit"])) {
        results.push({ id, error: { code: "LIMIT_EXCEEDED", message: "Explicit batch summary limit reached; no request sent" } });
        continue;
      }
      try {
        results.push({ id, ...await reportCommand({ ...parsed, command: "report show", flags: summaryFlags, positional: [id], operation: "report show", request: { pathParams: { id }, retry: false } }, transport) });
      } catch (error) {
        if (!(error instanceof TransportError)) throw error;
        results.push({ id, ...error.toJSON() });
        if (["LIMIT_EXCEEDED", "DEADLINE_EXCEEDED"].includes(error.error.code)) stopped = error;
      }
    }
    return { results, count: results.length, complete: results.every((item) => !item.error) };
  }
  const waiting = command === "report wait" ? await waitForResult(transport, "report state", positional[0]!, Number(flags["--timeout"])) : undefined;
  if (Object.hasOwn(rawSearch, operation!)) {
    const target = rawSearch[operation as keyof typeof rawSearch];
    return searchCommand({ command: target, flags: { ...flags, ...(operation === "labsOverview" ? { "--labs": "true" } : {}), ...(operation === "hashSearch" ? { "--hash": String(request!.query!.hash) } : {}) },
      positional: [request!.pathParams?.sha256 ?? request!.pathParams?.id ?? ""], body: {} }, transport);
  }
  let response;
  try { response = waiting ? { body: waiting.value } : await transport.request(operation!, request); }
  catch (error) {
    if (operation === "report show" && error instanceof TransportError && error.error.status === 410) {
      throw new TransportError(error.error, [`${suggestion("report children", flags["--config"], flags["--profile"])} ${request!.pathParams!.id}`]);
    }
    throw error;
  }
  if (output) {
    const artifact = transportBindings[operation!]!;
    const deprecated = Object.values(reportArtifacts).find((binding) => binding.path === artifact.path)?.deprecated;
    return { id: positional[0], type: flags["--type"], ...saveArtifact(output, response.body as Uint8Array, operation!), ...(deprecated ? { deprecated: true, warning: "This normal report format uses the deprecated /report/{id}/file/{type} route" } : {}) };
  }
  const definition = reportReads[waiting ? "report state" : operation!];
  const truncation: { path: string; returned: number; total: number }[] = [];
  function trim(value: unknown, path = "result"): unknown {
    if (flags["--full"]) return value;
    if (typeof value === "string" && value.length > 1000) {
      truncation.push({ path, returned: 1000, total: value.length });
      return `${value.slice(0, 1000)}\n... (truncated, ${value.length} chars total)`;
    }
    if (Array.isArray(value)) {
      if (value.length > 100) truncation.push({ path, returned: 100, total: value.length });
      return value.slice(0, 100).map((entry, index) => trim(entry, `${path}.${index}`));
    }
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, trim(child, `${path}.${key}`)]));
    return value;
  }
  const select = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) && !flags["--full"]
    ? Object.fromEntries((flags["--fields"]?.split(",") ?? definition?.fields ?? Object.keys(value)).filter((key) => Object.hasOwn(value, key)).map((key) => [key, (value as Record<string, unknown>)[key]])) : value;
  const { value: _value, help: _help, ...waitStatus } = waiting ?? {};
  const meta: Record<string, unknown> = { ...waitStatus, ...(waiting ? { id: positional[0] } : {}), ...(definition?.deprecated ? { deprecated: true, warning: "Deprecated latest feed; use hybrid-axi feed detonation for the current feed" } : {}) };
  const help: string[] = [];
  if (waiting && !waiting.complete) help.push(...(waiting.help ?? []), next(` --timeout ${flags["--timeout"]}${flags["--full"] ? " --full" : flags["--fields"] ? ` --fields ${flags["--fields"]}` : ""}`));
  if (definition?.rows) {
    const envelope = response.body as Record<string, unknown>;
    const rows = (definition.rows === true ? response.body : envelope[definition.rows]) as unknown[];
    const limit = Number(flags["--limit"] ?? "100");
    const shown = rows.slice(0, limit);
    const more = shown.length < rows.length;
    const pages = operation === "feed abuse" ? Number(envelope.number_of_pages) : 1;
    const page = Number(request?.query?.page ?? "1");
    Object.assign(meta, { results: shown.map((row, index) => trim(select(row), `results.${index}`)), count: shown.length,
      available: rows.length, ...(definition.total ? { total: envelope[definition.total] } : definition.cap ? {} : { total: rows.length }),
      complete: !more && page >= pages, ...(definition.cap ? { upstreamCap: definition.cap, scope: "Most recent upstream window; older entries are unavailable from this route" } : {}) });
    if (!rows.length) meta.message = `0 results for ${operation}`;
    if (more) help.push(next(` --limit ${rows.length}${flags["--full"] ? " --full" : flags["--fields"] ? ` --fields ${flags["--fields"]}` : ""}`));
    if (page < pages) {
      meta.continuation = { page: page + 1 };
      help.push(`${suggestion("feed abuse", flags["--config"], flags["--profile"])} --page ${page + 1}${flags["--limit"] ? ` --limit ${flags["--limit"]}` : ""}${flags["--full"] ? " --full" : flags["--fields"] ? ` --fields ${flags["--fields"]}` : ""}`);
    }
  } else if (response.body !== undefined) meta.result = trim(select(response.body));
  if (truncation.length) { meta.truncation = truncation; help.push(next(` --full${flags["--limit"] ? ` --limit ${flags["--limit"]}` : ""}${waiting ? ` --timeout ${flags["--timeout"]}` : ""}`)); }
  return { ...meta, ...(help.length ? { help } : {}) };
}
