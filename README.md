# hybrid-axi

Agent-ergonomic CLI for the Hybrid Analysis API, read-only by default, with compact TOON output and explicitly guarded submissions, YARA changes and malware downloads.

This repository ships local credential commands, bounded `doctor` and `quota` reads, hash overviews and searches, experimental Labs queries and hunting, report reads and normal artifacts, guarded malware downloads, feeds, system discovery, reviewed raw reads, guarded sandbox submissions and quick scans.
No npm release is available yet.
The [command reference](docs/commands.md) documents every shipped leaf, flag and example from the executable catalogue.
The [design](docs/design.md) defines the complete stable/Labs operation ledger, credentials, safety boundaries and ordered implementation slices.
The tool-specific no-mistakes configuration establishes offline validation before feature work.

## Installation and agent integration

Requires Node.js 22.12 or later.
After the first npm publication, install globally or run without a global install:

```sh
npm install -g @knowttl/hybrid-axi
hybrid-axi --version
npx -y @knowttl/hybrid-axi --help
```

Until publication, use the [development commands](#development) to build and run `node bin/hybrid-axi.js`.
Home, setup, profile discovery and authentication status are local; explicit API commands use the selected profile.
Output is TOON on stdout, including structured errors; exit codes are 0 for success, 1 for runtime failure and 2 for invalid input.

For ambient local profile context, explicitly opt in after installing the CLI:

```sh
hybrid-axi setup hooks
hybrid-axi setup hooks --scope project
```

The default user scope installs Claude Code SessionStart hooks, Codex SessionStart hooks and an OpenCode ambient plugin.
Project scope writes `.claude`, `.codex` and `.opencode` in the current directory instead.
Both scopes enable Codex's hooks feature in user configuration.
User configuration honors `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `XDG_CONFIG_HOME` for the respective agent.
Setup preserves unrelated configuration, repairs moved executable paths and makes repeated installs a no-op.
The hook uses a PATH-verified binary name when it resolves to this installation, otherwise its quoted absolute path.
OpenCode runs the installed entry directly through Node.
Restart the agent session after setup.
Context uses `HYBRID_AXI_CONFIG` and `HYBRID_AXI_PROFILE` from the session environment; it never makes an API call or reads a credential file.
Ordinary commands and package installation never install hooks.

For on-demand discovery instead, install the generated [agent skill](skills/hybrid-axi/SKILL.md):

```sh
npx skills add knowttl/hybrid-axi --skill hybrid-axi
```

The hook provides ambient context; the skill provides the command and safety reference when needed.
Either integration is sufficient; using both is optional.

## Command catalogue

Every leaf is marked read or write below.
`report file` is read for ordinary report types and write for `bin`, `dropped-files` and `memory`.
Quick scans are read exceptions that transmit data, and `setup hooks` writes only local agent configuration.

<!-- command-registry:start -->
| Command | Effect | Purpose |
|---|---|---|
| `hybrid-axi api get` | read | Reviewed JSON GET only: same decoders, redaction, fields and bounds as named reads; rejects binary, mixed-effect, consuming, refresh and unbound routes |
| `hybrid-axi auth status` | read | Verify local SecretRef availability and file protections without HTTP |
| `hybrid-axi config path` | read | Show selected config and platform state paths without reading files |
| `hybrid-axi doctor` | read | Verify credentials and read key level, submission quota and observed limit headers; other access is unverified |
| `hybrid-axi feed abuse` | read | Read one page of qualified-removal hashes |
| `hybrid-axi feed detonation` | read | Read the most recent report feed, capped upstream at 250 |
| `hybrid-axi feed latest` | read | Deprecated latest feed, at most 250 reports from 24h; use feed detonation for the current feed |
| `hybrid-axi feed quick-scan` | read | Read the most recent successful quick scans, capped upstream at 2500 |
| `hybrid-axi hash file` | write | Save one guarded sample unchanged to a new private file, bounded at 250 MiB. Live-malware warning: this artifact may contain executable malware. Save only; do not extract or execute. The spec documents gzip/ZIP delivery without promising password protection. Protection is unverified; bytes are saved exactly as provided. |
| `hybrid-axi hash search` | read | Find associated reports by hash, or deprecated bulk lookup from a newline-separated file |
| `hybrid-axi hash show` | read | Show stable SHA256 overview; --labs selects the experimental Labs overview |
| `hybrid-axi home` | read | Show local profile and policy without contacting Hybrid Analysis |
| `hybrid-axi hunting matches` | write | Experimental Labs: consuming GET marks returned matches delivered; preview sends no request; never automatically replayed |
| `hybrid-axi hunting yara create` | write | Experimental Labs: create own YARA rule; preview first, then --execute and exact --confirm. |
| `hybrid-axi hunting yara delete` | write | Experimental Labs: delete own YARA rule; preview first, then --execute and exact --confirm. |
| `hybrid-axi hunting yara list` | read | Experimental Labs: list own YARA rules; unknown response fields remain available |
| `hybrid-axi hunting yara show` | read | Experimental Labs: show own YARA rule by required positional ID |
| `hybrid-axi hunting yara update` | write | Experimental Labs: update own YARA rule; preview first, then --execute and exact --confirm. Partial POST; explicit reset_counter:true resets the all-time matches counter. |
| `hybrid-axi profile list` | read | List configured profiles without resolving keys or contacting Hybrid Analysis |
| `hybrid-axi quick-scan file` | read | Read exception: sends the sample to Hybrid Analysis without a write gate; never automatically replays |
| `hybrid-axi quick-scan scanners` | read | Read available quick-scan services and supported scan types |
| `hybrid-axi quick-scan show` | read | Read a known quick-scan result and finished status without sending the sample again |
| `hybrid-axi quick-scan submit` | write | Preview conversion of a quick scan into a sandbox analysis; requires write policy, --execute and exact --confirm |
| `hybrid-axi quick-scan url` | read | Read exception: sends the URL to Hybrid Analysis without a write gate; never automatically replays |
| `hybrid-axi quota` | read | Read key level, submission quota and observed limit headers with two bounded requests and no retries |
| `hybrid-axi report children` | read | List child report identifiers |
| `hybrid-axi report file` | read/write | Save one artifact unchanged to a new private file, bounded at 250 MiB; bin, dropped-files and memory require write scope, --execute and exact --confirm. Memory and legacy report formats use the deprecated generic route. Live-malware warning: this artifact may contain executable malware. Save only; do not extract or execute. The spec documents gzip/ZIP delivery without promising password protection. Protection is unverified; bytes are saved exactly as provided. |
| `hybrid-axi report memory hex` | read | Read structured hex rows for exactly one memory filename |
| `hybrid-axi report memory list` | read | List memory dump metadata without downloading process memory |
| `hybrid-axi report memory strings` | read | Read extracted strings for exactly one memory filename |
| `hybrid-axi report screenshots` | read | Read bounded Base64 screenshots; image text is previewed unless --full |
| `hybrid-axi report show` | read | Show a report summary for a job ID or sha256:environmentId |
| `hybrid-axi report state` | read | Show submission state |
| `hybrid-axi search results` | read | Experimental Labs results for a known query ID; never starts a query |
| `hybrid-axi search run` | read | Experimental Labs query: start once, then fetch asynchronous results once; resume pending queries by ID |
| `hybrid-axi search terms` | read | Search using at least one documented named filter |
| `hybrid-axi setup` | read | Show a read-only config template and SecretRef setup guidance without writing files |
| `hybrid-axi setup hooks` | write | Explicitly install or repair local-only Claude Code, Codex and OpenCode session integrations; no API calls |
| `hybrid-axi submit dropped-file` | write | Preview analysis of an exact dropped SHA256 from a report; the API accepts no environment override |
| `hybrid-axi submit file` | write | Preview a sandbox file submission; sending requires write policy, --execute and exact --confirm |
| `hybrid-axi submit url` | write | Preview a sandbox URL submission; sending requires write policy, --execute and exact --confirm |
| `hybrid-axi system action-scripts` | read | List available action scripts |
| `hybrid-axi system configuration` | read | Read documented partial public configuration with sensitive fields redacted |
| `hybrid-axi system environments` | read | List execution environments |
| `hybrid-axi system queue-size` | read | Read the queue size |
| `hybrid-axi system stats` | read | Read system statistics |
| `hybrid-axi system total-submissions` | read | Read the submission aggregate |
| `hybrid-axi system version` | read | Read system versions |
<!-- command-registry:end -->

## Local credentials

Run `hybrid-axi setup` for a configuration template and its platform path.
Setup prints guidance without writing files or installing agent hooks.
Set `HYBRID_AXI_API_KEY` in the environment, or reference a private UTF-8 file with `"apiKey":{"file":"<absolute-path>"}` in a named profile.
Keys are never accepted in arguments, stored by the tool or sent by these local commands.
`hybrid-axi auth status` verifies availability and file protections without printing the key or contacting the API.
`hybrid-axi profile list` lists configured profiles; `hybrid-axi config path` shows configuration and state locations.
Every command supports `--help`; profile commands also accept `--config <path>` and `--profile <name>`.

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
See the design's [key-level inspection and error contracts](docs/design.md#transport-and-bounded-work) for download 403 handling.

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

Guarded downloads, submissions, YARA changes and consuming hunting matches use the shared coordinator.
Enable only the needed operation names in a file profile's `writes.operations` and set `writes.allowWrites` to `true`.
The download names are `hash-download-bin`, `report-download-bin`, `report-download-dropped-files` and `report-download-memory`.
The submission names are `submitFile`, `submitUrl`, `submitDroppedFile` and `convertQuickScan`.
The hunting names are `yaraCreate`, `yaraUpdate`, `yaraDelete` and `huntingMatches`.
Environment profiles cannot enable writes, and forced read-only overrides file allowances.
Run the download without `--execute` to preview the exact profile, ID, type, destination and confirmation string without an HTTP request.
Then repeat it with `--execute --confirm '<exact preview confirmation>'` to send once after the private journal reserves the intent.
`--dry-run` explicitly selects preview and cannot accompany `--execute`.
Never replay an ambiguous outcome; inspect the journal and exact destination first.
See [guarded writes and artifact handling](docs/design.md#guarded-writes-and-artifact-handling) for the coordinator's policy, confirmation, journal and recovery contracts.

## Submissions and quick scans

`submit file --file <path> --environment-id <id>` and `submit url --url <url> --environment-id <id>` preview a sandbox submission locally.
The sample and its report can become visible to the community.
File confirmation binds the SHA256, byte count, filename, selected environment and complete request digest; file bytes are verified again before sending.
Uploads accept regular files up to 250 MiB.
URL confirmation binds the exact HTTP(S) URL and environment; embedded URL credentials are refused.
Run the selected command with `--help` for its accepted environment IDs.
Optional documented analysis settings are explicit flags; no anti-evasion or deprecated network flags are enabled implicitly.
Run command help for the available settings.
Submission and quick-scan value flags accept `--flag value` or `--flag=value`; dash-leading values require the latter, for example `--custom-cmd-line='--silent'`.
Quoting a dash-leading value after a separate flag still produces a missing-value error before transmission.
Unknown flags, duplicate flags and values attached to switches such as `--execute=false` are rejected.

`submit dropped-file --id <report-id> --file-hash <sha256>` previews analysis of the exact dropped file from that source report.
That API accepts no environment override.
`quick-scan submit <id> --environment-id <id>` previews conversion of a known quick scan to a sandbox analysis.
Each guarded command sends only with `--execute --confirm '<exact-preview-confirmation>'` under an enabled profile.
`--dry-run` explicitly selects preview and cannot be combined with `--execute`.
An optional `--intent-id <id>` prevents a reserved intent from being sent again across invocations.
Journal failure blocks sending; ambiguous outcomes include an audit ID and reconciliation guidance and are never automatically replayed.
Use a returned job ID with `report state <id>` to inspect analysis progress.

`quick-scan file --file <path> --scan-type <type>` sends the sample to Hybrid Analysis.
`quick-scan url --url <url> --scan-type <type>` sends the URL to Hybrid Analysis.
Both are explicit read exceptions with no write gate, including under read-only policy, and require a documented scan type from their help.
They send once without automatic replay, even after a timeout or explicit retryable HTTP failure.
`quick-scan show <id>` reads a known scan's `id`, `finished` and `sha256` without another upload.
`quick-scan scanners` reads the documented scanner service availability and supported types.
Quick-scan reads support `--fields` and `--full` after sensitive-field redaction.
No live submission or quick scan is part of automated verification.

## Experimental hunting

`hunting yara list` reads own rules, with optional `--search`, comma-separated `--threat-category` and `--status active|paused` filters.
`hunting yara show <id>` reads one own rule.
All hunting commands are experimental Labs contracts; unknown response fields remain available with `--fields` or `--full` after redaction.
These output flags are mutually exclusive.
Compact rule fields are `id`, `identifier` and `active`; selected text previews stop at 1,000 characters unless `--full` is supplied.
`hunting yara create --body-file <path>` requires a strict JSON object with `identifier`, `threat_categories` and YARA source in `rule`; unknown request fields are rejected.
Optional fields are `active` and integer `daily_notifications_limit`.
`hunting yara update <id> --body-file <path>` sends a partial POST containing only supplied fields, and accepts explicit `reset_counter:true` to reset the all-time matches counter.
`--body-file -` reads JSON from stdin, bounded to 1 MiB like regular body files.
`hunting yara delete <id>` deletes the exact rule and accepts an empty 204 success.
Every change previews first and requires enabled write scope, `--execute` and the exact preview confirmation, binding the profile, target and complete request digest.
Update and delete previews read the current rule; execution reads it again and checks for changes before sending the mutation.

`hunting matches` is a guarded consuming GET, with `--items-count` default 100 (range 1-1000) and optional RFC3339 `--search-after`.
Its preview names the current user's undelivered-match scope without sending a request.
Execution returns the oldest matching undelivered entries and marks every returned match delivered, so it cannot be retrieved again through this endpoint.
Compact fields are `id`, `rule_id`, `sample_sha256` and `match_date`.
Consumption is never automatically retried; an ambiguous outcome requires journal reconciliation, not replay.
An optional `--intent-id` reserves a durable intent against duplicate execution for all hunting writes.

## Reports, feeds and reviewed raw reads

`hybrid-axi report show <id>` reads the summary; `report state <id>` reads submission state.
Use a job ID or `sha256:environmentId`.
Container summary responses with HTTP 410 remain errors and point to `report children <id>`.
`report memory list <id>` lists metadata.
`report memory strings <id> --filename <name>` and `report memory hex <id> --filename <name>` read structured extracted strings or hex rows without downloading raw memory.
`report screenshots <id>` reads the documented Base64 screenshot array with bounded previews.

`report file <id> --type <type> --output <new-file>` downloads exactly one artifact to an existing directory.
The destination must be new, with no symlink path components; completed bytes are published atomically without overwriting concurrent files.
Files are private, bounded to 250 MiB, and saved unchanged without unpacking or executing them.
Downloads request identity HTTP content encoding and reject any other declared encoding to preserve upstream artifact bytes.
Types `crt`, `pcap`, `json` and `memory-strings` use dedicated routes.
Types `xml`, `html`, `pdf`, `maec`, `stix`, `misp`, `misp-json` and `openioc` use the deprecated generic route and disclose that fact in output.
Types `bin`, `dropped-files` and `memory` require the shared write guards.
They use the dedicated sample route, current dropped-files-v2 archive route and deprecated generic process-memory route respectively.
`hash file <sha256> --output <new-file>` downloads the hash's sample under the same guards.
Unknown types are refused, and execution flags are rejected for ordinary read artifacts.

**Live-malware warning: this artifact may contain executable malware. Save only; do not extract or execute.**
The spec documents gzip/ZIP delivery without promising password protection.
Protection is unverified; bytes are saved exactly as provided, without encryption or repackaging.
Binary contents never go to stdout or the journal, and upstream filenames never choose the destination.

`feed latest` retains the requested deprecated 24-hour feed, capped upstream at 250 reports.
`feed detonation` and `feed quick-scan` use current feeds capped at 250 and 2,500 respectively.
`feed abuse --page <n>` reads one documented page and generates page guidance without following upstream URLs.
`system version`, `environments`, `action-scripts`, `stats`, `configuration`, `queue-size` and `total-submissions` expose their reviewed read operations.

Report, feed and system reads support `--fields <comma-separated-names>` to replace the compact field selection, or `--full` for all fields and untruncated text after redaction.
These flags are mutually exclusive.
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

## Deviations from the prompt

These are findings from the pinned public specifications and synthetic contract tests, not claims about observed live API behavior.
No live API acceptance has run yet.
The [pinned sources](inventory/specs.json) and [operation ledger](docs/design.md#complete-operation-ledger) record the evidence.

1. Stable hash lookup is `GET /search/hash`; POST hash lookup, bulk `/search/hashes` and `/report/summary` are deprecated.
2. Labs search can return synchronous 200 results or asynchronous 202 IDs, with array envelopes and `query_status`, rather than invariably requiring an async two-request exchange.
3. Labs recent hunting matches is a consuming GET that marks returned matches delivered.
   There is no documented non-consuming alternative, so it is a guarded write.
4. Overview refresh is a GET that fetches fresh external-service data and remains blocked.
5. Sample delivery is documented as gzip and memory as ZIP, without guaranteed password protection.
   Guarded downloads save upstream bytes unchanged and warn that protection is unverified.
6. The deprecated generic `/report/{id}/file/{type}` route mixes normal formats with binary samples and memory; memory has no dedicated binary replacement.
   Legacy dropped-file routes are deprecated; the current raw route remains blocked under the archive-first requirement, while `dropped-files-v2` supplies the guarded archive.
7. `feed latest` is deprecated; current detonation and quick-scan feeds have different upstream caps of 250 and 2,500.
8. Deprecated URL-to-file and URL-for-analysis submission variants remain unavailable.
   Quick-scan conversion and dropped-file submissions create sandbox analyses and require write policy.
9. `/submit/hash-for-url` computes a lookup hash through POST and is a read; HTTP verbs alone do not determine policy.
10. Labs overview documents 425 for pending analysis, and neither overview defines a definitive missing-analysis error shape.
    Denial, generic 404 and malformed data stay distinct from synthetic verified empty-success responses; live acceptance is still pending.
11. Key levels are restricted/default/elevated/super.
    Key inspection contains `api_key` and user details that are always stripped; download auth levels usually use `x-auth-level`, and omitted annotations do not prove permission.
12. Quota substantially uses JSON-valued `Api-Limits`, `Submission-Limits`, `Quick-Scan-Limits` and `Sample-Download-Limits` headers rather than one uniform rate-limit scheme.
    Some submission responses document `Submission-Limits"` with a trailing quote, recognized defensively.
13. The stable changelog says historical `/file-collection/*` routes return 410 from 2026-08-21; none occur in the pinned paths, so they are not recreated.
14. YARA update is a partial POST, not PUT/PATCH, and supports explicit `reset_counter`.
    Deletion returns 204 without a JSON body.
15. The later request adds actual artium-axi integration after npm publication, replacing the original note-only exclusion; it remains a separate host-repository change.
16. Documented quota `apikey` blocks are projected as `keyQuota` before redaction so quota values survive credential-field scrubbing.
17. Compact feed fields follow each individual schema without invented common verdicts or timestamps.
18. Report summary documents 410 `SampleGone` for containers; callers are directed to child reports rather than treating it as missing analysis.

## Release and hosted integration

Release Please prepares version and changelog changes on `main`.
The release workflow is limited to release management, build, artifact freshness, packing and npm publication with provenance; there is no pull-request test workflow.
All tests and public-data review run locally before delivery.
Nothing is published by this release-surface change.
The first npm publication runs from the authorized main-branch host after separate read-only acceptance.
The owner then configures npm trusted publishing for `knowttl/hybrid-axi`, workflow `release-please.yml`, and enables the repository variable `NPM_TRUSTED_PUBLISHING=true`.
Until that explicit setup, the workflow's publication job is disabled.
Subsequent release tags can publish the packed artifact through GitHub OIDC with `id-token: write` and `npm publish --provenance`, without a stored npm token.

artium-axi integration follows npm publication in a separate PR, pinned to the released package and using a managed `api-key` for `hybrid-analysis.com`.
Submissions, YARA mutations, consuming matches and guarded downloads stay off by default.
Host policy cannot bypass native preview, execution, exact confirmation or journaling; uploads and artifacts need explicit host mapping.

## Development

Use Node.js 22.12+ and Corepack with the pinned pnpm version.
Populate the dependency cache once with `corepack pnpm install --frozen-lockfile --ignore-scripts` before offline validation.

```sh
node scripts/isolated.mjs corepack pnpm install --offline --frozen-lockfile --ignore-scripts --config.confirm-modules-purge=false
corepack pnpm run build
corepack pnpm run lint
corepack pnpm test
corepack pnpm run spec:check
corepack pnpm run docs:check
node bin/hybrid-axi.js --version
node bin/hybrid-axi.js --help
```

Preparation reuses the local dependency cache without network access and isolates HOME, XDG and agent state.
Tests select affected tests plus fixed packaged-CLI and selection baselines; infrastructure changes run the full suite.
Missing comparison bases or baseline files fail closed.
The test command builds the package and verifies specification and documentation freshness under a network-denying preload inherited by child Node processes.
Packed tests install local dependency tarballs with npm offline, then exercise version, help, local setup/auth status, opt-in hooks and rejected input.
Transport and CLI tests route validated logical URLs to our synthetic HTTPS upstream, trusting only its test certificate.
The network preload denies external sockets, DNS and arbitrary subprocesses, and propagates to Node descendants even with a fresh environment.
No validation command calls Hybrid Analysis or provisions a service.
Live API acceptance belongs to the separately authorized T11 slice.

`corepack pnpm run spec:generate` regenerates declarations and the non-executable capability inventory from the pinned bytes and design ledger.
`spec:check` checks SHA-256 hashes, all 62 method/path classifications and deterministic generated artifacts offline.
New inventory entries do not enable commands; executable bindings belong to `src/catalogue.ts`.
After building, `corepack pnpm run docs:generate` regenerates this command table, `docs/commands.md` and `skills/hybrid-axi/SKILL.md` from that catalogue.
`docs:check` fails when any committed generated document is stale.

`.no-mistakes.yaml` separates offline preparation, affected tests and linting, and declares that no hosted CI is configured.
It must reach `main` before feature validation can rely on its trusted commands and review rules.
Pull requests target `knowttl/hybrid-axi` with base `main`; validation never authorizes merging or publication by itself.
