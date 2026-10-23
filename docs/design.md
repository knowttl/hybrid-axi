# hybrid-axi design

Planning baseline prepared on 2026-10-23.
This document defines intended behavior across the implementation slices below.
See [README](../README.md) for the current project status.

## Purpose and scope

Provide a read-first, agent-friendly CLI for the stable Hybrid Analysis API and explicitly experimental Labs API.
Publish [knowttl/hybrid-axi](https://github.com/knowttl/hybrid-axi) and npm package `@knowttl/hybrid-axi`.
Follow [vectra-axi](https://github.com/knowttl/vectra-axi/tree/98104c2f64771b4d4e9b9bd3617e97322c0a1e15) for language, layout, packaging, test setup and AXI behavior, with the ordered design-slice format from [tenable-axi](https://github.com/knowttl/tenable-axi/tree/68a175f780e21bc61a603839195b79f9f181c31d).
Only `https://hybrid-analysis.com/api/v2` and `https://hybrid-analysis.com/api/labs` are runtime API bases.
Credential issuance, abuse-report creation and unreviewed endpoints are unavailable.
No design research calls an API operation or uses a credential.

## Accepted decisions

| Decision | Choice and consequence |
|---|---|
| Runtime | Node.js 22.12+, strict TypeScript, ESM, pnpm/Corepack, `axi-sdk-js`, `@toon-format/toon`, zod and Vitest, matching vectra-axi. |
| Client | Hand-written fetch session and closed transport; generated compile-time types from pinned specs, no generated runtime client. |
| Default policy | Reads only; submission, YARA create/update/delete and sample/memory downloads use write guards. |
| Quick scan | Read-class by explicit decision, without a write gate; help states that the sample or URL is sent to Hybrid Analysis. |
| Sensitive artifacts | Allow guarded downloads, save bytes as provided, never extract, execute, encrypt or repackage; gzip/ZIP delivery does not promise password protection. |
| Hunting matches | The recent-matches GET consumes delivery state and is a guarded write, including preview, execute and exact confirmation. |
| Credentials | One `api-key` header for both APIs, default SecretRef `{"env":"HYBRID_AXI_API_KEY"}`, private-file references supported. |
| Delivery | Tool-specific no-mistakes configuration in T1, full local validation and private-data check, auto-merge on green; npm trusted publishing later. |
| Hosted use | Separate final artium-axi PR after npm publication, pinned released version and managed key. |

## Evidence and API contracts

The public [stable docs](https://hybrid-analysis.com/docs/api/v2) and [Labs docs](https://hybrid-analysis.com/docs/api/labs) load their specs from `/bff/api-docs/v2` and `/bff/api-docs/labs`.
Their documentation bundle calls `fetchApiDocsV2` and `fetchApiDocsLabs` using the public frontend's backend URL.
The snapshots in [specs/v2.json](../specs/v2.json) and [specs/labs.json](../specs/labs.json) preserve the fetched bytes.
[inventory/specs.json](../inventory/specs.json) records source URL, documentation URL, version, UTC fetch date, SHA-256 and operation count in the same manifest shape as tenable-axi, with provenance fields added.
Both use OpenAPI 3.0.0; stable `info.version` is 2.38.0 and Labs is 1.0.0.
There are 53 stable and 9 Labs operations.
The ledger classifies 39 reads, 12 guarded writes and 11 blocked operations, counting the generic mixed-artifact route by its default write disposition.
Only public documentation and its assets were fetched; no API operation was invoked.

Pin bytes rather than relying on version strings to identify a snapshot.
See [README development commands](../README.md#development) for offline specification and generated-artifact checks.
Spec refresh is explicit: review routes, parameters, effects, auth levels, pagination, schemas and errors before changing hashes.
New operations stay blocked until reviewed and explicitly bound in the executable catalogue.

## Architecture and module depth

The execution path is strict command catalogue -> caller-shaped Hybrid Analysis session -> single HTTPS sink -> runtime decoder -> safe projection/redaction -> AXI output.
The session hides operation binding, credential resolution, pagination, deadlines and error translation from handlers.
Keep related domain functions together; avoid forwarding wrappers per endpoint.
One typed catalogue owns leaf grammar, flags, effects, operation IDs, method/path, request schemas, response decoders, default fields, auth notes and evidence.
The ledger records evidence and exclusions; it never grants executable access by itself.
Generate help, command reference, installable skill and host-facing inventory from the catalogue.
Use `bin/`, `src/`, `test/`, `scripts/`, `inventory/`, `specs/`, `skills/hybrid-axi/` and strict ESM packaging consistent with vectra-axi.
Ship `axi-credential.schema.json` and an importable reviewed catalogue for later hosted use.

Zod decoders require only fields the view renders and pass unknown upstream fields through.
Labs help and outputs explicitly identify experimental contracts; unknown fields remain available through `--fields` and `--full`.
Never turn missing, denied or malformed data into zero scores or empty lists.
Strict request/config validation and tolerant response decoding are separate responsibilities.

### Transport and bounded work

Only the transport composes the `api-key` header.
Require the exact HTTPS origin, enabled TLS verification, `redirect: error`, reviewed path templates and escaped identifiers.
Reject caller URLs, traversal, foreign continuations, alternate ports and unregistered routes before sending credentials.
The docs BFF is evidence only and is never a runtime API base.
Reject credentials with control characters or header delimiters.
Use a 20-second invocation deadline, 20-request ceiling and 20-MiB decoded JSON ceiling, including pages and retries.
File downloads have a separate 250-MiB ceiling and the same deadline/request bounds; report a clear limit error rather than publishing partial output.
Use cancellable requests with the remaining invocation budget.
Safe, non-consuming reads may retry explicit 429 and reviewed 502/503/504 responses at most twice within those budgets.
Honor valid `Retry-After` seconds or HTTP dates; return `RATE_LIMITED` with retry guidance when the delay exceeds the budget.
Never automatically replay an ambiguous timeout, including safe reads, quick scans, search starts, guarded downloads and mutations.
Quick scans and search starts are single-send even though classified as reads; separate result/status reads can resume known IDs.

Translate errors into `error: {code, message, operation, status?, keyLevel?, requiredKeyLevel?, retryAfter?, auditId?}` plus useful next-step hints.
Handle the documented `{message}` error, empty/malformed bodies and HTML failures without raw dependency output or stack traces.
401 is `AUTH_REQUIRED`; 403 is permission denial, never an empty result.
For a download 403, use known `/key/current` `auth_level_name` and the operation's `x-auth-level` where available.
For a restricted key, report `KEY_LEVEL_RESTRICTED`, `keyLevel: restricted`, `requiredKeyLevel: default`, and explain account vetting is needed for download access.
If key inspection is unavailable, say the level is unknown rather than inventing restricted status; suggest `hybrid-axi quota` and explain that non-vetted restricted keys cannot download.
Doctor cannot prove access to all operations and must not recommend broad elevation for ordinary reads.

## Profiles and authentication

Follow the public [AXI credential standard](https://github.com/knowttl/artium-axi/blob/main/docs/credential-standard.md).
Use this strict versioned envelope:

```json
{
  "version": 1,
  "defaultProfile": "example",
  "profiles": {
    "example": {
      "origin": "https://hybrid-analysis.com",
      "apiKey": {"env": "HYBRID_AXI_API_KEY"},
      "writes": {"allowWrites": false, "operations": []}
    }
  }
}
```

`apiKey` accepts exactly `{"env":"NAME"}` or `{"file":"<absolute-path>"}` and defaults to `{"env":"HYBRID_AXI_API_KEY"}` when omitted.
Reject inline values, unknown config keys, malformed refs, stored refs and invalid environment names without echoing their values.
The profile credential schema marks `apiKey` with `x-secret: true`.
Never accept a key through argv, request headers, raw-command options, login prompts or repository-local config discovery.
No key minting, browser login or persistent credential storage is provided.
Resolve keys in invocation memory only.

Config selection is `--config`, `HYBRID_AXI_CONFIG`, then the platform default.
Profile selection is `--profile`, `HYBRID_AXI_PROFILE`, a complete env profile, configured default, then sole profile.
Explicit file-profile selection ignores env profile fields; incomplete env profiles fail rather than mixing credentials.
The sole allowed origin defaults to `https://hybrid-analysis.com` and cannot be widened by flags.
Env profiles cannot enable writes.
`HYBRID_AXI_READ_ONLY=1` or `true` overrides every write allowance; accept `0` or `false` and reject other nonempty values, case-insensitively.
Linux/macOS config uses absolute `$XDG_CONFIG_HOME/hybrid-axi/config.json`, otherwise `~/.config/hybrid-axi/config.json`.
State uses absolute `$XDG_STATE_HOME/hybrid-axi`, otherwise `~/.local/state/hybrid-axi`.
Windows uses `%APPDATA%\hybrid-axi\config.json` and `%LOCALAPPDATA%\hybrid-axi`, ignoring XDG.
Use `os.homedir()` and the same private-file protections as vectra-axi: regular files, no symlinks/reparse points, current-user ownership, private secret files and protected Windows DACLs.
Use 0700 private directories and 0600 secret/journal files on POSIX; reject group/other writable config.
Decode secret files as UTF-8, remove BOM and trailing whitespace, and reject empty credentials.
`auth status` and `doctor` verify file protections without printing values.

Register raw, JSON-escaped and URL-encoded key values for redaction before any dependency or output sees them.
Scrub stdout, stderr, diagnostics, structured errors, previews, suggestions and journal metadata.
`/key/current` returns `api_key` and a user object: explicitly omit credential and user details even under `--full`.
Apply sensitive-field redaction to unknown Labs fields before output.
Binary artifact bytes are not rewritten or unpacked for redaction; response headers, filenames, paths and all printed metadata remain scrubbed.
Never store keys or full response bodies in journals.

## CLI and output contract

Use noun/subnoun/verb grammar and kebab-case flags.
Retain the requested positional `hash show <sha256>`, `report show <id>` and `api get <path>` shapes.
Common selectors are `--config` and `--profile`; every leaf supports concise `--help` with defaults, required inputs and two or three examples.
Reject unknown flags, unexpected/duplicate arguments and invalid combinations before credential resolution or HTTP, with exit 2 and valid flags inline.
No interactive prompts are needed.

The complete operation ledger below maps commands to exact upstream operations and effects.
Additional command contracts are:

| Command | Selectors and behavior | Compact fields |
|---|---|---|
| `home` / no args | Local profile, binary path with home collapsed to `~`, description and effective policy; no network. | profile, origin, readOnly, setup state |
| `auth status` | Local SecretRef availability and protection checks; no key value or HTTP. | profile, source kind, available |
| `doctor` | Bounded `/key/current` and `/key/submission-quota` reads, no retries or samples. | keyLevel, quota, rateLimits |
| `quota` | Same two key operations, body usage plus observed limit headers. | keyLevel, quota, rateLimits |
| `hash show <sha256>` | Stable overview; `--labs` selects experimental sample overview. | sha256, verdict, threat_score, reports/report_ids |
| `hash search` | Exactly one `--hash` or `--hashes-file`; bulk POST only for the latter. | sha256, verdict, threat_score, report ID |
| `search terms` | Documented named filters only; strict nonempty input. | sha256, verdict, threat_score, report ID |
| `search run` | Experimental Labs query, `--query`, `--size` (default 50, max 200), `--page`, `--date-from`, `--date-to`; starts once and retrieves results within the deadline. | sha256, verdict, score, query status |
| `search results <id>` | Experimental resumable results read, never reruns the query. | id, query_status, count, results |
| `report show/state <id>` | Job ID or `sha256:environmentId`; summary and state respectively. | id, state, verdict, threat_score |
| `report file <id>` | Exactly one `--type` and explicit new `--output`; one artifact per call, type determines gate below. | id, type, output, bytes |
| `quick-scan file/url` | `--file` or `--url`, documented `--scan-type`; read-class but transmits the supplied sample/URL. | id, finished, sha256 |
| `hunting yara list/show` | Experimental; list `--search`, `--threat-category`, `--status`; show positional ID. | id, identifier, active |
| `hunting yara create/update/delete` | Experimental, operation-specific `--body-file` for create/update; exact confirmation. | id, identifier, active |
| `hunting matches` | Experimental guarded write; `--items-count` (default 100, range 1-1000), optional `--search-after` timestamp; preview consuming scope without calling the endpoint. | id, rule, sha256, match time |
| `feed latest` | Requested deprecated latest feed, `--limit` default 100; upstream caps 250 reports/24h. | report ID, sha256, verdict, timestamp |
| `api get <path>` | Relative API path plus `--labs` when appropriate; reviewed read-only GET bindings, validated query schema and normal output/transport policy. | Operation-specific fields |

`api get` refuses binary routes, mixed-effect `/file/{type}`, refresh, consuming matches, unbound paths, full URLs and all writes; the HTTP method alone is insufficient authorization.
Raw reads cannot change credentials, origin, headers or budgets.
`hash search --hashes-file` uses the deprecated `/search/hashes` operation because the requested bulk behavior has no equivalent stable bulk replacement in this snapshot; document that warning.
`--body-file -` may use stdin for YARA source/JSON; reject competing stdin consumers and enforce size bounds.
Submission commands use the exact documented environment ID and options; never silently enable deprecated anti-evasion/network flags.

Keep JSON internally and encode [TOON](https://toonformat.dev/reference/spec.html) at stdout.
Use 3-4 useful fields for normal lists, `--fields` for explicit extra fields and `--full` for untruncated details.
Preview long text at 1,000 characters, include original length and offer `--full` only when truncation occurs.
Lists expose returned count, upstream total when known, completeness and continuation separately from TOON array headers.
Unknown totals stay unknown; truncation always has a command or selector to see more.
Default list limit is 100 unless the upstream bound is lower; never invent pagination parameters for an unpaged API.
Labs synchronous search supports 1-based pages; asynchronous results are bounded by the submitted size and cannot be treated as the full database.
Budget stops preserve validated rows and resumable query IDs/cursors with `complete:false`; partial errors exit 1.
Hints preserve profile and relevant selectors and use placeholders for unknown IDs.
Exit 0 means success/no-op, 1 runtime failure and 2 usage error.
Structured errors and data go to stdout; progress and diagnostics go to stderr.
Bare `-v`, `-V` and `--version` print only the version before dynamically importing the command graph.

A confirmed no-analysis state is success with `state: no-analysis`, the queried hash and `help: hybrid-axi hash search --hash <sha256>` to check associated reports.
An empty hash search explicitly reports zero reports and offers `hybrid-axi submit file --file <path> --environment-id <id>` as a preview-only next step.
Never auto-submit, quick-scan or refresh a missing hash.
The specs do not define a unique missing-analysis status/body, so implementation must distinguish confirmed absence from 401/403, malformed success and generic 404.
Labs 425 means analysis is in progress, not absent: return explicit pending state and retry guidance without resubmitting.

`doctor` and `quota` expose observed `Api-Limits`, `Submission-Limits`, `Quick-Scan-Limits`, `Sample-Download-Limits`, `Api-Version`, `Webservice-Version` and any observed `Retry-After`/rate-limit headers.
Parse documented JSON header values tolerantly, bound/redact malformed values and identify absent headers as unavailable.
The submit response documents a misspelled `Submission-Limits"` header; recognize it defensively without assuming the service emits it.
Do not manufacture quota values, reset times or universal numeric rate limits.

## Guarded writes and artifact handling

Default read-only includes keys with elevated upstream privileges.
Follow vectra-axi's coordinator: hand-enabled immutable profile operation allowlist, forced read-only override, preview, exact-target confirmation and durable redacted journal.
An empty allowlist denies all guarded operations, including guarded downloads; flags cannot widen policy.
No server-side dry-run facility is assumed.

1. Validate the operation, target, strict payload and immutable origin.
2. Enforce profile scope and forced read-only before HTTP, including previews.
3. Read existing YARA state where supported and render the redacted target, effect, proposed change and exact confirmation string.
4. Without `--execute`, return only the preview; `--dry-run` is mutually exclusive with execution.
5. Require typed `--confirm` equal to the exact preview target and apply an additional host approval hook when supplied.
6. Durably reserve intent, check changed target state, send once through single-use authorization bound to operation/path/payload/target, and record the result.

Submission confirmation binds profile, operation, file SHA-256 or exact normalized URL, environment ID and canonical option digest.
Every submission preview states: **The sample and its report can become visible to the community.**
YARA creates bind the exact identifier and payload digest; update/delete bind exact rule ID and proposed change digest.
Download confirmation binds profile, report/hash ID, artifact kind, any dropped hash or memory selector and destination.
Binary and memory preview/help states: **Live-malware warning: this artifact may contain executable malware. Save only; do not extract or execute.**
The design, preview and help also state: **The spec documents gzip/ZIP delivery without promising password protection. Protection is unverified; bytes are saved exactly as provided.**
Never add encryption or repackaging of our own.
Hunting-match confirmation binds profile, operation, exact `items_count` and `search_after` scope, and the canonical scope digest.
Its preview says that returned matches are marked delivered and will not be returned again; it must not call the consuming endpoint to discover or preview matches.
The operation does not offer stable pre-read match IDs, so confirmation names the exact consuming scope rather than claiming a fixed match set.
Read classification for quick scan is a deliberate exception and does not mean it avoids upload or other remote effects.

Use a private durable `writes.log` in the state directory, with a nonblank `HYBRID_AXI_WRITE_LOG` override for controlled hosts.
Record audit ID, operation, target/digest, effect and outcome, excluding keys, headers, source bodies and artifact contents.
Flush intent before any send; serialization, duplicate-intent checks, malformed-journal and unresolved-lock refusal follow vectra-axi's contract.
Failure to reserve intent blocks sending; failure to record outcome after sending reports possible success.
Ambiguous outcomes return `OUTCOME_UNKNOWN`, audit ID and read-back guidance, never replay or an assurance that nothing happened.
Re-reads narrow YARA races but do not provide undocumented compare-and-set or idempotency guarantees.
Only establish a no-op where a read proves the desired state; generic 404 is not proof of an already-deleted rule.

`report file` chooses one reviewed artifact and never downloads a batch of independently selected files.
Normal report formats, certificate, PCAP and memory strings are reads; sample binaries, dropped-binary archives and process-memory archives are guarded writes.
For `/report/{id}/file/{type}`, validate the documented type before dispatch: `bin`/`memory` are writes, `xml/json/html/pdf/maec/stix/misp/misp-json/openioc/crt/pcap` are reads, and unknown types fail closed.
Prefer dedicated nondeprecated routes for JSON, PCAP, certificate and sample; the deprecated generic endpoint remains necessary for memory and other documented formats.
Store exactly the provided compressed/archive bytes, without unpacking, recompressing or executing.
Require an explicit new output path, refuse overwrite and unsafe paths, stream to a private bounded temporary file and publish atomically only after success.
Treat `Vx-Filename` as untrusted metadata, never a destination path.
Binary content never goes to stdout or logs.
The archive/password discrepancy is documented in the decisions below, without blocking guarded execution.

## Complete operation ledger

Every operation appears once below, keyed by source, method/path and the upstream operation ID.
`read` is reviewed query behavior, including the explicitly approved quick-scan exception; `write` is guarded behavior and `blocked` has no passthrough.
For the single mixed artifact operation, effect is resolved from an exhaustive type allowlist before credentials or transport; its default disposition is write.
Blocked rows identify replacements or explain exclusions; they do not silently add unsupported features.

### Stable 2.38.0

| Operation ID | Method/path | Disposition | Planned command | Reason |
|---|---|---|---|---|
| `c1eed959af43228c83ebf43554f3c541` | `GET /feed/latest` | read | `feed latest` | Requested feed; deprecated, capped at 250 reports from 24h. |
| `90ffc0d89757c30cda41531e26c3daac` | `GET /feed/detonation` | read | `feed detonation` | Current report feed, capped at 250. |
| `6f846a8bc0bc73e905408f2e6da577a7` | `GET /feed/quick-scan` | read | `feed quick-scan` | Current quick-scan feed, capped at 2,500. |
| `5e583bcbee466842da56ec9dbe819664` | `GET /key/current` | read | `quota / doctor` | Key-level and limits only; strip returned key/user. |
| `a638983ab386e3f17ede1ed9644220a8` | `GET /key/submission-quota` | read | `quota / doctor` | Submission usage and limit evidence. |
| `9981be6445da2c7e117a48dbc551f5f6` | `GET /overview/{sha256}` | read | `hash show <sha256>` | Stable overview. |
| `cb21128a1fd6a0bfa882774482d1473d` | `GET /overview/{sha256}/refresh` | blocked | - | Refreshes remote external-service data; no raw-read exposure. |
| `052627a17af8cc6ae5240f4684040902` | `GET /overview/{sha256}/summary` | read | `hash summary <sha256>` | Compact overview. |
| `f0861f681445a6b6dd6f1b9964cee1b8` | `GET /overview/{sha256}/sample` | write | `hash file <sha256>` | Guarded sample bytes; protection unverified, save upstream bytes unchanged. |
| `04c731564495f3770c5d2e5d9971ecb2` | `GET /quick-scan/state` | read | `quick-scan scanners` | Available scanner state. |
| `711bd2a6c5b9f2b4c34e8af6554274e3` | `POST /quick-scan/file` | read | `quick-scan file` | Explicit read exception; sends sample, single-send. |
| `458f96cf9b737894c0a7bd60f6e3f183` | `POST /quick-scan/url` | read | `quick-scan url` | Explicit read exception; sends URL, single-send. |
| `1caeced3764dc67b0fc84b86cc9d5d74` | `POST /quick-scan/url-to-file` | blocked | - | Deprecated; use quick-scan url. |
| `c1764f8d9ba84c12fedb7f73915ab380` | `POST /quick-scan/url-for-analysis` | blocked | - | Deprecated; use quick-scan url. |
| `8b094dc6a7b763bfd4e25911ed8af72c` | `GET /quick-scan/{id}` | read | `quick-scan show <id>` | Retrieve unfinished/finished scan state. |
| `a73895c4bd896396a8f59a02f49cac3b` | `POST /abuse-reports/new` | blocked | - | Requests removal; outside requested mutation scope. |
| `d97c84ba3099decb501ba37e993ad225` | `GET /abuse-reports/feed` | read | `feed abuse` | Read qualified-removal feed with documented page selector. |
| `654b1757059fe1083aa8ad456fb6b8c0` | `GET /report/{id}/certificate` | read | `report file <id> --type crt` | Certificate artifact, one file. |
| `fe428721a2d007320558f6c1322015b7` | `GET /report/{id}/children` | read | `report children <id>` | Child report identifiers. |
| `610507c03f2fd279e8bf7de42eb1b78b` | `GET /report/{id}/memory-dumps-list` | read | `report memory list <id>` | Metadata only, no binary dump. |
| `a5ac630a36de6338b24cd231aae1b017` | `GET /report/{id}/memory-dump/extracted-strings` | read | `report memory strings <id> --filename <name>` | Selected extracted strings, not raw memory. |
| `39f01edd97d1aa8b83c7f339ccf58025` | `GET /report/{id}/memory-dump/hex-dump` | read | `report memory hex <id> --filename <name>` | Bounded structured JSON hex view, not binary download. |
| `efae3cf1c0edae0a3d48749f6897a022` | `GET /report/{id}/pcap` | read | `report file <id> --type pcap` | One network capture. |
| `dd971989a7f758edc5d1c9a7f5fde421` | `GET /report/{id}/report/json` | read | `report file <id> --type json` | Dedicated full JSON report route. |
| `c674755592ec02c64ad836ae12d6d7bf` | `GET /report/{id}/sample` | write | `report file <id> --type bin` | Guarded sample; protection unverified, save upstream bytes unchanged. |
| `e01f9d5e492cbc72369f56397488365b` | `GET /report/{id}/memory-strings` | read | `report file <id> --type memory-strings` | Extracted strings artifact, not raw memory. |
| `a9bc4ff2646b8ebd3e94b21c17f32f37` | `GET /report/{id}/state` | read | `report state <id>` | Submission state. |
| `b7bf5dba3bdd7e12a97034ad679b7358` | `GET /report/{id}/summary` | read | `report show <id>` | Submission summary. |
| `a692386204ede603328741f7b08e225a` | `POST /report/summary` | blocked | - | Deprecated bulk summary; use named report/hash reads. |
| `7e872c46c1a5638b701b09cc68e03565` | `GET /report/{id}/file/{type}` | write | `report file <id> --type <type>` | Mixed: bin/memory guarded writes; enumerated report formats read; unknown types blocked. Deprecated, dedicated routes preferred; protection unverified. |
| `db2dc105afde92f2df0d322b61143a5e` | `GET /report/{id}/screenshots` | read | `report screenshots <id>` | Bounded Base64 screenshot response. |
| `5d4fc0a422e9da082903f9ccf9b9bad1` | `GET /report/{id}/dropped-file/{hash}` | blocked | - | Deprecated single dropped archive; current archive alternative below. |
| `e718eaeb76a4ebfd4781995e894d7cec` | `GET /report/{id}/dropped-file-raw/{hash}` | blocked | - | Raw binary is outside the requested archive handling; use dropped-files-v2. |
| `ec44d43bdb74f2d7921a770ae549e81d` | `GET /report/{id}/dropped-files` | blocked | - | Deprecated gzip-in-ZIP bundle; use dropped-files-v2. |
| `62a8676fdd00f35e04945f2f0b4ad07d` | `GET /report/{id}/dropped-files-v2` | write | `report file <id> --type dropped-files` | One archive of dropped binaries; guarded, protection unverified. |
| `b972462c6d0d664b328b10b9e91da4c9` | `GET /search/hash` | read | `hash search --hash <hash>` | GET is current, supports MD5/SHA1/SHA256/SHA512. |
| `0197a6ff29eab44bf4d18d45bb67aedb` | `POST /search/hash` | blocked | - | Deprecated POST; use current GET hash search. |
| `2f3268b2522562c9d49936fae22ea6c7` | `POST /search/hashes` | read | `hash search --hashes-file <path>` | Requested bulk lookup; deprecated without stable bulk replacement. |
| `5d7230cfa76c541818188ff3911bb6a2` | `POST /search/terms` | read | `search terms` | POST query, no sample upload. |
| `e306d626e3fbbe3f10982ff88251b2b7` | `POST /submit/file` | write | `submit file` | Creates sandbox analysis; community-visibility preview. |
| `22e1723d4cec5c9b20d50715e4e5de8f` | `POST /submit/url` | write | `submit url` | Creates sandbox analysis; community-visibility preview. |
| `d23ebbf65a2b6ea472053d3478acdbaa` | `POST /submit/url-to-file` | blocked | - | Deprecated; use submit url. |
| `10980b93e5209ab3dde97d651c2fc503` | `POST /submit/url-for-analysis` | blocked | - | Deprecated; use submit url. |
| `e7a13bfd6ebcdc403f13efd8aa5f9bcc` | `POST /submit/hash-for-url` | read | `hash url --url <url>` | POST computes URL submission lookup hash, no sandbox submission. |
| `e2bce91701a469c9751d5a63da2869d9` | `POST /submit/dropped-file` | write | `submit dropped-file` | Creates sandbox analysis for exact parent/report and file hash. |
| `024cceff2dd2ddfad6a74251aad3b846` | `POST /quick-scan/{id}/convert-to-full` | write | `quick-scan submit <id>` | Creates sandbox analysis, outside quick-scan read exception. |
| `145769f29b3862d158e74b6ddda845f1` | `GET /system/version` | read | `system version` | Version information. |
| `bd68b15f49c59048688402da2a9d5b90` | `GET /system/environments` | read | `system environments` | Submission environment discovery. |
| `13ea959829e5303a7aa453d5e74c503e` | `GET /system/action-scripts` | read | `system action-scripts` | Available action-script options. |
| `5e878cfdb239f874742add7b9c519b41` | `GET /system/stats` | read | `system stats` | System statistics, default key level required. |
| `d373372cf33e493b15d9678972b68268` | `GET /system/configuration` | read | `system configuration` | Documented partial public instance configuration; redact before projection. |
| `04ea6a4ccdb477857ab825ca8ca8f4f5` | `GET /system/queue-size` | read | `system queue-size` | Queue size. |
| `5a69498675db3f2db5cfdb50423feafb` | `GET /system/total-submissions` | read | `system total-submissions` | Submission aggregate. |

### Labs 1.0.0 - experimental

| Operation ID | Method/path | Disposition | Planned command | Reason |
|---|---|---|---|---|
| `3fa0911073aec064f0398d488f74c4f2` | `GET /hunting/matches/recent` | write | `hunting matches` | Consuming GET marks every returned match delivered; preview exact consuming scope, execute and confirm before send. |
| `adc7c9ebb1c46f92f13f1a4e8dd0c9c3` | `GET /sample/{sha256}/overview` | read | `hash show <sha256> --labs` | Experimental sample overview; 425 is pending. |
| `60367d88a168e925cc6be05b55565ab6` | `POST /search/query/run` | read | `search run` | Query-only POST, sync 200 or async 202; start once. |
| `a385738306b200f7387851e538fe2e98` | `GET /search/query/{id}/results` | read | `search results <id> / search run` | Resume known query; bounded result retrieval. |
| `0d965c4fe9b7806ced772d0b6b61b1b5` | `GET /hunting/yara-rules` | read | `hunting yara list` | Own rule list with documented filters. |
| `7dcab7838cd6eeea81243d256b05ecc2` | `POST /hunting/yara-rules` | write | `hunting yara create` | Creates rule with exact identifier/payload confirmation. |
| `d8d8833e20421f7c1175ca126646ba7b` | `GET /hunting/yara-rules/{id}` | read | `hunting yara show <id>` | Own rule detail. |
| `39bc2cb8ea5bab2edd9eb9fa161b819a` | `POST /hunting/yara-rules/{id}` | write | `hunting yara update <id>` | Partial POST update; reset_counter is an explicit previewed effect. |
| `63fb1846ad545a0551d782694673cb22` | `DELETE /hunting/yara-rules/{id}` | write | `hunting yara delete <id>` | Deletes exact own rule; 204 has no JSON body. |

## Deviations from the prompt

These are specification findings, not observed live-API behavior.
No live behavior was probed in this design slice.

1. Stable hash lookup is now `GET /search/hash`; POST hash lookup is deprecated, as are bulk `/search/hashes` and `/report/summary`.
2. Labs `search run` can return synchronous 200 results or asynchronous 202 query IDs; it is not invariably an async two-request exchange.
   Its schemas wrap results/IDs in arrays, and async status is `query_status`; preserve the pinned shape rather than inventing a job envelope.
3. Labs recent hunting matches are consuming GETs: returned matches are marked delivered and will not be returned again.
   No non-consuming matches-list alternative appears in the snapshot; this command is a guarded write by explicit decision.
4. Overview refresh is a GET that fetches fresh external-service data; it is blocked rather than exposed as a raw read.
5. Sample downloads declare `application/gzip`; generic binary downloads describe gzip and memory describes ZIP.
   The specs do not promise password protection, contrary to the parenthetical expectation in the original download answer; the confirmed decision below allows guarded downloads unchanged with a warning.
6. `/report/{id}/file/{type}` is deprecated and mixes ordinary report formats with `bin` and `memory`; memory has no dedicated binary replacement in the spec.
   Dropped-file legacy routes are deprecated, a current raw route exists, and `/dropped-files-v2` provides an archive; the raw route stays blocked under the archive-first requirement.
7. `feed latest` is deprecated; `/feed/detonation` and `/feed/quick-scan` provide current feed alternatives with different caps (250 versus 2,500).
8. File/URL quick scans and sandbox submits have deprecated URL-to-file/URL-for-analysis variants; quick-scan-to-full and dropped-file submissions create sandbox analyses and require write policy.
9. `/submit/hash-for-url` computes a lookup hash using POST and is a read; HTTP verbs do not determine policy.
10. Labs overview documents 425 for analysis in progress; neither overview contract defines a definitive no-analysis error shape.
    Denial and malformed data cannot be interpreted as empty; read-only acceptance must establish missing-analysis fixtures before release.
11. The key-level vocabulary is restricted/default/elevated/super, and `/key/current` includes the secret `api_key` plus user information that must be stripped.
    Download auth levels are usually in `x-auth-level`, while newer operations sometimes omit that annotation; absence is not permission evidence.
12. Quota is conveyed substantially through JSON-valued `Api-Limits`, `Submission-Limits`, `Quick-Scan-Limits` and `Sample-Download-Limits` headers, not a uniform standard rate-limit header set.
    Some submit responses spell `Submission-Limits"` with a trailing quote.
13. The stable changelog says all `/file-collection/*` routes return 410 from 2026-08-21; there are no such operations in these pinned paths.
    Do not recreate them from historical notes.
14. YARA update is POST, not PUT/PATCH; it updates supplied fields only and also exposes `reset_counter`.
    A reset must be explicit in payload and preview; deletion returns 204 without a JSON body.
15. The later request adds actual artium-axi integration after publication, replacing the original note-only exclusion; T13 is a separate host-repository PR.

## Confirmed safety decisions

Q1 is resolved: consuming hunting matches is a guarded write, with no preview request or automatic replay.
Q2 is resolved for implementation: guarded sample and memory downloads remain allowed and save the upstream bytes unchanged, without encryption or repackaging.
The expected password-protected archive is not guaranteed by the pinned specs, which document gzip/ZIP delivery.
Protection remains unverified; preview and help must disclose that limitation alongside the live-malware warning.
The owner confirmed on 2026-10-22: keep them allowed with a warning.
This decision does not authorize changing artifact bytes.

No open contract is resolved by a guess about live behavior.
Missing-analysis, key denial and header details are verification requirements for synthetic contract tests and separately authorized read-only acceptance.

## Change recipe and tests

For each endpoint, update effect/evidence, bind its named command, implement its projection/decoder through the session, add synthetic outcome fixtures and regenerate documentation.
Use Vitest, isolated HOME/XDG/config state and a process-tree network-denying guard, following vectra-axi's conventions.
Build our own fake HTTPS Hybrid Analysis with a test CA and synthetic keys; inject routing at transport construction while keeping production origin validation intact.
Test public session behavior at the lowest useful level and packed CLI journeys where lower levels miss critical behavior.
Required outcomes include populated/empty/pending/denied/malformed responses, unknown Labs fields, redaction of echoed keys and headers, restricted-key download denial, both search modes, deadline/resume, repeated cursors and truncation escape hatches.
Safety cases include zero sends on preview/wrong confirmation/default read-only, quick-scan upload disclosure, journal failure, changed YARA target, single-send ambiguous outcomes and closed raw reads.
Artifact tests use inert synthetic bytes, validate destination safety and atomic bounded output, and never contain real samples.
Repeat changed async/time/I/O tests with fake clocks and deterministic randomness, checking cleanup without sleeps.
No automated test or design check needs Hybrid Analysis DNS, a real account or a credential.
The [contribution rules](../CONTRIBUTING.md) own local verification and public-data hygiene.

## Implementation slices

The order below is the delivery order, with each slice independently reviewable and verified against fakes.
Apply the recorded Q1/Q2 decisions in the affected slices; no design approval alone enables commands.

| Slice | Dependencies | Scope | Verify |
|---|---|---|---|
| T1 | Design | Scaffold: package, strict TS/ESM, pnpm, bin/src/test layout, catalogue skeleton, version fast path, generated spec types and offline spec checks. Land tool-specific `.no-mistakes.yaml` with separate prepare/test/lint commands, private-data review rules and auto-merge on green on main before feature slices. | Offline build/lint, hash and 62-operation inventory checks, packed version/help baseline, no network; configuration consumes real hybrid-axi commands and targets `knowttl/hybrid-axi` with base `main`. |
| T2 | T1 | Profiles, env/file SecretRefs, private-file handling, redaction, credential schema and local home/auth/setup/profile/config commands. | Precedence, file protections on both platform branches, no argv key, key-current/user stripping, no network. |
| T3 | T2 | Closed transport, errors, budgets, quota, doctor, fake upstream and process-tree network guard. | Restricted/unknown key-level 403, vetted-download advice, quota/header parsing, redirects, timeout no replay, malformed bodies and synthetic secret sentinels. |
| T4 | T3 | Hash show/search, search terms, Labs overview and sync/async query run/results. | Positive/empty/pending/denied fixtures, both query modes, bounded result fetching/resume, no duplicate start, unknown-field passthrough. |
| T5 | T3 | Report summary/state, children, memory metadata, normal report artifacts, feeds, system and reviewed raw reads. | Exact operation binding, deprecated-route disclosure, one atomic bounded artifact per call, no sensitive/raw bypass, counts/truncation. |
| T6 | T3 | Shared write coordinator, immutable scope, preview/execute/exact-confirm and durable journal. | Default/forced read-only, target digest, wrong confirmation, journal failure, single-send timeout and audit/read-back guidance. |
| T7 | T4, T6 | Sandbox file/URL submissions, dropped-file submit, quick-scan conversion, plus file/URL quick scans and status as explicit read exceptions. | Fake uploads only, community-visibility preview, exact sample/environment target, quick-scan transmission help, no automatic replay or live submissions. |
| T8 | T5, T6 | Guarded sample, dropped archive and process-memory downloads. | Exact ID/type/destination confirmation, live-malware and unverified-protection help/preview, private atomic bytes unchanged, no extraction/encryption/repackaging/stdout, restricted-key errors. |
| T9 | T4, T6 | Experimental hunting YARA list/show/create/update/delete and consuming matches as a guarded write. | Unknown fields, POST partial updates/reset preview, 204 delete, exact guards, consuming-scope preview without request and no retry of consuming operations. |
| T10 | T4 through T9 | Release README, catalogue-generated reference and skill with every leaf marked read/write, explicit session-hook setup, release-please and npm trusted-publishing workflow. | Offline tarball critical journeys, generated docs/spec freshness, build/lint/tests, public-data review; no publication yet. |
| T11 | T10 | Separately authorized read-only acceptance with supplied test key on an authorized host. | Doctor/quota, key-level error guidance, known/missing/pending hash contracts and sanitized header/search evidence; no sample/URL upload, sandbox submission, YARA write, consuming matches or guarded artifact download. |
| T12 | T11 | First npm release using trusted publishing, reviewed version and provenance. | Published integrity, offline version/help, shipped credential schema/catalogue/skill and package contents. |
| T13 | T12 | Separate artium-axi PR integrating hybrid-axi at a pinned released npm version, with a managed `api-key` credential for host `hybrid-analysis.com`. | Host fake walking skeleton, managed-secret redaction, restricted-key 403, package/image pinning and write-switch behavior. Submissions, YARA mutations, consuming matches and guarded sample/memory downloads are off by default and listed in the write switch; host policy cannot bypass native preview/execute/exact-confirm or journal. Map uploads/artifacts explicitly. |
