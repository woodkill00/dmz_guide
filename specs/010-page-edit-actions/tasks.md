# Tasks: Page edit and picture actions

Input: spec.md, plan.md, research.md, data-model.md, contracts/navigation.md. Tests explicitly required. Reviewer checkboxes are independent of this execution list.

## Phase 1: Setup
- [x] T001 Read repository/pinned skills, select feature explicitly and create feature artifacts in specs/010-page-edit-actions/.
- [x] T002 Obtain independent requirements-quality review in specs/010-page-edit-actions/checklists/safety-usability.md and complete read-only analysis in analysis.md before code edits.

## Phase 2: Foundation
- [x] T003 Implement strict generated identity/query contract in src/content/author-target.mjs and unit regressions in tests/runtime/page-edit.test.mjs (FR-003/004; SC-001/002).

## Phase 3: US1 - Edit from the reading page
Independent test: all six public detail groups target exact saved catalog/record; rename/save/return/reopen preserves identity.
- [x] T004 [US1] Add public contextual actions/static guidance and catalog mapping in src/ui/author-actions.mjs, src/ui/render.mjs, scripts/build.mjs; cover every generated record and spoiler boundary in tests/runtime/page-edit.test.mjs (FR-001/002/008; SC-001).
- [x] T005 [US1] Validate author document target and narrowly bounded top-level entry in scripts/author.mjs; add direct actions in scripts/author-preview.mjs and server regressions in tests/runtime/author-server.test.mjs (FR-003/004/007; SC-002).
- [x] T006 [US1] Resolve exact Studio target, show selected identity/return, focus correct controls and retain safe generic landing in src/client/studio.mjs and src/ui/studio-page.mjs (FR-004/006/008).

## Phase 4: US2 - Add or change pictures
Independent test: primary replacement/additional images survive save/rebuild; shared old image stays unchanged.
- [x] T007 [US2] Add location optional picture references and six-group media support in schemas/pack.schema.json and src/client/studio-media.mjs; test valid/broken/duplicate references in tests/runtime/page-edit.test.mjs (FR-005).
- [x] T008 [US2] Include pending image work in explicit discard and native leave safeguards in src/client/studio-media.mjs and src/client/studio.mjs; explain replacement semantics in src/ui/studio-page.mjs (FR-005/006).
- [x] T009 [US2] Extend tests/browser/studio.mjs with public action to Studio, exact group targets, rename, upload/red-to-blue primary replacement, additional image, library reuse, shared record integrity, cancel/back/repeated flows and fresh-checkout build proof (FR-001–007/009; SC-001–003).

## Phase 5: Polish and release
- [x] T010 Add action/guidance/target-context dark/light desktop/mobile/320px enlarged-text evidence in tests/browser/studio.mjs and keep hosted matrix in .github/workflows/quality.yml; document workflow in docs/content-studio.md and README.md (FR-008/009; SC-004).
- [ ] T011 Run full documented checks and pinned converge; record actual results and missing checks in specs/010-page-edit-actions/acceptance.md and convergence.md; append repairs rather than invent completion (FR-009; SC-004).
- [ ] T012 Publish draft PR, obtain exact-head green hosted CI plus independent implementation/visual review and report evidence to parent before any merge in specs/010-page-edit-actions/acceptance.md (SC-004).

## Dependencies and parallelism
T001→T002→T003. T004/T005/T006 share target contract and are serialized by implementation owner. T007/T008 follow foundation and feed T009. Tests may be authored in parallel with disjoint documentation after contracts settle; all code stays under one owner, independent reviewer alone edits safety-usability.md. T009/T010→T011→T012. No partial implementation is release-ready.

## Implementation strategy
First deliver exact record edit navigation end-to-end, then extend all-group image support and pending-work safeguards, then prove the real workflow and regression matrix. The smallest MVP is US1 but owner acceptance requires both stories. Public deployment and unrelated changes remain out of scope.

## Phase 6: Convergence
- [x] T013 Resolve CONV-001 (HIGH, partial FR-001/002 and SC-001): use the existing filesystem-safe colon-to-double-hyphen route encoding in src/ui/author-actions.mjs, add explicit guidance path regression in tests/runtime/page-edit.test.mjs and rerun package/release verification. The first release verifier rejected percent-encoded catalog record directories after URL decoding.

Execution note: T009/T010 mark authored browser coverage and documentation, not executed browser acceptance. T011/T012 retain the actual hosted/visual/release gate; see acceptance.md.
