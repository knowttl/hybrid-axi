import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from "node:fs";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { AxiError } from "axi-sdk-js";

const maximum = 250 * 1024 * 1024;
export const uploadSchema = z.strictObject({ path: z.string().min(1), name: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), size: z.number().int().min(0).max(maximum) });
export type Upload = z.infer<typeof uploadSchema>;

function bytes(path: string): Buffer {
  let fd: number | undefined;
  try {
    const entry = lstatSync(path);
    if (!entry.isFile() || entry.isSymbolicLink() || entry.size > maximum) throw new Error("Invalid upload");
    fd = openSync(path, constants.O_RDONLY | (process.platform === "win32" ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK));
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > maximum) throw new Error("Invalid upload");
    // Read at most the bound even if a file grows after the stat.
    const result = Buffer.alloc(Number(stat.size) + 1);
    let size = 0;
    while (size < result.length) {
      const count = readSync(fd, result, size, result.length - size, null);
      if (!count) break;
      size += count;
    }
    if (size !== stat.size) throw new Error("Changed upload");
    return result.subarray(0, size);
  } catch {
    throw new AxiError("Upload must be a readable regular file of at most 250 MiB", "VALIDATION_ERROR");
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function describeUpload(path: string): Upload {
  const absolute = resolve(path);
  const content = bytes(absolute);
  return { path: absolute, name: basename(absolute), size: content.length, sha256: createHash("sha256").update(content).digest("hex") };
}

export function multipartBody(body: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (name === "file") {
      const upload = uploadSchema.parse(value);
      const content = bytes(upload.path);
      if (content.length !== upload.size || createHash("sha256").update(content).digest("hex") !== upload.sha256) {
        throw new AxiError("Upload changed; review a new preview before sending", "VALIDATION_ERROR");
      }
      form.append(name, new Blob([new Uint8Array(content)]), upload.name);
    } else form.append(name, String(value));
  }
  return form;
}
