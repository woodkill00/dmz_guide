# Tasks
## Phase1: Gates
- [x] T001 Review constitution and create spec/clarifications/plan/research/data-model/quickstart in specs/018-deterministic-release, FR001–005.
- [x] T002 Reproduce actual unequal archives with equal payload and fixed-clock mtime control; record specs/018-deterministic-release/research.md, FR001.
- [x] T003 Obtain independent checklists/reproducibility.md approval and run read-only analysis before production, FR001–005.
## Phase2: US1 Compare releases
- [x] T004 [US1] Add red-first two-independent-source-tree build/package metadata and changed-input regression in tests/test_release_reproducibility.py, FR001–004.
- [x] T005 [US1] Canonicalize only final scripts/package-release.py ZIP writer after T003/T004, FR001–003.
- [x] T006 [US1] Document exact policy and two-clean-Git-worktree commands in docs/reproducible-releases.md, FR004–005.
## Phase3: Verify and converge
- [x] T007 Run regression/full local gates and two clean committed worktree builds, retain outputs and record environment/results in specs/018-deterministic-release/acceptance.md, FR001–005.
- [x] T008 Run convergence and independent source review, record pending hosted exact-head/main acceptance in specs/018-deterministic-release/acceptance.md, FR003–005.

## Phase4: Convergence
- [ ] T009 Integrator must rerun full hosted Windows/Linux runtime/browser/Python3.11 gates and two-clean-build evidence after stacking018 on integrated015–017, then record exact-head/main results in specs/018-deterministic-release/acceptance.md; current local evidence is not an integrated/main verdict, FR003–005.

## Phase5: Integrated release prerequisite
- [x] T010 Add 018-deterministic-release to the current exact feature-prerequisite list in .github/workflows/quality.yml without changing existing runtime, browser, platform or strict verification gates; rerun local prerequisites and checks, FR003–005.
