# Feature Specification: Contributor workflows

**Feature Branch**: `015-contributor-workflows`
**Created**: 2026-10-22
**Status**: Draft for independent requirements review
**Input**: Approved roundtable Wave 3 workpackages 10–12; continue all approved waves.

## User Scenarios & Testing

### User Story 1 - Recover a repository draft (Priority: P1)
A contributor can review a previously downloaded recovery draft without changing their current work, then explicitly apply it to the draft and separately review a repository save.
**Why this priority**: Recovery must preserve work without bypassing safety checks.
**Independent Test**: Import a valid recovery export, cancel, and compare the original draft and repository; apply only after review and then compare the candidate.
**Acceptance Scenarios**:
1. Given a version-1 recovery export, when previewed, then identity, version, changes, image requirements and rights are shown with no draft or repository mutation.
2. Given hostile, malformed, unsupported, oversized or incomplete media content, when previewed, then it is rejected with the original draft and file unchanged.
3. Given a preview, when the draft changes or the import is cancelled, then the previous preview cannot apply.
4. Given imported pictures, when rights confirmation is absent, then apply is blocked.

### User Story 2 - Navigate and review without losing work (Priority: P1)
A contributor jumps between authoring, pictures, review and recovery, preserving unsaved fields and rights choices. The workflow summary distinguishes draft, reviewed candidate, repository save and manual rebuild/publication.
**Why this priority**: Navigation must not destroy work or imply publication.
**Independent Test**: Enter unsaved fields and rights choices, navigate all sections with keyboard, and compare DOM identities and values.
**Acceptance Scenarios**:
1. Given unsaved fields, when in-flow navigation is used, then existing controls and values remain intact.
2. Given a reviewed candidate, when the catalog version is changed explicitly in save review, then the old candidate is invalidated and save requires a fresh review.
3. Given a successful repository save, then the summary does not claim the public guide was rebuilt or published.

### User Story 3 - Choose the right editing destination (Priority: P2)
Readers and contributors follow one short quickstart and run role-specific read-only diagnostics without installing optional developer tooling.
**Why this priority**: Users must know where changes are stored and how to start safely.
**Independent Test**: Follow documented reader and author commands and inspect missing-build and occupied-port diagnostics.
**Acceptance Scenarios**:
1. Given reader/private editing or repository authoring intent, the quickstart identifies browser-only versus checkout storage and manual publication.
2. Given an absent build or occupied chosen port, startup reports an actionable error and exits without selecting a new origin.
3. Given role-specific diagnostics, running them changes no repository files, browser data, credentials or ports.

### Edge Cases
Unsupported recovery versions; duplicate keys/IDs/uploads; dangerous property names and paths; arbitrary URL references; image type or dimension mismatch; invalid rights; missing actual image bytes; stale repository revision; new catalog versus existing identity collision; import cancellation during decode; pending image edits; failed save; keyboard navigation and true 200% text.

## Requirements
### Functional Requirements
- **FR-001**: Distinguish Private editor browser storage from Repository Content Studio checkout storage; provide short reader/author startup separately from optional development setup.
- **FR-002**: Provide read-only reader/author/contributor diagnostics and actionable missing-build/occupied-port errors; never automatically change ports. Classify actionable blockers separately from warnings; warn explicitly for a non-loopback configured address without changing settings.
- **FR-003**: Provide keyboard-accessible in-flow navigation that preserves existing controls, values, media and rights state.
- **FR-004**: Derive a compact draft/review/repository-save/rebuild summary from current state; repository save never implies publication.
- **FR-005**: Allow explicit version editing in review, invalidating the old preview and requiring fresh validation and review.
- **FR-006**: Accept only the existing named version-1 recovery envelope; reject loose JSON, unsupported formats, malformed values, dangerous keys and excessive nesting/counts. Maximum 20 MiB envelope, 8 MiB catalog, 32 pictures and 8 MiB total new picture bytes both before and after normalization.
- **FR-007**: Validate catalog identity/version/schema/rights, upload identities and raster content, and require every referenced picture to have validated uploaded bytes or a matching current repository source. Never fetch arbitrary external image sources.
- **FR-008**: Preview import inertly with readable identity/version/diff/media/rights summary; require explicit apply, separate from save. Reset rights at every new preview; changes/cancellation/catalog switch invalidate pending work, including during asynchronous image decoding before candidate assignment. Preserve the original export and current draft on failure.
- **FR-009**: Retain recovery downloads, including invalid unfinished drafts; they are not successful saves. Imported stale revision metadata cannot overwrite current optimistic revision protection.

### Key Entities
Recovery envelope: format/version, catalog key, historical repository revision, candidate catalog and image uploads. Import review: bounded validated candidate, explicit destination and rights decision. Workflow summary: existing dirty/review/save states and manual rebuild boundary.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Every rejected/cancelled import in the hostile fixture matrix leaves the current draft and repository unchanged.
- **SC-002**: Every in-flow navigation action retains the tested field values, rights choices and control identities.
- **SC-003**: Every version-change test blocks the old save preview until a fresh review.
- **SC-004**: Both roles receive actionable startup/diagnostic results with zero file changes and no automatic port changes.
- **SC-005**: Existing Windows/Linux and Chromium/Firefox/WebKit gates plus keyboard, small/desktop and true 200% checks remain mandatory; unavailable checks are recorded, never claimed passing.

## Assumptions
Only final approved workpackages 10–12 are included. No broad Studio extraction, schema/media semantics change, hosting, accounts, security changes, pruning or automatic publishing. Image semantics are coordinated separately. Current repository save/normalization/rights validation remain authoritative. Existing export version 1 is retained rather than introducing a gratuitous migration. Incomplete exports remain downloadable but cannot bypass strict importer validation.
