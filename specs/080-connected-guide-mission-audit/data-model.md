# Data model and ownership

## Mission audit (new, local editorial state)

`MissionAuditV1 = { version: 1, packId, contentVersion, pageSet, entries[], history[] }` with bounded serialized bytes and record counts. `pageSet` includes map/season/build label and the asserted page-slot range; the initial page set is the existing 24-slot Hajin model. Adding X01 or later page sets requires evidence and a new scoped definition.

`AuditTarget = { kind: 'page'|'mission', stableId, section, sourceIdentity?, sourceFingerprint? }`. Page targets represent unrecorded slots without creating objectives. Mission targets use stable objective IDs; a changed name or page does not change identity. Section IDs: `roster`, `identity`, `steps`, `prerequisites`, `item-needs`, `locations`, `rewards`, `walkthrough`, `sources`, `images`. Unrecorded slots expose `roster`; recorded missions expose applicable sections. Story Mission targets never inherit an Orders page number unless explicitly recorded.

`AuditEntry = { target, state, note, reviewer, reviewedAt, revision }`, where state is `not-checked | needs-correction | fill-later | ready-for-review | checked`. Empty content, source conflict, current-build uncertainty and staleness are computed signals, never editable states. `AuditEvent` retains bounded before/after state for undo and export. No audit mutation writes player progress or catalog records.

## Connected player workflow (existing stores plus validated handoffs)

`PreparationProjection` is derived from existing goal, stock, reserve, requirement, recipe and location records; it is not a second source of truth. Each action carries a stable target, input set, known/unknown explanation and deep link. `MatchSession` references a start snapshot and stages owner-reported deltas; apply uses existing inventory/progress transaction guards. The map receives only reviewed, explicit handoffs with source identity/version and no automatic retargeting.

`WorkspaceBundleManifest` records each supplied module's schema version, origin, digest, dependency list, inclusion/omission reason and size. Restore validates all selected files before presenting a diff; it applies per-module transactions and reports which modules were applied, skipped or failed. No cross-origin atomicity is claimed.

`CoverageFinding` is a computed projection from content fields, links, source claims and audit states. It points to the exact record/section and never fabricates a missing value. `SourceChange` preserves old and proposed claims with source URL/date/build and an explicit disposition.
