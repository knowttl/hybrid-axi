import { AxiError, computeSessionStartHookUpdate, extractNpmShimScriptPath, type HookEntry } from "axi-sdk-js";
import { accessSync, constants, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify, type TomlTable } from "smol-toml";
import { catalogue } from "./catalogue.js";

function portableCommand(entry: string): string {
  const name = "hybrid-axi-hook";
  const extensions = process.platform === "win32" ? ["", ...(process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")] : [""];
  for (const directory of (process.env.PATH ?? process.env.Path ?? "").split(delimiter)) {
    for (const extension of extensions) {
      const candidate = resolve(directory || ".", `${name}${extension}`);
      try {
        if (!statSync(candidate).isFile()) continue;
        accessSync(candidate, constants.X_OK);
      } catch { continue; }
      try {
        if (realpathSync(candidate) === entry) return name;
        if (process.platform === "win32") {
          const target = extractNpmShimScriptPath(readFileSync(candidate, "utf8"));
          if (target && realpathSync(resolve(dirname(candidate), target)) === entry) return name;
        }
      } catch { return entry; }
      // The first executable wins PATH lookup, even if a later one is ours.
      return entry;
    }
  }
  return entry;
}

export function setupHooks(argv: string[]): Record<string, unknown> {
  const usage = (message = "Invalid hook setup command or flags"): never => { throw new AxiError(message, "VALIDATION_ERROR", [
    "Valid commands: setup hooks; valid flags: --scope user|project, --help",
  ]); };
  if (argv[0] !== "setup" || argv[1] !== "hooks") usage();
  let scope: "user" | "project" = "user";
  const seen = new Set<string>();
  for (let index = 2; index < argv.length; index++) {
    const flag = argv[index]!;
    if (!["--help", "--scope"].includes(flag) || seen.has(flag)) usage(`Unknown or duplicate flag: ${flag.split("=")[0]}`);
    seen.add(flag);
    if (flag === "--scope") {
      const value = argv[++index];
      if (value !== "user" && value !== "project") usage();
      scope = value as "user" | "project";
    }
  }
  if (seen.has("--help")) return { command: "setup hooks", ...catalogue["setup hooks"] };
  const entry = realpathSync(fileURLToPath(new URL("../../bin/hybrid-axi-hook.js", import.meta.url)));
  const marker = "hybrid-axi-hook";
  const home = homedir();
  const root = process.cwd();
  const codexHome = process.env.CODEX_HOME || join(home, ".codex");
  const claude = join(scope === "project" ? join(root, ".claude") : process.env.CLAUDE_CONFIG_DIR || join(home, ".claude"), "settings.json");
  const codex = join(scope === "project" ? join(root, ".codex") : codexHome, "hooks.json");
  const openCode = scope === "project" ? join(root, ".opencode") : join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "opencode");
  const command = portableCommand(entry);
  const shellCommand = command === marker ? command : `'${command.replaceAll("'", "'\\''")}'`;
  const failures: string[] = [];
  const update = (path: string, transform: (current: string) => string) => {
    try {
      const current = existsSync(path) ? readFileSync(path, "utf8") : "";
      const next = transform(current);
      if (current !== next) {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, next, "utf8");
      }
    } catch { failures.push(`Could not update ${path}; check permissions and configuration syntax, then rerun hybrid-axi setup hooks`); }
  };
  for (const path of [claude, codex]) {
    update(path, (current) => {
      const settings = current ? JSON.parse(current) : {};
      for (const group of settings.hooks?.SessionStart ?? []) {
        for (const hook of group.hooks ?? []) {
          if (Array.isArray(hook.args) && hook.args.some((arg: unknown) => typeof arg === "string" && arg.includes(marker))) hook.command = shellCommand;
        }
      }
      const [next] = computeSessionStartHookUpdate(settings, { marker, command: shellCommand });
      const hook = next.hooks!.SessionStart!.flatMap((group) => group.hooks ?? [])
        .find((hook) => hook.command === shellCommand)! as HookEntry & { args?: string[]; commandWindows?: string };
      delete hook.args;
      delete hook.commandWindows;
      if (process.platform === "win32") {
        if (path === claude) {
          hook.command = process.execPath;
          hook.args = [entry];
        } else {
          const argv = Buffer.from(JSON.stringify([process.execPath, entry])).toString("base64");
          const script = `$ErrorActionPreference = 'Stop'; $argv = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${argv}')) | ConvertFrom-Json; & $argv[0] $argv[1]; exit $LASTEXITCODE`;
          hook.commandWindows = `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(script, "utf16le").toString("base64")}`;
        }
      }
      return `${JSON.stringify(next, null, 2)}\n`;
    });
  }
  // The Codex feature switch belongs to user config even for project hooks.
  update(join(codexHome, "config.toml"), (current) => {
    const config = parse(current, { integersAsBigInt: true });
    const features = config.features ?? {};
    if (typeof features !== "object" || features === null || Array.isArray(features) || features instanceof Date) throw new Error("Invalid features table");
    const table = features as TomlTable;
    if (table.hooks === true) return current;
    table.hooks = true;
    config.features = table;
    return stringify(config);
  });
  const managedMarker = `axi-sdk-js managed opencode plugin: ${marker}`;
  update(join(openCode, "plugins/axi-hybrid-axi-hook.js"), (current) => {
    if (current && !current.includes(managedMarker)) throw new Error("Unmanaged plugin");
    return `// ${managedMarker}
import { execFile } from "node:child_process";

function ambientContext(directory) {
  const sessions = new Map();
  return (sessionID) => {
    if (!sessions.has(sessionID)) {
      sessions.set(sessionID, new Promise((resolve) => {
        execFile(${JSON.stringify(process.execPath)}, [${JSON.stringify(entry)}], { cwd: directory, timeout: 10000 }, (error, stdout) => {
          resolve(error ? "hybrid-axi: local profile status unavailable" : stdout.trim());
        });
      }));
    }
    return sessions.get(sessionID);
  };
}

export default {
  id: "axi-hybrid-axi-hook",
  async setup(ctx) {
    const context = ambientContext(ctx.location.directory);
    await ctx.session.hook("context", async (event) => {
      const text = await context(event.sessionID);
      if (text) event.system.push({ type: "text", text });
    });
  },
  async server({ directory }) {
    const context = ambientContext(directory);
    return { "experimental.chat.system.transform": async (input, output) => {
      const text = await context(input.sessionID);
      if (text) output.system.push(text);
    } };
  },
};
`;
  });
  if (failures.length) throw new AxiError("Agent hook setup did not complete", "HOOK_INSTALL_FAILED", failures);
  return { hooks: { status: "installed", scope, integrations: "Claude Code, Codex, OpenCode" },
    help: ["Restart your agent session; local context uses HYBRID_AXI_PROFILE and HYBRID_AXI_CONFIG from the session environment"] };
}
