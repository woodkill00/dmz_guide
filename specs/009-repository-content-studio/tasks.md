# Tasks: Repository Content Studio

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/authoring.md.
**Tests**: Explicitly required by owner. Checkboxes report implementation evidence, not reviewer approval.

## Phase 1: Setup
- [x] T001 Verify main and isolate branch/worktree; read AGENTS.md and pinned Spec Kit instructions; record scope in specs/009-repository-content-studio/spec.md.
- [x] T002 Execute specify and clarify, research alternatives and write plan/data-model/contracts/quickstart under specs/009-repository-content-studio/.
- [x] T003 Obtain independent reviewer-owned requirements-quality gate in specs/009-repository-content-studio/checklists/safety-usability.md; analyze all artifacts before implementation.

## Phase 2: Foundations
- [x] T004 [P] Define and test canonical assembly, ID/order membership, safe categorized paths, explicit migration and legacy fixture adapter in scripts/catalog.mjs and tests/runtime/catalog.test.mjs (FR-003,004,008,012).
- [x] T005 [P] Extract guided renderer without behavior changes in src/client/guided-editor.mjs and src/client/editor.mjs; preserve private isolation and selectors (FR-002,010,013).
- [x] T006 [P] Define and test fixed-root snapshot/journal/recovery primitives in scripts/author-store.mjs and tests/runtime/author-store.test.mjs (FR-005,008,010).

## Phase 3: US1 - Save public game content locally
Independent criterion: weapon/stat + item + recipe save survives restart/build/clean checkout, no IndexedDB import.
- [x] T007 [US1] Test snapshot conflicts, partial-failure/recovery, missing references, case/path/symlink rejection and unrelated edits in tests/runtime/author-store.test.mjs (FR-003,005,008,010; SC-001,002).
- [x] T008 [US1] Implement staged validated save with immutable identities, rights and revision checks in scripts/author-store.mjs (FR-003,005,008,010).
- [x] T009 [P] [US1] Test exact Host/Origin/session proof, bounded requests, unsupported methods and read-only normal serving in tests/runtime/author-server.test.mjs (FR-001,009).
- [x] T010 [US1] Implement local-only API and CLI in scripts/author.mjs; add opt-in command in package.json without changing npm start (FR-001,009).
- [x] T011 [US1] Implement separate guided/advanced JSON contributor controller and dirty/conflict/save states in src/client/studio.mjs and src/ui/studio-page.mjs (FR-002,003,005,010,013).
- [x] T012 [US1] Integrate canonical build and migrate all three existing packs with exact ordered equality and provenance preservation in scripts/build.mjs, content/catalog/, media/ and tests/helpers/catalog.mjs (FR-004,012).

## Phase 4: US2 - Add and manage pictures
Independent criterion: crop and thumbnail actual pixels survive repository save/restart/build and all usage links resolve.
- [x] T013 [P] [US2] Implement bounded decode/crop/alpha-preserving PNG normalization in src/client/raster-editor.mjs with actual browser checks in tests/browser/studio.mjs (FR-006,008; SC-002).
- [x] T014 [US2] Add shared optional assetIds with at most 8 unique IDs, reference validation and lazy additional-picture galleries in schemas/pack.schema.json, src/content/validate.mjs, src/ui/render.mjs and private reader modules (FR-006,007,012).
- [x] T015 [US2] Implement picker/drop, size feedback, explicit duplicate reuse, thumbnail variants, rights/provenance, primary/additional attachments and where-used/delete previews in src/client/studio-media.mjs (FR-006,007,013).
- [x] T016 [US2] Separate published 1000 assets/pack, 1024/site and 256 MiB aggregate from portable 32 assets/8 MiB/16M pixels in src/content/limits.mjs, bundled-assets.mjs, validate.mjs, scripts/bundled-assets.mjs and schema; retain per-image 2 MiB/2048/4M bounds (FR-012).
- [x] T017 [US2] Test 1000-asset metadata, lazy paged library, corrupt/metadata-bearing PNG, batch limits, duplicates and in-use deletion in tests/runtime/catalog.test.mjs, author-store.test.mjs and tests/browser/studio.mjs (FR-006,007,008,012; SC-002,003).

## Phase 5: US3 - Review and share changes
Independent criterion: bounded managed change review, portable import preview/cancel, and fresh-clone publication with no automatic Git operation.
- [x] T018 [US3] Implement and test exact-managed-path Git status/diff summary, fixed argv and output bounds in scripts/author-store.mjs and tests/runtime/author-store.test.mjs (FR-011).
- [x] T019 [US3] Implement validated portable import preview/apply, new catalog flow, draft recovery export and cancel/back-navigation safety in src/client/studio.mjs and tests/browser/studio.mjs (FR-005,010,012,013).
- [x] T020 [US3] Document source layout, explicit migration, rights, normalization, exact limits, recovery and manual Git sharing in docs/content-studio.md; update README.md, AGENTS.md, docs/release.md and docs/README.md current-state wording (FR-014).

## Phase 6: Integration, convergence and release
- [x] T021 Add hosted Studio Chrome Windows/Linux and Firefox/WebKit journeys plus desktop/mobile/200% screenshot evidence in tests/browser/studio.mjs and .github/workflows/quality.yml; preserve health/CSP and documented WebKit screenshot limitation (FR-013,014; SC-004).
- [x] T022 Run all runtime/repository/format/build/package checks, exact fresh-checkout save/build proof, and independent visual/implementation review; record actual evidence in specs/009-repository-content-studio/acceptance.md (FR-014; SC-001,002,003,004,005).
- [x] T023 Execute Spec Kit converge, append any uncovered tasks and repair/retest until reviewed exact head is green; record analysis/convergence in specs/009-repository-content-studio/acceptance.md (SC-005).
- [x] T024 Ready and merge the reviewed feature PR using existing authorization, then verify exact main SHA CI and update acceptance evidence without claiming unexecuted tests (SC-005).

## Dependencies and parallel work
T001–T003 block implementation. T004/T005/T006 have disjoint ownership and agreed contracts. T007–T012 integrate after foundations; UI and server may proceed in separate files against contracts. T013/T014/T016 run in disjoint coordinated files; schema/validator ownership is serialized with catalog owner. T015 depends on raster and schema contracts. T017 follows integrated behavior. T018/T019 extend the validated save boundary. Documentation can proceed alongside tests once actual commands are stable. T021–T024 require all stories and the independent gate; merging never bypasses failed checks.

## Implementation strategy
Deliver the smallest real repository save journey first, then complete media/import/review breadth. Do not merge the partial slice as final acceptance. Existing private editor behavior is regression-tested after extraction. Every task belongs to the fifteen requirements or five measurable outcomes; test evidence and reviewer checklist remain independent.

## Phase 7: Approved preview scope reconciliation
- [x] T025 Add read-only saved-record preview rendering at GET /preview in scripts/author.mjs and a selected-record link in src/client/studio.mjs; validate source/images/references without writing public dist, and cover save-to-preview in tests/browser/studio.mjs (FR-015; SC-001).

## Phase 8: Convergence
- [x] T026 [US1] Resolve CONV-001 (HIGH, contradicts constitution principle 2 / FR-013 / SC-004): replace the light-only author stylesheet in src/ui/studio.css with dark-default and accessible optional light palettes, add a persisted theme-only toggle in src/ui/studio-page.mjs using existing theme support, and verify theme defaults/persistence/contrast plus both-theme responsive screenshots in tests/browser/studio.mjs. First hosted evidence showed cream/light default despite the established dark-first requirement; preserve the private-profile isolation boundary.

## Phase 9: Convergence
- [x] T027 [US1] Resolve CONV-002 (HIGH, partial FR-013 / SC-004 / constitution principle 2): fix intrinsic-width overflow in src/ui/studio.css at 320px with actual 200% text sizing. Hosted run 39662205116 measured a 494px document width. Preserve enlarged text, accessible controls and the existing no-overflow assertions in tests/browser/studio.mjs; verify actual desktop/mobile/enlarged-text screenshots and both themes without clipping or hiding content.

## Phase 10: Convergence
- [x] T028 [US2] Resolve CONV-003 (HIGH, partial FR-006/013 and SC-004): eliminate unexpected browser resource failures after the complete Studio journey. Give Studio and saved preview explicit existing local favicons, and repair the image object-URL lifecycle causing ERR_FILE_NOT_FOUND during draft rerenders. Preserve the strict browser health gate, add targeted regressions, and verify all supported hosted engines without broad console/network exceptions.

## Phase 11: Convergence
- [x] T029 [US1] Resolve CONV-004 (HIGH, partial FR-005/013 and SC-004): serialize same-process repository read/media/change-summary operations with active saves in scripts/author-store.mjs. Hosted Firefox and Windows completed functional workflows but exposed a transient HTTP 422 summary while a following save was in progress. Add a deterministic prepared-journal overlap test in tests/runtime/author-store.test.mjs. Preserve external-edit detection and strict browser health; do not return a partially installed snapshot or suppress failures.
