# Safety

## Write gates

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
See [guarded writes and artifact handling](design.md#guarded-writes-and-artifact-handling) for the coordinator's policy, confirmation, journal and recovery contracts.

## Operation matrix

| Family | Allowlisted operations | Additional requirement |
|---|---|---|
| Sample and malware artifacts | `hash-download-bin`, `report-download-bin`, `report-download-dropped-files`, `report-download-memory` | New explicit destination; may contain executable malware |
| Sandbox submissions | `submitFile`, `submitUrl`, `submitDroppedFile`, `convertQuickScan` | Exact sample/URL/report and supported environment where applicable; community visibility |
| YARA rules | `yaraCreate`, `yaraUpdate`, `yaraDelete` | Exact rule/body; update/delete read current state again before sending |
| Consuming matches | `huntingMatches` | Account-wide across all rules; returned entries irreversibly marked delivered |

Preview also requires the operation's configured write scope.
YARA update/delete previews read current rule state; download and consuming-match previews make no HTTP request.
There is no environment allow-write gate.
`HYBRID_AXI_READ_ONLY=1` or `true` forces read-only; unknown nonempty values fail closed.
A complete environment profile always remains read-only.

## Read exceptions and artifacts

Quick-scan file and URL reads transmit the supplied sample or URL even under read-only policy.
They are never automatically replayed.
Normal report artifacts are reads; `bin`, `dropped-files` and `memory` require the write gates above.
Downloads may contain executable malware.
Save only; do not extract or execute.
Upstream gzip/ZIP delivery does not guarantee password protection; bytes are saved unchanged.
Output files must be new and private; binary contents never enter stdout or the journal.

## Permissions and recovery

Local allowlists constrain the CLI; they do not grant Hybrid Analysis API permissions.
See the [operation ledger](design.md#complete-operation-ledger) for reviewed API classifications and the [doctor guide](behavior.md#doctor-and-quota) for probe limits.
A private journal records redacted intent before sending and outcome afterward.
Journal failure blocks sends; ambiguous outcomes require manual reconciliation using the audit ID, known result IDs and destination.
Never replay an unresolved intent.
Credentials use environment/private-file SecretRefs; see [configuration](configuration.md).
