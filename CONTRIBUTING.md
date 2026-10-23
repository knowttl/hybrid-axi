# Contributing

Keep changes focused and describe the problem, resulting behavior, scope, and verification in the pull request.
Follow [the design](docs/design.md); the operation ledger is evidence, not permission to expose arbitrary HTTP.
See [README](README.md) for shipped behavior and development commands.

## TypeScript conventions

Follow [vectra-axi](https://github.com/knowttl/vectra-axi): Node.js 22.12 or later, TypeScript with strict checking, ESM, pnpm through Corepack and a committed lockfile.
Reuse `axi-sdk-js` for the CLI boundary, `@toon-format/toon` for stdout and zod for runtime decoding.
Keep JSON internally, validate command inputs strictly and tolerate unknown response fields.
Keep one authoritative command catalogue for grammar, effects, operation bindings, output fields, help and generated agent documentation.
Prefer caller-shaped functions hiding a complete responsibility over forwarding wrappers per endpoint.
Match existing style, avoid adjacent refactors and never edit generated files or changelogs manually.

## Safety boundaries

Only the reviewed HTTPS origin `https://hybrid-analysis.com` and API prefixes `/api/v2` and `/api/labs` are permitted at runtime.
Never add arbitrary HTTP, alternate-origin, TLS-disable, inline-key or write-policy bypasses.
Credentials resolve from environment or private-file SecretRefs; the default is `HYBRID_AXI_API_KEY`.
Submissions, YARA mutations and binary/memory downloads use preview, explicit execution, exact-target confirmation and a durable redacted journal.
Quick scans are reads by explicit policy but transmit the supplied sample or URL; help must say so.
HTTP GET does not establish read safety: consuming hunting matches uses write guards, and refreshing external overview data is blocked.
Never replay an ambiguous timeout, including a quick scan or asynchronous search start.

## Verification

Automated tests are offline and use synthetic credentials, fixtures and our own fake upstream.
Deny outbound networking before imports, including subprocesses; permit only the explicitly constructed fake HTTPS service.
Isolate HOME, XDG directories, agent configuration directories and filesystem state.
Production origin checks remain intact; inject the fake transport at construction rather than exposing a runtime localhost override.
Use Vitest and test through CLI or session interfaces at the lowest level that sees the behavior.
Mock only genuine boundaries such as HTTP, clock, randomness and platform ACL operations.
No tautological tests: do not add mock-echo checks, source-string assertions, private-helper tests or checks already guaranteed by types.
Each test covers one meaningful behavior, including boundaries and failures.
Use deterministic fake time without sleeps and repeat changed async, time and I/O tests.
Reserve packed-CLI E2E tests for critical journeys lower levels miss.

`.no-mistakes.yaml` has separate preparation, test and lint commands, following vectra-axi.
It must land on the default branch before any feature slice because no-mistakes reads trusted commands and review rules from that branch.
The configuration targets hybrid-axi's real commands, tests, public repository and private-data review rules.
Use affected tests plus a fixed critical CLI/safety baseline; shared infrastructure, dependencies, specs and selector changes run the full suite.
Fail closed when test selection cannot determine the merge base or required baseline.
Keep the development commands in README accurate; do not claim checks passed without running them.
Verify specification hashes, complete ledger coverage and generated declarations offline.
The release slice will generate command reference and `skills/hybrid-axi/SKILL.md` from the catalogue and check freshness.
Do not fetch floating specs or call the real API during validation.
Live acceptance is separate, read-only, uses a supplied test key on an authorized host, and never submits samples or quick scans.

## Public repository hygiene

Never commit credentials, authentication headers, actual API responses, customer data, private paths or internal infrastructure details.
Use public source links and synthetic examples.
Review staged files and the complete diff for private data before committing.
Never commit scratch directories such as `.pi/`.
Keep each full Markdown sentence on its own line and use a plain dash instead of an em dash.
Do not add agent co-author trailers automatically.
