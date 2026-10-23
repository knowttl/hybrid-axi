import { z } from "zod";
import type { OperationBinding, Transport } from "./transport-core.js";
import type { MutationOperation } from "./writes-core.js";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);
const text = z.string().trim().min(1);
const categories = z.array(z.enum(["adware", "banker", "downloader", "dropper", "fakeav", "hacktool", "miner", "phishing", "pua", "ransomware", "spyware", "trojan", "virus", "worm"]));
const fields = { identifier: text.max(25, "YARA rule identifier must be at most 25 characters"), threat_categories: categories, active: z.boolean().optional(),
  daily_notifications_limit: z.number().int().optional(), rule: z.string().min(1) };
export const yaraCreate = z.strictObject(fields);
export const yaraUpdate = z.strictObject({ ...z.strictObject(fields).partial().shape, reset_counter: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0);
export const matchesQuery = z.strictObject({ items_count: z.number().int().min(1).max(1000).default(100), search_after: z.iso.datetime({ offset: true }).optional() });
const listQuery = z.strictObject({ search: text.optional(), threat_category: z.array(text).optional(), status: z.enum(["active", "paused"]).optional() });
const rule = z.looseObject({ id: z.string(), identifier: z.string(), active: z.boolean() });
const match = z.looseObject({ id: z.string(), rule_id: z.string(), sample_sha256: z.string(), match_date: z.string() });
const path = "/api/labs/hunting/yara-rules";
export const huntingBindings: Readonly<Record<string, OperationBinding & { operationId: string }>> = {
  yaraList: { method: "GET", path, operationId: "0d965c4fe9b7806ced772d0b6b61b1b5", effect: "read", decoder: z.array(rule), query: listQuery },
  yaraShow: { method: "GET", path: `${path}/{id}`, operationId: "d8d8833e20421f7c1175ca126646ba7b", effect: "read", decoder: rule },
  yaraCreate: { method: "POST", path, operationId: "7dcab7838cd6eeea81243d256b05ecc2", effect: "write", decoder: rule, body: yaraCreate },
  yaraUpdate: { method: "POST", path: `${path}/{id}`, operationId: "39bc2cb8ea5bab2edd9eb9fa161b819a", effect: "write", decoder: rule, body: yaraUpdate },
  yaraDelete: { method: "DELETE", path: `${path}/{id}`, operationId: "63fb1846ad545a0551d782694673cb22", effect: "write", decoder: z.null() },
  huntingMatches: { method: "GET", path: "/api/labs/hunting/matches/recent", operationId: "3fa0911073aec064f0398d488f74c4f2", effect: "write", decoder: z.array(match), query: matchesQuery, retrySafe: false },
};
const readBackHelp = ["Inspect the rule with hybrid-axi hunting yara show <id> before a new intent; never replay an ambiguous write."];
const current = async (transport: Transport, input: unknown) => ({
  state: (await transport.request("yaraShow", { pathParams: { id: (input as { id: string }).id }, retry: false })).body,
});
export const huntingMutations: Readonly<Record<string, MutationOperation>> = {
  yaraCreate: { input: yaraCreate, prepare(input) {
    const body = input as z.infer<typeof yaraCreate>;
    return { target: { identifier: body.identifier }, request: { body } };
  }, effect: "Create the exact YARA rule identifier and payload", readBackHelp },
  yaraUpdate: { input: z.strictObject({ id, body: yaraUpdate }), prepare(input) {
    const { id, body } = input as { id: string; body: z.infer<typeof yaraUpdate> };
    return { target: { id, reset_counter: body.reset_counter === true }, request: { pathParams: { id }, body } };
  }, current, effect: "Update only supplied YARA fields; reset_counter:true resets the all-time matches counter", readBackHelp },
  yaraDelete: { input: z.strictObject({ id }), prepare(input) {
    const { id } = input as { id: string };
    return { target: { id }, request: { pathParams: { id } } };
  }, current, effect: "Delete the exact YARA rule", readBackHelp },
  huntingMatches: { input: matchesQuery, prepare(input) {
    const query = input as z.infer<typeof matchesQuery>;
    return { target: { owner: "current-user", items_count: query.items_count, search_after: query.search_after ?? "all-undelivered" }, request: { query } };
  }, effect: "Consume the current user's oldest undelivered matches in this scope; every returned match is marked delivered and will not be returned again",
  readBackHelp: ["Reconcile the private journal and any returned match IDs; delivered matches cannot be read back through this endpoint. Never replay an ambiguous consumption."] },
};
const common = { "--help": "Show help; default false", "--config": "Config path; default platform config", "--profile": "Profile name; default profile precedence" };
const view = { "--fields": "Comma-separated response fields; default compact fields", "--full": "All response fields and untruncated text; default false" };
const guards = { "--execute": "Execute once; default preview only", "--dry-run": "Preview only; mutually exclusive with --execute", "--confirm": "Exact preview confirmation binding profile, target and payload digest", "--intent-id": "Optional unique intent ID; never reuse an unresolved intent" };
type HuntingCommand = { description: string; effect: "read" | "write"; operation: string; flags: Record<string, string>; examples: string[] };
export const huntingCatalogue: Record<string, HuntingCommand> = {
  "hunting yara list": { description: "Experimental Labs: list own YARA rules; unknown response fields remain available", effect: "read", operation: "yaraList",
    flags: { ...common, ...view, "--search": "Optional text filter", "--threat-category": "Optional comma-separated categories", "--status": "Optional active or paused" },
    examples: ["hybrid-axi hunting yara list", "hybrid-axi hunting yara list --status active --full"] },
  "hunting yara show": { description: "Experimental Labs: show own YARA rule by required positional ID", effect: "read", operation: "yaraShow", flags: { ...common, ...view },
    examples: ["hybrid-axi hunting yara show <id>", "hybrid-axi hunting yara show <id> --full"] },
  ...Object.fromEntries(["create", "update", "delete"].map((verb) => [`hunting yara ${verb}`, {
    description: `Experimental Labs: ${verb} own YARA rule; preview first, then --execute and exact --confirm.${verb === "update" ? " Partial POST; explicit reset_counter:true resets the all-time matches counter." : ""}`,
    effect: "write" as const, operation: `yara${verb[0]!.toUpperCase()}${verb.slice(1)}`,
    flags: { ...common, ...view, ...guards, ...(verb === "delete" ? {} : { "--body-file": "Required strict JSON body, at most 1 MiB; - reads stdin" }) },
    examples: [`hybrid-axi hunting yara ${verb}${verb === "create" ? "" : " <id>"}${verb === "delete" ? "" : " --body-file rule.json"}`, `hybrid-axi hunting yara ${verb} --help`],
  }])),
  "hunting matches": { description: "Experimental Labs: consuming GET marks returned matches delivered; preview sends no request; never automatically replayed", effect: "write", operation: "huntingMatches",
    flags: { ...common, ...view, ...guards, "--items-count": "Maximum returned matches; default 100, range 1-1000", "--search-after": "Optional RFC3339 date-time; only matches created after this timestamp" },
    examples: ["hybrid-axi hunting matches", "hybrid-axi hunting matches --items-count 20 --search-after 2026-01-01T00:00:00Z"] },
};
