import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, linkSync, lstatSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { AxiError } from "axi-sdk-js";
import { windowsAcl } from "./private-file.js";
import { TransportError } from "./transport-core.js";

export function artifactOutput(path: string): string {
  const invalid = (): never => { throw new AxiError("Output must be a new file in an existing directory without symlink components", "VALIDATION_ERROR"); };
  if (path === "-") invalid();
  const output = resolve(path);
  try { lstatSync(output); return invalid(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return invalid(); }
  try {
    for (let parent = dirname(output);;) {
      const stat = lstatSync(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return invalid();
      const next = dirname(parent);
      if (next === parent) break;
      parent = next;
    }
  } catch { return invalid(); }
  return output;
}

export function saveArtifact(output: string, bytes: Uint8Array, operation: string) {
  const temporary = join(dirname(output), `.hybrid-artifact-${randomUUID()}.tmp`);
  let fd: number | undefined;
  let created = false;
  try {
    artifactOutput(output);
    fd = openSync(temporary, "wx", 0o600);
    created = true;
    if (process.platform === "win32") {
      windowsAcl(temporary, "restrict", false);
      windowsAcl(temporary, "verify", false);
    }
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd); fd = undefined;
    // Publishing a completed inode refuses a destination created during download.
    linkSync(temporary, output);
    return { output, bytes: bytes.byteLength };
  } catch {
    throw new TransportError({ code: "OUTPUT_FAILED", message: "Artifact could not be published; choose a new writable output file", operation });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (created) unlinkSync(temporary);
  }
}
