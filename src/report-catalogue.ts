import { z } from "zod";
import type { OperationBinding } from "./transport-core.js";
import { downloadFlags, downloadWarnings, guardedArtifacts, hashDownloadCatalogue } from "./download-catalogue.js";
import { waitFlags } from "./bounded-wait.js";

const text = z.string().nullable();
const integer = z.number().int().nullable();
const strings = z.array(z.string());
const object = (shape: z.ZodRawShape) => z.looseObject(shape);
const filename = z.strictObject({ filename: z.string().min(1).max(4096) });
const abuseRows = z.array(object({ sha256: z.string(), deleted_at: text }));
const abusePage = { number_of_results: z.number().int().nonnegative(), number_of_pages: z.number().int().nonnegative(), link_to_next_page: text };
const common = {
  "--help": "Show help; default false", "--config": "Config path; default platform config",
  "--profile": "Profile name; default profile precedence", "--fields": "Comma-separated response fields; default compact fields",
  "--full": "All fields and untruncated text; default false",
};
const list = { "--limit": "Local row limit; default 100; --full does not change it" };

type ReadDefinition = OperationBinding & {
  operationId: string; description: string; fields: readonly string[];
  rows?: string | true; total?: string; cap?: number; deprecated?: boolean;
};
function read(path: string, operationId: string, decoder: z.ZodType, description: string, fields: string[], extra: Partial<ReadDefinition> = {}): ReadDefinition {
  return { method: "GET", effect: "read", path: `/api/v2${path}`, operationId, decoder, description, fields, ...extra };
}

export const reportReads: Readonly<Record<string, ReadDefinition>> = {
  "report show": read("/report/{id}/summary", "b7bf5dba3bdd7e12a97034ad679b7358", object({ job_id: text, state: text, verdict: text.optional(), threat_score: integer.optional() }),
    "Show a report summary for a job ID or sha256:environmentId", ["job_id", "state", "verdict", "threat_score"]),
  "report state": read("/report/{id}/state", "a9bc4ff2646b8ebd3e94b21c17f32f37", object({ state: z.string(), error: text.optional(), error_type: text.optional(), error_origin: text.optional() }),
    "Show submission state", ["state", "error", "error_type", "error_origin"]),
  "report children": read("/report/{id}/children", "fe428721a2d007320558f6c1322015b7", strings,
    "List child report identifiers", [], { rows: true }),
  "report memory list": read("/report/{id}/memory-dumps-list", "610507c03f2fd279e8bf7de42eb1b78b", z.array(object({ filename: z.string(), address: z.string(), flags: z.string(), file_process_pid: integer.optional() })),
    "List memory dump metadata without downloading process memory", ["filename", "address", "flags", "file_process_pid"], { rows: true, requiredKeyLevel: "default" }),
  "report memory strings": read("/report/{id}/memory-dump/extracted-strings", "a5ac630a36de6338b24cd231aae1b017", object({ data: strings }),
    "Read extracted strings for exactly one memory filename", [], { rows: "data", query: filename, requiredKeyLevel: "default" }),
  "report memory hex": read("/report/{id}/memory-dump/hex-dump", "39f01edd97d1aa8b83c7f339ccf58025", object({ data: strings }),
    "Read structured hex rows for exactly one memory filename", [], { rows: "data", query: filename, requiredKeyLevel: "default" }),
  "report screenshots": read("/report/{id}/screenshots", "db2dc105afde92f2df0d322b61143a5e", z.array(object({ name: z.string(), image: z.string(), date: z.string() })),
    "Read bounded Base64 screenshots; image text is previewed unless --full", ["name", "date", "image"], { rows: true, requiredKeyLevel: "default" }),
  "feed latest": read("/feed/latest", "c1eed959af43228c83ebf43554f3c541", object({ count: z.number().int().nonnegative(), status: z.string(), data: z.array(object({ job_id: text, sha256: text, threat_score: integer.optional(), analysis_start_time: text.optional() })) }),
    "Deprecated latest feed, at most 250 reports from 24h; use feed detonation for the current feed", ["job_id", "sha256", "threat_score", "analysis_start_time"], { rows: "data", total: "count", cap: 250, deprecated: true }),
  "feed detonation": read("/feed/detonation", "90ffc0d89757c30cda41531e26c3daac", z.array(object({ report_id: text, sha256: text, verdict: integer.optional(), verdict_human: text.optional() })),
    "Read the most recent report feed, capped upstream at 250", ["report_id", "sha256", "verdict", "verdict_human"], { rows: true, cap: 250 }),
  "feed quick-scan": read("/feed/quick-scan", "6f846a8bc0bc73e905408f2e6da577a7", z.array(object({ quick_scan_id: text, sha256: text, verdict: integer.optional(), verdict_human: text.optional() })),
    "Read the most recent successful quick scans, capped upstream at 2500", ["quick_scan_id", "sha256", "verdict", "verdict_human"], { rows: true, cap: 2500 }),
  "feed abuse": read("/abuse-reports/feed", "d97c84ba3099decb501ba37e993ad225", z.union([
    object({ ...abusePage, results: abuseRows }),
    object({ ...abusePage, falcon_mal_query_results: abuseRows }).transform((page) => ({ ...page, results: page.falcon_mal_query_results })),
  ]),
    "Read one page of qualified-removal hashes", ["sha256", "deleted_at"], { rows: "results", total: "number_of_results", query: z.strictObject({ page: z.number().int().positive().optional() }) }),
  "system version": read("/system/version", "145769f29b3862d158e74b6ddda845f1", object({ sandbox: z.string(), api: z.string() }), "Read system versions", ["sandbox", "api"]),
  "system environments": read("/system/environments", "bd68b15f49c59048688402da2a9d5b90", z.array(object({ environment_id: z.number().int(), description: z.string(), architecture: z.string(), analysis_mode: z.string() })),
    "List execution environments", ["environment_id", "description", "architecture", "analysis_mode"], { rows: true }),
  "system action-scripts": read("/system/action-scripts", "13ea959829e5303a7aa453d5e74c503e", z.array(object({ name: z.string(), description: z.string() })),
    "List available action scripts", ["name", "description"], { rows: true }),
  "system stats": read("/system/stats", "5e878cfdb239f874742add7b9c519b41", object({ total_submissions: z.number().int(), total_samples: z.number().int(), behaviour_indicators: z.number().int().optional(), total_yara_rules: z.number().int().optional() }),
    "Read system statistics", ["total_submissions", "total_samples", "behaviour_indicators", "total_yara_rules"], { requiredKeyLevel: "default" }),
  "system configuration": read("/system/configuration", "d373372cf33e493b15d9678972b68268", object({ submit_allow_offline: z.boolean(), submit_allow_tor: z.boolean(), enable_quick_scan: z.boolean() }),
    "Read documented partial public configuration with sensitive fields redacted", ["submit_allow_offline", "submit_allow_tor", "enable_quick_scan"], { requiredKeyLevel: "default" }),
  "system queue-size": read("/system/queue-size", "04ea6a4ccdb477857ab825ca8ca8f4f5", object({ value: z.number().int() }), "Read the queue size", ["value"], { requiredKeyLevel: "default" }),
  "system total-submissions": read("/system/total-submissions", "5a69498675db3f2db5cfdb50423feafb", object({ value: z.number().int() }), "Read the submission aggregate", ["value"]),
};

const artifact = (path: string, operationId: string, deprecated = false) => ({
  ...read(path, operationId, z.instanceof(Uint8Array), "Download one normal report artifact", []), download: true, requiredKeyLevel: "default", deprecated,
});
export const reportArtifacts = {
  crt: artifact("/report/{id}/certificate", "654b1757059fe1083aa8ad456fb6b8c0"),
  pcap: artifact("/report/{id}/pcap", "efae3cf1c0edae0a3d48749f6897a022"),
  json: artifact("/report/{id}/report/json", "dd971989a7f758edc5d1c9a7f5fde421"),
  "memory-strings": artifact("/report/{id}/memory-strings", "e01f9d5e492cbc72369f56397488365b"),
  ...Object.fromEntries(["xml", "html", "pdf", "maec", "stix", "misp", "misp-json", "openioc"].map((type) => [type,
    artifact(`/report/{id}/file/${type}`, "7e872c46c1a5638b701b09cc68e03565", true)])),
};
export const reportBindings: Readonly<Record<string, OperationBinding>> = {
  ...reportReads,
  ...Object.fromEntries(Object.entries(reportArtifacts).map(([type, binding]) => [`report artifact ${type}`, binding])),
};

export const reportCatalogue: Record<string, { effect: "read" | "write" | "read/write"; description: string; flags: Record<string, string>; examples: string[] }> = {
  ...hashDownloadCatalogue,
  "report batch": { effect: "read", description: "Read summaries for 1-20 known report IDs; rejects bare hashes and never chooses associated reports implicitly; preserves per-item failures",
    flags: { ...common, "--limit": "Required maximum summaries, integer 1-20; remaining IDs are disclosed as incomplete" },
    examples: ["hybrid-axi report batch <id> <id> --limit 2", "hybrid-axi report batch <id> --limit 1 --fields job_id,state,verdict"] },
  "report wait": { effect: "read", description: "Wait for a known report state SUCCESS or ERROR without submitting again; returns the last state and an incomplete reason on exhaustion",
    flags: { ...common, ...waitFlags }, examples: ["hybrid-axi report wait <id> --timeout 10", "hybrid-axi report wait <sha256:environmentId> --timeout 20"] },
  ...Object.fromEntries(Object.entries(reportReads).map(([command, binding]) => [command, {
    effect: binding.effect,
    description: binding.description,
    flags: { ...common, ...(binding.rows ? list : {}), ...(command === "feed abuse" ? { "--page": "Upstream page; default 1" } : {}),
      ...(command === "report memory strings" || command === "report memory hex" ? { "--filename": "Required exact memory dump filename" } : {}) },
    examples: [`hybrid-axi ${command}${command.startsWith("report ") ? " <id>" : ""}${binding.query && command !== "feed abuse" ? " --filename <name>" : ""}`,
      `hybrid-axi ${command} --help`],
  }])),
  "report file": { description: `Save one artifact unchanged to a new private file, bounded at 250 MiB; bin, dropped-files and memory require write scope, --execute and exact --confirm. Memory and legacy report formats use the deprecated generic route. ${downloadWarnings.join(" ")}`,
    effect: "read/write",
    flags: { "--help": common["--help"], "--config": common["--config"], "--profile": common["--profile"], "--type": `Required single type: ${[...Object.keys(reportArtifacts), ...Object.keys(guardedArtifacts)].join(", ")}`, "--output": "Required new file in an existing directory; never stdout or overwrite", ...downloadFlags },
    examples: ["hybrid-axi report file <id> --type json --output report.json", "hybrid-axi report file <id> --type pcap --output capture.gz"] },
  "api get": { description: "Reviewed JSON GET only: same decoders, redaction, fields and bounds as named reads; rejects binary, mixed-effect, consuming, refresh and unbound routes",
    effect: "read",
    flags: { ...common, ...list, "--labs": "Select experimental Labs API; default stable" },
    examples: ["hybrid-axi api get report/<id>/summary", "hybrid-axi api get 'report/<id>/memory-dump/extracted-strings?filename=<name>'", "hybrid-axi api get sample/<sha256>/overview --labs"] },
};
