# Editor boundary contract

All writes use the existing explicitly started loopback author service, retaining Host/Origin/session checks, path confinement, revision validation and journal recovery. Static4173 reader and release ZIP stay read-only. Edit deep-link uses registered immutable target and intent; all return locations are derived allowlisted local routes. No automatic loopback discovery, service launch, arbitrary URL or filesystem write.

Read returns adapter capabilities, canonical record, base revision/fingerprint, existing document/default template and attached asset metadata. Draft changes do not modify repository files. Validate returns a bounded candidate and semantic/layout impact, including invalid references or unsupported fields. Save consumes the exact reviewed candidate with expected revisions and commits canonical fields/document/assets together. Changed candidate or stale base invalidates preview. Lost acknowledgement requires checking revision/receipt, not replaying blindly.

Factual changes follow current content-version/rebind rules; profile inventory/completion is never edited by this API. Layout-only changes increment document revision without forcing a factual pack rebind. Saved author preview is immediate; normal reader changes only after successful build. Build failures preserve the previous runtime.

Documents:256KiB,32sections,128blocks,2000chars per prose field, one nested responsive group level,9distinct attached asset IDs; table50x8/cell500chars. Aggregate metadata/assets/transaction ceilings are inherited and enforced server-side and at build/import. Raster limits remain2MiB/2048px/4194304pixels. No SVG/animated image/remote fetch or imported executable markup. New page-bundle v1 is explicitly separate from pack-v1 and profile backups, with complete asset hashes/bytes admitted within existing32asset/8MiB binary/20MiB envelope caps.

Unsupported specialized fields are read-only with reasons. No generic JSON bypass. Imported data is schema checked before preview; future versions are preserved/rejected, not coerced. Imported sources remain dated reports and do not become verified facts. Section deletion keeps stable-link tombstone/redirect metadata where previously linked; record deletion uses existing reference checks.

Later public editing must independently establish authenticated identity, approved roles, server-side authorization, moderation and audit storage. Current local adapter design introduces no public token, mock login or exposed write endpoint.
