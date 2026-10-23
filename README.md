# hybrid-axi

Agent-ergonomic CLI for the Hybrid Analysis API, read-only by default, with compact TOON output and explicitly guarded submissions, YARA changes and malware downloads.

This repository ships local credential commands, bounded `doctor` and `quota` reads, hash overviews and searches, experimental Labs queries, report reads and normal artifacts, feeds, system discovery and reviewed raw reads.
No npm release is available yet.
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

Header observations include quota, rate-limit, retry and API-version information from the explicit [header allowlist](docs/design.md#cli-and-output-contract).
Unknown quota fields pass through after sensitive-field redaction.
The documented `apikey` quota block appears as `keyQuota` so it remains distinguishable from credential fields during redaction.
Transport errors use a structured `error` object with code, operation and any known status, key level or retry interval.
When a response was received, `error.rateLimits` preserves its allowlisted header observations, including on 429 and other failures.
Download denials distinguish an inspected restricted key from an unknown key level and explain the account-vetting requirement.
Normal report artifact downloads are available; sample, dropped-archive and process-memory downloads remain unavailable.

The closed transport uses only reviewed HTTPS bindings, refuses redirects and shares a 20-second deadline, 20-request ceiling and 20-MiB decoded JSON ceiling per invocation.
Binary responses have a separate 250-MiB ceiling.
An explicitly retryable, non-consuming read can retry an explicit 429 or 502/503/504 response at most twice within those budgets.
Ambiguous timeouts and network failures are never replayed.

## Hash and search

`hybrid-axi hash show <sha256>` displays the stable overview; `--labs` selects the experimental Labs overview.
A successfully decoded overview with an explicitly empty report list and no verdict or score reports that no analysis is available and names the hash lookup command to run next.
The empty-state contract is verified against the fake service; live missing-hash verification is pending separately authorized acceptance.
404, permission denial and malformed data are not interpreted as absence.
Labs 425 reports analysis pending and provides the exact overview command to retry.
`hybrid-axi hash search --hash <hash>` uses the current GET lookup for MD5, SHA1, SHA256 or SHA512 and returns associated report identifiers.
`--hashes-file <path>` instead uses the deprecated bulk POST with a newline-separated MD5/SHA1/SHA256 file, bounded to 1 MiB.

`hybrid-axi search terms` requires at least one documented named filter; run its help for the complete filter list.
Filter flags use kebab-case, such as `--env-id`, `--vx-family` and `--date-from`.
Term date filters use `YYYY-MM-DD HH:mm`.
Search requests transmit filters and hashes, without uploading samples or URLs for analysis.

`hybrid-axi search run --query '<query>'` starts one experimental Labs query with `--size` default 50 (range 1-200) and `--page` default 1.
Optional `--date-from` and `--date-to` use `YYYY-MM-DD` and include both endpoints.
Synchronous responses return the selected page immediately; asynchronous responses provide an ID and trigger one bounded result fetch using the same invocation budget.
Pending results and retrieval failures name `hybrid-axi search results <id>` for resuming without starting another query.
The CLI preserves the upstream `query_status`; the asynchronous API ignores page and treats size as the total number of matches to return.
Neither query starts nor result retrieval are automatically replayed.

Hash and search commands use compact output by default.
`--full` exposes all decoded fields; `--fields <comma-separated-names>` selects fields at each response level, including new experimental fields, after sensitive-field redaction.
Labs response envelopes remain array-shaped under `searches`, with result rows under `results`.

## Shared write guards

The shared coordinator is implemented for later submission, guarded download and YARA command slices.
This slice adds no executable write commands.
See [guarded writes and artifact handling](docs/design.md#guarded-writes-and-artifact-handling) for the coordinator's policy, confirmation, journal and recovery contracts.

## Reports, feeds and reviewed raw reads

`hybrid-axi report show <id>` reads the summary; `report state <id>` reads submission state.
Use a job ID or `sha256:environmentId`.
Container summary responses with HTTP 410 remain errors and point to `report children <id>`.
`report memory list <id>` lists metadata; `report memory strings/hex <id> --filename <name>` reads structured extracted strings or hex rows without downloading raw memory.
`report screenshots <id>` reads the documented Base64 screenshot array with bounded previews.

`report file <id> --type <type> --output <new-file>` downloads exactly one artifact to an existing directory.
The destination must be new, with no symlink path components; completed bytes are published atomically without overwriting concurrent files.
Files are private, bounded to 250 MiB, and saved unchanged without unpacking or executing them.
Types `crt`, `pcap`, `json` and `memory-strings` use dedicated routes.
Types `xml`, `html`, `pdf`, `maec`, `stix`, `misp`, `misp-json` and `openioc` use the deprecated generic route and disclose that fact in output.
Samples, dropped archives, process memory and unknown types are refused.

`feed latest` retains the requested deprecated 24-hour feed, capped upstream at 250 reports.
`feed detonation` and `feed quick-scan` use current feeds capped at 250 and 2,500 respectively.
`feed abuse --page <n>` reads one documented page and generates page guidance without following upstream URLs.
`system version`, `environments`, `action-scripts`, `stats`, `configuration`, `queue-size` and `total-submissions` expose their reviewed read operations.

Report, feed and system reads support `--fields` for extra fields and `--full` for all fields and untruncated text after redaction.
Text previews are 1,000 characters; nested detail arrays preview 100 entries and disclose their original size.
Collections have a separate local `--limit` default of 100, including under `--full`, and report returned count, available rows, known upstream total, completeness and continuation separately.
Feed totals remain unknown unless the response supplies one; current feeds describe only their capped recent window.
The CLI provides a rerun command whenever local truncation occurs and does not invent pagination for unpaged endpoints.

`api get <path>` accepts a relative API path such as `/report/<id>/summary` or `/report/<id>/memory-dump/hex-dump?filename=<name>`.
It serves only bound report/feed/system JSON reads, key inspection/quota, stable hash overview/lookup, experimental Labs overview and query results.
Use `--labs` for a Labs path such as `/sample/<sha256>/overview`.
Query keys must match the selected operation's strict schema; duplicate and malformed parameters fail before credentials are resolved.
Named and raw reads share transport, decoders, redaction and output policies.
Full URLs, encoded or traversing paths, binary routes, the mixed generic artifact route, consuming matches, refreshes, writes and unbound operations are blocked.
Raw reads cannot supply headers, credentials, origins or larger budgets.

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
