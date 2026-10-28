# Agent integration

```sh
hybrid-axi setup hooks
hybrid-axi setup hooks --scope project
npx skills add knowttl/hybrid-axi --skill hybrid-axi
```

Hooks supply local profile context each session; the [skill](../skills/hybrid-axi/SKILL.md) supplies static command and safety guidance on demand.
Neither grants credentials, API permissions or write policy.
Either integration is sufficient; both are optional.

## Hook installation

The default user scope installs Claude Code SessionStart hooks, Codex SessionStart hooks and an OpenCode ambient plugin.
Project scope writes `.claude`, `.codex` and `.opencode` in the current directory instead.
Both scopes enable Codex's hooks feature in user configuration.
User configuration honors `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `XDG_CONFIG_HOME` for the respective agent.
Setup preserves unrelated configuration, repairs moved executable paths and makes repeated installs a no-op.
On POSIX, the hook uses a PATH-verified binary name when it resolves to this installation, otherwise its quoted absolute path.
On Windows, Claude Code uses Node with the installed entry as an argument; Codex uses a PowerShell command that invokes Node with that entry.
OpenCode runs the installed entry directly through Node.
Restart the agent session after setup.
Context uses `HYBRID_AXI_CONFIG` and `HYBRID_AXI_PROFILE` from the session environment; it never makes an API call or reads a credential file.
Ordinary commands and package installation never install hooks.

## Removal

There is no hook-removal command.
Remove only hybrid-axi's SessionStart entries, preserving unrelated hooks, from the selected files:

| Scope | Claude Code | Codex | OpenCode plugin |
|---|---|---|---|
| User | `~/.claude/settings.json` | `~/.codex/hooks.json` | `~/.config/opencode/plugins/axi-hybrid-axi-hook.js` |
| Project | `.claude/settings.json` | `.codex/hooks.json` | `.opencode/plugins/axi-hybrid-axi-hook.js` |

User paths honor `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `XDG_CONFIG_HOME` respectively.
Identify managed entries by `hybrid-axi-hook` in the command, arguments or installed entry path.
Windows Codex entries also contain an encoded `commandWindows`; remove the corresponding managed entry as a unit.
Both install scopes enable `features.hooks` in the user's Codex `config.toml`.
Leave that feature enabled when other hooks need it.
Restart the agent session after removal.
