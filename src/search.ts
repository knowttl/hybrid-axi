import { readFileSync, statSync } from "node:fs";
import { AxiError } from "axi-sdk-js";
import { z } from "zod";
import { searchCatalogue, termNames } from "./search-catalogue.js";
import { hashResult, labsOverview, queryResult, queryStart, sample, stableOverview, termsResult } from "./search-contracts.js";
import { TransportError, type Transport } from "./transport-core.js";

const hash = /^[a-f\d]+$/i;

function decode<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AxiError("Response does not match the documented search contract", "INVALID_RESPONSE");
  return parsed.data;
}

export function parseSearch(argv: string[]) {
  let prefix = 0;
  while (["--config", "--profile"].includes(argv[prefix] ?? "") && argv[prefix + 1] && !argv[prefix + 1]!.startsWith("-")) prefix += 2;
  argv = [...argv.slice(prefix), ...argv.slice(0, prefix)];
  // Select the leaf without consuming positional arguments or flag values.
  const command = argv.slice(0, 2).join(" ") as keyof typeof searchCatalogue;
  if (!Object.hasOwn(searchCatalogue, command)) return undefined;
  const entry = searchCatalogue[command];
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const usage = (message: string): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    `Valid commands: ${Object.keys(searchCatalogue).join(", ")}; valid flags for ${command}: ${Object.keys(entry.flags).join(", ")}`,
    ...entry.examples,
  ]); };
  for (let index = 2; index < argv.length; index++) {
    const word = argv[index]!;
    if (!word.startsWith("-")) { positional.push(word); continue; }
    if (!Object.hasOwn(entry.flags, word) || Object.hasOwn(flags, word)) usage("Unknown or duplicate flag");
    if (["--help", "--full", "--labs"].includes(word)) flags[word] = "true";
    else {
      const value = argv[++index];
      if (!value?.trim() || value.startsWith("-")) usage("Flag requires a nonempty value");
      flags[word] = value!;
    }
  }
  const needsPosition = command === "hash show" || command === "search results";
  if (positional.length > (needsPosition ? 1 : 0)) usage("Unexpected positional argument");
  if (flags["--help"]) return { command, flags, positional, help: { command, ...entry } };
  if (needsPosition && positional.length !== 1) usage("A positional identifier is required");
  if (flags["--full"] && flags["--fields"]) usage("Choose --full or --fields");
  if (flags["--fields"] && !/^[a-zA-Z_][\w]*(,[a-zA-Z_][\w]*)*$/.test(flags["--fields"])) usage("Fields must be comma-separated field names");
  if (command === "hash show" && (!hash.test(positional[0]!) || positional[0]!.length !== 64)) usage("Expected a SHA256");
  if (command === "search results" && !/^[A-Za-z0-9_-]{1,256}$/.test(positional[0]!)) usage("Invalid query ID");
  const body: Record<string, unknown> = {};
  if (command === "hash search") {
    if (Boolean(flags["--hash"]) === Boolean(flags["--hashes-file"])) usage("Choose exactly one of --hash or --hashes-file");
    if (flags["--hash"] && (!hash.test(flags["--hash"]) || ![32, 40, 64, 128].includes(flags["--hash"].length))) usage("Expected an MD5, SHA1, SHA256 or SHA512");
    if (flags["--hashes-file"]) {
      let contents: string;
      try {
        const file = statSync(flags["--hashes-file"]);
        if (!file.isFile() || file.size > 1024 * 1024) return usage("Hashes input must be a regular file of at most 1 MiB");
        contents = readFileSync(flags["--hashes-file"], "utf8");
      } catch { return usage("Cannot read hashes file"); }
      const hashes = contents.trim().split(/\r?\n/).map((value) => value.trim());
      if (!hashes.length || hashes.some((value) => !hash.test(value) || ![32, 40, 64].includes(value.length))) usage("Bulk lookup requires newline-separated MD5, SHA1 or SHA256 hashes");
      body["hashes[]"] = hashes;
    }
  }
  if (command === "search terms") {
    for (const name of termNames) {
      const value = flags[`--${name.replaceAll("_", "-")}`];
      if (value !== undefined) body[name] = value;
    }
    if (!Object.keys(body).length) usage("At least one search filter is required");
    for (const [name, min, max] of [["verdict", 1, 5], ["port", 0, 65535]] as const) {
      if (body[name] !== undefined) {
        const value = String(body[name]);
        if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) usage(`Invalid ${name}`);
        body[name] = Number(value);
      }
    }
  }
  if (command === "search run") {
    if (!flags["--query"]) usage("--query is required");
    body.query = flags["--query"];
    for (const [name, fallback, max] of [["size", "50", 200], ["page", "1", Number.MAX_SAFE_INTEGER]] as const) {
      const value = flags[`--${name}`] ?? fallback;
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) usage(`Invalid --${name}`);
      body[name] = Number(value);
    }
  }
  for (const name of ["date_from", "date_to"]) {
    const value = body[name] ?? flags[`--${name.replaceAll("_", "-")}`];
    if (value !== undefined) {
      const text = String(value);
      const date = text.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date
        || (command === "search run" ? text !== date : !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text) || Number.isNaN(Date.parse(text + "Z")))) usage("Invalid date filter");
      body[name] = value;
    }
  }
  if (body.date_from && body.date_to && String(body.date_from) > String(body.date_to)) usage("Date range is reversed");
  return { command, flags, positional, body };
}

export async function searchCommand(parsed: NonNullable<ReturnType<typeof parseSearch>>, transport: Transport): Promise<Record<string, unknown>> {
  if (parsed.help) return parsed.help;
  const { command, flags, positional, body } = parsed;
  const experimental = Boolean(flags["--labs"]) || command.startsWith("search r");
  const select = (value: Record<string, unknown>, defaults: string[]) => flags["--full"] ? value
    : Object.fromEntries((flags["--fields"]?.split(",") ?? defaults).filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]]));
  const selector = `${flags["--config"] ? ` --config '${flags["--config"].replaceAll("'", "'\"'\"'")}'` : ""}${flags["--profile"] ? ` --profile '${flags["--profile"].replaceAll("'", "'\"'\"'")}'` : ""}`;
  const resume = (id: string) => `Run hybrid-axi search results ${id}${selector}`;
  if (command === "hash show") {
    let response;
    try { response = await transport.request(flags["--labs"] ? "labsOverview" : "hashOverview", { pathParams: { sha256: positional[0]! } }); }
    catch (error) {
      if (error instanceof TransportError && error.error.status === 425 && experimental) return { experimental, sha256: positional[0], state: "pending", help: [`Run hybrid-axi hash show ${positional[0]} --labs${selector}`] };
      throw error;
    }
    const value = experimental ? decode(labsOverview, response.body) : decode(stableOverview, response.body);
    const reports = experimental ? (value.report_ids as { sandbox_job_ids: string[] }).sandbox_job_ids : value.reports as string[];
    const empty = reports.length === 0 && value.verdict == null && value.threat_score == null;
    return { ...(experimental ? { experimental } : {}), overview: select(value, ["sha256", "verdict", "threat_score", "reports", "report_ids", "overall_status"]),
      ...(empty ? { state: "empty", message: "No analysis is available for this hash", help: [`Run hybrid-axi hash search --hash ${positional[0]}${selector}`] } : {}) };
  }
  if (command === "hash search") {
    if (flags["--hash"]) {
      const value = decode(hashResult, (await transport.request("hashSearch", { query: { hash: flags["--hash"] } })).body);
      return { ...select(value, ["sha256s", "reports"]), count: value.reports.length,
        ...(value.reports.length ? {} : { state: "empty", message: "No analysis reports found for this hash", help: [`Run hybrid-axi hash show ${value.sha256s[0] ?? "<sha256>"}${selector}`] }) };
    }
    const value = decode(z.array(sample), (await transport.request("hashesSearch", { body })).body);
    return { deprecated: true, results: value.map((row) => select(row, ["sha256", "verdict", "threat_score", "job_id"])), count: value.length,
      ...(value.length ? {} : { state: "empty", message: "No analysis reports found for the supplied hashes" }) };
  }
  if (command === "search terms") {
    const value = decode(termsResult, (await transport.request("termsSearch", { body })).body);
    const count = value.reduce((total, row) => total + row.count, 0);
    return { searches: value.map((row) => ({ ...select(row, ["count", "search_terms"]), result: row.result.map((sample) => select(sample, ["sha256", "verdict", "threat_score", "job_id"])) })), count,
      ...(count ? {} : { state: "empty", message: "No samples match these search terms" }) };
  }
  let id = positional[0];
  let response = command === "search run" ? await transport.request("queryRun", { body }) : await transport.request("queryResults", { pathParams: { id: id! } });
  let start: Record<string, unknown>[] | undefined;
  if (command === "search run" && response.status === 202) {
    start = decode(queryStart, response.body);
    id = start[0]!.id as string;
    try { response = await transport.request("queryResults", { pathParams: { id } }); }
    catch (error) {
      if (!(error instanceof TransportError)) throw error;
      throw new TransportError(error.error, [...error.help, resume(id)]);
    }
  }
  const results = decode(queryResult, response.body);
  const pending = results.some((row) => row.results === undefined || /^(pending|queued|running|processing)$/i.test(row.query_status));
  return { experimental, ...(id ? { id } : {}), ...(start && flags["--full"] ? { start } : {}),
    searches: results.map((row) => ({ ...select(row, ["number_of_results", "number_of_pages", "query_status"]),
      ...(row.results ? { results: row.results.map((sample) => select(sample, ["sha256", "verdict", "score", "submit_name"])) } : {}) })),
    ...(pending ? { state: "pending", ...(id ? { help: [resume(id)] } : {}) } : results.every((row) => row.results?.length === 0) ? { state: "empty", message: "No samples match this query" } : {}) };
}
