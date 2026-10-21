# Tasks004
## Phase1 Setup
- [x] T001 Lock shared planner contract in data-model.md and contracts/planner.md after independent requirements review. F004-01–06.
## Phase2 US1 Shared demand
- [x] T002 [US1] Add exact fixture and randomized tests in tests/runtime/shared-plan.test.mjs. F004-02/05/06.
- [x] T003 [US1] Implement aggregate closure/allocation in src/domain/shared-plan.mjs with iterative graph,100goals,20krecords,500kwork and1e12 safe aggregate caps. F004-02/05.
- [x] T004 [US1] Implement goal order/quantity/route controls and persistence in src/client/planner.mjs and src/ui/private-pages.mjs. F004-01.
## Phase3 US2 Executability
- [x] T005 [US2] Test strict/work-conserving, whole-goal rollback, shared unlock and retained joint stock in tests/runtime/shared-plan.test.mjs. F004-03/04/06.
- [x] T006 [US2] Implement copied executable schedule in src/domain/shared-plan.mjs and now/later/per-goal explanations in src/client/planner.mjs. F004-03/04.
## Phase4 US3 Failure and acceptance
- [x] T007 [US3] Add selected/unused cycle,scope,overflow,200goals,20k-DAG tests in tests/runtime/shared-plan.test.mjs and bounded error UI in src/client/planner.mjs. F004-05/06.
- [x] T008 [US3] Add browser goal editing/order/route/reload tests in tests/browser/run.mjs; run full regression/build and record acceptance.md. F004-06.
## Phase5 Release
- [ ] T009 Execute convergence and independent review; append repairs and record traceability.json/review.md. F004-06.
- [ ] T010 Create stacked PR, verify exact-head CI, merge only after authorized, verify exact-main CI. F004-06.
Dependencies: T001 before all coding. Domain worker owns T002/003/005/006(domain)/007(tests) only; integration owner UI/artifacts/browser. Parallel UI T004 after stable domain output contract.003 review fixes propagated before final004 acceptance.
- [x] T011 [US2] Add A25 now/later redistribution, conflicting-root-route and additional-production semantics regressions in tests/runtime/shared-plan.test.mjs. F004-02/03/05.

Integration status2026-10-21: completed markers above reflect implemented behavior and actual slice evidence, not final release/merge. Final integrated cross-engine/mobile200% checks and exact-main CI remain separately gated.
