# Feature Specification: Repository Content Studio

**Feature Branch**: `009-repository-content-studio`
**Created**: 2026-10-21
**Status**: Implemented, independently reviewed and merged through PR #8; exact verification is recorded in acceptance.md
**Input**: Owner requested an easy local page that saves item, weapon, recipe and image data as organized JSON and media inside the Git repository, so another clone receives the same public information. Owner approved implementation, testing and merge to main after review.

## User Scenarios & Testing

### User Story 1 - Save public game content locally (Priority: P1)
A contributor starts the optional Content Studio, creates or edits any supported content type using guided fields, selects existing references and saves it into the repository. The website remains read-only when started normally.

**Why this priority**: Browser-only drafts cannot deliver the requested shared repository database.
**Independent Test**: Create a weapon with explicitly sourced typed statistics, an item and a recipe referencing it; save, restart, build and read the same information from a fresh clone without importing private browser data.
**Acceptance Scenarios**:
1. Given a valid record, when Save to repository succeeds, then its canonical JSON exists in an organized folder and the interface identifies its path.
2. Given an invalid or missing reference, when saving, then actionable validation appears and the previous valid catalog remains unchanged.
3. Given a concurrent editor or external file change, when saving a stale draft, then it is rejected without overwriting either change and the draft remains recoverable.
4. Given the normal read-only website, when a write is attempted, then no source files or private profiles change.

### User Story 2 - Add and manage pictures (Priority: P1)
A contributor drops or selects a permitted raster image, previews it, optionally crops and optimizes it, supplies distribution rights, and attaches primary or additional pictures. The system chooses stable IDs and correct paths. A media library shows usage before replacement or deletion.

**Why this priority**: Manual path editing and disorganized media are the central usability problem.
**Independent Test**: Add an original fixture image, crop it, generate its thumbnail, save, restart and confirm actual pixels and attached record survive in the rebuilt guide.
**Acceptance Scenarios**:
1. Given a supported image with rights, when saved, then its bytes live separately from JSON and all references resolve without manual paths.
2. Given duplicate image content, when uploaded again, then the contributor sees an explicit reuse choice instead of silently duplicating or replacing references.
3. Given a used asset or record, when deletion is requested, then a usage preview identifies dependents and unsafe deletion is refused.
4. Given invalid, oversized or executable content disguised as an image, when uploaded, then it is rejected without modifying the repository.

### User Story 3 - Review and share changes (Priority: P2)
A contributor reviews the files changed by the Studio, then uses their normal Git workflow to commit and push. Existing portable content can be imported through a validation preview; private player inventory and goals remain separate.

**Why this priority**: Sharing requires deliberate review rather than hidden publication.
**Independent Test**: Save records and media, inspect the displayed bounded change summary and filesystem diff, then verify a clean checkout builds the same guide.
**Acceptance Scenarios**:
1. Given a successful save, when reviewing changes, then only the intended public source and media files changed; no automatic commit or push occurred.
2. Given a portable pack, when imported and approved, then it becomes one canonical repository catalog with validated media, not a second editable source.
3. Given a canceled import, draft switch or browser back navigation, then unsaved changes are clearly warned about or retained and no implicit write occurs.

### Edge Cases
- Interrupted saves and recovery after restart; unexpected disk errors; an external edit during recovery.
- Empty library, new pack, duplicate IDs, case-colliding files, duplicate JSON keys, unsupported source versions, missing images and broken references.
- Malicious paths, symlinks, oversized requests, hostile origins and rebinding attempts.
- Catalogs with substantially more pictures than portable import limits, without fetching every image merely to open a page.
- Concurrent tabs, expired authoring session, canceled crop, replacing an image shared by several records and safe repeated saves.

## Requirements

### Functional Requirements
- **FR-001**: Authoring MUST be explicitly started locally; the normal website and distributable MUST remain read-only with no authoring endpoints.
- **FR-002**: Supported public entity types MUST have guided editing, searchable references and an advanced JSON view with equivalent validation.
- **FR-003**: A successful save MUST persist canonical per-record JSON and separately stored categorized media inside the known repository; the UI MUST show the resulting paths without requiring path entry.
- **FR-004**: The build MUST deterministically produce the current public guide from that single canonical source; migrated packs MUST NOT retain two editable copies.
- **FR-005**: Saving MUST validate the full affected catalog and references before publication, reject stale drafts, and preserve recoverable previous content on partial failure. Interrupted recovery MUST never overwrite an independently changed file.
- **FR-006**: Picture workflows MUST support selection/drop, preview, optional crop and optimization, thumbnails, duplicate detection, primary/additional attachment, rights and provenance.
- **FR-007**: Media library and delete/replace previews MUST expose where-used relationships and prevent dangling references.
- **FR-008**: Filesystem paths MUST be generated and restricted to approved catalog/media roots; traversal, symlinks, case collisions and executable uploads MUST be rejected.
- **FR-009**: Only the current local authoring session may write; hostile Host/Origin requests, missing session proof and cross-origin requests MUST be rejected.
- **FR-010**: Private player profiles, inventory, progress, goals and browser backups MUST never be accepted as public authoring data or included in repository writes.
- **FR-011**: The interface MUST show reviewable file changes but MUST NOT commit, push, configure credentials or change repository security settings.
- **FR-012**: Existing portable import/export MUST remain compatible and explicitly bounded; published catalog capacity MUST be separately stated and validated, without eager image payload loading.
- **FR-013**: All saves, validation, conflict, loading and recovery outcomes MUST be visible and keyboard accessible, with usable layouts at 320px, 390px and desktop widths and 200% text sizing.
- **FR-014**: Documentation MUST explain author startup, ordinary read-only startup, source layout, migration, rights, limits, recovery and manual Git sharing. Existing accepted runtime behavior MUST remain covered by regression checks.

- **FR-015**: After a repository save, contributors MUST be able to open an updated local saved-record preview, including pictures and references, without importing private browser data or publishing the public build.

### Key Entities
- **Catalog**: Pack identity, game/build metadata and supported typed records; references use stable IDs.
- **Record**: One editable public fact/entity with provenance and typed relationships.
- **Media asset**: Stable ID, raster bytes, dimensions, content hash, rights, attribution, provenance and optional derivative relationships.
- **Draft revision**: The source snapshot against which an explicit save is compared.
- **Recoverable change**: A bounded set of intended public file changes and previous bytes, with durable preparation and outcome state.

## Success Criteria

### Measurable Outcomes
- **SC-001**: The complete weapon + item + recipe + image journey survives restart, build and fresh checkout without a private import; all resulting references resolve.
- **SC-002**: All tested invalid uploads, missing references, stale edits, hostile requests and interrupted saves preserve the prior valid data or stop with an explicit recoverable conflict.
- **SC-003**: A catalog with 1,000 image metadata entries can open the Studio/library without downloading all image payloads, and library entries are paged rather than rendered without bounds.
- **SC-004**: The primary journey and cancel/retry/conflict flows pass Chrome on Windows/Linux plus Firefox and WebKit behavior checks; actual desktop/mobile Chrome and Firefox screenshots receive independent visual review.
- **SC-005**: All existing runtime checks pass, new requirement-mapped checks pass, and final merged main passes its own CI before completion is reported.

## Assumptions
- This is a trusted local repository editing tool, not a remotely hosted multi-user backend. A malicious process already able to write arbitrary repository files is outside the isolation guarantee; concurrent ordinary external edits are explicitly guarded.
- No hosting, login, Discord account linking, credentials or automatic Git publication is included.
- Contributor-supplied media may be published only with declared distribution rights; supplied game screenshots are not automatically approved assets.
- Existing factual uncertainty and private editing remain intact. No new game facts are invented.
- Platform-specific durability limits and unavailable physical-device/WCAG certification are documented rather than claimed.

## Clarifications

### Session 2026-10-21
The approved proposal already resolves public versus private scope, local startup, source-of-truth ownership, automatic paths and manual Git publication. No critical user-facing ambiguity remains. Filesystem transaction mechanics, exact resource budgets and derivative representation are design decisions specified in the plan and contracts, not requests for additional owner choices.

The concurrency guarantee detects stale snapshots and ordinary changes observed before mutation; it is not an atomic compare-and-swap against an unrelated program in the final filesystem rename window. Contributors must avoid simultaneous external editing while saving. Process-interruption recovery is verified, while hardware power-loss durability depends on the operating system/filesystem. Before bytes are retained and unexpected current bytes stop recovery instead of being overwritten.

## Bounded lifecycle acceptance repair, 2026-10-22
FR-006/012/013 and T028 retain two same-file selection/cancel cycles, fresh working URLs, cleared workbench sources and unchanged pending upload/library/draft. That loop isolates resource ownership with an original small valid raster; the separate original 1024 × 768 real crop, rights, thumbnail and attachment scenarios remain unchanged. A controlled real-decode timeout must exercise the unchanged five-second guard, display its exact error, retain the complete exported draft and upload bytes/library, close the late native bitmap, and permit a fresh selection followed by cancel after restoring the decoder. No production changes, deadline increases, accepted happy-path timeout, broad health exception or WebKit screenshot are authorized.
