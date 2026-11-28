# Tasks: Site reliability

## Phase 1: Preservation and planning
- [x] T001 Capture confirmed VS Code 4173 guide/armory and origin storage under ignored .local/private-backups; validate export/integrity without restore or commit (FR001/008).
- [x] T002 Specify/clarify/plan contracts and requirements in specs/111-site-reliability/ (all FR).
- [x] T003 Independently analyze spec/plan/tasks and review checklists/reliability.md; repair/reanalyze all findings before code (all FR).

## Phase 2: US1 - Current project guidance
- [x] T004 [US1] Reconcile README.md and docs/roadmap.md; add docs/reliability.md and index link with actual routes/owners/deferred final workpackage (FR002/008).

## Phase 3: US3 - Content gaps
- [x] T005 [US3] Add missing-weapon regression and failing new camo-coverage fixtures in tests/runtime/site-quality.test.mjs before extending src/domain/site-quality.mjs and wiring src/ui/site-experience-page.mjs (FR004).
- [x] T006 [US3] Add scripts/content-audit.mjs and audit:content command for actual catalog/mission/X01 gap inventory, optional image availability and reader/editor route checks; record reproducible counts/limits and quality browser actions in specs/111-site-reliability/verification.md (FR004/007).

## Phase 4: US5 - Independent CI suites
- [x] T007 [US5] Add CI coverage/fail-closed regression cases in tests/runtime/ci-quality-contract.test.mjs and split .github/workflows/quality.yml with preserved aggregate names, pins, commands and OS coverage (FR006).

## Phase 5: US2/US4 - Journey and visual verification
- [x] T008 [US2] Run isolated three-engine inventory/needed/quick-collect, upgrade/Order, weapon/dashboard and map/route journeys; add missing checks and reproduce/repair confirmed defects with evidence (FR003/007).
- [x] T009 [US4] Run current compact/reusable cards, sitewide narrow/enlarged/keyboard/expanded accessibility and map checks; review actual screenshots and repair confirmed P1/P2 with regression evidence (FR005/007).

## Phase 6: Verify and converge
- [x] T010 Run relevant full runtime/repository/build/map/format/link checks; record exact commands/results/limits in specs/111-site-reliability/verification.md (FR007).
- [x] T011 Converge implementation against spec/plan/tasks, append and finish missing tasks, then obtain independent standards/spec/visual acceptance in specs/111-site-reliability/review.md (all FR).

## Dependencies
T001 precedes implementation. T003 gates T004–T009. T005 red reproduction precedes its fix. T008/T009 repairs need re-verification before T010/T011. Keep code, content, fixtures and reviewer artifacts separately owned. Dedicated backup/recovery verification is deliberately outside these implementation tasks and remains the final follow-up.

## Phase 7: Convergence follow-through
- [x] T012 Repair settled-map readiness in tests/browser/usability109.mjs before its reload/layout assertions; preserve strict health/oracles/deadlines and rerun all three engines (FR003/005/007).
- [x] T013 Verify missing optional local camo artwork in tests/browser/reliability.mjs with the existing exact-URL bounded health policy and visible fallback; retain fatal CSP/script/unrelated HTTP checks (FR003/007).
- [x] T014 Fix clean cached Orders return in src/client/progression.mjs; reproduce red in tests/browser/order-return.mjs, require canonical read/no-replay/stock preservation, run three-engine adverse and real cross-page regressions (FR003/007).
- [x] T015 Guard absent initial pack/profile in Orders reconciliation; add held-initialization lifecycle regression in tests/browser/order-return.mjs and rerun both return cases/adverse suite/all-engine real journeys (FR003/007).
