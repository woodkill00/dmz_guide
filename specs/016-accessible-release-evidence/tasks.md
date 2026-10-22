# Tasks: Accessible pictures and release evidence

## Phase1 Setup
- [x] T001 Read governance and select specs/016-accessible-release-evidence explicitly; review constitution unchanged, execute specify/clarify/plan with pinned skills and no extension hooks.
- [x] T002 Obtain reviewer-owned requirements checklist in specs/016-accessible-release-evidence/checklists: partial image/recovery gate permits T005–009 after baseline/analyze/ownership; exact identity approval separately required before T010–012 production.
## Phase2 Foundation
- [x] T003 Record focused source-defect reproduction in tests/runtime/image-descriptions.test.mjs and tests/test_release_manifest.py plus specs/016-accessible-release-evidence/acceptance.md (FR001,003,006,007).
- [x] T004 Run read-only analyze over spec/plan/tasks, repair owning artifacts and rerun before implementation.
## Phase3 US1 image semantics
- [x] T005 [US1] Add bounded optional imageDescriptions schema and semantic uniqueness/attachment validation in schemas/pack.schema.json and src/content/validate.mjs (FR001,002).
- [ ] T006 [US1] Add shared alt resolver src/content/image-description.mjs; give014 exact renderer hook patch and verify escaped/spoiler/decorative/legacy output in tests/runtime/image-descriptions.test.mjs (FR003).
- [x] T007 [US1] Add Studio attach/reuse/remove semantics in src/client/studio-media.mjs, coordinate015 markup and confirm generic private guided controls/import/export/recovery round trips in tests/runtime/image-descriptions.test.mjs and tests/browser/studio.mjs (FR002,009).
## Phase4 US2 recovery inventory
- [x] T008 [US2] Add synthetic read-only completed/pending/corrupt/bounds/race/symlink fixtures in tests/runtime/recovery-inventory.test.mjs (FR004,005).
- [x] T009 [US2] Export bounded inspectRecoveryStorage in scripts/author-store.mjs, coordinate015 diagnostics read-only integration (FR004,005).
## Phase5 US3 release evidence
- [x] T010 [US3] Finalize captured-input identity contract in specs/016-accessible-release-evidence/contracts/evidence.md with integrator approval, before build hook edits (FR008).
- [x] T011 [US3] Add source/schema/build identity helper scripts/build-identity.mjs and minimal scripts/build.mjs staged output hook without changing mutex/promotion semantics; test source drift/stale/no-Git in tests/runtime/build-identity.test.mjs (FR008,009).
- [x] T012 [US3] Expand scripts/package-release.py manifest to entire payload and exact inventory; harden scripts/verify-release.py to bounded pre-extraction inventory/hash validation; malformed archive tests in tests/test_release_manifest.py (FR006,007,008).
## Phase6 Verification and closure
- [ ] T013 Run full checks and hosted browser/visual matrix, record exact results and unavailable gates in specs/016-accessible-release-evidence/acceptance.md (FR009,SC001–004).
- [ ] T014 Execute converge, append missing tasks and rerun required implementation/verification; obtain independent source/visual review and exact-head/main gates in specs/016-accessible-release-evidence/acceptance.md.

## Dependencies and execution strategy
T001→T002/T003→T004→T005→T006/T007. T008→T009 after gate. T010→T011→T012 after separate identity approval; no partial gate overrides. T013/T014 require all stories integrated. No parallel same-file editing:014 owns render,015 Studio markup/client. Sequential small reversible commits; image semantics first, recovery second, release evidence third. Only tests/specs may precede production gate. No deterministic ZIP implementation in this feature.

## Phase7: Convergence
- [x] T015 [US3] Extend existing synthetic build fixture copies with newly captured package metadata and rerun unchanged013 fault/interleaving assertions in tests/runtime/build-cli.test.mjs and tests/runtime/build-snapshot.test.mjs.
- [ ] T016 [US1] Integrate two-line renderer hook and015 Studio controls, run new shared-description/decorative browser assertions in tests/browser/studio.mjs, and record hosted results in acceptance.md.
- [ ] T017 [US2] Integrate read-only storage summary into015 scripts/diagnose.mjs and verify diagnostics do not mutate state.
- [x] T018 [US3] Verify stale static source and changed/extra/missing dist cannot package using tests/test_release_server.py; document backward reader limits and hash limitations in docs/image-descriptions.md.

## Phase8: Independent review convergence
- [x] T019 [US3] Exclude generated Python caches from captured/comparison source sets and add clean-cache fixture; use bounded no-follow descriptor reads with stable file identity in scripts/build-identity.mjs.
- [x] T020 [US3] Keep verifier syntax compatible with documented Python3.11, parse with available3.11 grammar and require hosted3.11 runtime in scripts/verify-release.py acceptance.

## Phase9: Independent safety review convergence
- [x] T021 [US2] Preserve first observed stat signature, reject impossible empty receipt operations and add deterministic race/oversize/symlink/count-limit tests in scripts/author-store.mjs and tests/runtime/recovery-inventory.test.mjs.
- [x] T022 [US3] Bound and validate all package inputs before reading, including documents/identity/source ancestors; reject symlink/nonregular/oversize inputs in scripts/package-release.py and tests/test_release_server.py.
- [ ] T023 [US1] Apply shared usage-description semantics to private blob raster rendering in src/client/local.mjs and add private-path regression coverage without changing014/017 catalog loading ownership.

## Phase10: Hosted import-fixture repair
- [x] T024 [US1] Preserve the production changed-content version guard by incrementing the synthetic described-transfer version in tests/browser/bundled-assets.mjs; assert stored version and both image-description arrays, and capture bounded failure feedback without relaxing stage/alt/strict-health assertions.
- [ ] T025 [US1] Integrator reruns actual hosted Windows/Linux browser matrix for the corrected described-transfer fixture and records exact-head evidence in acceptance.md.
