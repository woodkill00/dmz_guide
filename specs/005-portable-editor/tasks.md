# Tasks: Private portable editor
## Phase 1: Setup
- [x] T001 Resolve explicit feature, pinned protocols and parent shared contracts in specs/005-portable-editor/plan.md (E01–E14).
- [x] T002 Obtain independent requirements gate in specs/005-portable-editor/checklists/reviewer.md (15/15; not implementation acceptance).
## Phase 2: Boundary foundations
- [x] T003 Write portable security/diff/profile-impact tests in tests/runtime/portable.test.mjs (E03–E09,E12–E14): strict v1, exact envelope, 20 MiB cap, canonical base64, 32 assets/2 MiB each/8 MiB total/2048 dimension/4M per-image/16M aggregate pixels, traversal, hashes, cycles and unsupported archive/animation.
- [x] T004 Implement portable boundary in src/content/portable.mjs with required decoder injection and bounded exact shape (E03–E09,E12–E14).
## Phase 3: US1 guided private corrections
- [x] T005 [US1] Implement labeled nested all-schema editor controls and native route shell in src/client/editor.mjs and src/ui/editor-page.mjs (E01,E02,E11,E12); immutable existing identity, optional/null/array/type controls, useful domain help, draft recovery export.
- [x] T006 [US1] Implement validation, semantic-version requirement, before/after preview, original-revision apply and private-reader links in src/client/editor.mjs (E02,E03,E08,E09,E13).
## Phase 4: US2 picture portability
- [x] T007 [US2] Implement rights/privacy-gated raster attach, sequential decode/timeout/cancel, upload reencode and content/picture exports in src/client/editor.mjs (E04–E07,E10,E14).
- [x] T008 [US2] Implement file bounded import, exact target baseline lookup and full payload staging in src/client/editor.mjs (E03–E09,E12–E14).
## Phase 5: US3 recovery
- [x] T009 [US3] Implement rollback snapshot preview, profile impact, generation invalidation, dirty-switch confirmation and storage-failure preservation in src/client/editor.mjs (E08,E09,E11–E14).
## Phase 6: Verification / polish
- [x] T010 Write exported hosted-browser acceptance journey in tests/browser/editor.mjs for guided edit, real original raster export/clean import/reload, cancellation, rollback, quota/conflict and narrow keyboard controls (SC01–SC05, E01–E14).
- [ ] T011 Run unit/build/check evidence and parent hosted-browser handoff; record exact results/remaining gaps in specs/005-portable-editor/acceptance.md (SC01–SC05).
- [ ] T012 Execute append-only convergence assessment and independent implementation handoff, recording lifecycle in specs/005-portable-editor/lifecycle.md (all requirements).
## Dependencies and strategy
T001→T002→T003→T004→T005→T006→T007→T008→T009→T010→T011→T012. No parallel edits of shared client file; parent integration files are disjoint. US1 useful first increment; US2/3 close full requested journey. Tests before corresponding boundary implementation. Parent alone owns publication, CI hook and final release.

## Phase 7: Convergence
- [x] T013 Harden per-frame raster predecode validation in src/content/portable.mjs and hostile fixtures in tests/runtime/portable.test.mjs per E05/E06/E07 (partial): WebP extended/intrinsic dimensions, JPEG duplicate frames and PNG critical ordering.
- [x] T014 Guard dirty-import disposal and all draft mutation before atomic-save lock in src/client/editor.mjs per E08/E13/E14 (partial); reset picture export attestations on changed content.
- [x] T015 Disclose original imported raster metadata and require explicit embedded/visible privacy attestation in src/ui/editor-page.mjs per E10 (partial), preserving actual-byte roundtrip instead of silently altering imported hashes.
- [x] T016 Add first-edit rollback, real JPEG/WebP decode, denied/quota-save direct recovery export and decode timeout browser cases in tests/browser/editor.mjs per E05/E08/E14 and SC02/03 (partial).

- [x] T017 Bound guided nested array rendering to20entries per page while preserving all fields via keyboard pagination in src/client/editor.mjs per E06/E11 (partial).
- [x] T018 Extend tests/browser/editor.mjs to add a new gun/stat and guide, then verify typed private reader links, inventory and planner after clean import per SC01/SC02 (partial; hosted execution pending).
