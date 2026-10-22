# Tasks: Trustworthy build and test outcomes

## Phase 1: Setup and assessed reproduction

- [x] T001 Read pinned lifecycle skills and governing instructions; resolve explicit specs/013-build-reliability context and record scope in spec.md/research.md. [FR-008]
- [x] T002 Reproduce actual destructive second-page write failure using reproduction/a3-write-failure.mjs and record baseline evidence in reproduction/proposal.md. [FR-001/003]
- [x] T003 [P] Reproduce actual wrong-process release readiness and browser readiness fallthrough using reproduction/readiness-* artifacts. [FR-004/005]
- [x] T004 [P] Investigate controlled build/save and pending-recovery behavior using reproduction/a4-* artifacts; do not change shared source contracts. [FR-007]

## Phase 2: Foundational review gate

- [x] T005 Obtain independent requirements-quality review of checklists/reliability.md and parent ownership approval for paths listed in plan.md; repair owning artifacts and rerun analysis if needed. [FR-008]
- [x] T006 Analyze spec.md, plan.md and tasks.md for traceability and contradictions; record the review outcome without treating unchecked approval as permission. [FR-001–008]

## Phase 3: US1 Keep the last usable reader

- [x] T007 [US1] Add deterministic filesystem fault tests in tests/runtime/build-output.test.mjs for first build, writes/copy/validation, successful replacement, each rename/rollback failure, build-lock collision and retained interruption material. [FR-001–003, SC-001]
- [x] T008 [US1] Implement staged output lifecycle in scripts/build-output.mjs and integrate scripts/build.mjs without changing rendering/catalog semantics; keep complete OLD bytes and honest diagnostics. [FR-001–003]
- [x] T009 [US1] Add approved .gitignore control-directory entry and docs/release.md explanation of retained OLD and explicit interrupted-state handling. [FR-002/003/008]

## Phase 4: US2 Trust readiness evidence

- [x] T010 [US2] Add readiness failure/identity/deadline/cleanup tests in tests/runtime/server-readiness.test.mjs and tests/test_release_server.py, before integration changes. [FR-004/005, SC-002]
- [x] T011 [US2] Implement approved bounded Node readiness helper tests/browser/server.mjs; integrate tests/browser/run.mjs and tests/browser/engines.mjs without weakening browser health checks. [FR-004/005]
- [x] T012 [US2] Implement equivalent Python child/content verification in scripts/verify-release.py and shared scripts/server-readiness.mjs CLI adapter, preserving package/hash/native-link checks. [FR-004/005]

## Phase 5: US3 Reproduce supported runtime checks

- [x] T013 [US3] Verify official setup-node source pin, then update approved .github/workflows/quality.yml with Linux22/Windows22 full runtime and Linux24 compatibility jobs plus explicit Node22 engine job. [FR-006, SC-003]
- [x] T014 [US3] Reconcile approved package.json/package-lock.json and docs runtime support to Node22/24 without future-major promises. [FR-006]

## Phase 6: US4 Establish concurrent-save behavior

- [x] T015 [US4] Record exact A4 reproduction outcomes, existing protections and limitations in research.md/acceptance.md; if defective, amend owning artifacts and seek separate shared-contract review before any repair. [FR-007, SC-004]

## Phase 7: Verification and convergence

- [x] T016 Run focused and full documented checks against final code; record command, head, OS/runtime, counts and any unavailable evidence in acceptance.md. [FR-001–008, SC-001–004]
- [x] T017 Perform pinned convergence assessment, append unmet work as new tasks without rewriting prior task intent, and complete/reverify any authorized remaining work. [FR-001–008]
- [x] T018 Obtain independent exact-head implementation review and Linux/Windows runtime/browser/clean-release CI through integration owner; no publish or merge from this worker. [SC-001–004]

## Dependencies and parallel opportunities

T001 precedes reproduction. T003 and T004 are safe parallel synthetic-only research. T005–T006 gate all production edits. Within each story tests precede implementation. T008 and readiness/CI implementations may be independently prepared only after ownership is assigned; shared entrypoint/config edits are serialized by integrator. A4 findings never silently expand T008. T016–T018 follow all accepted implementation work. MVP is US1; the committed batch must still honestly report the status of every accepted work package.

## Phase 8: Reproduced A4 amendment (approval required)

- [x] T019 Obtain independent review and integration-owner grant for FR-009 snapshot-boundary amendment in spec.md/plan.md before shared production edits. [FR-007/009]
- [x] T020 [US4] Add tests/runtime/build-snapshot.test.mjs covering root normalization, owner-only release on success/error, other/dead lock refusal, pending journals, separate-process writer exclusion, media materialization and exact ABA outcome. [FR-009, SC-004]
- [x] T021 [US4] Add narrow withRepositorySnapshot export in scripts/author-store.mjs and use it only around readCatalog/prepareBundledAssets in scripts/build.mjs; no catalog.mjs or author.mjs edits and no recursive queued store operations. [FR-009]
- [x] T022 Repeat original A4 controls and full relevant author-store/catalog/build tests; update acceptance.md and perform convergence plus independent final-head review. [FR-009, SC-004]

T019 gates T020–T022 production repair; synthetic assessment remains allowed. Final acceptance T016–T018 must be rerun after this amendment if approved. The amendment is not self-approved by appended tasks.

## Phase 9: Independent source-review corrections

- [x] T023 Move initial dist inspection under output-lock ownership; test competing first promotion and honest other-owner diagnostics. [FR-001–003]
- [x] T024 Validate the full expected generated/copied/media inventory and hashes before promotion; test silently omitted pack, media and module output. [FR-001]
- [x] T025 Add independent Python verifier outer timeout and portable graceful-helper cancellation before bounded escalation; never claim unconfirmed cleanup succeeded. [FR-004/005]

These source-review corrections are within approved paths and requirements. Reverify final code and return all to independent reviewer; do not treat focused green tests as final acceptance.

## Phase 10: Convergence

- [x] T026 Obtain exact integrated-head Linux22/Windows22 and Linux24 CI evidence, including full existing browsers/Studio, actual Windows promotion/fault operations and the native exclusive-open-file probe; disclose any platform limitation rather than infer success from Linux. [SC-001–003, FR-006] (partial)
- [ ] T027 Obtain independent exact-head source approval after the T023–T025 corrections and approved A4 repair, then integration-owner final-main verification; update acceptance with actual head/results without publishing from this worker. [SC-004, FR-008/009] (partial)

Convergence assessed 9 FR, 4 SC, 17 story acceptance scenarios, 5 technical decisions, all 10 constitution principles and T001–T025. No additional production-code gap identified in the approved scope. Two acceptance-evidence gaps remain, so this is `tasks_appended`, not a claim of final convergence. Local browser failures are documented in acceptance.md; they are not waived. T016/T018/T022 remain open until their full exact-head/platform/review obligations are met by integration.

## Phase 11: Convergence

- [x] T028 Record the independently confirmed hosted run 39764754220 for exact source head b54b2312e27a008b75bad04ab7f342ae4ef68ba6, distinguish synthetic merge checkout from identical source tree, and reconcile satisfied source/runtime task evidence in acceptance.md. [FR-006/008/009, SC-001–004] (partial)
- [ ] T029 Have the integration owner publish the documentation-only closeout, obtain independent review and fresh checks for that documentation head, then perform any separately gated parent merge and exact-main verification; do not mark final-main work complete from candidate-tree evidence. [FR-008, plan: verification and rollout] (partial)

2026-10-22 assessment: 9 FR, 4 SC, 17 story acceptance scenarios, 5 technical decisions, all 10 constitution principles and T001–T027 assessed. No production implementation gap or new scope identified. Two evidence/process gaps remain: the acceptance document has not yet captured the now-confirmed hosted source/runtime results (MEDIUM), and documentation-head/parent merge/exact-main gates are not yet established (HIGH). This append-only convergence pass added T028/T029 and changed no prior task or owning artifact. The subsequent implement pass may update evidence and satisfied task markers separately; it cannot infer completion of pending release gates. No extension hooks are configured.

### Separate implement closeout after Phase 11

T016/T018/T022/T026/T028 are satisfied for reviewed source head `b54b2312e27a008b75bad04ab7f342ae4ef68ba6` and identical tree `5e2f740641da336bcb2cf65ead3f208e18cc9529`, with exact hosted evidence recorded in acceptance.md. The independent reviewer confirmed all six terminal statuses, the four runtime/browser job logs and source/runtime approval; the implementation worker also inspected both repository/Python job logs. These marker/evidence updates are the separate implement pass, not writes performed by converge. T027 and T029 remain unchecked: publication/review/checks for this new documentation head, parent merge and exact-main evidence are not complete. No product/test changes or parent-gate approval are implied.
