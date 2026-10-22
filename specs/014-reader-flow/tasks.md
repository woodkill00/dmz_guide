# Tasks: Clear reader flow
## Setup and gates
- [x] T001 Read pinned lifecycle/governance/final report and isolate specs/014-reader-flow (FR-009).
- [x] T002 Specify/clarify/plan scope and contract in specs/014-reader-flow/*.md (FR-001–009).
- [x] T003 Reproduce failures in tests/runtime/reader-flow.test.mjs; record specs/014-reader-flow/reproduction.md (FR-001–008).
- [x] T004 Independent checklists/reader-flow.md approval and exact integration hook/base gate (FR-009).
## US1 — Plan needs
- [x] T005 [US1] Add context tests for back/refresh/pack change,wrong destination,missing/expired,denied/quota,same-version full-pack drift,current hidden target in tests/runtime/reader-flow.test.mjs and tests/browser/reader-flow.mjs (FR-001–003).
- [x] T006 [US1] Implement bounded20-entry/32768-char/30min context,256-char IDs,64hex digest,UUID token in src/domain/reader-flow.mjs and src/client/{planner,local,maps,common}.mjs exact approved hook only (FR-003,005).
- [x] T007 [US1] Additional-output/empty state/shortage links in src/client/planner.mjs and src/ui/private-pages.mjs preserve012 behavior (FR-001–003).
## US2 — Search
- [x] T008 [US2] Token/order/spoiler/URL/home expiry tests in tests/runtime/reader-flow.test.mjs and tests/browser/reader-flow.mjs (FR-004,005).
- [x] T009 [US2] Stable token/validated public URL/local home transfer in src/domain/reader-flow.mjs,src/client/{catalog,local}.mjs,src/ui/render.mjs (FR-004,005).
## US3 — Readability and location
- [x] T010 [US3] Map/calibrated/empty/evidence/nav/visual cases in tests/runtime/reader-flow.test.mjs and tests/browser/reader-flow.mjs (FR-006–009).
- [x] T011 [US3] List-first unplottable maps in src/client/maps.mjs and src/ui/maps-page.mjs, preserve calibrated controls (FR-007).
- [x] T012 [US3] Evidence/nav/hierarchy in src/ui/render.mjs and narrow src/styles.css spacing, preserve warning/text/44px (FR-006,008).
## Delivery
- [ ] T013 Local checks and integrator-hosted Windows/Linux/three-engine/fullpage/actual200% checks in specs/014-reader-flow/acceptance.md (FR-009).
- [ ] T014 Converge/independent source+visual review; fix/rerun; bounded commit with permission only (FR-001–009).
## Dependencies
T001–004 gate production. US1 then US2/US3 share files; no parallel file writes. Tests before implementation. Review may run read-only concurrently. Existing runners integration-owned. No publish/merge from worker.

## Phase 6: Convergence
- [ ] T015 Ensure actual hosted browser contract and normal/200% full-page evidence on exact candidate; record dimensions and independent visual interpretation in specs/014-reader-flow/acceptance.md (FR-003–009). Existing test module is not execution evidence.
- [ ] T016 Reconcile independent source review findings, rerun available tests and exact-head CI after integration in specs/014-reader-flow/acceptance.md (FR-001–009).

- [x] T017 Apply independently reviewed same-tab button amendment in src/client/planner.mjs, with44px targets and storage-failure/no-navigation/keyboard tests in tests/browser/reader-flow.mjs (FR-003,009). Preserve existing native links.

T005/T008/T010/T017 checkmarks mean test coverage authored and available runtime assertions passed; browser execution remains required by T013/T015. No screenshot/hosted success inferred.
