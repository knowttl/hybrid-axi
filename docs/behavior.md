# Behavior guide

[Doctor and quota](#doctor-and-quota) · [Hash and search](#hash-and-search) · [Submissions](#submissions-and-quick-scans) · [Hunting](#experimental-hunting) · [Reports and feeds](#reports-feeds-and-reviewed-raw-reads)

Read the [command reference](commands.md) for flags and the [safety guide](safety.md) before enabling writes.

## Startup

Configured `hybrid-axi` or `hybrid-axi home` reads key level, submission quota and the recent public detonation feed, with three requests and no retries.
Home shows at most five reports, the available window count, the upstream cap and a command to recover locally omitted rows.
This public feed is not the account's submission history and has no all-time total.
An empty feed explicitly reports zero; authentication, permission, quota and service failures remain errors.
If account reads succeed but the feed fails, home retains account context with `status: partial` and an unavailable feed carrying the structured error.
`home --offline` and session hooks read local profile status without HTTP or resolving credential files.
Unconfigured home explains setup without making API calls.
The `bin` identity is the absolute executable path with only the home directory boundary collapsed to `~`.

## Doctor and quota

`hybrid-axi doctor` verifies credential protections, reads `/key/current` and `/key/submission-quota`, and reports authentication, key level, quota and observed limit headers.
It also probes one read in each command group: system version, report state for a zero-hash placeholder, filename term search, detonation feed and zero-hash lookup.
Each probe uses API quota, and every denied probe is listed as `permission-denied` without preventing later probes.
A missing placeholder report is `not-found`, which does not establish access; unprobed operations remain unverified.
`hybrid-axi quota` reads the same two operations and reports the quota body and separately observed headers from each response.
Both commands accept `--config` and `--profile`, disable retries, and never submit a sample or URL.
Doctor makes at most seven requests; quota makes at most two.
The `api_key` and user fields from key inspection are always omitted.

Header observations include quota, rate-limit, retry and API-version information from the explicit [header allowlist](design.md#cli-and-output-contract).
Unknown quota fields pass through after sensitive-field redaction.
The documented `apikey` quota block appears as `keyQuota` so it remains distinguishable from credential fields during redaction.
Transport errors use a structured `error` object with code, operation and any known status, key level or retry interval.
When a response was received, `error.rateLimits` preserves its allowlisted header observations, including on 429 and other failures.
An `UPSTREAM_ERROR` includes `error.validation_errors` when supplied by the API, with redacted, bounded field diagnostics; inspect these when a schema-valid YARA body is rejected.
Transport JSON parse and schema failures use `MALFORMED_RESPONSE` with HTTP status, bounded `contentType`, `shape` and `shapeTruncated`.
`contentType` contains only the media type without parameters, or `null` when missing or invalid.
An unparseable body has a root shape of `undefined`; its body text is never included.
Schema failures also include bounded `issues`, `issuePaths` and `issuePathsTruncated`, reporting received and expected types without validator messages or response values.
Only letter-led identifiers of at most 40 ASCII letters, digits or underscores are retained as shape and issue-path keys, with GUID forms excluded; other keys, such as dotted hostnames, filenames and paths, become `<key>`.
This rule also applies to attacker-controlled malware report keys; identifier-shaped names can remain visible.
Registered secrets are redacted even in retained identifiers.
Arrays show their count and only the first element's shape, so later elements can differ.
`INVALID_RESPONSE` is a later command-level contract check and does not carry transport shape diagnostics.
Download denials distinguish an inspected restricted key from an unknown key level and explain the account-vetting requirement.
See the design's [key-level inspection and error contracts](design.md#transport-and-bounded-work) for download 403 handling.

The closed transport uses only reviewed HTTPS bindings, refuses redirects and shares a 20-second deadline, 20-request ceiling and 20-MiB decoded JSON ceiling per invocation.
Binary responses have a separate 250-MiB ceiling.
An explicitly retryable, non-consuming read can retry an explicit 429 or 502/503/504 response at most twice within those budgets.
Ambiguous timeouts and network failures are never replayed.

## Hash and search

`hybrid-axi hash show <sha256>` displays the stable overview; `--labs` selects the experimental Labs overview.
A successfully decoded overview with an explicitly empty report list and no verdict or score reports that no analysis is available and names the hash lookup command to run next.
The decoded empty-state contract is verified against the synthetic service.
HTTP errors do not establish that a hash has no analysis.
404, permission denial and malformed data are not interpreted as absence.
Labs 425 reports analysis pending and provides the exact overview command to retry.
`hybrid-axi hash search --hash <hash>` uses the current GET lookup for MD5, SHA1, SHA256 or SHA512 and returns associated report identifiers.
`--hashes-file <path>` instead uses the deprecated bulk POST with a newline-separated MD5/SHA1/SHA256 file, bounded to 1 MiB.
Report identifiers and bulk result rows in `hash show` and `hash search` are locally limited with `--limit` (default 100, and `--full` does not change it).
When rows are limited, output reports the truncation with returned and total counts and a follow-up command using the larger `--limit`.

`hybrid-axi search terms` requires at least one documented named filter; run its help for the complete filter list.
Filter flags use kebab-case, such as `--env-id`, `--vx-family` and `--date-from`.
Term date filters use `YYYY-MM-DD HH:mm`.
Output preserves upstream `count` beside `returned` result rows, both per search and in aggregate, and adds `complete: false` when fewer rows return.
Hybrid Analysis does not page search terms; narrow with `--date-from`/`--date-to`.
There is no term-search limit or cursor option.
Search requests transmit filters and hashes, without uploading samples or URLs for analysis.

`hybrid-axi search run --query '<query>'` starts one experimental Labs query with `--size` default 50 (range 1-200) and `--page` default 1.
Optional `--date-from` and `--date-to` use `YYYY-MM-DD` and include both endpoints.
Synchronous responses return the selected page immediately; asynchronous responses provide an ID and trigger one bounded result fetch using the same invocation budget.
Pending results and retrieval failures name `hybrid-axi search results <id>` for resuming without starting another query.
The CLI preserves the upstream `query_status`; the asynchronous API ignores page and treats size as the total number of matches to return.
Neither query starts nor result retrieval are automatically replayed.

Hash and search commands use compact output by default.
`--full` exposes all decoded fields; `--fields <comma-separated-names>` selects fields at each response level, including new experimental fields, after sensitive-field redaction.
Term and Labs searches accept object or array response envelopes and normalize them to an array under `searches`; term rows use `result` and Labs rows use `results`.
A single Labs result envelope with a validated query ID also exposes that ID at the top level; responses without an ID do not invent one.

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
Its `scan` output preserves the upstream shape: an array for a scanner list or an object for a single scanner.
Quick-scan reads support `--fields` and `--full` after sensitive-field redaction.
For scanner lists, field selection applies to each scanner.
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
Resetting changes the rule ID; use the returned ID for subsequent operations.
Any update returning a changed ID exposes `idChange` with `previousId` and `newId`, even with `--fields`.
Identity changes are also retained under the [private journal contract](design.md#guarded-writes-and-artifact-handling).
For create and update, a supplied `identifier` is trimmed and must contain 1-25 characters; longer identifiers fail locally with `VALIDATION_ERROR` before preview or any HTTP request.
`--body-file -` reads JSON from stdin, bounded to 1 MiB like regular body files.
`hunting yara delete <id>` deletes the exact rule and accepts an empty 204 success.
Every change previews first and requires enabled write scope, `--execute` and the exact preview confirmation, binding the profile, target and complete request digest.
Update and delete previews read the current rule; execution reads it again and checks for changes before sending the mutation.

`hunting matches` is a guarded consuming GET, with `--items-count` default 100 (range 1-1000) and optional RFC3339 `--search-after`.
Its help and preview disclose account-wide, irreversible consumption across all rules without sending a request; the API documents no rule selector.
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

`api get <path>` accepts a relative API path with or without a leading slash, such as `report/<id>/summary` or `report/<id>/memory-dump/hex-dump?filename=<name>`.
An omitted leading slash is added before the existing path validation.
Use the no-slash form in Git Bash to avoid automatic Windows path conversion, or set `MSYS_NO_PATHCONV=1`.
Drive-prefixed paths fail before credential resolution with that recovery hint.
It serves only bound report/feed/system JSON reads, key inspection/quota, stable hash overview/lookup, experimental Labs overview and query results.
Use `--labs` for a Labs path such as `sample/<sha256>/overview`.
Query keys must match the selected operation's strict schema; duplicate and malformed parameters fail before credentials are resolved.
Named and raw reads share transport, decoders, redaction and output policies.
Full URLs, encoded or traversing paths, binary routes, the mixed generic artifact route, consuming matches, refreshes, writes and unbound operations are blocked.
Raw reads cannot supply headers, credentials, origins or larger budgets.
