# Contributing

Keep changes focused and describe the problem, resulting behavior, scope, and verification in the pull request.
Follow [the design](docs/design.md); the operation ledger is evidence, not permission to expose arbitrary HTTP.
See [README](README.md) for onboarding, [behavior notes](docs/behavior.md) for shipped contracts and the [generated command reference](docs/commands.md) for every leaf.

## TypeScript conventions

Follow [vectra-axi](https://github.com/knowttl/vectra-axi): Node.js 22.12 or later, TypeScript with strict checking, ESM, pnpm through Corepack and a committed lockfile.
Reuse `axi-sdk-js` for the CLI boundary, `@toon-format/toon` for stdout and zod for runtime decoding.
Keep JSON internally, validate command inputs strictly and tolerate unknown response fields.
Follow the design's [documentation and catalogue ownership](docs/design.md#architecture-and-module-depth) when changing commands or agent guidance.
Prefer caller-shaped functions hiding a complete responsibility over forwarding wrappers per endpoint.
Match existing style, avoid adjacent refactors and never edit generated files or changelogs manually.

## Safety boundaries

Only the reviewed HTTPS origin `https://hybrid-analysis.com` and API prefixes `/api/v2` and `/api/labs` are permitted at runtime.
Never add arbitrary HTTP, alternate-origin, TLS-disable, inline-key or write-policy bypasses.
Credentials resolve from environment or private-file SecretRefs; the default is `HYBRID_AXI_API_KEY`.
Guarded operations use preview, explicit execution, exact-target confirmation and a durable redacted journal; see the design's [artifact classifications](docs/design.md#guarded-writes-and-artifact-handling) for which downloads require guards.
Quick scans are reads by explicit policy but transmit the supplied sample or URL; help must say so.
HTTP GET does not establish read safety: consuming hunting matches uses write guards, and refreshing external overview data is blocked.
Never replay an ambiguous timeout, including a quick scan or asynchronous search start.

## Verification

Automated tests are offline and use synthetic credentials, fixtures and our own fake upstream.
Deny outbound networking before imports, including subprocesses; permit only the explicitly constructed fake HTTPS service.
Isolate HOME, XDG directories, agent configuration directories and filesystem state.
Production origin checks remain intact; inject the fake transport at construction rather than exposing a runtime localhost override.
Use Vitest and test through CLI or session interfaces at the lowest level that sees the behavior.
Do not use source-string assertions as evidence of behavior.
Each test covers one meaningful behavior, including boundaries and failures.
Use deterministic fake time without sleeps and repeat changed async, time and I/O tests.
Reserve packed-CLI E2E tests for critical journeys lower levels miss.

Canonical source: knowttl/bstack revision feeccb1e6f1ae119bf4c74277c8bad328b05afe8, skills/verification/references/testing.md.
<!-- BEGIN canonical test-quality rules -->
**Test quality.** Write and review every test against these rules.
Tests are never required first; a change is verified end to end against the behaviour the user expects.

1. Trust upstream invariants: do not test states that types, schemas or database constraints already rule out.
   Test invalid input only at the boundary that validates it.
2. Assert outcomes from an agreed source (spec, domain rule, ground-truth fixture), never values copied from what the code returns today.
3. Mock only true external boundaries, with schema-valid or recorded payloads.
   Never mock in-process code.
   Delete tests that only check how a mock was set up or called, unless that call is the requirement.
4. Test through the public interface: no private helpers, internal state or internal call counts.
5. Every assertion must be able to fail when the behaviour breaks: no existence-, type- or constant-only assertions.

Exempt: validation-boundary tests, contract tests against an agreed schema or recording, and regression tests that cite the bug they reproduce.
<!-- END canonical test-quality rules -->

`.no-mistakes.yaml` has separate preparation, test and lint commands, following vectra-axi.
Validation reads trusted commands and review rules from the default branch.
The configuration targets hybrid-axi's real commands, tests, public repository and private-data review rules.
Use affected tests plus a fixed critical CLI/safety baseline; shared infrastructure, dependencies, specs and selector changes run the full suite.
Fail closed when test selection cannot determine the merge base or required baseline.
Keep the development commands below accurate; do not claim checks passed without running them.
Verify specification hashes, complete ledger coverage and generated declarations offline.
Follow the [development commands](#development) to regenerate catalogue documentation and check its freshness.
Do not fetch floating specs or call the real API during validation.
Live acceptance is separate, read-only, uses a supplied test key on an authorized host, and never submits samples or quick scans.

## Public repository hygiene

Never commit credentials, authentication headers, actual API responses, customer data, private paths or internal infrastructure details.
Use public source links and synthetic examples.
Review staged files and the complete diff for private data before committing.
Never commit scratch directories such as `.pi/`.
Keep each full Markdown sentence on its own line and use a plain dash instead of an em dash.
Do not add agent co-author trailers automatically.

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
Live API acceptance requires separate authorization.

`corepack pnpm run spec:generate` regenerates declarations and the non-executable capability inventory from the pinned bytes and design ledger.
`spec:check` checks SHA-256 hashes, all 62 method/path classifications and deterministic generated artifacts offline.
New inventory entries do not enable commands; executable bindings belong to `src/catalogue.ts`.
After building, `corepack pnpm run docs:generate` regenerates the README group table, `docs/commands.md` and `skills/hybrid-axi/SKILL.md`.
`docs:check` fails when any committed generated document is stale.

`.no-mistakes.yaml` separates offline preparation, affected tests and linting, and declares that no hosted CI is configured.
Pull requests target `knowttl/hybrid-axi` with base `main`; validation never authorizes merging or publication by itself.

## Releases

Release Please prepares version and changelog changes on `main`.
The release workflow is limited to release management, build, artifact freshness, packing and npm publication with provenance; there is no pull-request test workflow.
All tests and public-data review run locally before delivery.
Publication requires npm trusted publishing configured for `knowttl/hybrid-axi`, workflow `release-please.yml`, and the repository variable `NPM_TRUSTED_PUBLISHING=true`.
Pushes to `main` publish only when Release Please creates a release.
To publish an existing GitHub release whose npm publication was skipped, open Actions, select `release-please`, choose Run workflow on `main`, and supply the release's exact `tag`.
Manual dispatch validates that the tag names an existing, non-draft GitHub release before the publish job can run; it does not bump the version or create another release.
Both paths use the same gated publish job: check out the tag, require it to equal `v` plus the checked-out `package.json` version, install dependencies, build, check specification and documentation freshness, and pack the release.
The packed artifact is published through GitHub OIDC with `id-token: write` and `npm publish --provenance`, without a stored npm token.
