# Tasks: Protect private inventory drafts
## Phase 1: Setup
- [x] T001 Inspect baseline and pinned lifecycle; record decisions in research.md.
- [x] T002 Obtain independent requirements review in checklists/safety.md before production edits.
## Phase 2: Foundation
- [x] T003 Record baseline browser reproduction for C1/C3 in acceptance.md using tests/browser/draft-safety.mjs.
## Phase 3: US1 - Preserve drafts
- [x] T004 [US1] Add independent dirty departure/save-failure/invalid-input regression cases in tests/browser/draft-safety.mjs (FR-001–004, FR-007).
- [x] T005 [US1] Implement raw baseline and successful-save checkpoint in src/client/profile.mjs (FR-001, FR-003).
- [x] T006 [US1] Implement single departure decision, native unload and focus-safe dialog in src/client/common.mjs and src/ui/private-pages.mjs (FR-002–004, FR-007).
## Phase 4: US2 - Validated backups
- [x] T007 [US2] Add startup and both-export regression cases in tests/browser/draft-safety.mjs (FR-005–006).
- [x] T008 [US2] Centralize validation/naming and startup locking in src/client/common.mjs, src/client/profile.mjs and src/ui/private-pages.mjs (FR-005–006).
## Phase 5: Verification
- [x] T009 Integrate tests in tests/browser/run.mjs; execute check/format/browser/engines/studio and record exact results in acceptance.md (FR-007, SC-001–004).
- [x] T010 Execute converge and independent review; record exact candidate CI, parent merge gate and exact-main CI in acceptance.md.

## Dependencies and implementation strategy
T001 → T002/T003 → T004/T007 → T005/T006/T008 → T009 → T010. Tests are independent-owned; shared client files have one integrator. No parallel production-file ownership. US1 is the smallest protective outcome; US2 shares startup/common contracts and ships in this bounded batch. Completion requires evidence, not checked tasks alone.

## Phase 6: Convergence
- [x] T011 Obtain parent approval for the exact independently reviewed green candidate, merge only that candidate, and verify exact-main CI; record evidence in acceptance.md per plan: validation and rollback / T010 (partial external delivery gate).

## Verified receipt reconciliation, 2026-10-22

T010, T011 are marked complete from the exact historical/candidate evidence now recorded in acceptance.md and the delivery ledger. This separate documentation/implementation pass does not claim a new test execution or approval of this uncommitted documentation head. Any remaining combined convergence, publication, merge or exact-main obligations remain unchecked; historical success is not a guarantee for a later main revision.
