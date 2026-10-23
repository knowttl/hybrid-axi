import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(`Cannot compute changed files: git ${args.join(" ")} failed`);
  return result.stdout;
}

try {
  const base = git(["merge-base", "origin/main", "HEAD"]).trim();
  if (!base) throw new Error("Cannot compute changed files: merge base is empty");
  const changed = [...new Set([
    ...git(["diff", "--name-only", "-z", base, "--"]).split("\0"),
    ...git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
  ].filter(Boolean))];
  const baseline = ["test/packaged-cli.test.ts", "test/test-selection.test.ts"];
  for (const path of baseline) if (!existsSync(path)) throw new Error(`Required baseline is missing: ${path}`);
  const full = changed.some((path) => /^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*\.json|vitest\.config\.[^/]+|\.no-mistakes\.yaml)$/.test(path)
    || /^(scripts\/|specs\/|inventory\/|test\/(support|fixtures)\/)/.test(path));
  const vitestArgs = full ? ["run"] : ["related", "--run", ...new Set([...changed, ...baseline])];
  if (process.argv.includes("--plan")) console.log(JSON.stringify({ mode: full ? "full-suite" : "affected-only", changed, baseline, vitestArgs }));
  else {
    console.log(`Test mode: ${full ? "full-suite" : "affected-only"}; baseline: ${baseline.join(", ")}`);
    const root = new URL("../", import.meta.url);
    const guard = fileURLToPath(new URL("../test/support/deny-network.mjs", import.meta.url));
    for (const [entry, ...args] of [
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
      ["node_modules/vitest/vitest.mjs", ...vitestArgs],
      ["scripts/specs.mjs", "--check"],
      ["scripts/generate-docs.mjs", "--check"],
    ]) {
      const result = spawnSync(process.execPath, ["--import", guard, fileURLToPath(new URL(entry, root)), ...args], {
        stdio: "inherit", env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${guard}`.trim() },
      });
      if (result.error) throw result.error;
      if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
