# Feature Specification: Accessible pictures and release evidence

**Feature Branch**: `016-accessible-release-evidence`
**Created**: 2026-10-22
**Status**: Draft, independent requirements gate pending
**Input**: Approved roundtable Wave 3 workpackages 13–14 (V9, A6, A8).

## User Scenarios & Testing

### User Story 1 - Understand pictures without seeing them (Priority: P1)
A contributor describes a picture in the context of one record, or explicitly marks it decorative. A reader receives that meaning rather than a rights statement.
**Why this priority**: Rights attribution does not describe picture content.
**Independent Test**: Attach one shared picture to two records with different descriptions, export/import it, then inspect each rendered accessible name.
**Acceptance Scenarios**:
1. Given a described picture, when saved and transferred, then its usage-specific description survives and is the reader alternative text.
2. Given a decorative picture, when rendered, then its alternative text is empty while rights attribution remains visible.
3. Given legacy content without descriptions, when loaded, then it remains valid and receives an honest generic picture label, not an invented description or rights assertion.

### User Story 2 - Inspect retained recovery without losing it (Priority: P2)
A maintainer sees retained transaction count, bytes and whether each transaction has verifiable evidence suitable for archival review.
**Why this priority**: Retained data should be inspectable without automatic deletion or unsafe retention advice.
**Independent Test**: Inspect completed, pending and tampered synthetic transactions; compare all filesystem bytes before and after.
**Acceptance Scenarios**:
1. Given valid completed receipts and matching retained backup hashes, when inspected, then count, byte size and qualified archival eligibility are reported.
2. Given pending, corrupt, unreadable or excessive state, when inspected, then it is ineligible or explicitly incomplete, never falsely safe.
3. Given any state, when inspected, then nothing is deleted, moved, rewritten or automatically archived.

### User Story 3 - Verify the entire distributable (Priority: P2)
A release reviewer can compare every shipped file and exact archive membership with a release manifest, and identify the source revision, schema and build inputs used.
**Why this priority**: The current production-only hash list leaves bundled launcher and documentation uncovered.
**Independent Test**: Change a launcher, remove a document, append an archive member or duplicate a member; verification rejects each.
**Acceptance Scenarios**:
1. Given an intact package, when verified, then all shipped payload hashes and exact inventory agree.
2. Given any changed or unexpected archive entry, when verified, then verification fails before executing extracted content.
3. Given source/schema/build identity, when read, then hashes are explicitly consistency evidence, not authorship, signatures or proof of trust.

### Edge Cases
- Shared assets, primary plus additional images, removed attachments, whitespace-only text, long text, malformed metadata, spoiler text, hostile markup and legacy omission.
- Symlinks, unsafe paths, live/unknown locks, interrupted transactions, missing or changed backup bytes, transaction scan limits and filesystem races.
- Duplicate ZIP entries, unexpected files, missing entries, manifest self-hash circularity, dirty checkout, absent Git, stale builds and tampered manifest.

## Requirements
### Functional Requirements
- **FR-001**: Support optional usage-specific image description or explicit decorative meaning on every image-bearing record, retaining legacy content compatibility.
- **FR-002**: Private and repository guided editors must expose description/decorative controls; import/export and recovery preserve validated metadata. Decorative and nonempty description cannot coexist; descriptions are limited to 1000 characters and must not be whitespace-only.
- **FR-003**: Render description as escaped alternative text, decorative as empty alternative text, legacy as an honest generic label. Keep rights captions separate and retain spoiler masking.
- **FR-004**: Report retained transaction/file counts and byte sizes with completeness and per-transaction archival eligibility reasons. Require completed receipt integrity and backup consistency; pending/live/uncertain/corrupt evidence blocks eligibility. Eligibility is review information, not authorization to archive or prune.
- **FR-005**: Inspection is bounded and read-only, including failure paths; do not follow symlinks or silently omit unsupported state from a complete total.
- **FR-006**: Package manifest must cover all shipped payload files, including launcher/docs/license/start instructions, with exact archive inventory. Explicitly exclude the manifest's own digest to avoid circularity while including its name in inventory.
- **FR-007**: Verification must reject missing, extra, duplicate, unsafe or mismatched members before executing extracted content; retain existing owned-process readiness and native-route verification.
- **FR-008**: Record source revision/dirty status when verifiable, source-input hashes, schema hashes and build identity tied to actual staged output. Missing identity must be explicit; never label stale output fresh. Hashes prove internal consistency only.
- **FR-009**: Preserve strict health, staged-build invariants, existing image safety/rights bounds, Windows/Linux Chromium and Firefox/WebKit functionality and existing full-page/actual-200% evidence gates.

### Key Entities
- Image usage: attached asset identity, description, decorative choice scoped to its record.
- Recovery inventory: retained transaction identity, files, bytes, completeness, eligibility reasons.
- Release manifest: full payload inventory/digests and source/schema/build identity.

## Success Criteria
### Measurable Outcomes
- **SC-001**: All image-bearing record kinds round-trip described/decorative/legacy fixtures without losing intended meaning; malformed cases fail before save.
- **SC-002**: Recovery inspection leaves all inspected paths and bytes unchanged and rejects eligibility for every pending/tampered fixture.
- **SC-003**: Every packaged payload file is covered; injected missing/extra/duplicate/changed archive fixtures fail verification.
- **SC-004**: All existing acceptance gates remain required; no unavailable browser run is represented as passing.

## Assumptions
- No game facts or visual descriptions are invented for existing assets.
- Workpackage 15c deterministic ZIP/two-clean-build reproducibility is a separate later feature.
- No automatic archival/deletion, credentials, hosting, accounts, database or broad extraction work.
- Shared-file integration requires explicit owner agreement; requirements checklist is independently owned.

## Clarifications
### Session 2026-10-22
No critical product ambiguities require a user question. Recovery eligibility means evidence ready for manual archival review, never permission or a guarantee that deleting history is safe. Legacy images remain valid; no existing description is fabricated. Technical ownership and source-identity details are resolved in the plan before implementation. Functional scope, entities, flows, quality, integrations, negative cases, constraints, terminology and completion signals were reviewed.
