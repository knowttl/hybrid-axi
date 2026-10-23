# hybrid-axi

Agent-ergonomic CLI for the Hybrid Analysis API, read-only by default, with compact TOON output and explicitly guarded submissions, YARA changes and malware downloads.

This repository ships local credential commands plus the bounded `doctor` and `quota` API reads.
No npm release or other API commands are available yet.
The [design](docs/design.md) defines the planned command surface, complete stable/Labs operation ledger, credentials, safety boundaries, specification deviations and ordered implementation slices.
The tool-specific no-mistakes configuration establishes offline validation before feature work.

## Local credentials

Run `hybrid-axi setup` for a configuration template and its platform path.
Setup prints guidance without writing files or installing agent hooks.
Set `HYBRID_AXI_API_KEY` in the environment, or reference a private UTF-8 file with `"apiKey":{"file":"<absolute-path>"}` in a named profile.
Keys are never accepted in arguments, stored by the tool or sent by these local commands.
`hybrid-axi auth status` verifies availability and file protections without printing the key or contacting the API.
`hybrid-axi profile list` lists configured profiles; `hybrid-axi config path` shows configuration and state locations.
Every command supports `--help`, `--config <path>` and `--profile <name>`.

Config selection is `--config`, `HYBRID_AXI_CONFIG`, then the platform default.
Profile selection is `--profile`, `HYBRID_AXI_PROFILE`, a complete environment profile, the configured default, then the sole profile.
Explicit file-profile selection ignores environment profile fields; partial environment profiles fail.
Linux/macOS use absolute XDG config/state directories or `~/.config/hybrid-axi/config.json` and `~/.local/state/hybrid-axi`.
Windows uses APPDATA for config and LOCALAPPDATA for state, ignoring XDG.
Prepare config and secret files with current-user ownership and the [private-file protections](docs/design.md#profiles-and-authentication), checked on every read.

The shipped `axi-credential.schema.json` describes one strict profile with an `x-secret` apiKey env/file SecretRef.
Unlike the shared credential standard's optional login storage, this tool excludes stored refs and provides no login or key issuance.
Profiles default to read-only; a complete environment profile always stays read-only.
`HYBRID_AXI_READ_ONLY=1` or `true` forces read-only over file allowances; `0`, `false` or empty leaves profile policy in effect.
Unknown nonempty boolean values fail closed.

The public OpenAPI snapshots and their source URLs, versions, fetch dates and byte hashes are pinned in [inventory/specs.json](inventory/specs.json).
Design research fetched public documentation only and made no API operation calls.
See [CONTRIBUTING.md](CONTRIBUTING.md) for implementation conventions and offline verification requirements.

## Doctor and quota

`hybrid-axi doctor` verifies credential protections, reads `/key/current` and `/key/submission-quota`, and reports authentication, key level, quota and observed limit headers.
It does not prove access to other operations.
`hybrid-axi quota` reads the same two operations and reports the quota body and separately observed headers from each response.
Both commands accept `--config` and `--profile`, make at most two requests without retries, and never submit a sample or URL.
The `api_key` and user fields from key inspection are always omitted.

Limit observations use the documented JSON-valued `Api-Limits`, `Submission-Limits`, `Quick-Scan-Limits` and `Sample-Download-Limits` headers.
Missing headers stay absent; malformed JSON is marked explicitly rather than becoming zero usage.
Unknown quota fields pass through after sensitive-field redaction.
The documented `apikey` quota block appears as `keyQuota` so it remains distinguishable from credential fields during redaction.
Transport errors use a structured `error` object with code, operation and any known status, key level or retry interval.
Download denials distinguish an inspected restricted key from an unknown key level and explain the account-vetting requirement.
Download commands themselves remain unavailable in this slice.

The closed transport uses only reviewed HTTPS bindings, refuses redirects and shares a 20-second deadline, 20-request ceiling and 20-MiB decoded JSON ceiling per invocation.
Binary responses have a separate 250-MiB ceiling.
An explicitly retryable, non-consuming read can retry an explicit 429 or 502/503/504 response at most twice within those budgets.
Ambiguous timeouts and network failures are never replayed.

## Development

Use Node.js 22.12+ and Corepack with the pinned pnpm version.
Populate the dependency cache once with `corepack pnpm install --frozen-lockfile --ignore-scripts` before offline validation.

```sh
node scripts/isolated.mjs corepack pnpm install --offline --frozen-lockfile --ignore-scripts --config.confirm-modules-purge=false
corepack pnpm run build
corepack pnpm run lint
corepack pnpm test
corepack pnpm run spec:check
node bin/hybrid-axi.js --version
node bin/hybrid-axi.js --help
```

Preparation reuses the local dependency cache without network access and isolates HOME, XDG and agent state.
Tests select affected tests plus fixed packaged-CLI and selection baselines; infrastructure changes run the full suite.
Missing comparison bases or baseline files fail closed.
The test command builds the package and verifies specification freshness under a network-denying preload inherited by child Node processes.
Packed tests install local dependency tarballs with npm offline, then exercise version, help, local setup/auth status and rejected input.
Transport and CLI tests route validated logical URLs to our synthetic HTTPS upstream, trusting only its test certificate.
The network preload denies external sockets, DNS and arbitrary subprocesses, and propagates to Node descendants even with a fresh environment.
No validation command calls Hybrid Analysis or provisions a service.
Live API acceptance belongs to the separately authorized T11 slice.

`corepack pnpm run spec:generate` regenerates declarations and the non-executable capability inventory from the pinned bytes and design ledger.
`spec:check` checks SHA-256 hashes, all 62 method/path classifications and deterministic generated artifacts offline.
New inventory entries do not enable commands; executable bindings belong to `src/catalogue.ts`.

`.no-mistakes.yaml` separates offline preparation, affected tests and linting, and declares that no hosted CI is configured.
It must reach `main` before feature validation can rely on its trusted commands and review rules.
Pull requests target `knowttl/hybrid-axi` with base `main`; validation never authorizes merging or publication by itself.
