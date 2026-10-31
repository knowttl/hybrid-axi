import net from "node:net";
import dgram from "node:dgram";
import dns from "node:dns";
import childProcess from "node:child_process";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { syncBuiltinESMExports } from "node:module";

const stateKey = Symbol.for("hybrid-axi.test-network");
const state = (globalThis as typeof globalThis & {
  [stateKey]: { ports: Set<number>; connect: typeof net.Socket.prototype.connect };
})[stateKey] ??= { ports: new Set<number>(), connect: net.Socket.prototype.connect };
const deny = () => { throw new Error("Network access is disabled during offline validation"); };
// These monkeypatches replace Node overloads and promisify metadata at runtime.
net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
  const values = Array.isArray(args[0]) ? args[0] : args;
  const options = values[0];
  const port = typeof options === "object" ? (options as net.TcpNetConnectOpts).port : options;
  const host = typeof options === "object" ? (options as net.TcpNetConnectOpts).host : values[1];
  if (host !== "127.0.0.1" || !state.ports.has(Number(port))) return deny();
  return Reflect.apply(state.connect, this, args);
};
dgram.Socket.prototype.send = deny;
dns.lookup = function (host: string, options: dns.LookupOptions | dns.LookupOneOptions | ((...args: unknown[]) => void), callback?: (...args: unknown[]) => void) {
  if (host !== "127.0.0.1") return deny();
  const done = (typeof options === "function" ? options : callback)!;
  queueMicrotask(() => (options as dns.LookupOptions)?.all ? done(null, [{ address: "127.0.0.1", family: 4 }]) : done(null, "127.0.0.1", 4));
} as unknown as typeof dns.lookup;
for (const name of ["resolve", "resolve4", "resolve6", "resolveAny", "resolveCaa", "resolveCname", "resolveMx",
  "resolveNaptr", "resolveNs", "resolvePtr", "resolveSoa", "resolveSrv", "resolveTxt", "reverse"] as const) {
  (dns as unknown as Record<typeof name, typeof deny>)[name] = deny;
  dns.promises[name] = deny;
  (dns.Resolver.prototype as unknown as Record<typeof name, typeof deny>)[name] = deny;
  dns.promises.Resolver.prototype[name] = deny;
}
dns.promises.lookup = deny;
globalThis.fetch = deny;

// Every Node descendant inherits the preload even when a test supplies a fresh
// environment. Native tools are limited to the local packaging/git operations
// needed by the baseline; arbitrary programs and shells cannot bypass the guard.
const preload = `--import=${fileURLToPath(import.meta.url)}`;
for (const name of ["spawn", "spawnSync", "execFile", "execFileSync"] as const) {
  const original = childProcess[name];
  (childProcess as unknown as Record<typeof name, typeof replacement>)[name] = replacement;
  function replacement(this: typeof childProcess, file: string, args: string[] = [], options: childProcess.SpawnOptions | ((...args: unknown[]) => void) = {}, ...rest: unknown[]) {
    if (!Array.isArray(args)) return deny();
    if (typeof options === "function") { rest.unshift(options); options = {}; }
    const command = basename(file);
    const node = file === process.execPath || command === "node";
    let index = 0;
    while (args[index] === "-c" && /^(user.name|user.email|commit.gpgsign)=/.test(args[index + 1] ?? "")) index += 2;
    const git = command === "git" && ["init", "add", "commit", "update-ref", "diff", "merge-base", "ls-files"].includes(args[index]!);
    const npm = command === "npm" && (args[0] === "pack" || args[0] === "install" && args.includes("--offline")) && args.includes("--ignore-scripts");
    if (options.shell || !node && !git && !npm) return deny();
    const env = { ...(options.env ?? process.env) };
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ""} ${preload}`.trim();
    return Reflect.apply(original, this, [file, args, { ...options, env }, ...rest]);
  }
}
childProcess.exec = deny as unknown as typeof childProcess.exec;
childProcess.execSync = deny;
const fork = childProcess.fork;
childProcess.fork = function (this: typeof childProcess, modulePath: string | URL, args: string[] = [], options: childProcess.ForkOptions = {}) {
  const env = { ...(options.env ?? process.env) };
  env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ""} ${preload}`.trim();
  return fork.call(this, modulePath, args, { ...options, env });
} as unknown as typeof childProcess.fork;
syncBuiltinESMExports();

export function allowFakeServer(server: net.Server) {
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") return deny();
  state.ports.add(address.port);
  return () => state.ports.delete(address.port);
}
