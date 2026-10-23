import { z } from "zod";
import { hashResult, labsOverview, queryResult, queryStart, sample, stableOverview, termsResult } from "./search-contracts.js";

const common = {
  "--help": "Show help; default false",
  "--config": "Config path; default platform config",
  "--profile": "Profile name; default profile precedence",
  "--fields": "Comma-separated response fields; default compact fields",
  "--full": "Include all response fields; default false",
};

export const termNames = ["filename", "filetype", "filetype_desc", "env_id", "country", "verdict", "av_detect", "vx_family", "tag", "date_from", "date_to", "port", "host", "domain", "url", "similar_to", "context", "imp_hash", "ssdeep", "authentihash", "uses_tactic", "uses_technique"] as const;

export const searchCatalogue = {
  "hash show": {
    effect: "read",
    description: "Show stable SHA256 overview; --labs selects the experimental Labs overview",
    flags: { ...common, "--labs": "Experimental Labs overview; default false" },
    examples: ["hybrid-axi hash show <sha256>", "hybrid-axi hash show <sha256> --labs --full"],
  },
  "hash search": {
    effect: "read",
    description: "Find associated reports by hash, or deprecated bulk lookup from a newline-separated file",
    flags: { ...common, "--hash": "One MD5/SHA1/SHA256/SHA512; exactly one selector required", "--hashes-file": "Newline-separated MD5/SHA1/SHA256 file; deprecated bulk route" },
    examples: ["hybrid-axi hash search --hash <hash>", "hybrid-axi hash search --hashes-file <path>"],
  },
  "search terms": {
    effect: "read",
    description: "Search using at least one documented named filter",
    flags: { ...common, ...Object.fromEntries(termNames.map((name) => [`--${name.replaceAll("_", "-")}`, "Optional nonempty filter; default omitted"])) },
    examples: ["hybrid-axi search terms --filename invoice.exe", "hybrid-axi search terms --verdict 5 --port 443"],
  },
  "search run": {
    effect: "read",
    description: "Experimental Labs query: start once, then fetch asynchronous results once; resume pending queries by ID",
    flags: { ...common, "--query": "Required nonempty query", "--size": "Results per page or async total; default 50, range 1-200", "--page": "Synchronous page, ignored asynchronously; default 1, minimum 1", "--date-from": "Inclusive YYYY-MM-DD; default omitted", "--date-to": "Inclusive YYYY-MM-DD; default omitted" },
    examples: ["hybrid-axi search run --query 'verdict:malicious'", "hybrid-axi search run --query 'score:80+' --size 20 --page 2"],
  },
  "search results": {
    effect: "read",
    description: "Experimental Labs results for a known query ID; never starts a query",
    flags: common,
    examples: ["hybrid-axi search results <id>", "hybrid-axi search results <id> --full"],
  },
} as const;

export const searchBindings = {
  hashOverview: { effect: "read", method: "GET", path: "/api/v2/overview/{sha256}", operationId: "9981be6445da2c7e117a48dbc551f5f6", decoder: stableOverview },
  labsOverview: { effect: "read", method: "GET", path: "/api/labs/sample/{sha256}/overview", operationId: "adc7c9ebb1c46f92f13f1a4e8dd0c9c3", decoder: labsOverview },
  hashSearch: { effect: "read", method: "GET", path: "/api/v2/search/hash", operationId: "b972462c6d0d664b328b10b9e91da4c9", decoder: hashResult,
    query: z.strictObject({ hash: z.string().regex(/^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64}|[a-f\d]{128})$/i) }) },
  hashesSearch: { effect: "read", method: "POST", path: "/api/v2/search/hashes", operationId: "2f3268b2522562c9d49936fae22ea6c7", decoder: z.array(sample),
    body: z.strictObject({ "hashes[]": z.array(z.string().regex(/^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64})$/i)).min(1) }), bodyEncoding: "form" },
  termsSearch: { effect: "read", method: "POST", path: "/api/v2/search/terms", operationId: "5d7230cfa76c541818188ff3911bb6a2", decoder: termsResult,
    body: z.strictObject(Object.fromEntries(termNames.map((name) => [name, name === "verdict" ? z.number().int().min(1).max(5).optional()
      : name === "port" ? z.number().int().min(0).max(65535).optional() : z.string().trim().min(1).optional()]))).refine((value) => Object.values(value).some((entry) => entry !== undefined)), bodyEncoding: "form" },
  queryRun: { effect: "read", method: "POST", path: "/api/labs/search/query/run", operationId: "60367d88a168e925cc6be05b55565ab6", decoder: z.union([queryResult, queryStart]), retrySafe: false,
    body: z.strictObject({ query: z.string().trim().min(1), size: z.number().int().min(1).max(200), page: z.number().int().positive(), date_from: z.iso.date().optional(), date_to: z.iso.date().optional() }) },
  queryResults: { effect: "read", method: "GET", path: "/api/labs/search/query/{id}/results", operationId: "a385738306b200f7387851e538fe2e98", decoder: queryResult },
} as const;
