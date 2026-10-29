# Tasks: sourced upgrades and unlocks

## Phase 1: Scope and evidence
- [x] T 001 Read repository contracts, source pages and owning artifacts; establish isolated branch and active feature in `specs/032-sourced-unlocks-catalog/` (FR-006).
- [x] T 002 Obtain independent source/requirements review in `checklists/evidence.md` and `analysis/001-design-review.md` (FR-001–009).

## Phase 2: US 1 materials and upgrades
- [x] T 003 Add attributed items/upgrade definitions and null cash corrections in `content/catalog/upgrade-observations/` without altering original 31 rows (FR-001–003,006–007).
- [x] T 004 Add exact data/aggregate and purchase/refusal/history regression tests in `tests/runtime/sourced-catalog.test.mjs`; update prior scoped observation tests to preserve their original guarantees (FR-001–003,007).

## Phase 3: US 2 unlocks and level rewards
- [x] T 005 Add deduplicated recipe-unlock objectives, typed route claims, level milestones/reward claims and linking guides in the same pack (FR-004–006,008–009).
- [x] T 006 Test coverage, ambiguity, zero automatic grants and no executable recipe fabrication in `tests/runtime/sourced-catalog.test.mjs` (FR-004–006,008–009).

## Phase 4: US 3 use and preservation
- [x] T 007 Update `docs/quickstart.md` and `docs/content-contributing.md` for source coverage, backup/rebind and purchase-blocking correction (FR-006–009).
- [x] T 008 Exercise item, upgrade, unlock, level, source links and rebind workflows in `tests/browser/sourced-catalog-journeys.mjs`, desktop/mobile with screenshot review (FR-001–009).

## Phase 5: Verification and convergence
- [x] T 009 Run repository/schema/runtime/build/format and affected browser suites; record exact results and review in `acceptance.md`, complete traceability and convergence findings (SC-001–004).
- [x] T 010 Independent data/implementation review and publication-scope report; public writes remain under parent authorization (FR-006–007,SC-004).

Dependencies: T 001→T 002→T 003→T 004→T 005→T 006→T 007→T 008→T 009→T 010. Independent reviewer reads while implementation proceeds only after design checklist passes; no parallel shared-file writers. MVP is US 1, followed by US 2 and preservation/verification. Tests are required by the constitution and spec.


## Current verification state
T 008–010 implementation verification and independent review are complete. Repaired head `7a0b4caf` passed all nine CI jobs with reviewed browser pixels; see acceptance.md. Final documentation-head CI, authorized merge and post-merge results are tracked in PR #28 before delivery completion; these release gates are not represented as already passed.
