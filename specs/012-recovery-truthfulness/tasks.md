# Tasks
## Phase1: Foundation
- [x] T001 Read baseline, approved scope and pinned workflow; specify/clarify/plan artifacts in specs/012-recovery-truthfulness/.
- [x] T002 Obtain independent requirements approval in checklists/safety.md.
- [x] T003 Reproduce C2/C4/C5/C6/C7 before repair in tests/runtime/storage-lifecycle.test.mjs and tests/browser/recovery-truthfulness.mjs; record acceptance.md.
## Phase2: US1
- [x] T004 [US1] Test full/spoiler-only/inert/masked projections in tests/runtime/profile-preview.test.mjs (FR-001–002).
- [x] T005 [US1] Implement projection in src/domain/profile-preview.mjs and summary in src/client/profile.mjs/src/ui/private-pages.mjs (FR-001–002).
## Phase3: US2
- [x] T006 [US2] Test failed open, versionchange, late success, closed transaction and no write replay in tests/runtime/storage-lifecycle.test.mjs (FR-004).
- [x] T007 [US2] Repair lifecycle in src/storage/store.mjs (FR-004).
- [x] T008 [US2] Separate read/validation warnings in src/client/common.mjs and browser assertions in tests/browser/recovery-truthfulness.mjs (FR-003).
## Phase4: US3
- [x] T009 [US3] Catch guided nested events and wire both hosts in src/client/guided-editor.mjs/src/client/editor.mjs/src/client/studio.mjs (FR-005).
- [x] T010 [US3] Implement successful planner identity-based focus in src/client/planner.mjs and focused browser tests (FR-006).
## Phase5: Verification
- [x] T011 Run check/format/browser/engines/studio/visual gates and record acceptance.md (SC-001–004).
- [x] T012 Execute converge, independent source review, exact-head CI, approved merge and exact-main CI; update docs/roundtable-delivery.md.

Dependencies: T001→T002/T003→T004/T006→T005/T007/T008/T009/T010→T011→T012. Tests before repair; shared files single integration owner. No parallel file ownership. No migration; revert bounded patch if necessary.

## Phase6: Convergence
- [x] T013 Complete documentation-only exact-head CI, obtain parent approval for the exact reviewed green candidate, merge and verify exact-main CI per SC-004/T012 (partial external delivery gate; source, functional and visual acceptance already evidenced in acceptance.md). Do not equate successful PR tests with merged/main completion.

## Verified receipt reconciliation, 2026-10-22

T012, T013 are marked complete from the exact historical/candidate evidence now recorded in acceptance.md and the delivery ledger. This separate documentation/implementation pass does not claim a new test execution or approval of this documentation head. Any remaining combined convergence, publication, merge or exact-main obligations remain unchecked; historical success is not a guarantee for a later main revision.
