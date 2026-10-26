# Feature Specification: Multi-source map workspace

**Feature Branch**: `feat/020-map-source-fusion`  
**Created**: 2026-10-26  
**Status**: Implemented; final verification and independent review recorded in verification.md
**Input**: Source layers for CODMunity, WZStats and CODCentral, category masks, comparison and a combined reviewed map, with custom POIs, marks and uploaded icons.

## User Scenarios & Testing

### User Story 1 - Inspect source layers (Priority: P1)

As a guide author, I can distinguish each provider, inspect its available categories and control its visibility from either Layers or Map key.

**Why this priority**: Source identity and alignment are prerequisites for trustworthy comparisons.

**Independent Test**: Load two synthetic, authorized snapshots and one permission-blocked source; toggle categories and reopen the viewer without external network access.

**Acceptance Scenarios**:
1. Given compatible snapshots, when I open Map key directly, then it opens independently of Layers, lists every source/category and displays checked, unchecked or mixed state consistently in both controls.
2. Given a blocked provider, when I select it, then I see its source link and specific permission requirement with zero imported records; no harvesting request occurs.
3. Given an unknown coordinate frame, when I import a snapshot, then its records remain in a staging list until registration passes; no guessed pins appear.

### User Story 2 - Review and combine evidence (Priority: P2)

As an author, I compare aligned sources, resolve candidate duplicates and choose which evidence appears on a Reviewed map.

**Why this priority**: A combined map should preserve disagreement and explain its choices.

**Independent Test**: With synthetic aligned sources, review a same-location candidate, retain conflicting claims and undo the resulting merge.

**Acceptance Scenarios**:
1. Given nearby compatible records, when comparison runs, then it suggests pairs without merging or averaging positions; different floors, versions or geometry kinds cannot be automatically equated.
2. Given records inherited from the official guide, when I select canonical values, then their shared upstream lineage remains visible and is not counted as independent corroboration.
3. Given a new snapshot with changed or missing records, when I refresh, then I review its diff and stale decisions before committing; existing canonical choices and custom points remain intact.

### User Story 3 - Maintain my own locations and icons (Priority: P1)

As a player, I can create, edit, move and remove private point POIs, locations and marks using my own icons, and back up my work.

**Why this priority**: This remains useful without any third-party ingestion permission.

**Independent Test**: Offline, create a point by coordinates, upload an owned icon, edit and undo a deletion, then restore a private backup into an empty workspace.

**Acceptance Scenarios**:
1. Given a selected map, when I add a point by click or keyboard form, then preview and cancel precede save, and the saved point survives reload.
2. Given an uploaded raster, when validation succeeds, then a sanitized icon preview and description are available; invalid images leave the previous workspace untouched.
3. Given a revision conflict or quota failure, when save fails, then no partial change is committed and my unsaved draft remains recoverable/exportable.

### Edge Cases

Local interaction follow-up: right-clicking inside the map opens a new private POI draft at that canonical position. No automatic save occurs. An existing draft or preview is preserved; in explicit pick-location mode right-click selects the position for that draft. Out-of-bounds clicks and busy saves must not create points. Numeric keyboard authoring remains available.

Source record ID collisions; stale calibration; inverted axes; rectangular crops; unknown floors; possible spawn versus active object; empty categories; inaccessible assets; source master off with remembered masks; malformed backups; icon references on deletion; tabs racing; migration rollback; derived fields whose reuse rights remain restricted.

## Requirements

### Functional Requirements

- **FR-001**: Register Call of Duty, CODMunity, WZStats and CODCentral as distinct sources for geographic map Hajin. Record capabilities, attribution, acquisition and redistribution status with evidence. New providers default permission-required; no automated acquisition ships enabled without reviewed permission. Public accessibility is not authorization.
- **FR-002**: Provide source masters and category masks with all/none/mixed state, show/hide all globally and per source, search and a directly accessible Map key containing all registered categories. Layers and key share one persisted state. Disabled/unavailable sources explain why. Counts distinguish imported, visible and reviewed records; no invented completeness total.
- **FR-003**: Stage bounded, explicitly authorized local snapshot files, preview validation and additions/changes/missing records, then commit atomically. Snapshots and raw source records are immutable; refresh never silently deletes or overwrites curation. No arbitrary remote URL fetching, sign-in bypass or restricted-data copying workaround.
- **FR-004**: Preserve raw coordinates and require a versioned, reviewed transformation to the canonical map frame before placement or duplicate comparison. Registration must meet the calibration contract; unknown or invalid frames remain unplotted. Preserve game build, map version, floor and possible-spawn/observed-active/unknown semantics. Allow authorized local source-background staging and calibrated comparison with the canonical background on one camera, using single-background switching or two-background opacity overlay. Unknown-rights backgrounds remain reference links; no download is implied.
- **FR-005**: Map original category paths through a versioned taxonomy without losing original labels; unmapped records remain visible in an Unmapped category.
- **FR-006**: Produce deterministic, bounded duplicate suggestions, filtered by map/build/floor/geometry and normalized category. Proximity is only a candidate signal. No automatic merges, position averages, invented confidence or inferred live activity.
- **FR-007**: Allow an explicit reviewer to create/update canonical entities using field-level source choices or authored values with evidence, rejected alternatives and upstream lineage. Preserve conflicts, decision history and reversible split/unmerge. Missing/changed evidence flags accepted decisions stale without revoking acceptance. Reviewed map displays accepted decisions with current/stale freshness; pending or withdrawn decisions stay off the map.
- **FR-008**: Create/edit/move/delete private point annotations of kinds POI, location and mark, with title, category, notes, map/build/floor applicability, evidence, verification state and optional icon. Include preview, cancel, undo last mutation and numeric/list keyboard alternatives. Lines, polygons, screenshots and collaborative editing are deferred.
- **FR-009**: Accept owned/authorized local PNG/JPEG/WebP icons only after signature, decode, dimension and byte validation; reject animated or executable content. Reencode to sanitized PNG, hash-deduplicate and store description and rights declaration. Override precedence is annotation icon, category icon, built-in fallback. Referenced icon removal requires replacement or cancelled deletion, committed atomically.
- **FR-010**: Persist workspace data locally without changing native guide profiles/content; use revision-checked atomic transactions, recoverable previous state, migration preview, quota errors and multi-tab conflict handling. Keep unsaved changes on failure and provide a private backup path. Migrate existing source masks once without deleting the legacy state.
- **FR-011**: Export/import versioned, bounded private backups with preview and all-or-nothing restore. Preserve decisions, calibration and custom data. Omit source resources lacking export permission with an explicit dependency manifest. Public/share export is disabled in this slice; private backup does not grant third-party redistribution rights.
- **FR-012**: Provide keyboard operation, labelled controls, visible focus, non-color statuses, reduced motion and usable 360px layout. Existing official map, native guide and direct Map key access must regress neither function nor state.
- **FR-013**: Enforce the contract limits and performance budgets with synthetic/offline fixtures. Do not commit harvested datasets, unknown-rights assets, personal backups or original screenshots. No game-file inspection, deployment or source-site writes are included.

### Key Entities

Source, immutable SourceSnapshot/SourceRecord, CoordinateFrame/Registration, TaxonomyMapping, ReviewDecision/CanonicalEntity, Annotation, IconAsset, VisibilityState and WorkspaceBackup. See data-model.md for identities and lifecycle.

## Success Criteria

- **SC-001**: All source/category/key toggle permutations and reload persistence pass automated tests; blocked sources produce zero acquisition requests.
- **SC-002**: Calibration rejects invalid or undocumented crop/axis fixtures and accepts documented crop/axis transformations meeting the specified residual limits; no unresolved record reaches canonical placement. Authorized background switching/opacity preserves canonical marker placement; blocked imagery is never fetched.
- **SC-003**: Candidate/merge/refresh/split fixtures preserve every raw record, selected field, conflict and shared lineage, with no automatic merge.
- **SC-004**: Offline annotation/icon CRUD, undo, reload, backup round-trip and failure recovery pass; invalid files and revision conflicts produce no partial commits.
- **SC-005**: At the supported capacity, source toggle/search completes within 250ms p95 and comparison within 2s on the defined reference environment; bounded overflow gives an actionable message.
- **SC-006**: Keyboard-only and 360px browser journeys pass for layer controls, comparison and annotation editing; native guide and feature019 map regression checks pass before release.

## Assumptions and Clarifications

- Planning was merged in PR23; implementation is underway on `feat/020-map-workspace-implementation`. Full implementation and acceptance evidence is recorded in verification.md. Provider acquisition defaults gated; the owner-authorized local follow-up below enables private captures on this machine.
- These are different providers of Hajin information, not confirmed distinct geographic maps. The model supports future map IDs without inventing their content.
- Private point editing is the first geometry slice. No live match tracking, accounts, automatic harvesting or public sharing is implied.
- CODMunity and WZStats terms restrict collection; CODCentral reuse permission is unverified. Default registration remains blocked. The later owner-local authorization below supplies collection permission for this machine; it does not grant redistribution.
- Existing owner-local official assets retain feature019 rights status. Adding providers does not clear redistribution of those assets.

## Owner-local capture follow-up

The owner subsequently explicitly confirmed permission to collect data from the three named providers. This enables machine-local captures only: default registry policy remains reference-only, with opt-in local authorization and hash-bound, reviewed coordinate evidence. Runtime performs no provider requests. Capture bytes, icons and permission declarations stay ignored. Each loaded capture has independent visibility, source/category icons and a bounded preview path into review snapshots. This confirmation does not establish redistribution permission or factual accuracy.

## Reversible duplicate display follow-up

The owner requests one visible marker for likely matching locations across all websites, preferring the Call of Duty source, with `*`/muted source-category rows and preserved source data for completeness checks. This is display grouping, not a canonical merge or verification claim. Same normalized category and positions within24 canonical pixels require matching normalized marker names. Different names never collapse, including facilities at identical coordinates. Normalize Unicode/case, whitespace and punctuation only; do not infer singular/plural or synonym equivalence. Different known floors/builds remain separate. Use representative-based grouping, not transitive chains, with at most one record per website per group. Never suppress nearby objects from the same site. If the preferred source/category is deselected, an enabled matching copy appears. A clearly labelled Show duplicate markers checkbox restores all selected copies for inspection. Custom annotations/reviewed entities remain separate authored layers. Unknown/ambiguous matches stay available and source records/history are never changed.
