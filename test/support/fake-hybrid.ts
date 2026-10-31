import { createServer, request as httpsRequest } from "node:https";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { constructTransport, type Credential, type OperationBinding } from "../../src/transport-core.js";
import { transportBindings } from "../../src/catalogue.js";
import { allowFakeServer } from "./deny-network.js";

export type Reply = { status?: number; body?: unknown; text?: string; bytes?: Uint8Array; headers?: Record<string, string> };
export const syntheticKey = "synthetic-secret+sentinel";
export const keyBody = { api_key: syntheticKey, auth_level: 100, auth_level_name: "restricted", user: { id: "synthetic-user" } };
const quotaType = { quota: { day: 100 }, used: { day: 3 }, available: { day: 97 }, quota_reached: false };
export const quotaBody = { detonation: { apikey: quotaType, quota_reached: false }, quick_scan: { apikey: null, quota_reached: false } };

// Scripted failures model the network boundary, never additional API contracts.
export function fakeTransport(replies: (Reply | "hang" | "disconnect")[], options: {
  bindings?: Readonly<Record<string, OperationBinding>>; credential: Credential;
  consumeWriteAuthorization?: (authorization: unknown, request: { operation: string; method: string; url: string; body?: string }) => boolean;
}) {
  const requests: { url: string; init: RequestInit }[] = [];
  const fetch: typeof globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected fake request");
    if (reply === "disconnect") throw new Error(`Network failure ${syntheticKey}`);
    if (reply === "hang") return new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    return new Response(reply.bytes ?? reply.text ?? JSON.stringify(reply.body), { status: reply.status ?? 200, headers: reply.headers });
  };
  return { requests, fetch, transport: constructTransport({ credential: options.credential }, {
    ...options, bindings: options.bindings ?? transportBindings, fetch,
  }) };
}

export async function fakeHttpsHybrid(replies: Reply[]) {
  const cert = readFileSync(new URL("../fixtures/cert.pem", import.meta.url));
  const key = readFileSync(new URL("../fixtures/key.pem", import.meta.url));
  const requests: { method: string; url: string; headers: Record<string, string | string[] | undefined>; body: string; bytes: Buffer }[] = [];
  const server = createServer({ key, cert }, async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    requests.push({ method: request.method!, url: request.url!, headers: request.headers, body: bytes.toString("utf8"), bytes });
    const reply = replies.shift() ?? { status: 500, body: { message: "Unexpected fake request" } };
    response.writeHead(reply.status ?? 200, { "content-type": "application/json", ...reply.headers });
    response.end(reply.bytes ?? reply.text ?? JSON.stringify(reply.body));
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const release = allowFakeServer(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake server unavailable");
  const fetch: typeof globalThis.fetch = async (input, init = {}) => {
    const encoded = new Request(String(input), init);
    const body = init.body === undefined ? undefined : Buffer.from(await encoded.arrayBuffer());
    return new Promise((resolve, reject) => {
      const url = new URL(String(input));
      const pending = httpsRequest({ hostname: "127.0.0.1", port: address.port, ca: cert, rejectUnauthorized: true,
        path: url.pathname + url.search, method: init.method, headers: Object.fromEntries(encoded.headers),
        signal: init.signal ?? undefined, agent: false }, (response) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }
        if (response.statusCode === 204) response.resume();
        resolve(new Response(response.statusCode === 204 ? null : Readable.toWeb(response) as ReadableStream<Uint8Array>, { status: response.statusCode!, headers }));
      });
      pending.once("error", reject);
      pending.end(body);
    });
  };
  return { requests, fetch, async close() {
    release();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  } };
}
