# Tasks: Repository bootstrap

Input: spec.md and plan.md. Generated again on 2026-10-21 by following the installed tasks protocol and resolved template after initial manually authored scaffolding. Earlier code exists; task status below records actual evidence, not a retroactive claim of test-first development.

## Phase 1: Setup
- [x] T001 Install official pinned CLI and Codex files in .agents/skills/ and .specify/; record source in speckit.lock.json (BOOT-001).

## Phase 2: Foundational
- [x] T002 Preserve specs/001-guide-foundation/ and add bounded specs/002-repository-bootstrap/ artifacts (BOOT-002).

## Phase 3: User story 1 — Reproducible contributor workflow (P1)
Goal: contributors can inspect installed skills and select a feature. Independent test: selector positive/traversal fixtures and official prerequisites.
- [x] T003 [US1] Validate existing feature-selection tests in tests/test_repository.py, including missing/traversal inputs (BOOT-002).
- [x] T004 [US1] Verify scripts/select-feature.py and scripts/doctor.py against docs/quickstart.md (BOOT-002, BOOT-003).

## Phase 4: User story 2 — Traceable review (P1)
Goal: every requirement has tasks and evidence. Independent test: dangling-task and missing-evidence fixtures fail correctly.
- [x] T005 [US2] Validate traceability fixtures in tests/test_repository.py before completing remaining validator repairs (BOOT-004).
- [x] T006 [P] [US2] Integrate README.md, CONTRIBUTING.md and docs/spec-kit-cycle.md with bounded full-change workflow and truthful limitations (BOOT-003).
- [x] T007 [P] [US2] Verify scripts/check.py links, requirement coverage and docs accuracy (BOOT-004).

## Phase 5: User story 3 — Safe cross-platform maintenance (P2)
Goal: detect vendor drift and metadata errors offline and in CI. Independent test: upstream mutation, empty manifest, malformed JSON and ignored runtime-state fixtures.
- [x] T008 [US3] Run positive and negative tests in tests/test_repository.py and Bash smoke tests (BOOT-004).
- [x] T009 [US3] Verify .github/workflows/quality.yml at exact PR head on Ubuntu and Windows Git Bash (BOOT-004).

## Phase 6: Polish and release
- [x] T010 Record independent review and convergence in specs/002-repository-bootstrap/review.md; confirm LICENSE and THIRD_PARTY_NOTICES.md; publish only reviewed passing changes (BOOT-005).

## Dependencies and parallel opportunities
T001 → T002 → T003 → T004. T005 precedes validator repair T007; docs T006 may run in parallel with T007 because ownership is disjoint. T008 follows T003–T007; T009 follows T008 and branch publication; T010 release closes only after T009 and independent approval. Shared contracts and merges belong to integrator. MVP is US1; final bootstrap includes all three stories.

## Phase 7: Convergence
- [x] T011 Record exact-head hosted validation and independent review in specs/002-repository-bootstrap/acceptance.md and review.md per BOOT-005 (partial). Finding F1: code is present and validated; evidence files still say pending. This task does not authorize merge before review and final-head CI.
