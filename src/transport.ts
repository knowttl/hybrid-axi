import { transportBindings } from "./catalogue.js";
import { constructTransport, type Credential } from "./transport-core.js";

export function createTransport(credential: Credential) {
  return constructTransport({ credential }, { bindings: transportBindings, fetch: globalThis.fetch });
}
