import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expect, test } from "vitest";

function repository(options: { missingBase?: boolean; missingBaseline?: boolean } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "hybrid-axi-selector-"));
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  };
  mkdirSync(join(directory, "scripts"));
  mkdirSync(join(directory, "test"));
  mkdirSync(join(directory, "src"));
  copyFileSync(resolve("scripts/test-changes.ts"), join(directory, "scripts/test-changes.ts"));
  writeFileSync(join(directory, "test/test-selection.test.ts"), "// Synthetic baseline\n");
  if (!options.missingBaseline) writeFileSync(join(directory, "test/packaged-cli.test.ts"), "// Synthetic baseline\n");
  git("init", "-b", "main");
  git("add", ".");
  git("-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
  if (!options.missingBase) git("update-ref", "refs/remotes/origin/main", "HEAD");
  return { directory, plan: () => spawnSync(process.execPath, ["scripts/test-changes.ts", "--plan"], { cwd: directory, encoding: "utf8" }),
    cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test("affected selection always includes the fixed baseline", () => {
  const fixture = repository();
  try {
    writeFileSync(join(fixture.directory, "src/feature.ts"), "export {};\n");
    const result = fixture.plan();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ mode: "affected-only", vitestArgs: ["related", "--run", "src/feature.ts", "test/packaged-cli.test.ts", "test/test-selection.test.ts"] });
  } finally { fixture.cleanup(); }
});

test.each(["package.json", "pnpm-lock.yaml", ".no-mistakes.yaml", "scripts/selector.mjs", "inventory/specs.json", "specs/v2.json", "test/support/guard.mjs"])("shared change runs the full suite: %s", (path) => {
  const fixture = repository();
  try {
    mkdirSync(dirname(join(fixture.directory, path)), { recursive: true });
    writeFileSync(join(fixture.directory, path), "{}\n");
    const result = fixture.plan();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ mode: "full-suite", vitestArgs: ["run"] });
  } finally { fixture.cleanup(); }
});

test.each([
  { missingBase: true, error: "Cannot compute changed files" },
  { missingBaseline: true, error: "Required baseline is missing" },
])("selection fails closed: $error", ({ error, ...options }) => {
  const fixture = repository(options);
  try {
    const result = fixture.plan();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
    expect(result.stdout).toBe("");
  } finally { fixture.cleanup(); }
});
