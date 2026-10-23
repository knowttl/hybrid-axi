import type { z } from "zod";

export const HYBRID_ORIGIN = "https://hybrid-analysis.com";
export type Credential = Readonly<{ apiKey: string; redact: (value: unknown) => unknown }>;
export type OperationBinding = Readonly<{
  method: "GET" | "POST" | "DELETE";
  path: string;
  effect: "read" | "write";
  decoder: z.ZodType;
  query?: z.ZodType<Record<string, string | number | boolean | undefined>>;
  body?: z.ZodType;
  bodyEncoding?: "form";
  retrySafe?: boolean;
  download?: boolean;
  requiredKeyLevel?: string;
}>;
export type RequestOptions = {
  pathParams?: Readonly<Record<string, string>>;
  query?: Readonly<Record<string, string | number | boolean>>;
  body?: unknown;
  retry?: false;
  signal?: AbortSignal;
  authorization?: unknown;
};
export type Transport = {
  request(operation: string, options?: RequestOptions): Promise<{ status: number; body: unknown; rateLimits: Record<string, unknown> }>;
};
export type PreparedRequest = Readonly<{ operation: string; method: string; url: string; body?: string; effect: "read" | "write" }>;
export class TransportError extends Error {
  constructor(readonly error: {
    code: string; message: string; operation: string; status?: number; keyLevel?: string;
    requiredKeyLevel?: string; retryAfter?: number; rateLimits?: Record<string, unknown>; auditId?: string;
  }, readonly help: readonly string[] = []) {
    super(error.message);
    this.name = "TransportError";
  }
  toJSON() { return { error: this.error, ...(this.help.length ? { help: this.help } : {}) }; }
}

// Internal construction seam: production supplies the executable catalogue and native
// fetch; tests route already validated logical URLs to their own HTTPS service.
export function constructTransport(options: { credential: Credential; origin?: string }, dependencies: {
  bindings: Readonly<Record<string, OperationBinding>>;
  fetch: typeof globalThis.fetch;
  now?: () => number;
  consumeWriteAuthorization?: (authorization: unknown, request: { operation: string; method: string; url: string; body?: string }) => boolean;
}): Transport & { prepare(operation: string, options?: RequestOptions): PreparedRequest } {
  const fail = (code: string, message: string, operation = "transport", details = {}, help: readonly string[] = []): never => {
    throw new TransportError({ code, message, operation, ...details }, help);
  };
  if ((options.origin ?? HYBRID_ORIGIN) !== HYBRID_ORIGIN || process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    fail("CONFIG_INVALID", "Use the reviewed HTTPS origin with TLS verification enabled");
  }
  const { apiKey, redact } = options.credential;
  if (!apiKey || /[\s\x00-\x1f\x7f;,]/u.test(apiKey)) {
    fail("CONFIG_INVALID", "API key must be nonempty and contain no whitespace, controls or header delimiters");
  }
  const bindings = Object.fromEntries(Object.entries(dependencies.bindings).map(([id, binding]) => [id, { ...binding }]));
  const now = dependencies.now ?? performance.now.bind(performance);
  const deadline = now() + 20_000;
  let requests = 0, jsonBytes = 0, downloadBytes = 0;
  let keyLevel: string | undefined;

  function destination(operation: string, binding: OperationBinding, input: RequestOptions): URL {
    const names = [...binding.path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]!);
    const params = input.pathParams ?? {};
    if (Object.keys(params).some((name) => !names.includes(name)) || names.some((name) => !params[name])) {
      fail("VALIDATION_ERROR", "Supply exactly the operation's required identifiers", operation);
    }
    if (!/^\/api\/(v2|labs)\//.test(binding.path) || /[\\?#%]/u.test(binding.path)
      || binding.path.split("/").some((part) => part === "." || part === "..")) {
      fail("OPERATION_BLOCKED", "Operation path is outside the reviewed API", operation);
    }
    const path = binding.path.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
      const value = params[name]!;
      if (/[\x00-\x20\x7f/\\%?#]/u.test(value) || value === "." || value === "..") {
        fail("VALIDATION_ERROR", "Invalid operation identifier", operation);
      }
      return encodeURIComponent(value);
    });
    const url = new URL(path, HYBRID_ORIGIN);
    if (url.origin !== HYBRID_ORIGIN || url.pathname !== path) fail("OPERATION_BLOCKED", "Invalid operation destination", operation);
    if (binding.query) {
      const decoded = binding.query.safeParse(input.query ?? {});
      if (!decoded.success) fail("VALIDATION_ERROR", "Invalid operation query parameters", operation);
      for (const [name, value] of Object.entries(decoded.data!)) if (value !== undefined) url.searchParams.set(name, String(value));
    } else if (input.query && Object.keys(input.query).length) {
      fail("VALIDATION_ERROR", "This operation does not accept query parameters", operation);
    }
    return url;
  }

  async function readBody(response: Response, operation: string, download: boolean): Promise<Uint8Array> {
    const reader = response.body?.getReader();
    if (!reader) return new Uint8Array();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (download) downloadBytes += chunk.value.byteLength;
        else jsonBytes += chunk.value.byteLength;
        if (download ? downloadBytes > 250 * 1024 * 1024 : jsonBytes > 20 * 1024 * 1024) {
          fail("LIMIT_EXCEEDED", "Invocation response byte limit exceeded", operation, { status: response.status });
        }
        chunks.push(chunk.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally { reader.releaseLock(); }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  }

  function prepare(operation: string, input: RequestOptions = {}): PreparedRequest {
    const binding = Object.hasOwn(bindings, operation) ? bindings[operation] : undefined;
    if (!binding) fail("OPERATION_BLOCKED", "Operation is not bound in the executable catalogue");
    const reviewed = binding!;
    const url = destination(operation, reviewed, input);
    let body: string | undefined;
    if (reviewed.body) {
      const decoded = reviewed.body.safeParse(input.body);
      if (!decoded.success) fail("VALIDATION_ERROR", "Invalid operation request body", operation);
      if (reviewed.bodyEncoding === "form") {
        const form = new URLSearchParams();
        for (const [name, value] of Object.entries(decoded.data as Record<string, unknown>)) {
          if (value !== undefined) for (const entry of Array.isArray(value) ? value : [value]) form.append(name, String(entry));
        }
        body = form.toString();
      } else body = JSON.stringify(decoded.data);
    } else if (input.body !== undefined) {
      fail("VALIDATION_ERROR", "This operation does not accept a request body", operation);
    }
    return Object.freeze({ operation, method: reviewed.method, url: url.href, effect: reviewed.effect,
      ...(body !== undefined ? { body } : {}) });
  }

  return {
    prepare,
    async request(operation, input = {}) {
      const { url, body, effect: _effect, ...identity } = prepare(operation, input);
      const reviewed = bindings[operation]!;
      if (reviewed.effect === "write" && !dependencies.consumeWriteAuthorization?.(input.authorization,
        { ...identity, url, ...(body !== undefined ? { body } : {}) })) {
        fail("WRITE_DENIED", "This operation requires guarded write authorization", operation);
      }
      for (let attempt = 0; ; attempt++) {
        const remaining = deadline - now();
        if (remaining <= 0) fail("DEADLINE_EXCEEDED", "Invocation deadline exceeded; no request sent", operation);
        if (requests >= 20) fail("LIMIT_EXCEEDED", "Invocation request limit exceeded", operation);
        if (input.signal?.aborted) fail("REQUEST_CANCELLED", "Request cancelled; no request sent", operation);
        requests++;
        const controller = new AbortController();
        const cancel = () => controller.abort();
        input.signal?.addEventListener("abort", cancel, { once: true });
        const timer = setTimeout(cancel, remaining);
        let rateLimits: Record<string, unknown> | undefined;
        try {
          const response = await dependencies.fetch(url, {
            method: reviewed.method, headers: { "api-key": apiKey, "user-agent": "hybrid-axi", accept: reviewed.download ? "*/*" : "application/json",
              ...(reviewed.download ? { "accept-encoding": "identity" } : {}),
              ...(body !== undefined ? { "content-type": reviewed.bodyEncoding === "form" ? "application/x-www-form-urlencoded" : "application/json" } : {}) },
            ...(body !== undefined ? { body } : {}), redirect: "error", signal: controller.signal,
          });
          rateLimits = {};
          for (const name of ["Api-Limits", "Submission-Limits", "Quick-Scan-Limits", "Sample-Download-Limits"]) {
            const value = [...response.headers].find(([field]) => field.toLowerCase() === name.toLowerCase()
              || name === "Submission-Limits" && field.toLowerCase() === 'submission-limits"')?.[1] ?? null;
            if (value !== null) {
              try { rateLimits[name] = { value: redact(JSON.parse(value)) }; }
              catch { rateLimits[name] = { malformed: true }; }
            }
          }
          for (const name of ["Api-Version", "Webservice-Version", "Retry-After", "RateLimit", "RateLimit-Policy",
            "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]) {
            const value = response.headers.get(name);
            if (value !== null) rateLimits[name] = { value: String(redact(value)).slice(0, 1000) };
          }
          if (response.status >= 300 && response.status < 400) {
            await response.body?.cancel();
            fail("REDIRECT_BLOCKED", "Upstream redirect refused", operation, { status: response.status });
          }
          const encoding = response.headers.get("content-encoding");
          if (reviewed.download && response.ok && encoding !== null && encoding.trim().toLowerCase() !== "identity") {
            await response.body?.cancel();
            fail("MALFORMED_RESPONSE", "Encoded artifact delivery cannot preserve upstream bytes", operation, { status: response.status });
          }
          if (reviewed.download && response.ok && Number(response.headers.get("content-length")) > 250 * 1024 * 1024 - downloadBytes) {
            await response.body?.cancel();
            fail("LIMIT_EXCEEDED", "Invocation response byte limit exceeded", operation, { status: response.status });
          }
          const raw = await readBody(response, operation, Boolean(reviewed.download && response.ok));
          const header = response.headers.get("retry-after");
          let retryAfter: number | undefined;
          if (header && /^\d+$/.test(header)) retryAfter = Number(header);
          else if (header && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(header) && Number.isFinite(Date.parse(header))) {
            retryAfter = Math.max(0, Math.ceil((Date.parse(header) - Date.now()) / 1000));
          }
          if (!Number.isFinite(retryAfter)) retryAfter = undefined;
          if (!response.ok) {
            if (reviewed.retrySafe && reviewed.effect === "read" && !reviewed.download && input.retry !== false
              && attempt < 2 && [429, 502, 503, 504].includes(response.status)) {
              const wait = (retryAfter ?? 1) * 1000;
              if (retryAfter !== undefined && wait >= deadline - now()) {
                fail("RATE_LIMITED", "Retry interval exceeds the remaining invocation budget", operation,
                  { status: response.status, retryAfter }, ["Wait for the reported retry interval before a new invocation"]);
              }
              if (wait < deadline - now()) {
                await new Promise<void>((resolve, reject) => {
                  const aborted = () => { clearTimeout(waitTimer); reject(new Error("aborted")); };
                  const waitTimer = setTimeout(() => { controller.signal.removeEventListener("abort", aborted); resolve(); }, wait);
                  controller.signal.addEventListener("abort", aborted, { once: true });
                });
                continue;
              }
            }
            const details = { status: response.status, ...(retryAfter !== undefined ? { retryAfter } : {}) };
            if (response.status === 401) fail("AUTH_REQUIRED", "API authentication failed", operation, details, ["Run hybrid-axi auth status"]);
            if (response.status === 403 && reviewed.download) {
              if (keyLevel === undefined && bindings["key.current"]) {
                try { await this.request("key.current", { retry: false }); }
                catch { /* Keep the original denial and an explicitly unknown level. */ }
              }
              const restricted = keyLevel === "restricted";
              fail(restricted ? "KEY_LEVEL_RESTRICTED" : "PERMISSION_DENIED",
                restricted ? "Restricted key: account vetting is needed for download access"
                  : `Download denied; key level is ${keyLevel ?? "unknown"}. Non-vetted restricted keys cannot download`,
                operation, { ...details, keyLevel: keyLevel ?? "unknown", ...(reviewed.requiredKeyLevel ? { requiredKeyLevel: reviewed.requiredKeyLevel } : {}) },
                ["Run hybrid-axi quota to inspect key level; request account vetting for restricted download access"]);
            }
            if (response.status === 403) fail("PERMISSION_DENIED", "API operation denied for this key", operation, details);
            if (response.status === 429) fail("RATE_LIMITED", "API rate limit reached", operation, details, ["Wait for the reported retry interval before a new invocation"]);
            let message = "Upstream API request failed";
            try {
              const body: unknown = JSON.parse(new TextDecoder().decode(raw));
              if (body && typeof body === "object" && "message" in body && typeof body.message === "string" && body.message.trim()) {
                message = String(redact(body.message)).replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 1000);
              }
            } catch { /* HTML and malformed failures do not expose raw bodies. */ }
            fail("UPSTREAM_ERROR", message, operation, details);
          }
          let responseBody: unknown;
          if (reviewed.download) responseBody = raw;
          else {
            try { responseBody = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
            catch { fail("MALFORMED_RESPONSE", "Upstream returned invalid JSON", operation, { status: response.status }); }
          }
          const decoded = reviewed.decoder.safeParse(responseBody);
          if (!decoded.success) fail("MALFORMED_RESPONSE", "Upstream response does not match the documented contract", operation, { status: response.status });
          if (reviewed.path === "/api/v2/key/current") {
            const level = (decoded.data as { auth_level_name?: unknown }).auth_level_name;
            keyLevel = typeof level === "string" && ["restricted", "default", "elevated", "super"].includes(level) ? level : undefined;
          }
          return { status: response.status, body: reviewed.download ? decoded.data : redact(decoded.data), rateLimits };
        } catch (error) {
          if (error instanceof TransportError) {
            if (rateLimits !== undefined) error.error.rateLimits = rateLimits;
            throw error;
          }
          const details = rateLimits !== undefined ? { rateLimits } : {};
          if (controller.signal.aborted) fail(input.signal?.aborted ? "REQUEST_CANCELLED" : "TIMEOUT",
            "Request outcome is ambiguous; it was not replayed", operation, details, ["Inspect any known result ID before deciding whether to send again"]);
          fail("NETWORK_ERROR", "Request failed with an unknown outcome; it was not replayed", operation, details);
        } finally {
          clearTimeout(timer);
          input.signal?.removeEventListener("abort", cancel);
        }
      }
    },
  };
}
