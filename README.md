# hybrid-axi

Agent-ergonomic CLI for the Hybrid Analysis API, read-only by default, with compact TOON output and explicitly guarded submissions, YARA changes and malware downloads.

This repository is at the design stage; no executable commands or npm release are available yet.
The [design](docs/design.md) defines the planned command surface, complete stable/Labs operation ledger, credentials, safety boundaries, specification deviations and ordered implementation slices.
The next slice establishes the scaffold and tool-specific no-mistakes configuration before feature work.

The public OpenAPI snapshots and their source URLs, versions, fetch dates and byte hashes are pinned in [inventory/specs.json](inventory/specs.json).
Design research fetched public documentation only and made no API operation calls.
See [CONTRIBUTING.md](CONTRIBUTING.md) for implementation conventions and offline verification requirements.
