import { z } from "zod";
import type { OperationBinding } from "./transport-core.js";
import type { MutationOperation } from "./writes-core.js";

export const downloadWarnings = [
  "Live-malware warning: this artifact may contain executable malware. Save only; do not extract or execute.",
  "The spec documents gzip/ZIP delivery without promising password protection. Protection is unverified; bytes are saved exactly as provided.",
] as const;

export const guardedArtifacts = {
  bin: { operation: "report-download-bin", path: "/report/{id}/sample", operationId: "c674755592ec02c64ad836ae12d6d7bf" },
  "dropped-files": { operation: "report-download-dropped-files", path: "/report/{id}/dropped-files-v2", operationId: "62a8676fdd00f35e04945f2f0b4ad07d" },
  memory: { operation: "report-download-memory", path: "/report/{id}/file/memory", operationId: "7e872c46c1a5638b701b09cc68e03565" },
} as const;
const definitions = [
  ...Object.entries(guardedArtifacts).map(([type, entry]) => ({ ...entry, type, selector: "id" as const })),
  { operation: "hash-download-bin", path: "/overview/{sha256}/sample", operationId: "f0861f681445a6b6dd6f1b9964cee1b8", type: "bin", selector: "sha256" as const },
];
export const downloadBindings: Readonly<Record<string, OperationBinding>> = Object.fromEntries(definitions.map((entry) => [entry.operation, {
  method: "GET", path: `/api/v2${entry.path}`, operationId: entry.operationId, effect: "write", download: true,
  decoder: z.instanceof(Uint8Array), requiredKeyLevel: "default",
}]));
export const downloadOperations: Readonly<Record<string, MutationOperation>> = Object.fromEntries(definitions.map((entry) => [entry.operation, {
  input: z.strictObject({ id: z.string().regex(entry.selector === "sha256" ? /^[a-f\d]{64}$/i : /^(?:[A-Za-z0-9_-]{1,256}|[a-f\d]{64}:\d+)$/i), output: z.string().min(1) }),
  prepare(input) {
    const { id, output } = input as { id: string; output: string };
    return { target: { [entry.selector]: id, type: entry.type, output }, request: { pathParams: { [entry.selector]: id } } };
  },
  effect: "Download one potentially live-malware artifact to the exact destination, unchanged",
  warnings: [...downloadWarnings, ...(entry.type === "memory" ? ["Process memory uses the deprecated /report/{id}/file/{type} route."] : [])],
  readBackHelp: ["Inspect the exact destination and private journal before deciding on a new download; never replay an unresolved intent"],
}]));

export const downloadFlags = {
  "--execute": "Execute once after exact confirmation; default preview only",
  "--dry-run": "Preview only; mutually exclusive with --execute",
  "--confirm": "Exact confirmation string from the preview, binding profile, ID, type and destination",
};
export const hashDownloadCatalogue = {
  "hash file": {
    effect: "write" as const,
    description: `Save one guarded sample unchanged to a new private file, bounded at 250 MiB. ${downloadWarnings.join(" ")}`,
    flags: { "--help": "Show help; default false", "--config": "Config path; default platform config", "--profile": "Profile name; default profile precedence",
      "--output": "Required new file in an existing directory; never stdout or overwrite", ...downloadFlags },
    examples: ["hybrid-axi hash file <sha256> --output sample.gz", "hybrid-axi hash file <sha256> --output sample.gz --execute --confirm '<exact preview confirmation>'"],
  },
};
