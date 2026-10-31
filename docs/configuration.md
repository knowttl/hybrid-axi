# Configuration

Run `hybrid-axi setup` for a configuration template and its platform path.
Setup prints guidance without writing files or installing agent hooks.
Set `HYBRID_AXI_API_KEY` in the environment, or reference a private UTF-8 file with `"apiKey":{"file":"<absolute-path>"}` in a named profile.
Keys are never accepted in arguments or stored by the tool.
`hybrid-axi auth status` verifies availability and file protections without printing the key or contacting the API.
Auth status reports only the secret source kind (`env` or `file`).
Local home status (`home --offline` or unconfigured home) and auth status omit environment variable names, secret file paths and config paths from success, error and help output.
Their follow-up commands replace an explicit config path with `<path>`; substitute your selected config path before running them.
Configured live home resolves credentials for API reads and preserves explicit config/profile selectors in recovery commands.
See [startup behavior](behavior.md#startup) for home requests and executable identity.
`hybrid-axi profile list` lists configured profiles; `hybrid-axi config path` shows configuration and state locations.
Every command supports `--help`; profile commands also accept `--config <path>` and `--profile <name>`.

Config selection is `--config`, `HYBRID_AXI_CONFIG`, then the platform default.
Profile selection is `--profile`, `HYBRID_AXI_PROFILE`, a complete environment profile, the configured default, then the sole profile.
Explicit file-profile selection ignores environment profile fields; partial environment profiles fail.
Linux/macOS use absolute XDG config/state directories or `~/.config/hybrid-axi/config.json` and `~/.local/state/hybrid-axi`.
Windows uses APPDATA for config and LOCALAPPDATA for state, ignoring XDG.
Prepare config and secret files with current-user ownership and the [private-file protections](design.md#profiles-and-authentication), checked on every read.

The shipped [credential schema](../axi-credential.schema.json) describes one strict profile with an `x-secret` apiKey env/file SecretRef.
Unlike the shared credential standard's optional login storage, this tool excludes stored refs and provides no login or key issuance.
Profiles default to read-only; a complete environment profile always stays read-only.
`HYBRID_AXI_READ_ONLY=1` or `true` forces read-only over file allowances; `0`, `false` or empty leaves profile policy in effect.
Unknown nonempty boolean values fail closed.

The public OpenAPI snapshots and their source URLs, versions, fetch dates and byte hashes are pinned in [inventory/specs.json](../inventory/specs.json).
Design research fetched public documentation only and made no API operation calls.
See [CONTRIBUTING.md](../CONTRIBUTING.md) for implementation conventions and offline verification requirements.

## Environment overrides

The [README environment table](../README.md#configuration) lists every directly read runtime variable.
A profile's `apiKey.env` may name an additional credential variable.
`HYBRID_AXI_ORIGIN` accepts only `https://hybrid-analysis.com`; an origin without a nonblank API key is an incomplete environment profile.
`HYBRID_AXI_WRITE_LOG` must be a nonblank absolute path; its default is `writes.log` under the selected platform state directory.
On Windows, missing or relative APPDATA/LOCALAPPDATA fall back to `~/AppData/Roaming` and `~/AppData/Local`.
On Linux/macOS, relative XDG config/state bases are ignored.
Agent hook directories use separate environment rules described in [agent integration](agent-integration.md).

## Private files

On POSIX, config and secret files must be regular files owned by the current user.
Config must not be group/other writable; secrets require no group/other access, typically `chmod 600`.
On Windows, private files need protected DACLs limited to the current user, SYSTEM and Administrators.
Symlinks and reparse points are refused.
These checks run on every private-file read; see [authentication design](design.md#profiles-and-authentication).
