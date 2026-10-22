# Tasks: Contributor workflows

## Phase 1: Setup

- [x] T001 Read pinned lifecycle, constitution and approved scope; isolate specs/015-contributor-workflows on exact base 6d92043.
- [x] T002 Specify/clarify/plan in specs/015-contributor-workflows; record no critical unresolved scope ambiguities.

## Phase 2: Gates

- [x] T003 Obtain independent requirements approval in specs/015-contributor-workflows/checklists/contributor-safety.md and analyze consistency before production edits.

## Phase 3: US1 recovery

- [x] T004 [US1] Reproduce absent recovery contract and hostile cases in tests/runtime/contributor-workflows.test.mjs (FR-006–009).
- [x] T005 [US1] Implement bounded version-1 validator in src/content/studio-recovery.mjs with exact shape/identity/rights/current-source/media validation, per Plan limits (FR-006–009).
- [x] T006 [US1] Integrate separate recovery file control and inert preview/apply in src/client/studio.mjs and src/ui/studio-page.mjs; add scripts/author.mjs allowlist (FR-008–009).

## Phase 4: US2 navigation/review

- [x] T007 [US2] Add red-first UI contract/browser cases in tests/runtime/contributor-workflows.test.mjs and tests/browser/contributor-workflows.mjs (FR-003–005).
- [x] T008 [US2] Add stable anchor sections, derived summary, explicit review version change in src/client/studio.mjs, src/ui/studio-page.mjs and additive src/ui/studio.css selectors (FR-003–005).

## Phase 5: US3 startup

- [x] T009 [US3] Reproduce missing-build/occupied-port diagnostics and role requirements in tests/runtime/contributor-workflows.test.mjs (FR-001–002).
- [x] T010 [US3] Add read-only scripts/diagnose.mjs and reader/author/contributor warning/blocker diagnostics including non-loopback HOST warning and friendly startup messages in scripts/serve.mjs and scripts/author.mjs; preserve owned-process signals (FR-002).
- [x] T011 [US3] Separate docs/quickstart.md reader/author guide from docs/developer-quickstart.md; update README.md and docs/content-studio.md (FR-001).

## Phase 6: Verification

- [x] T012 Run tests/check/build/format/Python and focused acceptance; record exact outcomes in specs/015-contributor-workflows/acceptance.md.
- [ ] T013 Converge artifacts and source, append missing tasks in specs/015-contributor-workflows/tasks.md and obtain independent source/visual review.
- [x] T014 Integrator runs actual Windows/Linux Chrome/Firefox/WebKit, strict health, full-page/tiled/200% exact-head CI; record in specs/015-contributor-workflows/acceptance.md. No merge/publish by worker.

## Dependencies and strategy

T001–003 gate all production work. Each story's reproduction precedes implementation. US1/US2 share Studio and execute sequentially. US3 diagnostic module/docs can be parallel only with a disjoint owner; this worker executes sequentially. MVP recovery first, then navigation/review, then startup/docs. All story phases independently testable; full delivery requires all three and evidence/review.

## Phase 7: Convergence

- [x] T015 Preserve the author-only static boundary for the new parser via exact exclusions in scripts/build.mjs and scripts/release_paths.py and corresponding tests (FR-006; plan local-only scope); integrator authorized exact exclusions only.
- [x] T016 Execute expanded actual-raster/rights/rejection/delayed-decode cancellation cases in tests/browser/contributor-workflows.mjs on hosted Chrome/Firefox/WebKit and retain strict-health plus full-page/tiled actual200% artifacts (FR-007–008, SC-005). Local launch is unavailable, not passed.
- [x] T017 Keep016 image controls out of the independently usable015 candidate; transfer working controls and optional recovery-storage diagnostics to016 with its owned helpers. No inert description input is shipped in015 (coordinated ownership boundary).

## Phase 8: Actual hosted visual repairs

- [x] T018 Repair native checkbox flex shrink in src/ui/studio.css after actual Chrome320px/200% artifact showed the rights control reduced to a near-invisible speck; retain1.2em dimensions and validate real geometry/full-page evidence across engines.
- [x] T019 Diagnose actual Firefox320px/200% horizontal overflow using validator-owned tests/browser/contributor-workflows.mjs geometry before any further CSS repair; preserve existing strict reflow threshold and source review.

## Verified receipt reconciliation, 2026-10-22

T014, T016, T018, T019 are marked complete from the exact historical/candidate evidence now recorded in acceptance.md and the delivery ledger. This separate documentation/implementation pass does not claim a new test execution or approval of this uncommitted documentation head. Any remaining combined convergence, publication, merge or exact-main obligations remain unchecked; historical success is not a guarantee for a later main revision.

## Phase 9: Convergence

- [x] T020 Record the accepted startup verification-order exception in docs/adr/0014-startup-verification-chronology.md, with affected FR-002/SC-004/US3-AC2 and T009–T010, exact retrospective evidence limits, independent review and an explicit expiry/revisit trigger; link the record from acceptance.md. Do not alter production behavior, infer failure-first ordering or grant a future testing waiver. [Constitution: exception record; FR-002, SC-004] (partial)

## Phase 10: Recovery category boundary repair

- [x] T021 [US1] Reproduce malformed recovery upload category acceptance with actual valid PNG bytes in tests/runtime/recovery-category-shape.test.mjs; verify every existing allowed string and reject JSON primitive/object/array category shapes plus whitespace/newline variants before raster decode. Repair only the category type/enum boundary in src/content/studio-recovery.mjs, preserve stripped payloads and normalized downstream uploads, rerun focused/existing parser checks, and obtain independent exact-source review before commit. Record actual red/green and the remaining exact-head integration gate in acceptance.md. [FR-006, FR-007–008; SC-001]
