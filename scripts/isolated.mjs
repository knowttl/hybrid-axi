import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const home = mkdtempSync(join(tmpdir(), "hybrid-axi-validation-"));
try {
  const [command, ...args] = process.argv.slice(2);
  if (!command) throw new Error("A validation command is required");
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("HYBRID_AXI_")));
  const result = spawnSync(command, args, {
    stdio: "inherit",
    // Reuse only dependency caches; all profile, agent and application state stays isolated.
    env: { ...env, COREPACK_ENABLE_NETWORK: "0",
      COREPACK_HOME: env.COREPACK_HOME ?? join(homedir(), ".cache/node/corepack"),
      npm_config_store_dir: env.npm_config_store_dir ?? join(env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "pnpm/store"),
      HOME: home, USERPROFILE: home, APPDATA: join(home, "AppData/Roaming"),
      CODEX_HOME: join(home, ".codex"), CLAUDE_CONFIG_DIR: join(home, ".claude"),
      LOCALAPPDATA: join(home, "AppData/Local"), XDG_CONFIG_HOME: join(home, ".config"),
      XDG_DATA_HOME: join(home, ".local/share"), XDG_CACHE_HOME: join(home, ".cache"),
      XDG_STATE_HOME: join(home, ".local/state") },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(home, { recursive: true, force: true });
}
