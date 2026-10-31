import { TransportError, type RequestOptions, type Transport } from "./transport-core.js";
import { parseReport, reportCommand } from "./reports.js";
import { suggestion } from "./catalogue.js";

export function createSession(transport: Transport) {
  async function quota() {
    const key = await transport.request("key.current", { retry: false });
    const quota = await transport.request("key.submission-quota", { retry: false });
    return { keyLevel: (key.body as { auth_level_name: string }).auth_level_name,
      quota: quota.body, rateLimits: { key: key.rateLimits, quota: quota.rateLimits } };
  }
  return {
    quota,
    async home(selectors: { config?: string; profile?: string }) {
      const account = await quota();
      const args = ["feed", "detonation", "--limit", "5"];
      if (selectors.config) args.push("--config", selectors.config);
      if (selectors.profile) args.push("--profile", selectors.profile);
      try {
        const parsed = parseReport(args)!;
        parsed.request = { ...parsed.request, retry: false };
        return { ...account, status: "live", feed: await reportCommand(parsed, transport),
          scope: "Recent public detonation feed, not account submissions; at most five of up to 250 upstream rows",
          help: [suggestion("feed detonation", selectors.config, selectors.profile), suggestion("home", selectors.config, selectors.profile) + " --offline"] };
      } catch (error) {
        if (!(error instanceof TransportError)) throw error;
        return { ...account, status: "partial", feed: { status: "unavailable", ...error.toJSON() },
          help: [suggestion("feed detonation", selectors.config, selectors.profile), suggestion("home", selectors.config, selectors.profile) + " --offline"] };
      }
    },
    async doctor() {
      const result = await quota();
      const hash = "0".repeat(64);
      const reads: { group: string; operation: string; input?: RequestOptions }[] = [
        { group: "system", operation: "system version" },
        { group: "report", operation: "report state", input: { pathParams: { id: `${hash}:120` } } },
        { group: "search", operation: "termsSearch", input: { body: { filename: "hybrid-axi-doctor-probe" } } },
        { group: "feed", operation: "feed detonation" },
        { group: "hash", operation: "hashSearch", input: { query: { hash } } },
      ];
      const probes: { group: string; operation: string; status: string }[] = [];
      for (const { group, operation, input } of reads) {
        let status = "ok";
        try { await transport.request(operation, { ...input, retry: false }); }
        catch (error) {
          if (!(error instanceof TransportError) || ![403, 404].includes(error.error.status ?? 0)) throw error;
          status = error.error.status === 403 ? "permission-denied" : "not-found";
        }
        probes.push({ group, operation, status });
      }
      return { ...result, status: probes.some((probe) => probe.status === "permission-denied") ? "permission-denied" : "ok", probes,
        scope: "One read per command group; other operations remain unverified. A not-found probe does not establish access.",
        help: ["Each probe uses API quota"] };
    },
  };
}
