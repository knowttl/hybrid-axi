import { z } from "zod";
import type { OperationBinding } from "./transport-core.js";
import type { MutationOperation } from "./writes-core.js";
import { uploadSchema } from "./uploads.js";
import { waitFlags } from "./bounded-wait.js";

const common = { "--help": "Show help; default false", "--config": "Config path; default platform config", "--profile": "Profile name; default profile precedence" };
const write = { "--execute": "Send once; default preview only", "--dry-run": "Preview only; incompatible with --execute", "--confirm": "Exact confirmation from the preview; required with --execute", "--intent-id": "Optional durable intent identifier; an already reserved intent is never replayed" };
const views = { "--full": "All response fields; default false", "--fields": "Comma-separated response fields; default compact fields" };
const environment = z.union([z.literal(430), z.literal(330), z.literal(200), z.literal(160), z.literal(140), z.literal(120), z.literal(110), z.literal(100)]);
const text = z.string().min(1);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);
const reportId = z.string().regex(/^(?:[A-Za-z0-9_-]{1,256}|[a-f\d]{64}:\d+)$/i);
const sha256 = z.string().regex(/^[a-f\d]{64}$/i);
const url = z.url({ protocol: /^https?$/ }).refine((value) => !/[\x00-\x20\x7f]/.test(value) && !new URL(value).username && !new URL(value).password);
const options = {
  action_script: z.enum(["default", "default_maxantievasion", "default_randomfiles", "default_randomtheme", "default_openie"]).optional(),
  experimental_anti_evasion: z.boolean().optional(), script_logging: z.boolean().optional(), input_sample_tampering: z.boolean().optional(),
  network_settings: z.enum(["default", "tor", "simulated"]).optional(), email: text.optional(), comment: text.optional(),
  custom_date_time: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/).refine((value) => {
    const date = new Date(value.replace(" ", "T") + ":00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16).replace("T", " ") === value;
  }).optional(),
  custom_cmd_line: text.optional(), custom_run_time: z.number().int().positive().optional(), submit_name: text.optional(),
  priority: z.number().int().min(1).max(10).optional(), document_password: text.optional(), environment_variable: text.optional(),
};
export const submissionOptionNames = Object.keys(options);
const sandboxFlags = { "--environment-id": "Required documented environment: 100, 110, 120, 140, 160, 200, 330, 430",
  ...Object.fromEntries(submissionOptionNames.map((name) => [`--${name.replaceAll("_", "-")}`, `Optional ${name}; default omitted${["experimental_anti_evasion", "script_logging", "input_sample_tampering"].includes(name) ? "; explicit true or false" : ""}`])),
  "--action-script": "Optional: default, default_maxantievasion, default_randomfiles, default_randomtheme, default_openie; default omitted",
  "--network-settings": "Optional: default, tor, simulated; default omitted",
  "--priority": "Optional integer 1-10; default omitted (upstream 5)",
  "--custom-run-time": "Optional positive integer seconds; default omitted",
  "--custom-date-time": "Optional YYYY-MM-DD HH:mm; default omitted",
};
export const fileScanTypes = ["all", "all_lookup", "all_scan", "lookup_ha", "scan_crowdstrike_ml", "scan_metadefender"] as const;
export const urlScanTypes = [...fileScanTypes, "lookup_cleandns", "lookup_bforeai", "scan_urlscanio", "scan_scamadviser", "scan_criminalip", "scan_vipre"] as const;
const scanFlags = { "--comment": "Optional comment; default omitted", "--submit-name": "Optional submission name; default omitted" };
const warning = "The sample and its report can become visible to the community.";
export const submissionCatalogue: Record<string, { operation: string; effect: "read" | "write"; description: string; flags: Record<string, string>; examples: string[] }> = {
  "submit file": { operation: "submitFile", effect: "write", description: "Preview a sandbox file submission; sending requires write policy, --execute and exact --confirm",
    flags: { ...common, ...write, ...sandboxFlags, "--file": "Required regular file, at most 250 MiB; confirmation binds its SHA256 and size" }, examples: ["hybrid-axi submit file --file sample.bin --environment-id 160", "hybrid-axi submit file --help"] },
  "submit url": { operation: "submitUrl", effect: "write", description: "Preview a sandbox URL submission; sending requires write policy, --execute and exact --confirm",
    flags: { ...common, ...write, ...sandboxFlags, "--url": "Required exact HTTP(S) URL without embedded credentials" }, examples: ["hybrid-axi submit url --url https://example.com/sample --environment-id 160", "hybrid-axi submit url --help"] },
  "submit dropped-file": { operation: "submitDroppedFile", effect: "write", description: "Preview analysis of an exact dropped SHA256 from a report; the API accepts no environment override",
    flags: { ...common, ...write, "--id": "Required source job ID or sha256:environmentId", "--file-hash": "Required dropped-file SHA256" }, examples: ["hybrid-axi submit dropped-file --id <report-id> --file-hash <sha256>", "hybrid-axi submit dropped-file --help"] },
  "quick-scan submit": { operation: "convertQuickScan", effect: "write", description: "Preview conversion of a quick scan into a sandbox analysis; requires write policy, --execute and exact --confirm",
    flags: { ...common, ...write, ...sandboxFlags }, examples: ["hybrid-axi quick-scan submit <id> --environment-id 160", "hybrid-axi quick-scan submit --help"] },
  "quick-scan file": { operation: "quickScanFile", effect: "read", description: "Read exception: sends the sample to Hybrid Analysis without a write gate; never automatically replays",
    flags: { ...common, ...views, ...scanFlags, "--file": "Required regular file, at most 250 MiB", "--scan-type": `Required: ${fileScanTypes.join(", ")}` }, examples: ["hybrid-axi quick-scan file --file sample.bin --scan-type all_lookup", "hybrid-axi quick-scan file --help"] },
  "quick-scan url": { operation: "quickScanUrl", effect: "read", description: "Read exception: sends the URL to Hybrid Analysis without a write gate; never automatically replays",
    flags: { ...common, ...views, ...scanFlags, "--url": "Required exact HTTP(S) URL without embedded credentials", "--scan-type": `Required: ${urlScanTypes.join(", ")}` }, examples: ["hybrid-axi quick-scan url --url https://example.com --scan-type lookup_ha", "hybrid-axi quick-scan url --help"] },
  "quick-scan show": { operation: "quickScanShow", effect: "read", description: "Read a known quick-scan result and finished status without sending the sample again",
    flags: { ...common, ...views }, examples: ["hybrid-axi quick-scan show <id>", "hybrid-axi quick-scan show <id> --full"] },
  "quick-scan wait": { operation: "quickScanShow", effect: "read", description: "Wait for a known quick scan to finish without sending any sample or URL; returns the last result and an incomplete reason on exhaustion",
    flags: { ...common, ...views, ...waitFlags }, examples: ["hybrid-axi quick-scan wait <id> --timeout 10", "hybrid-axi quick-scan wait <id> --timeout 20 --fields id,finished,sha256"] },
  "quick-scan scanners": { operation: "quickScanState", effect: "read", description: "Read available quick-scan services and supported scan types",
    flags: { ...common, ...views }, examples: ["hybrid-axi quick-scan scanners", "hybrid-axi quick-scan scanners --full"] },
};

const submission = z.looseObject({ job_id: z.string().nullable(), submission_id: z.string().nullable(), environment_id: z.number().int().nullable(), sha256: z.string().nullable() });
const quickScan = z.looseObject({ id: z.string(), finished: z.boolean(), sha256: z.string() });
export const submissionBodies = {
  submitFile: z.strictObject({ file: uploadSchema, environment_id: environment, ...options }),
  submitUrl: z.strictObject({ url, environment_id: environment, ...options }),
  submitDroppedFile: z.strictObject({ id: reportId, file_hash: sha256 }),
  convertQuickScan: z.strictObject({ id, environment_id: environment, ...options }),
  quickScanFile: z.strictObject({ file: uploadSchema, scan_type: z.enum(fileScanTypes), comment: text.optional(), submit_name: text.optional() }),
  quickScanUrl: z.strictObject({ url, scan_type: z.enum(urlScanTypes), comment: text.optional(), submit_name: text.optional() }),
  quickScanShow: z.strictObject({ id }), quickScanState: z.strictObject({}),
};
const binding = (path: string, operationId: string, body: z.ZodType, multipart = false): OperationBinding & { operationId: string } => ({
  path: `/api/v2${path}`, operationId, method: "POST", effect: "write", body, bodyEncoding: multipart ? "multipart" : "form", decoder: submission, retrySafe: false,
});
const scanner = z.looseObject({ name: z.string(), available: z.boolean(), description: z.string(), supported_types: z.array(z.string()) });
export const submissionBindings = {
  submitFile: binding("/submit/file", "e306d626e3fbbe3f10982ff88251b2b7", submissionBodies.submitFile, true),
  submitUrl: binding("/submit/url", "22e1723d4cec5c9b20d50715e4e5de8f", submissionBodies.submitUrl),
  submitDroppedFile: binding("/submit/dropped-file", "e2bce91701a469c9751d5a63da2869d9", submissionBodies.submitDroppedFile),
  convertQuickScan: binding("/quick-scan/{id}/convert-to-full", "024cceff2dd2ddfad6a74251aad3b846", submissionBodies.convertQuickScan.omit({ id: true })),
  quickScanFile: { ...binding("/quick-scan/file", "711bd2a6c5b9f2b4c34e8af6554274e3", submissionBodies.quickScanFile, true), effect: "read", decoder: quickScan },
  quickScanUrl: { ...binding("/quick-scan/url", "458f96cf9b737894c0a7bd60f6e3f183", submissionBodies.quickScanUrl), effect: "read", decoder: quickScan },
  quickScanShow: { path: "/api/v2/quick-scan/{id}", operationId: "8b094dc6a7b763bfd4e25911ed8af72c", method: "GET", effect: "read", decoder: quickScan, retrySafe: false },
  quickScanState: { path: "/api/v2/quick-scan/state", operationId: "04c731564495f3770c5d2e5d9971ecb2", method: "GET", effect: "read", decoder: z.union([z.array(scanner), scanner]) },
} as const;

export const submissionMutations: Readonly<Record<string, MutationOperation>> = Object.fromEntries(
  ["submitFile", "submitUrl", "submitDroppedFile", "convertQuickScan"].map((operation) => [operation, {
    input: submissionBodies[operation as keyof typeof submissionBodies],
    prepare(input: unknown) {
      const body = input as Record<string, unknown>;
      const file = body.file as z.infer<typeof uploadSchema> | undefined;
      const target = Object.fromEntries(Object.entries({ ...(file ? { sha256: file.sha256, bytes: file.size, name: file.name } : {}),
        url: body.url, report: operation === "submitDroppedFile" ? body.id : undefined, file_hash: body.file_hash,
        quickScan: operation === "convertQuickScan" ? body.id : undefined, environment_id: body.environment_id }).filter(([, value]) => value !== undefined)) as Record<string, string | number>;
      if (operation === "convertQuickScan") {
        const { id, ...rest } = body;
        return { target, request: { pathParams: { id: String(id) }, body: rest } };
      }
      return { target, request: { body } };
    },
    effect: "Submit the exact sample for sandbox analysis", warnings: [warning],
    readBackHelp: ["Inspect any returned job_id with hybrid-axi report state <id>; otherwise reconcile the submission in Hybrid Analysis before a new intent. Never replay an ambiguous submission."],
  }]),
);
