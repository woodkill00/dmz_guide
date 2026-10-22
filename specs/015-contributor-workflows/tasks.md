# Tasks: Contributor workflows
## Phase 1: Setup
- [x] T001 Read pinned lifecycle, constitution and approved scope; isolate specs/015-contributor-workflows on exact base 6d92043.
- [x] T002 Specify/clarify/plan in specs/015-contributor-workflows; record no critical unresolved scope ambiguities.
## Phase 2: Gates
- [x] T003 Obtain independent requirements approval in specs/015-contributor-workflows/checklists/contributor-safety.md and analyze consistency before production edits.
## Phase 3: US1 recovery
- [x] T004 [US1] Reproduce absent recovery contract and hostile cases in tests/runtime/contributor-workflows.test.mjs (FR-006–009).
- [x] T005 [US1] Implement bounded version-1 validator in src/content/studio-recovery.mjs with exact shape/identity/rights/current-source/media validation, per Plan limits (FR-006–009).
- [x] T006 [US1] Integrate separate recovery file control and inert preview/apply in src/client/studio.mjs and src/ui/studio-page.mjs; add scripts/author.mjs allowlist (FR-008–009).
## Phase 4: US2 navigation/review
- [x] T007 [US2] Add red-first UI contract/browser cases in tests/runtime/contributor-workflows.test.mjs and tests/browser/contributor-workflows.mjs (FR-003–005).
- [x] T008 [US2] Add stable anchor sections, derived summary, explicit review version change in src/client/studio.mjs, src/ui/studio-page.mjs and additive src/ui/studio.css selectors (FR-003–005).
## Phase 5: US3 startup
- [x] T009 [US3] Reproduce missing-build/occupied-port diagnostics and role requirements in tests/runtime/contributor-workflows.test.mjs (FR-001–002).
- [x] T010 [US3] Add read-only scripts/diagnose.mjs and reader/author/contributor warning/blocker diagnostics including non-loopback HOST warning and friendly startup messages in scripts/serve.mjs and scripts/author.mjs; preserve owned-process signals (FR-002).
- [x] T011 [US3] Separate docs/quickstart.md reader/author guide from docs/developer-quickstart.md; update README.md and docs/content-studio.md (FR-001).
## Phase 6: Verification
- [x] T012 Run tests/check/build/format/Python and focused acceptance; record exact outcomes in specs/015-contributor-workflows/acceptance.md.
- [ ] T013 Converge artifacts and source, append missing tasks in specs/015-contributor-workflows/tasks.md and obtain independent source/visual review.
- [ ] T014 Integrator runs actual Windows/Linux Chrome/Firefox/WebKit, strict health, full-page/tiled/200% exact-head CI; record in specs/015-contributor-workflows/acceptance.md. No merge/publish by worker.

## Dependencies and strategy
T001–003 gate all production work. Each story's reproduction precedes implementation. US1/US2 share Studio and execute sequentially. US3 diagnostic module/docs can be parallel only with a disjoint owner; this worker executes sequentially. MVP recovery first, then navigation/review, then startup/docs. All story phases independently testable; full delivery requires all three and evidence/review.

## Phase 7: Convergence
- [x] T015 Preserve the author-only static boundary for the new parser via exact exclusions in scripts/build.mjs and scripts/release_paths.py and corresponding tests (FR-006; plan local-only scope); integrator authorized exact exclusions only.
- [ ] T016 Execute expanded actual-raster/rights/rejection/delayed-decode cancellation cases in tests/browser/contributor-workflows.mjs on hosted Chrome/Firefox/WebKit and retain strict-health plus full-page/tiled actual200% artifacts (FR-007–008, SC-005). Local launch is unavailable, not passed.
- [x] T017 Keep016 image controls out of the independently usable015 candidate; transfer working controls and optional recovery-storage diagnostics to016 with its owned helpers. No inert description input is shipped in015 (coordinated ownership boundary).
