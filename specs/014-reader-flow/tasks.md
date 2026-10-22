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

- [x] T018 Reproduce and repair ledger accessible heading contamination; add regression preserving exact heading/sibling controls (FR-003,008).
- [ ] T019 Diagnose actual Firefox Back failure using bounded hosted failure artifacts, then repair confirmed cause and rerun unchanged browser assertions (FR-003,009).

- [x] T020 Correct mixed-clock expiry test fixture without changing production validation; regression protects malformed future-entry rejection and existing tokens (FR-003,009).
- [ ] T021 Locate Firefox history-entry growth using stage checkpoints and actual hosted evidence before changing source or assertions (FR-003,009).

- [x] T022 Author independently approved isolated static/reader×Playwright/native refresh controls with strict native semantics and profile/target preservation (FR-003,009).
- [x] T023 Execute controls hosted, independently interpret actual differential, then separately review any primary refresh test-contract change. Preserve one Back and exact target/profile (FR-003,009). Actual151301f/artifact12422153749 independently confirms native refresh contract.

- [ ] T024 Independently review primary native refresh delta and run exact-head hosted journey with stable history/type plus original single Back (FR-003,009).

- [x] T025 Inspect actual clipped/overlapping radar caption evidence, independently approve and implement bounded template/CSS repair with structural runtime regression (FR-008,009).
- [ ] T026 Run validator-owned caption geometry/nonoverlap and independent normal/200 pixel review across widths/themes on exact candidate (FR-008,009).

## Phase 7: Convergence
- [ ] T027 Reproduce the remaining functional metadata font-floor gap on unchanged production CSS using actual hosted computed styles in tests/browser/metadata-floor.mjs; after independent review, repair only reachable semantic metadata in src/styles.css and rerun normal/true-200% dark/light 320/390/1280 checks, full-document evidence and independent pixel review. Preserve existing assertions, timeouts, health checks, text, targets and decorative typography; record exact baseline and fixed evidence in specs/014-reader-flow/reproduction.md and acceptance.md (FR-006,008,009; SC-005; plan: functional metadata >=0.875rem; partial).

T027's baseline/fixed matrix has 84 cases per engine: seven real reader surfaces (catalog, official recipe, fictional recipe, progression, long fictional local detail, inventory privacy and private-editor privacy), two themes, two actual text scales and three viewport widths. Private editor is the existing /editor/ reader route, not Content Studio or its separate stylesheet.
