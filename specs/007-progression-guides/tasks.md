# Tasks007
## Phase1 Setup
- [x] T001 Independently approve contracts/checklist in specs/007-progression-guides/checklists/progression-quality.md. F007-01–05.
## Phase2 US1 Tracks
- [x] T002 [US1] Implement pure rows/transitions and tests in src/domain/progression.mjs and tests/runtime/progression.test.mjs. F007-01/02/05.
- [x] T003 [US1] Implement src/ui/progression-page.mjs and src/client/progression.mjs with pack-qualified links and provenance. F007-01/02.
## Phase3 US2 Spoilers
- [x] T004 [US2] Implement reveal/hide/search isolation/reload preference and tests in tests/runtime/progression.test.mjs and tests/browser/progression.mjs. F007-03/05.
## Phase4 US3 Recovery
- [x] T005 [US3] Implement named target/revision reset+cancel and no-inventory-change tests in src/client/progression.mjs and tests/browser/progression.mjs. F007-04/05.
## Phase5 Acceptance
- [x] T006 Run full regressions/build/hosted browser, convergence and independent review; write acceptance.md/traceability.json. F007-05.
- [ ] T007 Publish reviewed PR and verify exact-head/main CI only after authorized readiness/merge. F007-05.
Dependencies: T001 before code; T002 before T003; T004/005 extend same UI sequentially. No shared-file concurrent edits.

## Phase6 Integration follow-through
- [x] T008 Wire the progression page builder and browser suite in the integration-owned build/test entrypoints. F007-01/05.
- [x] T009 Execute the hosted sandboxed Chrome browser suite, inspect 320/390px screenshots, resolve failures and obtain independent implementation review. F007-03/04/05. Local browser launch is blocked; tests are authored, not yet browser-accepted.

T002–T005 markers record implemented code and regression scenarios, not successful browser acceptance. T006/T008/T009 remain open until integration evidence is recorded. T007 remains subject to the parent’s publication/readiness/merge authorization.
- [x] T010 Bound full-page prerequisite/related/source/effect projections, paginate visible records, bound spoiler matching and add adversarial large valid graph tests after independent source-review finding. F007-01/03/05; constitution untrusted-content limits. Runtime verified; browser pagination inspection remains part of T009.

Integration status2026-10-21: completed markers above reflect implemented behavior and actual slice evidence, not final release/merge. Final integrated cross-engine/mobile200% checks and exact-main CI remain separately gated.

Slice evidence: exact cb6e40776fbd28da9bf73ec640df45f91cdff817 hosted browser/visual/source accepted independently2026-10-21. Final integration gates and authorized exact-main merge remain open.
