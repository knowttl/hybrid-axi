# hybrid-axi

Investigate Hybrid Analysis with bounded reads and explicitly guarded writes

[![npm version](https://img.shields.io/npm/v/@knowttl/hybrid-axi)](https://www.npmjs.com/package/@knowttl/hybrid-axi) [![License](https://img.shields.io/npm/l/@knowttl/hybrid-axi)](#license) [![Node.js](https://img.shields.io/node/v/@knowttl/hybrid-axi)](package.json) [![npm provenance](https://img.shields.io/badge/npm-provenance-blue)](https://www.npmjs.com/package/@knowttl/hybrid-axi#provenance) [![AXI](https://img.shields.io/badge/AXI-agent%20experience-blue)](https://github.com/knowttl/hybrid-axi)

[Why](#why-this-exists) · [Quickstart](#quickstart) · [Agents](#use-with-your-agent) · [Coverage](#what-it-covers) · [Safety](#safety) · [Configuration](#configuration) · [Output](#output-and-exit-codes) · [Troubleshooting](#troubleshooting) · [Contributing](#contributing) · [Security](#security) · [License](#license)

## Why this exists

Hybrid Analysis is a malware sandbox whose API includes quotas, large artifacts and consuming reads.
Agents using the raw API must guess routes, limit responses and distinguish reads from irreversible effects.
hybrid-axi gives agents and the humans running them bounded TOON output, verified read contracts and useful next steps.
Submissions, YARA changes, consuming matches and malware downloads require explicit write policy and exact confirmation.

## Quickstart

Requires Node.js 22.12 or later; install globally and open the local home view:

```sh
npm install --global @knowttl/hybrid-axi
hybrid-axi
```

Or run without installing: `npx -y @knowttl/hybrid-axi`.
Synthetic home excerpt before configuration:

```text
profile: none
readOnly: true
```

Set `HYBRID_AXI_API_KEY` through your shell's secret mechanism, then run:

```sh
hybrid-axi setup
hybrid-axi auth status
hybrid-axi doctor
hybrid-axi system environments
```

An API key alone selects a read-only environment profile; no config file is needed.
`setup` only prints a template; `doctor` uses API quota for up to seven reads.
See [configuration](docs/configuration.md) for named profiles and file-backed credentials.

## Use with your agent

Install ambient local profile context first, or use the on-demand skill:

```sh
hybrid-axi setup hooks
npx skills add knowttl/hybrid-axi --skill hybrid-axi
```

Hooks support Claude Code, Codex and OpenCode; restart the agent session after setup.
Hooks inject local profile context without HTTP or credential-file reads; the [skill](skills/hybrid-axi/SKILL.md) supplies command and safety guidance on demand.
Neither grants API permissions or enables writes.
Either integration is sufficient; both are optional.
To remove hooks, delete only the managed SessionStart entries and OpenCode plugin listed in [agent integration](docs/agent-integration.md#removal).

## What it covers

<!-- command-registry:start -->
| Group | Purpose | Read/write | Reference |
|---|---|---|---|
| `api` | Reviewed JSON reads | read | [Details](docs/commands.md#api-get) |
| `auth` | Verify local credential availability | read | [Details](docs/commands.md#auth-status) |
| `config` | Locate config and state | read | [Details](docs/commands.md#config-path) |
| `doctor` | Probe credentials, quota and read access | read | [Details](docs/commands.md#doctor) |
| `feed` | Recent reports, quick scans and removals | read | [Details](docs/commands.md#feed-detonation) |
| `hash` | Hash overviews, lookups and guarded samples | read/write | [Details](docs/commands.md#hash-show) |
| `home` | Local profile and policy context | read | [Details](docs/commands.md#home) |
| `hunting` | Experimental YARA rules and consuming matches | read/write | [Details](docs/commands.md#hunting-yara-list) |
| `profile` | Discover local profiles | read | [Details](docs/commands.md#profile-list) |
| `quick-scan` | Scan supplied files/URLs and convert results | read/write | [Details](docs/commands.md#quick-scan-scanners) |
| `quota` | Key level and observed limits | read | [Details](docs/commands.md#quota) |
| `report` | Reports, memory metadata and artifacts | read/write | [Details](docs/commands.md#report-show) |
| `search` | Named filters and experimental Labs queries | read | [Details](docs/commands.md#search-terms) |
| `setup` | Local templates and opt-in agent hooks | read/write (local) | [Details](docs/commands.md#setup) |
| `submit` | Guarded sandbox submissions | write | [Details](docs/commands.md#submit-file) |
| `system` | Environments, configuration and statistics | read | [Details](docs/commands.md#system-environments) |
<!-- command-registry:end -->

The [generated command reference](docs/commands.md) lists every leaf, flag, default and example.
[Behavior notes](docs/behavior.md) explain response shapes, bounds and recovery.

## Safety

Read-only by default; API writes require a file profile with `writes.allowWrites: true` and an exact `writes.operations` allowlist.
Preview first, then repeat with `--execute --confirm '<exact preview confirmation>'`.
`HYBRID_AXI_READ_ONLY=true` forces read-only; environment profiles cannot enable writes.
There are no `HYBRID_AXI_ALLOW_*` environment gates.
Quick-scan file and URL commands are read exceptions that transmit supplied data even under read-only policy.
Sandbox submissions can make the sample and report visible to the community.
Hunting matches irreversibly marks returned account-wide matches delivered.
Downloads may contain live malware with unverified password protection; save only, never extract or execute.
Credentials use environment or private-file SecretRefs, never arguments or stored keys.
The private journal reserves each write intent before sending; reconcile ambiguous outcomes without replay.
See the [write gate matrix](docs/safety.md), [API permission evidence](docs/design.md#complete-operation-ledger) and [credential protections](docs/configuration.md).

## Configuration

| Platform | Default config | Default state directory |
|---|---|---|
| Linux/macOS | `~/.config/hybrid-axi/config.json` | `~/.local/state/hybrid-axi` |
| Windows | `%APPDATA%\hybrid-axi\config.json` | `%LOCALAPPDATA%\hybrid-axi` |

`--config` and `--profile` override environment selection.
Profiles select credentials and write policy; complete environment profiles are always read-only.

| Environment variable | Purpose | Default |
|---|---|---|
| `HYBRID_AXI_API_KEY` | Default credential SecretRef | Unset |
| `HYBRID_AXI_ORIGIN` | Environment-profile origin; only `https://hybrid-analysis.com` is accepted | That origin |
| `HYBRID_AXI_CONFIG` | Config file selection | Platform config above |
| `HYBRID_AXI_PROFILE` | Named profile selection | Environment profile, configured default, then sole profile |
| `HYBRID_AXI_READ_ONLY` | `1`/`true` force read-only; `0`/`false`/empty retain profile policy; invalid values fail closed | Unset |
| `HYBRID_AXI_WRITE_LOG` | Nonblank absolute journal path | `writes.log` in state directory |
| `XDG_CONFIG_HOME`, `XDG_STATE_HOME` | Absolute config/state bases on Linux/macOS | `~/.config`, `~/.local/state` |
| `APPDATA`, `LOCALAPPDATA` | Absolute config/state bases on Windows | `~/AppData/Roaming`, `~/AppData/Local` |
| `CLAUDE_CONFIG_DIR` | User Claude hook base | `~/.claude` |
| `CODEX_HOME` | User Codex hook and feature-config base | `~/.codex` |
| `PATH` / `Path`, `PATHEXT` | Hook executable discovery; Windows extension search | Empty path; Windows `.COM;.EXE;.BAT;.CMD` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Value `0` is rejected for API transport | Unset |

OpenCode user hooks also use `XDG_CONFIG_HOME`, falling back to `~/.config`.
See [configuration](docs/configuration.md) for precedence, platform fallbacks and the [credential schema](axi-credential.schema.json).

## Output and exit codes

TOON goes to stdout, including structured errors.
Bare `--version`, `-v` and `-V` print only the package version.
Supported reads use `--fields` for selection or `--full` for all decoded fields and untruncated text after redaction.
These flags are mutually exclusive; `--full` does not raise collection `--limit` defaults (100).
Truncation reports counts and a follow-up command; use each command's `--help` for its controls.

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Runtime failure |
| 2 | Invalid input |

## Troubleshooting

| Symptom | Next step |
|---|---|
| Doctor reports `permission-denied` | Check the key's permissions; a successful unrelated probe proves no other access. |
| Labs overview returns 425 | Analysis is pending; retry the exact overview command from the hint. |
| Container report returns 410 | Use `hybrid-axi report children <id>`. |
| Git Bash rewrites an API path | Use `api get report/<id>/summary` without a leading slash or set `MSYS_NO_PATHCONV=1`. |
| Download denied for a restricted key | Review the account-vetting guidance in the error; retrying cannot grant permission. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development, offline verification and releases, and [design](docs/design.md) for architecture and API decisions.

## Security

See [SECURITY.md](SECURITY.md) for handling and reporting security issues.

## License

Licensed under the [MIT License](LICENSE).
