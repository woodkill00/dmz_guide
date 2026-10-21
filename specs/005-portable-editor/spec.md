# Feature Specification: Private portable editor
**Feature Branch**: `005-portable-editor`
**Created**: 2026-10-21
**Status**: Requirements review pending
**Input**: Continue the complete guide with guided private content editing and safe portable picture packs, without publication.

## User Scenarios & Testing
### User Story 1 - Correct a private guide (P1)
A contributor edits existing records or adds items/weapons, recipes, sources, objectives, guides, maps, locations and claims through labeled fields rather than needing to write JSON.
**Independent Test**: Change an item name and recipe consumed flag, preview before/after, save locally, reload and inspect the private reader; published detail remains unchanged.
**Acceptance Scenarios**: Invalid references or unsupported mechanics prevent save; unknown facts remain explicit; cancel leaves persistent content unchanged.
### User Story 2 - Carry a picture pack (P1)
A contributor attaches their own authorized raster picture, exports a self-contained pack, imports into a clean browser and sees the identical semantic content and actual picture after reload.
**Independent Test**: Compare asset hash, decoded dimensions, rights and edited item fields through export/import.
**Acceptance Scenarios**: Rights acknowledgment is required, raw personal screenshots must not enter exports unnoticed, and profile inventory/progress never enter content exports.
### User Story 3 - Recover safely (P1)
Before replacing content the contributor sees additions, changes and removals with before/after details, can cancel, and can restore the previous snapshot after applying.
**Independent Test**: Import a changed content version with removed IDs; preview reports profile rebind required and retained profile references; concurrent stale save fails rather than overwrites.
### Edge Cases
Malformed JSON, duplicate keys/IDs, prototype keys, excessive depth/nodes/bytes, invalid source links, unsafe asset paths, unsupported versions, corrupt raster signature/dimensions/hash, excessive pixels, missing payloads, duplicate payload IDs, quota denial, reload and cross-tab conflicts all fail closed. No network asset fetching or executable markup.

## Requirements
### Functional Requirements
- E01: Every mutable content field in the agreed schema is editable using labeled nested controls with help, explicit optional/null controls and array addition/removal. Existing pack ID and schema version are read-only identity/format fields, not editable facts. Advanced JSON is optional, never the sole editor. Units, weapon context/build/mode/evidence, consumed versus retained requirements, outputs, gates and spoilers are distinguishable.
- E02: Drafts remain private and unsaved until validation, readable before/after preview and explicit replacement. Draft cancel leaves saved state unchanged. Private reader links are pack-qualified and distinct from published pages.
- E03: Complete content validation precedes saves/imports. Current schema version 1 is supported; other versions are rejected with recovery instructions to retain originals and use a compatible reader, not guessed migration.
- E04: Content-only JSON export excludes profile fields and clearly states pictures are references only. Self-contained picture export includes every referenced raster's actual bytes, integrity and redistribution metadata; missing bytes block that export.
- E05: Raster import accepts only PNG/JPEG/WebP, verifies signature, declared/decoded dimensions, byte count, integrity hash and rights, and decodes/re-encodes new uploads to strip embedded metadata. Existing imported bundle images are decoded before commit. Never fetch source URLs.
- E06: Limits are 32 assets, 2 MiB each, 8 MiB combined raster bytes, 2048 pixels per dimension and 4,194,304 pixels per image. Aggregate decoded pixels are at most 16,777,216. Pack JSON is at most 8 MiB; self-contained envelope is at most 20 MiB including base64 overhead. All limits reject before persistent mutation.
- E07: Reject unsafe paths, duplicate/case-colliding asset paths, duplicate payload IDs, noncanonical base64, missing/unexpected payloads, unknown envelope properties/versions, JSON duplicate/prototype keys and cyclic/deep/resource-exhausting inputs. Imported text is inert.
- E08: Apply atomically checks expected revision and saves previous valid snapshot; cancellation, invalid input, storage failure or concurrent revision conflict cannot partially commit. Rollback is explicit and revision-checked.
- E09: Content version/build/identity or retired-record changes show profile-rebind/unresolved-reference warnings. Preview lists affected saved goals and missing historical inventory/progression/goal references when a profile exists. Profiles are not rewritten or deleted; their historical references survive. Same-ID private changes never alter public snapshot links.
- E10: No upload, account, sync, Discord submission, remote asset request or automatic publication. Rights checkbox does not certify third-party ownership; contributor must attest redistribution and absence of visible or embedded personal screenshot data before attaching/exporting pictures. Export warns imported bytes retain EXIF/GPS/text metadata and are not normalized; require offline inspection/sanitization or reattachment before redistribution.
- E11: Keyboard-accessible native controls, focusable errors, live save status and readable 320px layout cover draft, staging, cancel, apply, rollback and failure states.
- E12: Existing draft identity is immutable. Import with a new valid pack ID creates a new local pack at revision zero; import whose ID already exists stages an explicit replacement of that exact pack, not another selected pack. Names may collide but IDs are exact case-sensitive namespaced keys; no automatic renaming, merging or cross-pack reference resolution. Fork creation by changing IDs is not offered; a separately prepared valid new-ID pack can be imported.
- E13: Each staging report binds target pack ID, original baseline revision and current workspace generation. Switching pack discards draft/stage and cancels pending imports/decodes; UI warns to export unsaved changes before switching. Late async results cannot change the new workspace. Cancelling import also invalidates pending decode and leaves both snapshots unchanged.
- E14: Raster validation is sequential, with a five-second timeout per image and explicit cancel control. Timed-out/cancelled results cannot commit; decoded resources close even after a late completion. APNG and animated WebP are rejected rather than silently exporting a frame. ZIP and other archives are unsupported and rejected without decompression. Failure/denial/quota keeps the draft on the current page directly exportable without navigation; no profile changes.
### Key Entities
Pack: canonical versioned content records and rights. Payload: asset ID and bounded actual raster bytes. Draft: unsaved editable private pack. Staging report: exact baseline, expected revision, before/after and warnings. Snapshot: current and previous private content. Profile: separate unchanged private inventory/progress.

## Success Criteria
### Measurable Outcomes
- SC01: Guided edit of item, stat, recipe, source, objective, guide, map and location can be validated and persisted without raw JSON.
- SC02: Export/import/reload preserves all semantic content and raster hashes; no profile fields are exported.
- SC03: Every invalid import and cancellation in the adversarial suite leaves current and previous records unchanged.
- SC04: Concurrent stale apply cannot overwrite newer content; prior snapshot can be explicitly restored.
- SC05: Keyboard-only edit/preview/apply works and editor has no horizontal page overflow at 320px.

## Assumptions
Locked schema and canonical validator remain owned by integration parent. Existing IndexedDB atomic storage is reused; payload persistence requires parent approval. Synthetic fixture pictures are original, not game artwork. No v0 migration is claimed. Parent owns build/navigation/private-reader integration and final independent release review.

## Clarifications
### Session 2026-10-21
No critical ambiguities detected worth formal clarification. Parent assignment explicitly resolves scope, versions, budgets, rights and transactional semantics. Zero user questions asked. Aggregate pixel budget and envelope bytes are conservative additional bounds; source URLs remain inert. Private overlays retain pack identity while private readers are visibly separate from public snapshots.
