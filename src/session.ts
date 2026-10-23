import type { Transport } from "./transport-core.js";

export function createSession(transport: Transport) {
  async function quota() {
    const key = await transport.request("key.current", { retry: false });
    const quota = await transport.request("key.submission-quota", { retry: false });
    return { keyLevel: (key.body as { auth_level_name: string }).auth_level_name,
      quota: quota.body, rateLimits: { key: key.rateLimits, quota: quota.rateLimits } };
  }
  return {
    quota,
    async doctor() {
      const result = await quota();
      return { ...result, status: "ok", scope: "Authentication and quota only; access to other operations is unverified" };
    },
  };
}
