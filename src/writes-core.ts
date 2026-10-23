import { createHash, randomUUID } from "node:crypto";
import { lstatSync } from "node:fs";
import { isAbsolute, join, win32 } from "node:path";
import { z } from "zod";
import { credentialStore, type CredentialContext } from "./profiles.js";
import { privateFiles } from "./private-file.js";
import { constructTransport, TransportError, type OperationBinding, type RequestOptions, type Transport } from "./transport-core.js";

// Domain definitions own strict input schemas, exact target selectors, warnings
// and read-back commands. Inventory entries alone never grant write access.
export type MutationOperation = Readonly<{
  input: z.ZodType;
  prepare(input: unknown): {
    target: Readonly<Record<string, string | number | boolean>>;
    request: Pick<RequestOptions, "pathParams" | "query" | "body">;
  };
  current?: (transport: Transport, input: unknown) => Promise<{ state: unknown; noop?: boolean }>;
  effect: string;
  warnings?: readonly string[];
  readBackHelp: readonly string[];
}>;
export type MutationPreview = Readonly<{
  profile: string; operation: string; target: Readonly<Record<string, string | number | boolean>>;
  digest: string; effect: string; current: unknown; proposed: unknown;
  confirm: string; noop: boolean; warnings: readonly string[];
}>;
export type WriteCoordinatorOptions = {
  config?: string; profile?: string; readOnly?: boolean;
  approval?: (preview: MutationPreview) => boolean | Promise<boolean>;
};
export type MutationOptions = { execute?: boolean; dryRun?: boolean; confirm?: string; intentId?: string };

function canonical(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, normalize(child)]));
    return item;
  };
  try {
    // First enforce JSON semantics, including toJSON, before ordering keys.
    return JSON.stringify(normalize(JSON.parse(JSON.stringify(value))));
  } catch {
    throw new TransportError({ code: "VALIDATION_ERROR", message: "Write input and state must be JSON serializable", operation: "writes" });
  }
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const auditRecord = z.strictObject({
  kind: z.enum(["intent", "outcome"]), time: z.iso.datetime(), auditId: z.uuid(),
  intentKey: z.string().regex(/^[a-f0-9]{64}$/), profile: z.string(), operation: z.string(),
  target: z.string().regex(/^[a-f0-9]{64}$/), effect: z.literal("write"),
  status: z.number().int().min(100).max(599).optional(),
  result: z.enum(["SUCCESS", "FAILED", "NOT_SENT", "OUTCOME_UNKNOWN"]).optional(),
}).superRefine((record, context) => {
  const validOutcome = record.result === "SUCCESS" ? record.status !== undefined && record.status >= 200 && record.status < 300
    : record.result === "FAILED" ? record.status !== undefined && record.status >= 300
      : (record.result === "NOT_SENT" || record.result === "OUTCOME_UNKNOWN") && record.status === undefined;
  if (record.kind === "intent" ? record.status !== undefined || record.result !== undefined : !validOutcome) {
    context.addIssue({ code: "custom", message: "Invalid journal record" });
  }
});

// Production supplies the closed catalogue and native fetch. Tests inject only
// synthetic operations and genuine external boundaries.
export function constructWriteCoordinator(options: WriteCoordinatorOptions, dependencies: {
  operations: Readonly<Record<string, MutationOperation>>;
  bindings: Readonly<Record<string, OperationBinding>>;
  fetch: typeof globalThis.fetch;
  credentials?: CredentialContext;
  files?: ReturnType<typeof privateFiles>;
}) {
  options = { ...options };
  const store = credentialStore(dependencies.credentials);
  const profile = store.select(store.load(options.config).config, options.profile);
  const forced = store.readOnly() || options.readOnly === true;
  const scope = Object.freeze({ profile: profile.name, origin: profile.origin,
    allowWrites: profile.source !== "env-profile" && profile.writes.allowWrites,
    operations: Object.freeze([...profile.writes.operations]) });
  const definitions = Object.fromEntries(Object.entries(dependencies.operations).map(([name, definition]) =>
    [name, { ...definition, warnings: [...(definition.warnings ?? [])], readBackHelp: [...definition.readBackHelp] }]));
  const bindings = Object.fromEntries(Object.entries(dependencies.bindings).map(([name, binding]) => [name, { ...binding }]));
  const env = dependencies.credentials?.env ?? process.env;
  const override = env.HYBRID_AXI_WRITE_LOG;
  const platform = dependencies.credentials?.platform ?? process.platform;
  if (override !== undefined && (!override.trim() || !(platform === "win32" ? /^[A-Za-z]:[\\/]/.test(override) : isAbsolute(override)))) {
    throw new TransportError({ code: "CONFIG_INVALID", message: "HYBRID_AXI_WRITE_LOG must be a nonblank absolute path", operation: "writes" });
  }
  const journalPath = override ?? (platform === "win32" ? win32.join : join)(store.statePath(), "writes.log");
  const files = dependencies.files ?? privateFiles(dependencies.credentials);
  let transport: ReturnType<typeof constructTransport> | undefined;
  const authorizations = new WeakMap<object, string>();
  function sender() {
    return transport ??= constructTransport({ credential: { ...store.credentials(profile), redact: (value) => store.redactor.payload(value) }, origin: scope.origin }, {
      bindings, fetch: dependencies.fetch,
      consumeWriteAuthorization(authorization, request) {
        if (!authorization || typeof authorization !== "object") return false;
        const expected = authorizations.get(authorization);
        authorizations.delete(authorization);
        return expected !== undefined && expected === canonical(request);
      },
    });
  }
  function fail(code: string, message: string, operation: string, help: readonly string[] = [], auditId?: string): never {
    throw new TransportError(store.redactor.payload({ code, message, operation, ...(auditId ? { auditId } : {}) }) as TransportError["error"],
      store.redactor.payload(help) as string[]);
  }
  function record(value: z.infer<typeof auditRecord>, help: readonly string[]): void {
    let release: (() => void) | undefined;
    try {
      release = files.lock(`${journalPath}.lock`);
      let contents = "";
      try { lstatSync(journalPath); contents = files.read(journalPath, true); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      if (contents && !contents.endsWith("\n")) throw new Error("Incomplete journal");
      const records = contents ? contents.slice(0, -1).split("\n").map((line) => auditRecord.parse(JSON.parse(line))) : [];
      const intents = new Map<string, z.infer<typeof auditRecord>>();
      const outcomes = new Set<string>();
      for (const prior of records) {
        if (prior.kind === "intent") {
          if (intents.has(prior.intentKey)) throw new Error("Duplicate intent");
          intents.set(prior.intentKey, prior);
        } else {
          const intent = intents.get(prior.intentKey);
          if (!intent || outcomes.has(prior.intentKey) || intent.auditId !== prior.auditId
            || intent.profile !== prior.profile || intent.operation !== prior.operation || intent.target !== prior.target) throw new Error("Invalid outcome");
          outcomes.add(prior.intentKey);
        }
      }
      const prior = intents.get(value.intentKey);
      if (value.kind === "intent" && prior) {
        fail("ALREADY_EXECUTED", "Intent was already reserved; reconcile it without replay", value.operation, help, prior.auditId);
      }
      if (value.kind === "outcome" && (!prior || outcomes.has(value.intentKey))) throw new Error("Missing intent");
      files.write(journalPath, `${contents}${JSON.stringify(auditRecord.parse(store.redactor.payload(value)))}\n`);
      release();
      release = undefined;
    } catch (error) {
      if (error instanceof TransportError && error.error.code === "ALREADY_EXECUTED") throw error;
      fail(value.kind === "intent" ? "INTENT_NOT_RECORDED" : "OUTCOME_UNKNOWN",
        value.kind === "intent" ? "Intent could not be recorded; operation was not sent" : "Outcome could not be recorded; remote success is possible",
        value.operation, ["Reconcile the private journal and any remaining lock manually; never replay an unresolved intent", ...help], value.auditId);
    } finally {
      // A failed release leaves a fail-closed lock for manual reconciliation.
      if (release) { try { release(); } catch { /* Preserve the journal failure. */ } }
    }
  }

  async function run(operation: string, input: unknown, flags: MutationOptions = {}) {
    flags = { ...flags };
    const definition = Object.hasOwn(definitions, operation) ? definitions[operation] : undefined;
    if (!definition || bindings[operation]?.effect !== "write") fail("OPERATION_BLOCKED", "Operation has no reviewed write binding", operation);
    const parsed = definition!.input.safeParse(input);
    if (!parsed.success) fail("VALIDATION_ERROR", "Invalid write input; check the named operation's schema", operation);
    const data = JSON.parse(canonical(parsed.data)) as unknown;
    const prepared = definition!.prepare(structuredClone(data));
    const request = JSON.parse(canonical(prepared.request)) as RequestOptions;
    const target = JSON.parse(canonical(prepared.target)) as MutationPreview["target"];
    if (!Object.keys(target).length || Object.values(target).some((value) =>
      typeof value === "string" ? !value.trim() : typeof value !== "boolean" && (typeof value !== "number" || !Number.isFinite(value)))) {
      fail("VALIDATION_ERROR", "An exact write target is required", operation);
    }
    if (flags.execute && flags.dryRun) fail("VALIDATION_ERROR", "--execute and --dry-run are mutually exclusive", operation);
    const enforce = () => {
      if (forced || store.readOnly() || !scope.allowWrites) fail("WRITES_DISABLED", "Writes are disabled for the selected profile", operation);
      if (!scope.operations.includes(operation)) fail("OPERATION_NOT_WRITABLE", "Operation is outside the configured write scope", operation);
    };
    enforce();
    const connection = sender();
    const { effect: _effect, ...identity } = connection.prepare(operation, request);
    const targetDigest = digest(canonical({ profile: scope.profile, origin: scope.origin, target, request: identity }));
    const confirm = canonical([scope.profile, operation, target, targetDigest]);
    const reader: Transport = { request: async (name, options) => {
      if (connection.prepare(name, options).effect !== "read") fail("OPERATION_BLOCKED", "State readers cannot send writes", operation);
      return connection.request(name, options);
    } };
    const current = await definition!.current?.(reader, structuredClone(data));
    const state = canonical(current?.state ?? null);
    const preview = store.redactor.payload({ profile: scope.profile, operation, target, digest: targetDigest,
      effect: definition!.effect, current: current?.state ?? null, proposed: request, confirm,
      noop: current?.noop === true, warnings: definition!.warnings }) as MutationPreview;
    if (!flags.execute) return { kind: "dry-run" as const, preview };
    if (preview.noop) return { kind: "noop" as const, preview };
    // A redacted target cannot safely authorize its different original value.
    if (preview.confirm !== confirm) fail("CONFIRM_UNSAFE", "Target contains credential material; choose a safe target", operation);
    if (flags.confirm !== confirm) fail(flags.confirm === undefined ? "CONFIRM_REQUIRED" : "CONFIRM_MISMATCH", "Pass --confirm equal to the exact preview confirmation", operation);
    if (options.approval && !await options.approval(structuredClone(preview))) fail("APPROVAL_DENIED", "Host approval was denied", operation);
    enforce();
    if (flags.intentId !== undefined && !flags.intentId.trim()) fail("VALIDATION_ERROR", "Intent ID must not be blank", operation);
    const auditId = randomUUID();
    const meta = { auditId, intentKey: digest(flags.intentId ?? auditId), profile: scope.profile, operation,
      target: targetDigest, effect: "write" as const };
    const help = definition!.readBackHelp;
    const append = (kind: "intent" | "outcome", result?: z.infer<typeof auditRecord>["result"], status?: number) => record({ ...meta, kind,
      time: new Date().toISOString(), ...(result === undefined ? {} : { result }), ...(status === undefined ? {} : { status }) }, help);
    append("intent");
    try {
      const fresh = await definition!.current?.(reader, structuredClone(data));
      if (canonical(fresh?.state ?? null) !== state) fail("PREVIEW_CHANGED", "Target changed after preview; review it again", operation, help, auditId);
      enforce();
    } catch (error) { append("outcome", "NOT_SENT"); throw error; }
    const authorization = Object.freeze({});
    authorizations.set(authorization, canonical(identity));
    let response: Awaited<ReturnType<Transport["request"]>>;
    try { response = await connection.request(operation, { ...request, retry: false, authorization }); }
    catch (error) {
      const upstream = error instanceof TransportError ? error : undefined;
      const status = upstream?.error.status;
      const unknown = status === undefined;
      append("outcome", unknown ? "OUTCOME_UNKNOWN" : status >= 200 && status < 300 ? "SUCCESS" : "FAILED", status);
      if (unknown) fail("OUTCOME_UNKNOWN", "Operation may have succeeded; never replay this intent", operation, help, auditId);
      throw new TransportError(store.redactor.payload({ ...upstream!.error, auditId }) as TransportError["error"],
        store.redactor.payload([...upstream!.help, ...help]) as string[]);
    } finally { authorizations.delete(authorization); }
    append("outcome", "SUCCESS", response.status);
    return { kind: "success" as const, preview, auditId, status: response.status, response: store.redactor.payload(response.body), help };
  }
  return { scope, run };
}
