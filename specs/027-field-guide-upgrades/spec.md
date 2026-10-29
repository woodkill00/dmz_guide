# Feature Specification: Field guide workspace upgrades
**Branch**:feat/027-field-guide-upgrades. **Created**:2026-10-28. **Status**:Implemented and automated-verified; external T012 evidence pending.
**Input**: Implement the proposed reliability/usability improvements and in-depth search with nearby result lists and selectable map locations.

## User scenarios and acceptance
### US1 In-depth search and nearby locations (P1)
Search names, categories, websites, notes and evidence; narrow by source/category/kind/floor/build/visibility/placement/verification. Ranked exact/word/partial and bounded approximate matches, coordinate/grid queries and nearest results use a chosen origin (map center, grid/XY or a selected result). Results show grid/coordinates/source/distance and allow details, Jump and Find nearby without changing masks. Matching source copies group reversibly; unplaced reference entries remain searchable without fake pins. Pagination, reset, empty/error/loading states and keyboard/mobile remain usable.
### US2 Health, source status and recovery (P1)
Dashboard shows workspace/storage limits and headroom, capture ages, missing dependencies, update service/history availability and links to safe existing pruning/stage recovery. Guided fresh-profile recovery verifies owned data and separately required source/background resources without exporting restricted data. No silent deletion or background collection.
### US3 Evidence and map annotations (P2)
Attach sanitized owned screenshots, captions and observation dates to private points. Save editable routes/areas with bounded vertices through coordinate/map-pick tools. Display shapes on map, retain notes/icons, search anchors and private backup/restore. Existing point-only data remains valid.
### US4 Reusable icons (P2)
Save/load bounded editable icon design packs, reuse saved designs as starters and undo/redo design edits. Preview before atomic import; same pixels reuse existing IDs and preserve references.
### US5 Verification and documentation (P1)
Broaden browser engines/accessibility checks, repeated changed-update/restart/recovery cases, and fresh-profile restore. Keep help current. Create a concrete gameplay/device verification checklist with unverified status until real evidence exists.

## Functional requirements
FR001 Text search all available title/category/source/notes/evidence fields with multiword/quoted input, relevance/name/nearest sort and source/category/kind/floor/build/visibility/placement/verification filters.
FR002 Origins: capture map center, strictgridcell/XY or placed result; show nearest distance in canonical pixels and grid cell, optional radius; grid query jumps/highlights cell center. Never imply player tracking/meters or path safety.
FR003 Selectable paginated results Jump/highlight actual coordinates, show details/source and Find nearby; masks/private data unchanged. Group matched website copies conservatively by name+location/category/floor/build; retain all evidence and offer ungrouped results. Unplaced entries never get spatial distance/pins.
FR004 Search remains bounded at20000 source+5000private+5000reviewed entries; cache normalized fields, debounce input, deterministic ordering, no stale queued search, meaningful performance fixture. Invalid queries/coordinates show explanations; no execution or arbitrary URLs.
FR005 Health dashboard accurately measures limits/usage, source capture age/unavailable status, dependencies and update availability. Existing protected prune/managed-stage actions remain explicit, dependency-aware; no automatic file deletion or collection. Explain retained filesystem generations separately from browser snapshots and manual maintenance boundaries.
FR006 Guided recovery checklist/manifest identifies separate source/background dependencies; demonstrate restore in a fresh browser profile including available dependencies and missing-file reporting. Existing private export restrictions and transactional recovery remain.
FR007 Owned screenshot attachments are bounded sanitized PNGs with caption/date, remain private and round-trip backup; invalid/excess images or cancellation preserve draft. Add optional observation date and retain existing verification state.
FR008 Private routes/areas use2..200/3..200 finite in-map vertices, color, nondegenerate geometry; editable coordinate entry/map-pick workflow and map rendering; no navigation/pathfinding/world-unit claim. Point-only compatibility, safe deletion/undo and backup preservation.
FR009 Icon design pack exports/imports only bounded validated original recipes/metadata, preview then atomic import with existing limits/dedup. Saved designs selectable as starters; bounded designer undo/redo preserves draft guards.
FR010 Multi-engine smoke and automated accessibility plus manual checklist; synthetic changed/removed/renamed updates, interruption/restart, multitab and repeat identity; no claims for unavailable engines/physical devices/live-game checks.
FR011 Update Help/source docs to five providers and new workflows. Record completed work, test evidence and externally pending verification honestly. Local commits are authorized; no remote push/merge/deployment from this scope.

## Success criteria
SC001 End-to-end search/nearby/selection/filter/group/grid tests and bounded performance pass, with correct located versus unplaced behavior.
SC002 Health/recovery/evidence/shapes/icon packs round-trip and failure tests; old backups and source update regressions pass.
SC003 Unit/build/full browser/repository checks, supported engine/accessibility checks and independent requirements/security/UI review; analyze/converge resolves actionable code issues. Gameplay/device evidence stays explicitly pending when unavailable.

## Key entities, assumptions and edge cases
Search session is transient, not another player profile. Evidence/geometry optional additive private-annotation fields; icons retain existing content identity. Capture/prune rules unchanged. Physical device/gameplay inputs cannot be fabricated. Nearby uses selected image-space origins. No external-map scraping beyond existing explicit update workflow. Offline/missingassets, malformed queries/files, storage quota, stale tabs/updates, references, late async work and old backups covered.
