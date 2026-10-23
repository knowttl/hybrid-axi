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
    description: "Show stable SHA256 overview; --labs selects the experimental Labs overview",
    flags: { ...common, "--labs": "Experimental Labs overview; default false" },
    examples: ["hybrid-axi hash show <sha256>", "hybrid-axi hash show <sha256> --labs --full"],
  },
  "hash search": {
    description: "Find associated reports by hash, or deprecated bulk lookup from a newline-separated file",
    flags: { ...common, "--hash": "One MD5/SHA1/SHA256/SHA512; exactly one selector required", "--hashes-file": "Newline-separated MD5/SHA1/SHA256 file; deprecated bulk route" },
    examples: ["hybrid-axi hash search --hash <hash>", "hybrid-axi hash search --hashes-file <path>"],
  },
  "search terms": {
    description: "Search using at least one documented named filter",
    flags: { ...common, ...Object.fromEntries(termNames.map((name) => [`--${name.replaceAll("_", "-")}`, "Optional nonempty filter; default omitted"])) },
    examples: ["hybrid-axi search terms --filename invoice.exe", "hybrid-axi search terms --verdict 5 --port 443"],
  },
  "search run": {
    description: "Experimental Labs query: start once, then fetch asynchronous results once; resume pending queries by ID",
    flags: { ...common, "--query": "Required nonempty query", "--size": "Results per page or async total; default 50, range 1-200", "--page": "Synchronous page, ignored asynchronously; default 1, minimum 1", "--date-from": "Inclusive YYYY-MM-DD; default omitted", "--date-to": "Inclusive YYYY-MM-DD; default omitted" },
    examples: ["hybrid-axi search run --query 'verdict:malicious'", "hybrid-axi search run --query 'score:80+' --size 20 --page 2"],
  },
  "search results": {
    description: "Experimental Labs results for a known query ID; never starts a query",
    flags: common,
    examples: ["hybrid-axi search results <id>", "hybrid-axi search results <id> --full"],
  },
} as const;

export const searchBindings = {
  hashOverview: { api: "v2", method: "GET", path: "/overview/{sha256}", operationId: "9981be6445da2c7e117a48dbc551f5f6" },
  labsOverview: { api: "labs", method: "GET", path: "/sample/{sha256}/overview", operationId: "adc7c9ebb1c46f92f13f1a4e8dd0c9c3" },
  hashSearch: { api: "v2", method: "GET", path: "/search/hash", operationId: "b972462c6d0d664b328b10b9e91da4c9" },
  hashesSearch: { api: "v2", method: "POST", path: "/search/hashes", operationId: "2f3268b2522562c9d49936fae22ea6c7" },
  termsSearch: { api: "v2", method: "POST", path: "/search/terms", operationId: "5d7230cfa76c541818188ff3911bb6a2" },
  queryRun: { api: "labs", method: "POST", path: "/search/query/run", operationId: "60367d88a168e925cc6be05b55565ab6", singleSend: true },
  queryResults: { api: "labs", method: "GET", path: "/search/query/{id}/results", operationId: "a385738306b200f7387851e538fe2e98" },
} as const;
