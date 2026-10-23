import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";

const generate = process.argv[2] === "--generate";
if (!generate && process.argv[2] !== "--check") throw new Error("Use --generate or --check");
const sources = JSON.parse(readFileSync("inventory/specs.json", "utf8"));
const design = readFileSync("docs/design.md", "utf8");
const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);
const operations = [];

function artifact(path, content) {
  if (generate) writeFileSync(path, content);
  else if (readFileSync(path, "utf8") !== content) throw new Error(`Stale generated artifact: ${path}`);
}

function checkRefs(value) {
  if (!value || typeof value !== "object") return;
  if (typeof value.$ref === "string" && !value.$ref.startsWith("#/")) throw new Error("External $ref is forbidden");
  for (const child of Object.values(value)) checkRefs(child);
}

if (sources.length !== 2 || sources[0].id !== "v2" || sources[1].id !== "labs") throw new Error("Expected stable and Labs sources");
if (generate) mkdirSync("src/generated", { recursive: true });
for (const source of sources) {
  const bytes = readFileSync(`specs/${source.id}.json`);
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error(`Pinned specification hash mismatch: ${source.id}`);
  const spec = JSON.parse(bytes);
  checkRefs(spec);
  if (spec.openapi !== "3.0.0" || spec.info.version !== source.version) throw new Error(`Specification version mismatch: ${source.id}`);
  const heading = source.id === "v2" ? "### Stable 2.38.0" : "### Labs 1.0.0 - experimental";
  const section = design.split(`${heading}\n`)[1]?.split(/\n## /)[0];
  if (!section) throw new Error(`Missing design ledger: ${source.id}`);
  const ledger = [...section.split("\n### ")[0].matchAll(/^\| `([^`]+)` \| `([A-Z]+) ([^`]+)` \| (read|write|blocked) \| (.*?) \| (.*?) \|$/gm)];
  const seen = new Set();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      const matches = ledger.filter((row) => row[1] === operation.operationId && row[2] === method.toUpperCase() && row[3] === path);
      if (matches.length !== 1) throw new Error(`Operation needs exactly one classification: ${method} ${path}`);
      if (seen.has(operation.operationId)) throw new Error(`Duplicate operation ID: ${operation.operationId}`);
      seen.add(operation.operationId);
      const row = matches[0];
      const plannedCommands = row[5] === "-" ? [] : row[5].replaceAll("`", "").split(" / ");
      if ((row[4] === "blocked") !== (plannedCommands.length === 0)) throw new Error("Blocked operation cannot have a planned command");
      operations.push({ source: source.id, sourceSha256: source.sha256, operationId: operation.operationId,
        method: method.toUpperCase(), path, disposition: row[4], plannedCommands, reason: row[6] });
    }
  }
  const expected = source.id === "v2" ? 53 : 9;
  if (seen.size !== expected || source.operations !== expected || ledger.length !== expected) throw new Error(`Incomplete ledger: ${source.id}`);
  artifact(`src/generated/${source.id}.d.ts`, astToString(await openapiTS(spec)));
}
const counts = Object.fromEntries(["read", "write", "blocked"].map((kind) => [kind, operations.filter((op) => op.disposition === kind).length]));
if (operations.length !== 62 || counts.read !== 39 || counts.write !== 12 || counts.blocked !== 11) throw new Error("Inventory differs from the accepted 62-operation scope");
artifact("inventory/capabilities.json", `${JSON.stringify({ schemaVersion: 1, sources, operations }, null, 2)}\n`);
console.log(`${generate ? "Generated" : "Verified"} pinned specs, declarations and 62 classifications: ${JSON.stringify(counts)}`);
