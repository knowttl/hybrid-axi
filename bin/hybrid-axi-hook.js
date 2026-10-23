#!/usr/bin/env node
import { encode } from "@toon-format/toon";

// Ambient context remains local and never resolves a credential file.
try {
  const { credentialStore } = await import("../dist/src/profiles.js");
  const { localCommand } = await import("../dist/src/local-commands.js");
  const store = credentialStore();
  process.stdout.write(`${encode(store.redactor.value(localCommand(["home"], store)))}\n`);
} catch {
  process.stdout.write("hybrid-axi: local profile status unavailable\n");
}
