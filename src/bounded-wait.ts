import { TransportError, type Transport } from "./transport-core.js";

export const waitFlags = { "--timeout": "Required deadline in seconds, integer 1-20; checks every second within shared transport budgets" };

export async function waitForResult(transport: Transport, operation: "report state" | "quickScanShow", id: string, seconds: number): Promise<{
  value: Record<string, unknown> | undefined; complete: boolean; reason?: string;
  error?: TransportError["error"]; help?: readonly string[];
}> {
  const controller = new AbortController();
  const deadline = performance.now() + seconds * 1000;
  const timer = setTimeout(() => controller.abort(), seconds * 1000);
  let value: Record<string, unknown> | undefined;
  try {
    while (!controller.signal.aborted && performance.now() < deadline) {
      try {
        const response = await transport.request(operation, { pathParams: { id }, retry: false, signal: controller.signal });
        value = response.body as Record<string, unknown>;
      } catch (error) {
        if (!(error instanceof TransportError)) throw error;
        return { value, complete: false, reason: controller.signal.aborted ? "WAIT_TIMEOUT" : error.error.code, ...error.toJSON() };
      }
      if (operation === "report state" ? ["SUCCESS", "ERROR"].includes(String(value.state)) : value.finished === true) {
        return { value, complete: true };
      }
      const remaining = deadline - performance.now();
      if (remaining <= 0) break;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(1000, remaining)));
    }
    return { value, complete: false, reason: "WAIT_TIMEOUT" };
  } finally { clearTimeout(timer); }
}
