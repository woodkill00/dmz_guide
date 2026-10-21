# Tasks: Runnable guide foundation
Input: spec.md, plan.md, research.md, data-model.md, contracts/ui.md.
## Phase 1 Setup
- [x] T001 Create package.json and runtime commands; retain baseline gates in .github/workflows/quality.yml. F003-07/08.
- [x] T002 Record static route spike and architecture result in research.md after scripts/build.mjs + scripts/serve.mjs test. F003-01/07.
## Phase 2 Foundation
- [x] T003 Integrate reviewed schemas/pack.schema.json and content/packs/*.json; add src/content/validate.mjs with canonical caps, reference/status/scope checks and tests/runtime/content.test.mjs. F003-02/08.
## Phase 3 US1 Read
- [x] T004 [US1] Implement escaped native routes and provenance in scripts/build.mjs + src/ui/render.mjs; test direct/no-JS routes in tests/browser/guide.mjs. F003-01/02.
- [x] T005 [US1] Implement accessible responsive theme and URL search in src/styles.css + src/client/catalog.mjs + src/client/theme.mjs; inspect screenshots. F003-06.
## Phase 4 US2 Plan
- [x] T006 [US2] Write tests/runtime/planner.test.mjs covering batch rounding, tools, currency, gated/unknown states, invalid references/cycles and 100-operation conservation. F003-04/08.
- [x] T007 [US2] Implement pure one-goal calculations in src/domain/planner.mjs and planner UI in src/client/planner.mjs. F003-03/04.
## Phase 5 US3 Recover
- [x] T008 [US3] Write tests/runtime/profile.test.mjs for bytes/depth/count limits, dangerous keys, versions, mismatch and round trip. F003-05.
- [x] T009 [US3] Implement src/storage/store.mjs and src/domain/profile.mjs with atomic expected-revision saves, previous snapshot, memory unsaved fallback and preview restore/rebind. F003-03/05.
- [x] T010 [US3] Implement inventory/settings UI in src/client/profile.mjs and browser reload/restore/cancel/conflict/error tests in tests/browser/profile.mjs. F003-03/05.
## Phase 6 Polish and acceptance
- [x] T011 Verify build/link/budget and all repository/runtime/browser checks; write acceptance.md and traceability.json with exact evidence. F003-07/08.
- [x] T012 Run convergence, append missing tasks, repair and obtain independent reviewer verdict in review.md. F003-08.
- [ ] T013 Publish PR, verify exact-head CI, merge and verify exact-main CI; record release evidence and continue 004. F003-08.
## Dependencies and parallelism
T001/003 precede domain implementation. After reviewer gate and schema lock, US1 shell worker owns scripts/build/serve, src/ui, styles and catalog/theme only; integration owner owns domain/storage/planner/profile. T004 and T006 may run in parallel after T003 contract stabilization. US2/US3 integrate shared profile sequentially. MVP is US1 but stopping there does not meet user scope.
## Implementation strategy
S0–S2 end-to-end first, then 004 shared planning, 005 portable editor, 006 location intelligence, 007 progression and 008 community/release. No dummy controls stand in for completed behavior.

## Phase7: Convergence
- [x] T014 Repair reviewer-found atomic preview pack/revision binding and direct unsaved export in src/client/profile.mjs/common.mjs/private-pages, verify cross-pack/denied-storage browser cases. F003-03/05 partial.
- [x] T015 Repair bounded prerequisite traversal, disputed readiness, one-time quantities and aggregate overflow in src/domain/planner.mjs with regression tests. F003-04 partial.
- [x] T016 Correct browser option synchronization, use supported installed Chrome sandbox, update official artifact action pin and rerun actual CI screenshots. F003-08 missing browser evidence.

Integration status2026-10-21: completed markers above reflect implemented behavior and actual slice evidence, not final release/merge. Final integrated cross-engine/mobile200% checks and exact-main CI remain separately gated.

Final integrated evidence supersedes earlier browser-pending notes: exact93ad1f5, all five hosted jobs in run39601721603, independent112-test/build/link/full-height visual/package verdict. Only explicitly named owner-authorized readiness/merge and exact-main CI gates remain pending; see ../008-community-release/acceptance.md.
